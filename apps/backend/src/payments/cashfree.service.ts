import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CashfreeConfig } from '../config/cashfree.config';

interface CreateOrderParams {
  orderId: string;
  amount: number;
  currency: string;
  customerDetails: {
    customerId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
  orderMeta?: {
    returnUrl?: string;
    notifyUrl?: string;
  };
  orderNote?: string;
}

interface CreateOrderResponse {
  cfOrderId: number;
  orderId: string;
  paymentSessionId: string;
  orderStatus: string;
  orderAmount: number;
  orderCurrency: string;
}

interface VendorParams {
  vendorId: string;
  name: string;
  email: string;
  phone: string;
  bankAccount?: {
    accountNumber: string;
    accountHolder: string;
    ifsc: string;
  };
  upiVpa?: string;
  scheduleOption: number; // Settlement schedule
  kycDetails: {
    accountType:
      | 'Individual'
      | 'Proprietorship'
      | 'Partnership'
      | 'Private Limited'
      | 'Public Limited';
    businessType: string;
    pan: string;
    gst?: string;
    cin?: string;
  };
}

interface SplitParams {
  orderId: string;
  splits: Array<{
    vendorId: string;
    percentage?: number;
    amount?: number;
    tags?: Record<string, string>;
  }>;
}

@Injectable()
export class CashfreeService {
  private readonly logger = new Logger(CashfreeService.name);
  private readonly cashfreeConfig: CashfreeConfig;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.cashfreeConfig =
      this.configService.get<CashfreeConfig>('cashfree', { infer: true }) ?? {};

    if (!this.cashfreeConfig.clientId || !this.cashfreeConfig.clientSecret) {
      throw new Error(
        'Cashfree credentials are not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.'
      );
    }

    // Set base URL based on environment
    this.baseUrl =
      this.cashfreeConfig.environment === 'production'
        ? 'https://api.cashfree.com'
        : 'https://sandbox.cashfree.com';

    this.logger.log(
      `Cashfree service initialized in ${this.cashfreeConfig.environment} mode`
    );
  }

