import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  openSubscriptionCheckout,
  createSubscriptionCheckoutOptions,
  getRazorpayKey,
  validateRazorpayEnvironment,
  RazorpayResponse,
  RazorpayError,
} from '@/utils/razorpay';

export interface SubscriptionCheckoutData {
  subscriptionId: string;
  customerId: string;
  planId: string;
  customerDetails: {
    name: string;
    email: string;
    contact: string;
  };
  authenticationAmount: number;
  trialMode: boolean;
}

export interface UseSubscriptionCheckoutOptions {
  onSuccess?: (response: RazorpayResponse) => void;
  onError?: (error: RazorpayError) => void;
  onDismiss?: () => void;
}

export const useSubscriptionCheckout = (options?: UseSubscriptionCheckoutOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const openCheckout = useCallback(
    async (checkoutData: SubscriptionCheckoutData) => {
      // Validate environment
      if (!validateRazorpayEnvironment()) {
        toast({
          title: 'Environment Error',
          description: 'Payments are not available in this environment',
          variant: 'destructive',
        });
        return;
      }

      setIsProcessing(true);

      try {
        const handleSuccess = (response: RazorpayResponse) => {
          setIsProcessing(false);

          // Show success message
          toast({
            title: 'Payment Successful',
            description: 'Your subscription has been activated successfully!',
          });

          // Call success callback if provided
          options?.onSuccess?.(response);
        };

        const handleError = (error: RazorpayError) => {
          setIsProcessing(false);

          console.error('Razorpay Error:', error);

          toast({
            title: 'Payment Failed',
            description: error.description || 'Payment failed. Please try again.',
            variant: 'destructive',
          });

          // Call error callback if provided
          options?.onError?.(error);
        };

        const handleDismiss = () => {
          setIsProcessing(false);

          toast({
            title: 'Payment Cancelled',
            description: 'Payment was cancelled by user.',
            variant: 'destructive',
          });

          // Call dismiss callback if provided
          options?.onDismiss?.();
        };

        // Create checkout options
        const checkoutOptions = createSubscriptionCheckoutOptions(
          getRazorpayKey(),
          checkoutData.subscriptionId,
          checkoutData.customerDetails,
          handleSuccess,
          handleDismiss,
          handleError
        );

        // Open Razorpay checkout
        await openSubscriptionCheckout(checkoutOptions);
      } catch (error) {
        setIsProcessing(false);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        toast({
          title: 'Checkout Error',
          description: errorMessage,
          variant: 'destructive',
        });

        // Call error callback if provided
        options?.onError?.({
          code: 'CHECKOUT_ERROR',
          description: errorMessage,
          source: 'checkout',
          step: 'initialization',
          reason: 'script_load_failed',
          metadata: error,
        });
      }
    },
    [toast, options]
  );

  return {
    openCheckout,
    isProcessing,
  };
};