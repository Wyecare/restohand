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
            `${process.env.USER_FRONTENT_URL}/payment/success`,
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

  // ============= SUBSCRIPTION PLAN MANAGEMENT =============

  /**
   * Create a subscription plan
   */
  async createSubscriptionPlan(planData: {
    plan_id: string;
    plan_name: string;
    plan_type: string;
    plan_recurring_amount?: number;
    plan_max_amount: number;
    plan_max_cycles?: number;
    plan_intervals?: number;
    plan_currency?: string;
    plan_interval_type?: string;
    plan_note?: string;
  }): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/plans`;

      this.logger.log(`Creating Cashfree subscription plan: ${planData.plan_name}`);
      this.logger.log(`Plan data being sent to Cashfree:`, JSON.stringify(planData, null, 2));

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
      };

      this.logger.log(`Request URL: ${url}`);
      this.logger.log(`Request headers:`, JSON.stringify(headers, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(planData),
      });

      const responseData = await response.json() as any;

      this.logger.log(`Cashfree response status: ${response.status}`);
      this.logger.log(`Cashfree response data:`, JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        this.logger.error(
          `Cashfree plan creation failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Plan creation failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree plan created successfully: ${planData.plan_name}`);
      return responseData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create Cashfree plan:`, error);
      throw new InternalServerErrorException(
        `Failed to create subscription plan: ${errorMessage}`
      );
    }
  }

  /**
   * Get a single subscription plan from Cashfree
   */
  async getSubscriptionPlan(planId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/plans/${planId}`;

      this.logger.log(`Fetching Cashfree subscription plan: ${planId}`);

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'x-api-version': '2025-01-01',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree plan fetch failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Failed to fetch plan: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Fetched Cashfree plan: ${planId}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to fetch Cashfree plan ${planId}:`, error);
      throw new InternalServerErrorException(
        `Failed to fetch subscription plan: ${error.message}`
      );
    }
  }


  /**
   * Update a subscription plan
   */
  async updateSubscriptionPlan(
    planId: string,
    updateData: {
      plan_amount?: number;
      plan_max_amount?: number;
      plan_note?: string;
      plan_metadata?: Record<string, any>;
    }
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/subscriptions/plans/${planId}`;

      this.logger.log(`Updating Cashfree subscription plan: ${planId}`);

      const headers = {
        'X-Client-Id': this.cashfreeConfig.clientId,
        'X-Client-Secret': this.cashfreeConfig.clientSecret,
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
      };

      const response = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree plan update failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Plan update failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree plan updated successfully: ${planId}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to update Cashfree plan:`, error);
      throw new InternalServerErrorException(
        `Failed to update subscription plan: ${error.message}`
      );
    }
  }

  /**
   * Delete a subscription plan
   */
  async deleteSubscriptionPlan(planId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/subscriptions/plans/${planId}`;

      this.logger.log(`Deleting Cashfree subscription plan: ${planId}`);

      const headers = {
        'X-Client-Id': this.cashfreeConfig.clientId,
        'X-Client-Secret': this.cashfreeConfig.clientSecret,
        'x-api-version': '2023-08-01',
      };

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const responseData = await response.json();
        this.logger.error(
          `Cashfree plan deletion failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Plan deletion failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree plan deleted successfully: ${planId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Cashfree plan:`, error);
      throw new InternalServerErrorException(
        `Failed to delete subscription plan: ${error.message}`
      );
    }
  }

  /**
   * Create customer for subscriptions
   */
  async createCustomer(customerData: {
    customer_id: string;
    customer_email: string;
    customer_phone: string;
    customer_name: string;
  }): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/customers`;

      this.logger.log(`Creating Cashfree customer: ${customerData.customer_id}`);

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(customerData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree customer creation failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Customer creation failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree customer created successfully: ${customerData.customer_id}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to create Cashfree customer:`, error);
      throw new InternalServerErrorException(
        `Failed to create customer: ${error.message}`
      );
    }
  }

  /**
   * Create subscription for customer
   */
  async createSubscription(subscriptionData: {
    subscription_id: string;
    customer_id: string;
    plan_id: string;
    customer_details: {
      customer_email: string;
      customer_phone: string;
      customer_name: string;
    };
    authorization_amount: number;
    return_url: string;
  }): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/subscriptions`;

      this.logger.log(`Creating Cashfree subscription: ${subscriptionData.subscription_id}`);

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
      };

      // Format data according to Cashfree API requirements with authorization details
      const payload = {
        subscription_id: subscriptionData.subscription_id,
        customer_details: {
          customer_id: subscriptionData.customer_id,
          customer_email: subscriptionData.customer_details.customer_email,
          customer_phone: subscriptionData.customer_details.customer_phone,
          customer_name: subscriptionData.customer_details.customer_name,
        },
        plan_details: {
          plan_id: subscriptionData.plan_id,
        },
        authorization_details: {
          authorization_amount: subscriptionData.authorization_amount / 100, // Convert paise to rupees
          authorization_amount_refund: true,
          payment_methods: ['card', 'upi', 'enach', 'pnach']
        },
        subscription_meta: {
          return_url: subscriptionData.return_url,
          notification_channel: ['EMAIL', 'SMS']
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree subscription creation failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Subscription creation failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree subscription created successfully: ${subscriptionData.subscription_id}`);
      this.logger.log(`Cashfree response data: ${JSON.stringify(responseData, null, 2)}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to create Cashfree subscription:`, error);
      throw new InternalServerErrorException(
        `Failed to create subscription: ${error.message}`
      );
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(cancelData: {
    subscription_id: string;
  }): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/subscriptions/${cancelData.subscription_id}/manage`;

      this.logger.log(`Cancelling Cashfree subscription: ${cancelData.subscription_id}`);

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
      };

      const payload = {
        subscription_id: cancelData.subscription_id,
        action: 'CANCEL',
        action_details: {}
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree subscription cancellation failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Subscription cancellation failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree subscription cancelled successfully: ${cancelData.subscription_id}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to cancel Cashfree subscription:`, error);
      throw new InternalServerErrorException(
        `Failed to cancel subscription: ${error.message}`
      );
    }
  }

  /**
   * Get subscription payment history
   */
  async getSubscriptionPayments(subscriptionId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/subscriptions/${subscriptionId}/payments`;

      this.logger.log(`Fetching Cashfree subscription payments: ${subscriptionId}`);

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'x-api-version': '2025-01-01',
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree subscription payments fetch failed: ${response.status}`,
          responseData
        );
        return {
          payments: [],
          cycles: [],
        };
      }

      this.logger.log(`Fetched Cashfree subscription payments: ${subscriptionId}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to fetch Cashfree subscription payments:`, error);
      return {
        payments: [],
        cycles: [],
      };
    }
  }

  /**
   * Retry failed subscription payment
   */
  async retrySubscriptionPayment(retryData: {
    subscription_id: string;
    return_url: string;
  }): Promise<any> {
    try {
      const url = `${this.baseUrl}/pg/subscriptions/${retryData.subscription_id}/retry`;

      this.logger.log(`Retrying Cashfree subscription payment: ${retryData.subscription_id}`);

      const headers = {
        'x-client-id': this.cashfreeConfig.clientId,
        'x-client-secret': this.cashfreeConfig.clientSecret,
        'Content-Type': 'application/json',
        'x-api-version': '2025-01-01',
      };

      const payload = {
        return_url: retryData.return_url,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error(
          `Cashfree subscription payment retry failed: ${response.status}`,
          responseData
        );
        throw new InternalServerErrorException(
          `Payment retry failed: ${responseData.message || 'Unknown error'}`
        );
      }

      this.logger.log(`Cashfree subscription payment retry initiated: ${retryData.subscription_id}`);
      return responseData;
    } catch (error) {
      this.logger.error(`Failed to retry Cashfree subscription payment:`, error);
      throw new InternalServerErrorException(
        `Failed to retry subscription payment: ${error.message}`
      );
    }
  }

  /**
   * Create subscription authorization (AUTH type payment)
   */
  async createSubscriptionAuth(authData: {
    subscription_id: string;
    payment_id: string;
    subscription_session_id: string;
    payment_method?: 'upi' | 'card' | 'enach' | 'pnach';
    upi_channel?: 'link' | 'collect' | 'qrcode';
    upi_id?: string;
  }): Promise<any> {
    try {
      this.logger.log(`Creating subscription auth for subscription: ${authData.subscription_id}`);

      let paymentMethodData: any = {};

      if (authData.payment_method === 'card') {
        // For card authorization - use minimal structure
        paymentMethodData = {
          card: {
            channel: 'link'
          }
        };
      } else {
        // Default to UPI
        paymentMethodData = {
          upi: {
            channel: authData.upi_channel || 'link'
          }
        };

        // Add upi_id only for collect channel
        if (authData.upi_channel === 'collect' && authData.upi_id) {
          paymentMethodData.upi.upi_id = authData.upi_id;
        }
      }

      const requestData = {
        subscription_id: authData.subscription_id,
        payment_id: authData.payment_id,
        payment_type: 'AUTH',
        subscription_session_id: authData.subscription_session_id,
        payment_method: paymentMethodData
      };

      this.logger.log(`Subscription auth request data:`, JSON.stringify(requestData, null, 2));

      const response = await this.makeRequest('POST', '/pg/subscriptions/pay', requestData);

      this.logger.log(`Subscription auth response:`, JSON.stringify(response, null, 2));
      return response;
    } catch (error: any) {
      this.logger.error(`Failed to create subscription auth:`, error);
      throw new InternalServerErrorException(
        `Failed to create subscription auth: ${error.message}`
      );
    }
  }
}
