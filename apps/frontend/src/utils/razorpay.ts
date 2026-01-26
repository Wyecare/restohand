// Razorpay Checkout utility for subscription payments
// This replaces the hosted link approach with direct checkout integration

export interface CheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
  handler: (response: RazorpayResponse) => void;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface RazorpayError {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: any;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Load Razorpay checkout script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay checkout for subscription authentication
 */
export const openSubscriptionCheckout = async (
  options: CheckoutOptions
): Promise<void> => {
  const isLoaded = await loadRazorpayScript();

  if (!isLoaded) {
    throw new Error('Failed to load Razorpay checkout script');
  }

  if (!window.Razorpay) {
    throw new Error('Razorpay is not available');
  }

  const razorpay = new window.Razorpay(options);
  razorpay.open();
};

/**
 * Create checkout options for subscription
 */
export const createSubscriptionCheckoutOptions = (
  keyId: string,
  subscriptionId: string,
  customerDetails: {
    name: string;
    email: string;
    contact: string;
  },
  onSuccess: (response: RazorpayResponse) => void,
  onDismiss: () => void,
  onError?: (error: RazorpayError) => void
): CheckoutOptions => {
  return {
    key: keyId,
    subscription_id: subscriptionId,
    name: 'RestoHand',
    description: 'Subscription Authentication Payment',
    image: '/logo.png', // Add your logo URL here
    prefill: {
      name: customerDetails.name,
      email: customerDetails.email,
      contact: customerDetails.contact.startsWith('+91')
        ? customerDetails.contact
        : `+91${customerDetails.contact}`,
    },
    theme: {
      color: '#3b82f6', // Tailwind blue-500
    },
    modal: {
      ondismiss: onDismiss,
    },
    handler: onSuccess,
  };
};

/**
 * Validate Razorpay environment
 */
export const validateRazorpayEnvironment = (): boolean => {
  const isProduction = window.location.hostname.includes('restohand.com');
  const isStaging = window.location.hostname.includes('dev.admin.restohand.com');
  const isLocal = window.location.hostname === 'localhost';

  return isProduction || isStaging || isLocal;
};

/**
 * Format amount for display (Razorpay amounts are in paise)
 */
export const formatAmount = (amountInPaise: number): string => {
  return `₹${(amountInPaise / 100).toLocaleString('en-IN')}`;
};

/**
 * Get Razorpay key based on environment
 */
export const getRazorpayKey = (): string => {
  // In a real app, you might have different keys for different environments
  // For now, using the live key since your plans are created with live key
  return 'rzp_live_RbHutYgpJaFNZ8';
};