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

    return this.client.accounts.create({
      email: params.email,
      phone: params.phone,
      type: params.type,
      reference_id: params.reference_id,
      legal_business_name: params.legal_business_name,
      business_type: params.business_type,
      profile: params.profile
    });
  }

  async getLinkedAccount(accountId: string): Promise<any> {
    if (!this.client) {
      throw new InternalServerErrorException('Razorpay is not configured');
    }

    return this.client.accounts.fetch(accountId);
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
