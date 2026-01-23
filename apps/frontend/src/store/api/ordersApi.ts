import { baseApi } from './baseApi';
import type {
  PaginatedResponse,
  Order,
  OrderModification,
  CreateOrderModificationRequest,
  ProcessOrderModificationRequest,
  ModificationStatus,
  ModificationType
} from './types';

export interface ListOrdersParams {
  restaurantId: string;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateOrderPayload {
  restaurantId: string;
  sessionId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: 'upi' | 'cash';
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    pricing: {
      unitAmount: number;
      currency: string;
      taxAmount?: number;
      discountAmount?: number;
    };
    notes?: string;
  }>;
}

export interface UpdateOrderStatusPayload {
  restaurantId: string;
  orderId: string;
  status?: Order['status'];
  progress?: Order['progress'];
  statusNote?: string;
}

export interface UpdateOrderPaymentPayload {
  restaurantId: string;
  orderId: string;
  paymentStatus?: Order['paymentStatus'];
  transactionId?: string;
  provider?: string;
}

export interface CreatePaymentIntentPayload {
  restaurantId: string;
  orderId: string;
}

export interface CreatePaymentIntentResponse {
  razorpayKey: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  restaurant?: {
    id: string;
  };
  settlementType?: string;
}

export interface CreateUpiIntentPayload {
  restaurantId: string;
  orderId: string;
}

export interface CreateUpiIntentResponse {
  upiIntent: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  settlementType: string;
}

export interface CreatePaymentLinkPayload {
  restaurantId: string;
  orderId: string;
}

export interface CreatePaymentLinkResponse {
  paymentLinkUrl: string;
  paymentLinkId: string;
  amount: number;
  currency: string;
}

// New customer cart interfaces
export interface CreateOrderWithPaymentPayload {
  restaurantId: string;
  tableNumber?: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: {
      addons?: Array<{ id: string; name: string; price: number }>;
      variants?: Array<{ id: string; name: string; price: number }>;
      notes?: string;
    };
  }>;
  notes?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  totalAmount: number; // in paise for verification
}

export interface CreateOrderWithPaymentResponse {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  razorpayKey: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentPayload {
  restaurantId: string;
  orderId: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  order: Order;
}

export interface CalculateCartTotalPayload {
  restaurantId: string;
  tableNumber?: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    pricing: {
      unitAmount: number;
      currency: string;
    };
  }>;
  notes?: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface CalculateCartTotalResponse {
  subtotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  itemDetails: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
  }>;
}

export interface AddItemsToOrderPayload {
  restaurantId: string;
  orderId: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    pricing: {
      unitAmount: number;
      currency: string;
    };
  }>;
  notes?: string;
}

export interface BillResponse {
  orderId: string;
  orderNumber: string;
  restaurant: {
    name: string;
    address?: any;
    gstin?: string;
    phone?: string;
    email?: string;
  };
  customer: {
    name?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    state?: string;
  };
  tableNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paymentStatus: string;
  billGeneratedAt: string;
  notes?: string;
}

// Order Modification Interfaces
export interface ListOrderModificationsParams {
  restaurantId: string;
  status?: ModificationStatus;
  type?: ModificationType;
  orderId?: string;
  orderNumber?: string;
}

export interface CreateOrderModificationParams {
  restaurantId: string;
  body: CreateOrderModificationRequest;
}