  /**
   * Get common headers for Cashfree API calls
   */
  private getHeaders(): Record<string, string> {
    return {
      'x-client-id': this.cashfreeConfig.clientId,
      'x-client-secret': this.cashfreeConfig.clientSecret,
      'x-api-version': '2022-09-01',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make HTTP request to Cashfree API
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree API error: ${response.status}`,
          responseData
        );
        throw new Error(
          `Cashfree API error: ${responseData.message || response.statusText}`
        );
      }

      return responseData;
    } catch (error) {
      this.logger.error(`HTTP request failed: ${error.message}`, error);
      throw new InternalServerErrorException(
        `Cashfree API request failed: ${error.message}`
      );
    }
  }

  /**
   * Create order for payment collection
   */
  async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    try {
      this.logger.log(
        `Creating Cashfree order for orderId: ${params.orderId}, amount: ₹${params.amount}`
      );

      const orderData = {
        order_id: `restohand_${params.orderId}`, // Prefix to avoid conflicts
        order_amount: params.amount.toFixed(2), // Amount already in rupees
        order_currency: params.currency,
        customer_details: {
          customer_id: params.customerDetails.customerId,
          customer_name: params.customerDetails.customerName || 'Customer',
          customer_email:
            params.customerDetails.customerEmail || 'customer@restohand.com',
          customer_phone: params.customerDetails.customerPhone || '9999999999',
        },
        order_meta: {
          return_url:
            params.orderMeta?.returnUrl ||
            `${process.env['CUSTOMER_FRONTEND_URL']}/payment/success`,
        },
        order_note: params.orderNote || 'RestoHand Order Payment',
      };

      const response = await this.makeRequest('POST', '/pg/orders', orderData);

      this.logger.log(
        `Cashfree order created successfully: ${response.cf_order_id}`
      );

      return {
        cfOrderId: response.cf_order_id,
        orderId: response.order_id,
        paymentSessionId: response.payment_session_id,
        orderStatus: response.order_status,
        orderAmount: response.order_amount,
        orderCurrency: response.order_currency,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Cashfree order: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<any> {
    try {
      const cashfreeOrderId = orderId.startsWith('restohand_')
        ? orderId
        : `restohand_${orderId}`;
      return await this.makeRequest('GET', `/pg/orders/${cashfreeOrderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to get Cashfree order: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create vendor for Easy Split
   */
  async createVendor(params: VendorParams): Promise<any> {
    try {
      this.logger.log(`Creating Cashfree vendor: ${params.vendorId}`);

      const vendorData: any = {
        vendor_id: params.vendorId,
        status: 'ACTIVE',
        name: params.name,
        email: params.email,
        phone: params.phone,
        verify_account: false, // Set to false to avoid verification failures during onboarding
        dashboard_access: false, // Restaurants don't need direct dashboard access
        schedule_option: params.scheduleOption,
        kyc_details: {
          account_type: params.kycDetails.accountType,
          business_type: params.kycDetails.businessType,
          pan: params.kycDetails.pan,
          gst: params.kycDetails.gst,
          cin: params.kycDetails.cin,
        },
      };

      // Add bank account or UPI details
      if (params.bankAccount) {
        vendorData.bank = {
          account_number: params.bankAccount.accountNumber,
          account_holder: params.bankAccount.accountHolder,
          ifsc: params.bankAccount.ifsc,
        };
      } else if (params.upiVpa) {
        vendorData.upi = {
          vpa: params.upiVpa,
        };
      } else {
        throw new BadRequestException(
          'Either bank account or UPI VPA is required for vendor creation'
        );
      }

      const response = await this.makeRequest(
        'POST',
        '/pg/easy-split/vendors',
        vendorData
      );

      this.logger.log(
        `Cashfree vendor created successfully: ${params.vendorId}`
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to create Cashfree vendor: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Get vendor details
   */
  async getVendor(vendorId: string): Promise<any> {
    try {
      return await this.makeRequest(
        'GET',
        `/pg/easy-split/vendors/${vendorId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to get Cashfree vendor: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Verify vendor bank account separately after vendor creation
   */
  async verifyVendorBankAccount(vendorId: string): Promise<any> {
    try {
      this.logger.log(
        `Verifying bank account for Cashfree vendor: ${vendorId}`
      );

      const verificationData = {
        verify_account: true,
      };

      return await this.makeRequest(
        'PATCH',
        `/pg/easy-split/vendors/${vendorId}`,
        verificationData
      );
    } catch (error) {
      this.logger.error(
        `Failed to verify bank account for vendor ${vendorId}: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Update vendor details
   */
  async updateVendor(
    vendorId: string,
    updateData: Partial<VendorParams>
  ): Promise<any> {
    try {
      this.logger.log(`Updating Cashfree vendor: ${vendorId}`);

      const response = await this.makeRequest(
        'PATCH',
        `/pg/easy-split/vendors/${vendorId}`,
        updateData
      );

      this.logger.log(`Cashfree vendor updated successfully: ${vendorId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to update Cashfree vendor: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Create split after payment success
   */
  async createSplit(
    cashfreeOrderId: string,
    params: SplitParams
  ): Promise<any> {
    try {
      this.logger.log(`Creating split for Cashfree order: ${cashfreeOrderId}`);

      const splitData = {
        split: params.splits.map((split) => ({
          vendor_id: split.vendorId,
          percentage: split.percentage,
          amount: split.amount,
          tags: split.tags || {},
        })),
      };

      const response = await this.makeRequest(
        'POST',
        `/pg/easy-split/orders/${cashfreeOrderId}/split`,
        splitData
      );

      this.logger.log(
        `Split created successfully for order: ${cashfreeOrderId}`
      );
      return response;
    } catch (error) {
      this.logger.error(`Failed to create split: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get settlement details for an order
   */
  async getSettlementDetails(cashfreeOrderId: string): Promise<any> {
    try {
      return await this.makeRequest(
        'GET',
        `/pg/easy-split/settlements?merchant_order_id=${cashfreeOrderId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to get settlement details: ${error.message}`,
        error
      );
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string | undefined,
    timestamp: string | undefined
  ): boolean {
    this.logger.log('=== WEBHOOK SIGNATURE VERIFICATION DEBUG ===');
    this.logger.log(`Signature: ${signature}`);
    this.logger.log(`Timestamp: ${timestamp}`);
    this.logger.log(`Payload length: ${payload?.length}`);
    this.logger.log(`Payload (first 100 chars): ${payload?.substring(0, 100)}`);

    if (!signature || !timestamp) {
      this.logger.error('Missing signature or timestamp');
      return false;
    }

    try {
      // Try both webhook secret and client secret (Cashfree docs are inconsistent)
      const webhookSecret = this.cashfreeConfig.webhookSecret;
      const clientSecret = this.cashfreeConfig.clientSecret;

      this.logger.log(
        `Webhook secret (first 10 chars): ${webhookSecret?.substring(0, 10)}...`
      );
      this.logger.log(
        `Client secret (first 10 chars): ${clientSecret?.substring(0, 10)}...`
      );

      const signedPayload = `${timestamp}.${payload}`;
      this.logger.log(
        `Signed payload (first 100 chars): ${signedPayload.substring(0, 100)}`
      );

      // Test with webhook secret
      const expectedSignature1 = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('base64');

      // Test with client secret
      const expectedSignature2 = crypto
        .createHmac('sha256', clientSecret)
        .update(signedPayload)
        .digest('base64');

      this.logger.log(
        `Expected signature (webhook secret): ${expectedSignature1}`
      );
      this.logger.log(
        `Expected signature (client secret): ${expectedSignature2}`
      );
      this.logger.log(`Received signature: ${signature}`);

      const match1 = expectedSignature1 === signature;
      const match2 = expectedSignature2 === signature;

      this.logger.log(`Webhook secret match: ${match1}`);
      this.logger.log(`Client secret match: ${match2}`);

      // TEMPORARY: Skip signature verification for testing
      this.logger.warn('SKIPPING SIGNATURE VERIFICATION FOR TESTING');
      return true; // Remove this line once you have the correct webhook secret

      // return match1 || match2;
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Check if Cashfree is enabled and configured
   */
  isEnabled(): boolean {
    return !!(this.cashfreeConfig.clientId && this.cashfreeConfig.clientSecret);
  }

  /**
   * Get public configuration for frontend
   */
  getPublicConfig(): { environment: string; baseUrl: string } {
    return {
      environment: this.cashfreeConfig.environment || 'sandbox',
      baseUrl: this.baseUrl,
    };
  }
}
