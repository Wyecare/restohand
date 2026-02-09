import { baseApi } from './baseApi';
import type { PaginatedResponse } from './types';

// Session Types
export interface TableSession {
  id: string;
  tableNumber: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'ready' | 'completed' | 'paid';
  orders: SessionOrder[];
  totals: {
    orderCount: number;
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    subTotalAmount: number;
    taxAmount: number;
    discountAmount?: number;
  };
  customer: {
    customerSessionId?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  estimatedCompletion?: string;
  lastActivity: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  tableId?: string;
  branchId?: string;
}

export interface SessionOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  totalAmount: number;
  subTotalAmount: number;
  taxAmount: number;
  items: SessionOrderItem[];
  progress: number;
  estimatedTime?: number;
  notes?: string;
  customerSessionId?: string;
}

export interface SessionOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  selectedModifiers?: Array<{
    modifierName: string;
    selectedOptions: Array<{
      optionName: string;
      priceAdjustment: number;
    }>;
  }>;
  notes?: string;
  activePriceTagId?: string;
  menuItemId: string;
}

// Request/Response Types
export interface ListActiveSessionsParams {
  restaurantId: string;
  branchId: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListActiveSessionsResponse {
  sessions: TableSession[];
  total: number;
  stats: {
    activeCount: number;
    readyCount: number;
    completedCount: number;
    totalRevenue: number;
  };
}

export interface GetSessionDetailsParams {
  restaurantId: string;
  branchId: string;
  sessionId: string;
}

export interface UpdateSessionStatusParams {
  restaurantId: string;
  sessionId: string;
  status: TableSession['status'];
}

export interface UpdateOrderStatusParams {
  restaurantId: string;
  orderId: string;
  status: SessionOrder['status'];
  estimatedTime?: number;
  progress?: number;
}

export interface PrintReceiptParams {
  restaurantId: string;
  sessionId: string;
  type: 'customer' | 'kitchen' | 'summary';
  orderId?: string; // For individual order receipts
}

export interface MarkSessionCompleteParams {
  restaurantId: string;
  sessionId: string;
  notes?: string;
}

export interface SessionReceiptResponse {
  success: boolean;
  message: string;
  receiptData?: {
    receiptNumber: string;
    printData: any;
  };
}

// API Endpoints
export const sessionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List active sessions with filtering and search
    listActiveSessions: builder.query<ListActiveSessionsResponse, ListActiveSessionsParams>({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/sessions`,
        params: Object.fromEntries(
          Object.entries({ branchId, ...params }).filter(([_, v]) => v !== undefined && v !== null)
        ),
      }),
      providesTags: (result, error, { restaurantId }) =>
        result
          ? [
              ...result.sessions.map((session) => ({
                type: 'Session' as const,
                id: session.id
              })),
              { type: 'Session', id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'Session', id: `LIST-${restaurantId}` }],
    }),

    // Get detailed session information including all orders and items
    getSessionDetails: builder.query<TableSession, GetSessionDetailsParams>({
      query: ({ restaurantId, sessionId, branchId }) => ({
        url: `/restaurants/${restaurantId}/sessions/${sessionId}`,
        params: { branchId },
      }),
      providesTags: (result, error, { sessionId }) => [
        { type: 'Session', id: sessionId },
        { type: 'Order', id: 'SESSION_ORDERS' },
      ],
    }),

    // Update session status (active, ready, completed)
    updateSessionStatus: builder.mutation<TableSession, UpdateSessionStatusParams>({
      query: ({ restaurantId, sessionId, ...body }) => ({
        url: `/restaurants/${restaurantId}/sessions/${sessionId}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { sessionId, restaurantId }) => [
        { type: 'Session', id: sessionId },
        { type: 'Session', id: `LIST-${restaurantId}` },
      ],
    }),

    // Update individual order status within a session
    updateOrderStatus: builder.mutation<SessionOrder, UpdateOrderStatusParams>({
      query: ({ restaurantId, orderId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { restaurantId }) => [
        { type: 'Order', id: 'SESSION_ORDERS' },
        { type: 'Session', id: `LIST-${restaurantId}` },
      ],
    }),

    // Print session receipt (customer bill)
    printSessionReceipt: builder.mutation<SessionReceiptResponse, PrintReceiptParams>({
      query: ({ restaurantId, sessionId, ...body }) => ({
        url: `/restaurants/${restaurantId}/sessions/${sessionId}/print-receipt`,
        method: 'POST',
        body,
      }),
    }),

    // Print kitchen ticket for order preparation
    printKitchenTicket: builder.mutation<SessionReceiptResponse, PrintReceiptParams>({
      query: ({ restaurantId, sessionId, ...body }) => ({
        url: `/restaurants/${restaurantId}/sessions/${sessionId}/print-kitchen-ticket`,
        method: 'POST',
        body,
      }),
    }),

    // Mark session as complete and close table
    markSessionComplete: builder.mutation<TableSession, MarkSessionCompleteParams>({
      query: ({ restaurantId, sessionId, ...body }) => ({
        url: `/restaurants/${restaurantId}/sessions/${sessionId}/complete`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { sessionId, restaurantId }) => [
        { type: 'Session', id: sessionId },
        { type: 'Session', id: `LIST-${restaurantId}` },
      ],
    }),

    // Get session bill/receipt data for printing
    getSessionBill: builder.query<any, { restaurantId: string; sessionId: string }>({
      query: ({ restaurantId, sessionId }) =>
        `/restaurants/${restaurantId}/sessions/${sessionId}/bill`,
      providesTags: (result, error, { sessionId }) => [
        { type: 'Session', id: sessionId },
      ],
    }),

    // Download session receipt as PDF
    downloadSessionReceipt: builder.query<
      Blob,
      { restaurantId: string; sessionId: string; type?: string }
    >({
      query: ({ restaurantId, sessionId, type = 'customer' }) => ({
        url: `/restaurants/${restaurantId}/sessions/${sessionId}/receipt`,
        params: { type },
        responseHandler: (response) => response.blob(),
      }),
      keepUnusedDataFor: 0, // Don't cache blob data
    }),

    // Get session statistics for dashboard
    getSessionStats: builder.query<
      {
        todayStats: {
          totalSessions: number;
          activeSessions: number;
          completedSessions: number;
          totalRevenue: number;
          averageOrderValue: number;
        };
        weeklyStats: {
          totalSessions: number;
          totalRevenue: number;
        };
      },
      { restaurantId: string; date?: string }
    >({
      query: ({ restaurantId, date }) => ({
        url: `/restaurants/${restaurantId}/sessions/stats`,
        params: date ? { date } : {},
      }),
      providesTags: (result, error, { restaurantId }) => [
        { type: 'Session', id: `STATS-${restaurantId}` },
      ],
    }),

    // Bulk update multiple order statuses
    bulkUpdateOrderStatus: builder.mutation<
      { success: boolean; updated: number },
      {
        restaurantId: string;
        orderIds: string[];
        status: SessionOrder['status'];
        estimatedTime?: number;
      }
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/bulk-update-status`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { restaurantId }) => [
        { type: 'Order', id: 'SESSION_ORDERS' },
        { type: 'Session', id: `LIST-${restaurantId}` },
      ],
    }),

    // Get orders by session ID
    getSessionOrders: builder.query<
      SessionOrder[],
      { restaurantId: string; sessionId: string }
    >({
      query: ({ restaurantId, sessionId }) =>
        `/restaurants/${restaurantId}/sessions/${sessionId}/orders`,
      providesTags: (result, error, { sessionId }) => [
        { type: 'Order', id: `SESSION-${sessionId}` },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useListActiveSessionsQuery,
  useGetSessionDetailsQuery,
  useUpdateSessionStatusMutation,
  useUpdateOrderStatusMutation,
  usePrintSessionReceiptMutation,
  usePrintKitchenTicketMutation,
  useMarkSessionCompleteMutation,
  useGetSessionBillQuery,
  useLazyDownloadSessionReceiptQuery,
  useGetSessionStatsQuery,
  useBulkUpdateOrderStatusMutation,
  useGetSessionOrdersQuery,
} = sessionsApi;