export interface ProcessOrderModificationParams {
  restaurantId: string;
  modificationId: string;
  body: ProcessOrderModificationRequest;
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listOrders: builder.query<PaginatedResponse<Order>, ListOrdersParams>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/orders`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.data.map((order) => ({
                type: 'Order' as const,
                id: order.id,
              })),
              { type: 'Order' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'Order' as const, id: `LIST-${restaurantId}` }],
    }),

    listOrdersByBranch: builder.query<
      PaginatedResponse<Order>,
      ListOrdersParams & { branchId: string }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/orders/branch/${branchId}`,
        params,
      }),
      providesTags: (result, _error, { restaurantId, branchId }) =>
        result
          ? [
              ...result.data.map((order) => ({
                type: 'Order' as const,
                id: order.id,
              })),
              { type: 'Order' as const, id: `LIST-${restaurantId}-${branchId}` },
            ]
          : [{ type: 'Order' as const, id: `LIST-${restaurantId}-${branchId}` }],
    }),

    getOrder: builder.query<Order, { restaurantId: string; orderId: string }>(
      {
        query: ({ restaurantId, orderId }) =>
          `/restaurants/${restaurantId}/orders/${orderId}`,
        providesTags: (_result, _error, { orderId }) => [
          { type: 'Order', id: orderId },
        ],
      }
    ),

    createOrder: builder.mutation<Order, CreateOrderPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    updateOrderStatus: builder.mutation<Order, UpdateOrderStatusPayload>({
      query: ({ restaurantId, orderId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    updateOrderPayment: builder.mutation<Order, UpdateOrderPaymentPayload>({
      query: ({ restaurantId, orderId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/payment`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    createPaymentIntent: builder.mutation<
      CreatePaymentIntentResponse,
      CreatePaymentIntentPayload
    >({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/payment-intent`,
        method: 'POST',
      }),
    }),

    createUpiIntent: builder.mutation<
      CreateUpiIntentResponse,
      CreateUpiIntentPayload
    >({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/upi-intent`,
        method: 'POST',
      }),
    }),

    createPaymentLink: builder.mutation<
      CreatePaymentLinkResponse,
      CreatePaymentLinkPayload
    >({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/payment-link`,
        method: 'POST',
      }),
    }),

    // New customer cart endpoints
    calculateCartTotal: builder.mutation<
      CalculateCartTotalResponse,
      CalculateCartTotalPayload
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/calculate-cart-total`,
        method: 'POST',
        body,
      }),
      // No cache invalidation needed for calculation
    }),

    createOrderWithPayment: builder.mutation<
      CreateOrderWithPaymentResponse,
      CreateOrderWithPaymentPayload
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/create-with-payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    verifyPayment: builder.mutation<VerifyPaymentResponse, VerifyPaymentPayload>({
      query: ({ restaurantId, orderId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/verify-payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    // New order-first flow endpoints
    addItemsToOrder: builder.mutation<Order, AddItemsToOrderPayload>({
      query: ({ restaurantId, orderId, items, notes }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/add-items`,
        method: 'POST',
        body: { items, notes },
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: `LIST-${restaurantId}` },
      ],
    }),

    generateBill: builder.query<BillResponse, { restaurantId: string; orderId: string }>({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/bill`,
      }),
      providesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: `BILL-${orderId}` },
      ],
    }),

    // Order Modification Endpoints
    createOrderModification: builder.mutation<OrderModification, CreateOrderModificationParams>({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/orders/modifications`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { body }) => [
        { type: 'OrderModification', id: body.orderId },
        { type: 'OrderModification', id: 'LIST' },
        { type: 'Order', id: body.orderId },
      ],
    }),

    listOrderModifications: builder.query<OrderModification[], ListOrderModificationsParams>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/orders/modifications`,
        params: Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null)),
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'OrderModification' as const, id })),
              { type: 'OrderModification', id: 'LIST' },
            ]
          : [{ type: 'OrderModification', id: 'LIST' }],
    }),

    getOrderModifications: builder.query<OrderModification[], { restaurantId: string; orderId: string }>({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/modifications/order/${orderId}`,
      }),
      providesTags: (_result, _error, { orderId }) => [
        { type: 'OrderModification', id: orderId },
      ],
    }),

    checkPendingModifications: builder.query<{ hasPending: boolean }, { restaurantId: string; orderId: string }>({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/modifications/order/${orderId}/pending`,
      }),
      providesTags: (_result, _error, { orderId }) => [
        { type: 'OrderModification', id: `PENDING-${orderId}` },
      ],
    }),

    processOrderModification: builder.mutation<OrderModification, ProcessOrderModificationParams>({
      query: ({ restaurantId, modificationId, body }) => ({
        url: `/restaurants/${restaurantId}/orders/modifications/${modificationId}/process`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, modificationId }) => [
        { type: 'OrderModification', id: modificationId },
        { type: 'OrderModification', id: 'LIST' },
        // Also invalidate the related order
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListOrdersQuery,
  useListOrdersByBranchQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderPaymentMutation,
  useCreatePaymentIntentMutation,
  useCreateUpiIntentMutation,
  useCreatePaymentLinkMutation,
  useCalculateCartTotalMutation,
  useCreateOrderWithPaymentMutation,
  useVerifyPaymentMutation,
  useAddItemsToOrderMutation,
  useGenerateBillQuery,
  // Order Modification Hooks
  useCreateOrderModificationMutation,
  useListOrderModificationsQuery,
  useGetOrderModificationsQuery,
  useCheckPendingModificationsQuery,
  useProcessOrderModificationMutation,
} = ordersApi;
