import { baseApi } from "./baseApi";
import type { Order, PaginatedResponse, CalculateCartTotalPayload, CalculateCartTotalResponse } from "./types";

export interface ListOrdersParams {
  restaurantId: string;
  status?: Order["status"];
  paymentStatus?: Order["paymentStatus"];
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  branchId?: string;
}

export interface UpdateOrderStatusPayload {
  restaurantId: string;
  orderId: string;
  status?: Order["status"];
  progress?: Order["progress"];
  statusNote?: string;
}

export interface OrderHistoryParams {
  restaurantId: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  search?: string;
  tableNumber?: string;
}

export interface OrderHistoryItem {
  id: string;
  orderNumber: string;
  tableNumber: string;
  customerName: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  paidAt: string;
  itemCount: number;
  sessionInfo?: {
    sessionId: string;
    isArchived: boolean;
    sessionStarted: string;
    sessionCompleted: string | null;
    totalSessionAmount: number;
    orderCount: number;
  };
}

export interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface GetOrCreateSessionPayload {
  restaurantId: string;
  tableId?: string;
  tableNumber?: string;
  customerNumber?: number;
}

export interface GetOrCreateSessionResponse {
  sessionId: string;
  isNewSession: boolean;
  tableId: string;
  tableNumber: string;
  customerNumber?: number;
}

export interface CreateOrderPayload {
  restaurantId: string;
  customerSessionId?: string;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: "upi" | "cash";
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    pricing: {
      unitAmount: number;
      currency: string;
      taxAmount?: number;
      discountAmount?: number;
    };
    activePriceTagId?: string;
    selectedModifiers?: Array<{
      modifierId: string;
      modifierName: string;
      selectedOptions: Array<{
        optionId: string;
        optionName: string;
        priceAdjustment: number;
        quantity?: number;
      }>;
    }>;
    notes?: string;
  }[];
}

export interface UpdateOrderPaymentPayload {
  restaurantId: string;
  orderId: string;
  paymentStatus?: Order["paymentStatus"];
  transactionId?: string;
  provider?: string;
}

export interface GenerateReceiptQrResponse {
  orderId?: string;
  orderNumber?: string;
  orderIds?: string[];
  orderNumbers?: string[];
  tableNumber?: string;
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
                type: "Order" as const,
                id: order.id,
              })),
              { type: "Order" as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: "Order" as const, id: `LIST-${restaurantId}` }],
    }),

    getOrder: builder.query<Order, { restaurantId: string; orderId: string }>({
      query: ({ restaurantId, orderId }) =>
        `/restaurants/${restaurantId}/orders/${orderId}`,
      providesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: orderId },
      ],
    }),

    createOrder: builder.mutation<Order, CreateOrderPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: "Order", id: `LIST-${restaurantId}` },
        "RestaurantTable",
        // Invalidate session-related caches since new orders affect session data
        "CustomerSession",
        "Bill",
      ],
    }),

    updateOrderStatus: builder.mutation<Order, UpdateOrderStatusPayload>({
      query: ({ restaurantId, orderId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: "Order", id: orderId },
        { type: "Order", id: `LIST-${restaurantId}` },
        // Invalidate session-related caches since order status affects session data
        { type: "CustomerSession", id: "LIST" },
        { type: "Bill", id: "LIST" },
        "CustomerSession",
        "Bill",
      ],
    }),

    updateOrderPayment: builder.mutation<Order, UpdateOrderPaymentPayload>({
      query: ({ restaurantId, orderId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/payment`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: "Order", id: orderId },
        { type: "Order", id: `LIST-${restaurantId}` },
        "RestaurantTable",
        // Invalidate session-related caches since payment status affects session data
        "CustomerSession",
        "Bill",
      ],
    }),

    generateReceiptQr: builder.query<
      GenerateReceiptQrResponse,
      { restaurantId: string; orderId: string }
    >({
      query: ({ restaurantId, orderId }) =>
        `/restaurants/${restaurantId}/orders/${orderId}/receipt-qr`,
      // No caching for QR generation
    }),

    generateCombinedReceiptQr: builder.mutation<
      GenerateReceiptQrResponse,
      { restaurantId: string; orderIds: string[]; tableNumber?: string }
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/combined-receipt-qr`,
        method: "POST",
        body,
      }),
      // No caching for QR generation
    }),

    generateSessionReceiptQr: builder.mutation<
      GenerateReceiptQrResponse,
      { restaurantId: string; customerSessionId: string; tableNumber?: string }
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/session-receipt-qr`,
        method: "POST",
        body,
      }),
      // No caching for QR generation
    }),

    // Cart calculation endpoint (matching customer frontend exactly)
    calculateCartTotal: builder.mutation<
      CalculateCartTotalResponse,
      CalculateCartTotalPayload
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/calculate-cart-total`,
        method: "POST",
        body,
      }),
      // No cache invalidation needed for calculation
    }),

    // Order history endpoint with session information
    getOrderHistory: builder.query<OrderHistoryResponse, OrderHistoryParams>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/orders/history`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) => [
        { type: "Order" as const, id: `HISTORY-${restaurantId}` },
      ],
    }),

    // Get or create session for table (for staff app)
    getOrCreateSession: builder.mutation<
      GetOrCreateSessionResponse,
      GetOrCreateSessionPayload
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/get-or-create-session`,
        method: "POST",
        body,
      }),
      // No cache invalidation needed for session creation
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
  useGenerateCombinedReceiptQrMutation,
  useGenerateSessionReceiptQrMutation,
  useCalculateCartTotalMutation,
  useGetOrderHistoryQuery,
  useGetOrCreateSessionMutation,
} = ordersApi;
