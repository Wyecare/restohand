// Cashfree Frontend Integration Utilities

declare global {
  interface Window {
    Cashfree: any;
  }
}

export interface CashfreeConfig {
  mode: 'sandbox' | 'production';
}

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_self' | '_blank' | '_top' | '_modal' | HTMLElement;
  onSuccess?: (data: CashfreePaymentResult) => void;
  onFailure?: (data: CashfreePaymentFailure) => void;
  onCancel?: () => void;
}

export interface CashfreePaymentResult {
  orderStatus: string;
  paymentSessionId: string;
  referenceId: string;
  paymentDetails?: {
    paymentMessage?: string;
    paymentTime?: string;
    paymentMode?: string;
    cfPaymentId?: number;
  };
}

export interface CashfreePaymentFailure {
  orderStatus: string;
  paymentSessionId: string;
  errorText?: string;
  errorMessage?: string;
}

export class CashfreeService {
  private cashfree: any = null;
  private isInitialized = false;

  constructor(private config: CashfreeConfig) {}

  /**
   * Initialize Cashfree SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Load Cashfree SDK if not already loaded
    await this.loadCashfreeSDK();

    // Initialize Cashfree instance
    if (window.Cashfree) {
      this.cashfree = window.Cashfree({
        mode: this.config.mode
      });
      this.isInitialized = true;
      console.log(`Cashfree SDK initialized in ${this.config.mode} mode`);
    } else {
      throw new Error('Failed to load Cashfree SDK');
    }
  }

  /**
   * Load Cashfree SDK script
   */
  private async loadCashfreeSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.Cashfree) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;

      script.onload = () => {
        console.log('Cashfree SDK loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('Failed to load Cashfree SDK');
        reject(new Error('Failed to load Cashfree SDK'));
      };

      // Add to document head
      document.head.appendChild(script);
    });
  }

  /**
   * Open Cashfree checkout (redirect mode)
   */
  async checkout(options: CashfreeCheckoutOptions): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const checkoutOptions = {
      paymentSessionId: options.paymentSessionId,
      redirectTarget: options.redirectTarget || '_self'
    };

    try {
      console.log('Opening Cashfree checkout with options:', checkoutOptions);
      await this.cashfree.checkout(checkoutOptions);
    } catch (error) {
      console.error('Cashfree checkout error:', error);
      throw new Error('Failed to open Cashfree checkout');
    }
  }

  /**
   * Open Cashfree checkout (modal mode)
   */
  async checkoutModal(options: CashfreeCheckoutOptions): Promise<CashfreePaymentResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const checkoutOptions = {
      paymentSessionId: options.paymentSessionId,
      redirectTarget: '_modal'
    };

    try {
      console.log('Opening Cashfree modal checkout with options:', checkoutOptions);

      const result = await this.cashfree.checkout(checkoutOptions);

      // Handle different result types
      if (result?.order?.status === 'PAID') {
        const successData: CashfreePaymentResult = {
          orderStatus: result.order.status,
          paymentSessionId: options.paymentSessionId,
          referenceId: result.order.order_id,
          paymentDetails: {
            paymentMessage: 'Payment successful',
            paymentTime: new Date().toISOString(),
            cfPaymentId: result.payment?.cf_payment_id
          }
        };

        if (options.onSuccess) {
          options.onSuccess(successData);
        }

        return successData;
      } else {
        const failureData: CashfreePaymentFailure = {
          orderStatus: result?.order?.status || 'FAILED',
          paymentSessionId: options.paymentSessionId,
          errorText: 'Payment failed or was cancelled',
          errorMessage: result?.payment?.payment_message || 'Unknown error'
        };

        if (options.onFailure) {
          options.onFailure(failureData);
        }

        throw new Error(failureData.errorText);
      }
    } catch (error) {
      console.error('Cashfree modal checkout error:', error);

      if (error.message?.includes('cancelled') || error.message?.includes('closed')) {
        if (options.onCancel) {
          options.onCancel();
        }
        throw new Error('Payment cancelled by user');
      }

      const failureData: CashfreePaymentFailure = {
        orderStatus: 'FAILED',
        paymentSessionId: options.paymentSessionId,
        errorText: error.message || 'Payment failed',
        errorMessage: 'Checkout process failed'
      };

      if (options.onFailure) {
        options.onFailure(failureData);
      }

      throw error;
    }
  }

  /**
   * Check if Cashfree SDK is loaded and initialized
   */
  isReady(): boolean {
    return this.isInitialized && !!this.cashfree;
  }

  /**
   * Get environment configuration
   */
  getEnvironment(): string {
    return this.config.mode;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cashfree = null;
    this.isInitialized = false;
  }
}

// Singleton instance
let cashfreeService: CashfreeService | null = null;

/**
 * Get or create Cashfree service instance
 */
export function getCashfreeService(config?: CashfreeConfig): CashfreeService {
  if (!cashfreeService) {
    const defaultConfig: CashfreeConfig = {
      mode: (import.meta.env.VITE_CASHFREE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    };

    cashfreeService = new CashfreeService(config || defaultConfig);
  }

  return cashfreeService;
}

/**
 * Initialize Cashfree service
 */
export async function initializeCashfree(config?: CashfreeConfig): Promise<CashfreeService> {
  const service = getCashfreeService(config);
  await service.initialize();
  return service;
}

/**
 * Open Cashfree checkout (convenience function)
 */
export async function openCashfreeCheckout(options: CashfreeCheckoutOptions): Promise<void> {
  const service = getCashfreeService();
  await service.checkout(options);
}

/**
 * Open Cashfree modal checkout (convenience function)
 */
export async function openCashfreeModal(options: CashfreeCheckoutOptions): Promise<CashfreePaymentResult> {
  const service = getCashfreeService();
  return service.checkoutModal(options);
}