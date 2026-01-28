import { baseApi } from './baseApi';
import type {
  PaginatedResponse,
  Order,
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

export interface UpdateOrderStatusPayload {
  restaurantId: string;
  orderId: string;
  status?: Order['status'];
  progress?: Order['progress'];
  statusNote?: string;
}

export interface CreateOrderPayload {
  restaurantId: string;
  sessionId?: string;
  tableId?: string;
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

export interface UpdateOrderPaymentPayload {
  restaurantId: string;
  orderId: string;
  paymentStatus?: Order['paymentStatus'];
  transactionId?: string;
  provider?: string;
}

export interface GenerateReceiptQrResponse {
  orderId: string;
  orderNumber: string;
  receiptUrl: string;
  qrCodeDataUrl: string;
  token: string;
  expiresAt: string;
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

    getOrder: builder.query<Order, { restaurantId: string; orderId: string }>({
      query: ({ restaurantId, orderId }) =>
        `/restaurants/${restaurantId}/orders/${orderId}`,
      providesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
      ],
    }),

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

    generateReceiptQr: builder.query<GenerateReceiptQrResponse, { restaurantId: string; orderId: string }>({
      query: ({ restaurantId, orderId }) => `/restaurants/${restaurantId}/orders/${orderId}/receipt-qr`,
      // No caching for QR generation
    }),
  }),
  overrideExisting: false,
});

export const {
  useListOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useUpdateOrderPaymentMutation,
  useGenerateReceiptQrQuery,
} = ordersApi;