import { baseApi } from './baseApi';

// Customer Session Types
export interface CustomerSession {
  sessionId: string;
  restaurantId: string;
  branchId?: string;
  tableId: string;
  tableNumber: string;
  status: 'active' | 'closed' | 'abandoned';
  startedAt: string;
  closedAt?: string;
  closureReason?:
    | 'payment_completed'
    | 'staff_closed'
    | 'auto_timeout'
    | 'manual_closure'
    | 'table_cleared';
  expiresAt: string;
  closedBy?: string;
  closureNotes?: string;
  totalOrders: number;
  totalAmount: number;
  lastActivityAt?: string;
  // Bill breakdown
  subTotalAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  roundOffAmount: number;
  paidAmount: number;
  pendingAmount: number;
  allOrdersPaid: boolean;
  taxType?: 'intra-state' | 'inter-state';
  createdAt: string;
  updatedAt: string;
}

export interface SessionOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  // Note: items are not included in the backend response from getSessionWithBill
  // If needed, they would need to be added to the backend service method
}

export interface SessionWithOrders {
  session: CustomerSession;
  bill: {
    subTotalAmount: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    discountAmount: number;
    totalAmount: number;
    roundOffAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  orders: SessionOrder[];
}

export interface FindSessionsParams {
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  status?: CustomerSession['status'] | 'all';
  returnEmpty?: boolean; // If true, include sessions with zero orders (for staff app)
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface FindSessionsResponse {
  sessions: CustomerSession[];
  total: number;
  page: number;
  limit: number;
}

// API Endpoints for Customer Sessions (Staff App)
export const customerSessionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Find sessions with filtering for staff app
    findSessions: builder.query<FindSessionsResponse, FindSessionsParams>({
      query: (params) => ({
        url: '/customer-sessions',
        params: {
          ...params,
          // Filter out 'all' status as backend expects undefined for all
          status: params.status === 'all' ? undefined : params.status,
          // Ensure page and limit are numbers
          page: params.page ? Number(params.page) : 1,
          limit: params.limit ? Number(params.limit) : 20,
        },
      }),
      providesTags: (result, error, params) => [
        { type: 'CustomerSession', id: 'LIST' },
        { type: 'CustomerSession', id: `LIST-${params.restaurantId}` },
      ],
    }),

    // Get session by ID
    getSession: builder.query<CustomerSession, string>({
      query: (sessionId) => `/customer-sessions/${sessionId}`,
      providesTags: (result, error, sessionId) => [
        { type: 'CustomerSession', id: sessionId },
      ],
    }),

    // Get session with complete bill calculation
    getSessionWithBill: builder.query<SessionWithOrders, string>({
      query: (sessionId) => `/customer-sessions/${sessionId}/bill`,
      providesTags: (result, error, sessionId) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'Bill', id: sessionId },
      ],
    }),

    // Close a session (staff action)
    // Create a new customer session (for staff app)
    createCustomerSession: builder.mutation<
      CustomerSession,
      {
        restaurantSlug: string;
        tableId: string;
      }
    >({
      query: (body) => ({
        url: `/customer-sessions/create`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tableId }) => [
        { type: 'CustomerSession', id: 'LIST' },
        { type: 'CustomerSession', id: `LIST-${result?.restaurantId}` },
      ],
    }),

    // Notify session about order placement (updates session totals)
    onOrderPlaced: builder.mutation<
      { success: boolean },
      { sessionId: string; orderId: string }
    >({
      query: ({ sessionId, orderId }) => ({
        url: `/customer-sessions/${sessionId}/events/order-placed`,
        method: 'POST',
        body: { orderId },
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'CustomerSession', id: 'LIST' },
        { type: 'Bill', id: sessionId },
        { type: 'Bill', id: 'LIST' },
      ],
    }),

    // Close a session (staff action)
    closeSession: builder.mutation<
      CustomerSession,
      {
        sessionId: string;
        reason?: CustomerSession['closureReason'];
        notes?: string;
      }
    >({
      query: ({ sessionId, ...body }) => ({
        url: `/customer-sessions/${sessionId}/close`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'CustomerSession', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for use in components
export const {
  useFindSessionsQuery,
  useGetSessionQuery,
  useGetSessionWithBillQuery,
  useCreateCustomerSessionMutation,
  useOnOrderPlacedMutation,
  useCloseSessionMutation,
} = customerSessionsApi;
