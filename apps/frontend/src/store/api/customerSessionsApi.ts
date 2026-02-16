import { baseApi } from './baseApi';

// Customer Session Types
export interface CustomerSession {
  sessionId: string;
  restaurantId: string;
  branchId?: string;
  tableId: string;
  tableNumber: string;
  customerNumber: number;
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

export interface CreateCustomerSessionRequest {
  restaurantSlug: string;
  tableId: string;
  userAgent?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface SessionWithBill {
  session: CustomerSession;
  bill: BillCalculation;
  orders: SessionOrder[];
}

export interface BillCalculation {
  subTotalAmount: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  discountAmount: number;
  grossAmount: number;
  totalAmount: number;
  roundOffAmount: number;

  // Branch charges
  branchCharges: Array<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    includedInGst: boolean;
  }>;
  totalBranchCharges: number;

  paidAmount: number;
  pendingAmount: number;
  taxType: 'intra-state' | 'inter-state' | null;
  orderCount: number;
  itemCount: number;
  orderBreakdown: OrderBillBreakdown[];
  calculatedAt: string;
  currency: string;

  // Mixed tax support (optional fields for backward compatibility)
  categoryCalculations?: Array<{
    category: 'cooked_food' | 'fresh_items' | 'packaged_items' | 'beverages' | 'alcohol' | 'sweets' | 'ice_cream';
    subtotal: number;
    taxType: 'gst' | 'vat' | 'exempt';
    gstRate?: number;
    vatRate?: number;
    gstAmount?: number;
    vatAmount?: number;
    totalTaxAmount: number;
    totalWithTax: number;
  }>;
  totalGstAmount?: number;
  totalVatAmount?: number;
  gstSubtotal?: number;
  vatSubtotal?: number;
  exemptSubtotal?: number;
  stateVatAmount?: number;
}

export interface OrderBillBreakdown {
  orderId: string;
  orderNumber: string;
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
  paymentStatus: string;
  itemCount: number;
  createdAt: string;
}

export interface SessionOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
}

export interface FindSessionsParams {
  restaurantId?: string;
  branchId?: string;
  tableId?: string;
  status?: CustomerSession['status'] | 'all';
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

// API Endpoints for Customer Sessions
export const customerSessionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Find sessions with filtering for admin app
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
        ...(params.branchId ? [{ type: 'CustomerSession' as const, id: `LIST-${params.restaurantId}-${params.branchId}` }] : []),
      ],
    }),

    // Create a new customer session (when QR is scanned)
    createCustomerSession: builder.mutation<
      CustomerSession,
      CreateCustomerSessionRequest
    >({
      query: ({ restaurantSlug, tableId, ...body }) => ({
        url: `/public/restaurants/${restaurantSlug}/table/${tableId}/session`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { tableId }) => [
        { type: 'CustomerSession', id: 'LIST' },
        { type: 'CustomerSession', id: tableId },
        // Invalidate all branch-specific lists since we don't know which branch this table belongs to
        ...(result ? [
          { type: 'CustomerSession' as const, id: `LIST-${result.restaurantId}` },
          ...(result.branchId ? [{ type: 'CustomerSession' as const, id: `LIST-${result.restaurantId}-${result.branchId}` }] : [])
        ] : [])
      ],
    }),

    // Get session by ID
    getCustomerSession: builder.query<CustomerSession, string>({
      query: (sessionId) => `/customer-sessions/${sessionId}`,
      providesTags: (result, error, sessionId) => [
        { type: 'CustomerSession', id: sessionId },
      ],
    }),

    // Update session activity (keep alive)
    updateSessionActivity: builder.mutation<{ success: boolean }, string>({
      query: (sessionId) => ({
        url: `/customer-sessions/${sessionId}/activity`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, sessionId) => [
        { type: 'CustomerSession', id: sessionId },
      ],
    }),

    // Get session with complete bill calculation
    getSessionBill: builder.query<SessionWithBill, string>({
      query: (sessionId) => `/customer-sessions/${sessionId}/bill`,
      providesTags: (result, error, sessionId) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'Bill', id: sessionId },
      ],
    }),

    // Get active session for a table
    getActiveSessionByTable: builder.query<CustomerSession | null, string>({
      query: (tableId) => `/customer-sessions/table/${tableId}/active`,
      providesTags: (result, error, tableId) => [
        { type: 'CustomerSession', id: tableId },
      ],
    }),

    // Handle order placed event in session
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
        { type: 'CustomerSession', id: 'LIST' }, // Invalidate all lists
        { type: 'Bill', id: sessionId },
      ],
    }),

    // Handle order paid event in session
    onOrderPaid: builder.mutation<
      { success: boolean },
      { sessionId: string; orderId: string }
    >({
      query: ({ sessionId, orderId }) => ({
        url: `/customer-sessions/${sessionId}/events/order-paid`,
        method: 'POST',
        body: { orderId },
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'CustomerSession', id: 'LIST' }, // Invalidate all lists
        { type: 'Bill', id: sessionId },
      ],
    }),

    // Close session manually
    closeSession: builder.mutation<
      CustomerSession,
      { sessionId: string; reason?: string; notes?: string }
    >({
      query: ({ sessionId, reason, notes }) => ({
        url: `/customer-sessions/${sessionId}/close`,
        method: 'PATCH',
        body: { reason, notes },
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'CustomerSession', id: 'LIST' }, // Invalidate all lists
        { type: 'Bill', id: sessionId },
      ],
    }),

    // Delete empty session
    deleteSession: builder.mutation<
      { success: boolean },
      { sessionId: string }
    >({
      query: ({ sessionId }) => ({
        url: `/customer-sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'CustomerSession', id: 'LIST' }, // Invalidate all lists
        { type: 'Bill', id: sessionId },
      ],
    }),

    // Handle order cancelled event in session
    onOrderCancelled: builder.mutation<
      { success: boolean },
      { sessionId: string; orderId: string }
    >({
      query: ({ sessionId, orderId }) => ({
        url: `/customer-sessions/${sessionId}/events/order-cancelled`,
        method: 'POST',
        body: { orderId },
      }),
      invalidatesTags: (result, error, { sessionId }) => [
        { type: 'CustomerSession', id: sessionId },
        { type: 'CustomerSession', id: 'LIST' }, // Invalidate all lists
        { type: 'Bill', id: sessionId },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useFindSessionsQuery,
  useCreateCustomerSessionMutation,
  useGetCustomerSessionQuery,
  useUpdateSessionActivityMutation,
  useGetSessionBillQuery,
  useGetActiveSessionByTableQuery,
  useOnOrderPlacedMutation,
  useOnOrderPaidMutation,
  useCloseSessionMutation,
  useDeleteSessionMutation,
  useOnOrderCancelledMutation,
} = customerSessionsApi;
