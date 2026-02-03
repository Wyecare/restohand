import { baseApi } from './baseApi';

// Cashfree Payment Intent Types
export interface CashfreePaymentIntentPayload {
  restaurantId?: string; // For admin endpoints
  customerDetails?: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

export interface CashfreePublicPaymentIntentPayload {
  customerDetails?: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

export interface CashfreeSessionPaymentIntentPayload {
  customerSessionId?: string;
  customerDetails?: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  };
}

export interface CashfreePaymentIntentResponse {
  paymentSessionId: string;
  cashfreeOrderId: string;
  orderId: string;
  amount: number;
  currency: string;
  restaurantInfo: {
    name: string;
    vendorId?: string;
    canReceiveSettlements: boolean;
  };
  settlementType: 'split_payment' | 'manual_settlement';
  checkoutUrl?: string;
}

export interface CashfreeSessionPaymentIntentResponse extends CashfreePaymentIntentResponse {
  orderIds: string[];
  orderCount: number;
  totalAmount: number;
}

export interface CashfreeVerifyPaymentPayload {
  restaurantId?: string; // For admin endpoints
  cashfreePaymentId?: string;
  paymentSessionId?: string;
}

export interface CashfreeVerifyPaymentResponse {
  orderId: string;
  paymentStatus: string;
  cashfreeOrderId: string;
  settlementStatus: string;
  verified: boolean;
  message: string;
  settlementType?: string;
}

export interface CashfreePaymentStatusResponse {
  orderId: string;
  cashfreeOrderId: string;
  paymentSessionId: string;
  orderStatus: string;
  paymentStatus: string;
  amount: number;
  splitStatus: string;
  settlementType: string;
}

export interface CashfreeVendorBankVerificationResponse {
  success: boolean;
  vendorId: string;
  verificationStatus?: string;
  error?: string;
}

export const cashfreeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Admin/Restaurant Manager Endpoints
    createCashfreePaymentIntent: builder.mutation<
      CashfreePaymentIntentResponse,
      { restaurantId: string; orderId: string; customerDetails?: CashfreePaymentIntentPayload['customerDetails'] }
    >({
      query: ({ restaurantId, orderId, customerDetails }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/payment-intent`,
        method: 'POST',
        body: { customerDetails },
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    verifyCashfreePayment: builder.mutation<
      CashfreeVerifyPaymentResponse,
      { restaurantId: string; orderId: string; verificationData?: CashfreeVerifyPaymentPayload }
    >({
      query: ({ restaurantId, orderId, verificationData }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/verify-payment`,
        method: 'POST',
        body: verificationData || {},
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    getCashfreePaymentStatus: builder.query<
      CashfreePaymentStatusResponse,
      { restaurantId: string; orderId: string }
    >({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/payment-status`,
      }),
      providesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
      ],
    }),

    // Public/Customer Endpoints
    createCashfreePublicPaymentIntent: builder.mutation<
      CashfreePaymentIntentResponse,
      { slug: string; orderId: string; customerDetails?: CashfreePublicPaymentIntentPayload['customerDetails'] }
    >({
      query: ({ slug, orderId, customerDetails }) => ({
        url: `/public/restaurants/${slug}/orders/${orderId}/payment-intent`,
        method: 'POST',
        body: { customerDetails },
      }),
    }),

    createCashfreeSessionPaymentIntent: builder.mutation<
      CashfreeSessionPaymentIntentResponse,
      { slug: string; tableId: string; sessionData?: CashfreeSessionPaymentIntentPayload }
    >({
      query: ({ slug, tableId, sessionData }) => ({
        url: `/public/restaurants/${slug}/table/${tableId}/session/payment-intent`,
        method: 'POST',
        body: sessionData || {},
      }),
    }),

    verifyCashfreePublicPayment: builder.mutation<
      CashfreeVerifyPaymentResponse,
      { slug: string; orderId: string; verificationData?: CashfreeVerifyPaymentPayload }
    >({
      query: ({ slug, orderId, verificationData }) => ({
        url: `/public/restaurants/${slug}/orders/${orderId}/verify-payment`,
        method: 'POST',
        body: verificationData || {},
      }),
    }),

    getCashfreePublicPaymentStatus: builder.query<
      CashfreePaymentStatusResponse,
      { slug: string; orderId: string }
    >({
      query: ({ slug, orderId }) => ({
        url: `/public/restaurants/${slug}/orders/${orderId}/payment-status`,
      }),
    }),

    // Vendor Bank Account Verification
    verifyCashfreeVendorBankAccount: builder.mutation<
      CashfreeVendorBankVerificationResponse,
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/cashfree/vendor/verify-bank`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Restaurant', id: restaurantId },
      ],
    }),
  }),
});

// Export hooks for components to use
export const {
  // Admin/Restaurant Manager hooks
  useCreateCashfreePaymentIntentMutation,
  useVerifyCashfreePaymentMutation,
  useGetCashfreePaymentStatusQuery,
  useLazyGetCashfreePaymentStatusQuery,

  // Public/Customer hooks
  useCreateCashfreePublicPaymentIntentMutation,
  useCreateCashfreeSessionPaymentIntentMutation,
  useVerifyCashfreePublicPaymentMutation,
  useGetCashfreePublicPaymentStatusQuery,
  useLazyGetCashfreePublicPaymentStatusQuery,

  // Vendor Management hooks
  useVerifyCashfreeVendorBankAccountMutation,
} = cashfreeApi;