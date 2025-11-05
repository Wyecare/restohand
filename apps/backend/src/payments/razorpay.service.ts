import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { RazorpayConfig } from '../config/razorpay.config';

interface CreateOrderParams {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  transfers?: Array<{
    account: string;
    amount: number;
    currency: string;
    notes?: Record<string, string>;
  }>;
}

interface CreatePaymentLinkParams {
  amount: number;
  currency: string;
  accept_partial: boolean;
  description: string;
  customer: {
    name?: string;
    contact?: string;
    email?: string;
  };
  notify: {
    sms: boolean;
    email: boolean;
  };
  reminder_enable: boolean;
  notes?: Record<string, string>;
  callback_url?: string;
  callback_method?: string;
}

interface CreateContactParams {
  name: string;
  email: string;
  contact: string;
  type: 'vendor' | 'customer';
  reference_id: string;
  notes?: Record<string, string>;
}

interface CreateFundAccountParams {
  contact_id: string;
  account_type: 'bank_account' | 'vpa';
  bank_account?: {
    name: string;
    account_number: string;
    ifsc: string;
  };
  vpa?: {
    address: string;
  };
}

interface CreateTransferParams {
  account: string;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
  linked_account_notes?: Array<string>;
  on_hold?: boolean;
}

interface CreateLinkedAccountParams {
  email: string;
  phone: string;
  type: string;
  reference_id: string;
  legal_business_name: string;
  business_type: string;
  profile?: {
    category: string;
    subcategory: string;
    addresses?: {
      registered: {
        street1: string;
        street2: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
    };
  };
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly razorpayConfig: RazorpayConfig;
  private readonly client: Razorpay;

  constructor(private readonly configService: ConfigService) {
    this.razorpayConfig = this.configService.get<RazorpayConfig>('razorpay', { infer: true }) ?? {};
    if (!this.razorpayConfig.keyId || !this.razorpayConfig.keySecret) {
      throw new Error('Razorpay keys are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    if (!this.razorpayConfig.webhookSecret) {
      throw new Error('Razorpay webhook secret not configured. Set RAZORPAY_WEBHOOK_SECRET.');
    }
    this.client = new Razorpay({
      key_id: this.razorpayConfig.keyId,
      key_secret: this.razorpayConfig.keySecret,
    });
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  get publicKey(): string | undefined {
    return this.razorpayConfig.keyId;
  }

  async createOrder(params: CreateOrderParams): Promise<Razorpay.Order> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    const orderData: any = {
      amount: params.amount,
      currency: params.currency,
      receipt: params.receipt,
      payment_capture: 1,
      notes: params.notes,
    };

    // Add transfers if provided for direct settlement
    if (params.transfers && params.transfers.length > 0) {
      orderData.transfers = params.transfers;
    }

    return this.client.orders.create(orderData);
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    const paymentLinkData = {
      amount: params.amount,
      currency: params.currency,
      accept_partial: params.accept_partial,
      description: params.description,
      customer: params.customer,
      notify: params.notify,
      reminder_enable: params.reminder_enable,
      notes: params.notes || {},
      callback_url: params.callback_url,
      callback_method: params.callback_method || 'get'
    };

    try {
      // Try the modern payment link API
      return await (this.client as any).paymentLink.create(paymentLinkData);
    } catch (error) {
      this.logger.error('Payment Link API failed, falling back to direct HTTP call', error);

      // Fallback: Use direct HTTP call to Razorpay Payment Links API
      const https = require('https');
      const auth = Buffer.from(`${this.razorpayConfig.keyId}:${this.razorpayConfig.keySecret}`).toString('base64');

      return new Promise((resolve, reject) => {
        const postData = JSON.stringify(paymentLinkData);
        const options = {
          hostname: 'api.razorpay.com',
          port: 443,
          path: '/v1/payment_links',
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = https.request(options, (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    }
  }

  async createLinkedAccount(params: CreateLinkedAccountParams): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    this.logger.log(`Creating linked account for reference: ${params.reference_id}`);

    // Validate and format data for Indian requirements
    const formattedPhone = params.phone.startsWith('+91') ? params.phone : `+91${params.phone.replace(/^0/, '')}`;

    const accountData = {
      email: params.email,
      phone: formattedPhone,
      type: 'standard', // Standard account type for restaurants
      reference_id: params.reference_id,
      legal_business_name: params.legal_business_name,
      business_type: params.business_type,
      profile: {
        category: 'food_and_beverages',
        subcategory: 'restaurant',
        addresses: params.profile?.addresses ? {
          registered: {
            ...params.profile.addresses.registered,
            // Ensure postal code is 6 digits for India
            postal_code: params.profile.addresses.registered.postal_code.replace(/\D/g, '').padStart(6, '0').substring(0, 6),
            country: 'IN' // Force India for now
          }
        } : undefined,
        ...params.profile
      }
    };

    this.logger.log(`Creating linked account with data:`, JSON.stringify(accountData, null, 2));

    try {
      const account = await this.client.accounts.create(accountData);
      this.logger.log(`Linked account created successfully: ${account.id}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to create linked account: ${error.message}`, error);
      this.logger.error(`Error details:`, JSON.stringify(error, null, 2));

      // Log the full error response for debugging
      if (error.response) {
        this.logger.error(`Razorpay API Response:`, JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  async getLinkedAccount(accountId: string): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    try {
      const account = await this.client.accounts.fetch(accountId);
      this.logger.log(`Fetched linked account ${accountId}: status=${account.status}`);
      return account;
    } catch (error) {
      this.logger.error(`Failed to fetch linked account ${accountId}: ${error.message}`);
      throw error;
    }
  }

  async getLinkedAccountStatus(accountId: string): Promise<{
    status: string;
    canReceivePayments: boolean;
    details: any;
  }> {
    try {
      const account = await this.getLinkedAccount(accountId);

      const canReceivePayments = account.status === 'activated';

      return {
        status: account.status,
        canReceivePayments,
        details: {
          id: account.id,
          status: account.status,
          activated_at: account.activated_at,
          created_at: account.created_at,
          legal_business_name: account.legal_business_name,
          business_type: account.business_type,
        }
      };
    } catch (error) {
      return {
        status: 'error',
        canReceivePayments: false,
        details: { error: error.message }
      };
    }
  }

  // Transfers API Methods for instant restaurant payments
  async createContact(params: CreateContactParams): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    this.logger.log(`Creating contact for: ${params.name}`);

    // Note: Contacts API is not available in this SDK version
    // For transfers, we'll use the customers API as an alternative
    // or implement direct HTTP calls to Razorpay's contacts API
    throw new InternalServerErrorException('Contacts API not available in current SDK version. Use fundAccount.create() directly for simpler flow.');
  }

  async createFundAccount(params: CreateFundAccountParams): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    this.logger.log(`Creating fund account for contact: ${params.contact_id}`);

    const fundAccountData: any = {
      contact_id: params.contact_id,
      account_type: params.account_type
    };

    if (params.account_type === 'bank_account' && params.bank_account) {
      fundAccountData.bank_account = params.bank_account;
    }

    if (params.account_type === 'vpa' && params.vpa) {
      fundAccountData.vpa = params.vpa;
    }

    return this.client.fundAccount.create(fundAccountData);
  }

  async createTransfer(params: CreateTransferParams): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    this.logger.log(`Creating transfer of ₹${params.amount/100} to account: ${params.account}`);

    const transferData: any = {
      account: params.account,
      amount: params.amount,
      currency: params.currency,
      notes: params.notes || {},
      on_hold: params.on_hold || false
    };

    // Add linked_account_notes if provided (may not be supported in all SDK versions)
    if (params.linked_account_notes) {
      transferData.linked_account_notes = params.linked_account_notes;
    }

    return this.client.transfers.create(transferData);
  }

  // Alternative: Direct bank transfer using Payouts API (works without Route)
  async createPayout(params: {
    fundAccountId: string;
    amount: number;
    currency: string;
    purpose: string;
    notes?: Record<string, string>;
    queueIfLowBalance?: boolean;
  }): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    this.logger.log(`Creating payout of ₹${params.amount/100} to fund account: ${params.fundAccountId}`);

    const payoutData = {
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER, // Your X account number
      fund_account_id: params.fundAccountId,
      amount: params.amount,
      currency: params.currency,
      mode: 'IMPS', // IMPS/NEFT/RTGS
      purpose: params.purpose, // 'refund', 'cashback', 'payout', etc.
      queue_if_low_balance: params.queueIfLowBalance || true,
      reference_id: `payout_${Date.now()}`,
      narration: 'Restaurant Settlement',
      notes: params.notes || {}
    };

    try {
      return await this.client.payouts.create(payoutData);
    } catch (error) {
      this.logger.error(`Payout failed: ${error.message}`, error);
      throw error;
    }
  }

  // Create fund account for restaurant bank details
  async createFundAccountForRestaurant(restaurantId: string, bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  }): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    // First create a contact
    const contact = await this.client.customers.create({
      name: bankDetails.accountHolderName,
      email: `restaurant-${restaurantId}@restohand.com`,
      contact: '9999999999', // Use restaurant phone if available
      type: 'vendor',
      reference_id: restaurantId,
      notes: {
        restaurant_id: restaurantId
      }
    });

    // Then create fund account
    const fundAccount = await this.client.fundAccount.create({
      contact_id: contact.id,
      account_type: 'bank_account',
      bank_account: {
        name: bankDetails.accountHolderName,
        account_number: bankDetails.accountNumber,
        ifsc: bankDetails.ifscCode
      }
    });

    this.logger.log(`Fund account created for restaurant ${restaurantId}: ${fundAccount.id}`);
    return { contact, fundAccount };
  }

  async getTransfer(transferId: string): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    return this.client.transfers.fetch(transferId);
  }

  verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
    if (!signature) {
      return false;
    }
    const webhookSecret = this.razorpayConfig.webhookSecret!;
    const computed = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    return computed === signature;
  }
}
