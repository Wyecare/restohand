import { baseApi } from './baseApi';
import type { BillCalculation } from './customerSessionsApi';

// Detailed bill calculation interfaces
export interface BillItemDetail {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalWithTax: number;
  hsnCode?: string;
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
  items: BillItemDetail[];
}

export interface DetailedBillCalculation extends BillCalculation {
  restaurant: {
    id: string;
    name: string;
    address: any;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  session: {
    sessionId: string;
    tableNumber: string;
    customerNumber: number;
    startedAt: string;
    customerName?: string;
    customerPhone?: string;
  };
  allItems: BillItemDetail[];
  orderBreakdown: OrderBillBreakdown[];
}

// Billing API Types
export interface CalculateOrdersBillRequest {
  orderIds: string[];
  includeUnpaid?: boolean;
}

export interface CalculateCustomBillRequest {
  sessionId?: string;
  orderIds?: string[];
  orderId?: string;
  includeUnpaid?: boolean;
  includeCancelled?: boolean;
}

export interface BillingValidationResult {
  isValid: boolean;
  calculatedBill: BillCalculation;
  discrepancies?: any[];
}

// Billing API Endpoints
export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Calculate bill for a customer session (PUBLIC - no auth required)
    calculateSessionBill: builder.query<
      BillCalculation,
      { sessionId: string; includeUnpaid?: boolean }
    >({
      query: ({ sessionId, includeUnpaid }) => ({
        url: `/billing/session/${sessionId}`,
        params: includeUnpaid !== undefined ? { includeUnpaid: includeUnpaid.toString() } : {},
      }),
      providesTags: (result, error, { sessionId }) => [
        { type: 'Bill', id: sessionId },
        { type: 'Bill', id: 'SESSION' },
      ],
    }),

    // Calculate bill for a single order (PUBLIC - no auth required)
    calculateOrderBill: builder.query<BillCalculation, string>({
      query: (orderId) => `/billing/order/${orderId}`,
      providesTags: (result, error, orderId) => [
        { type: 'Bill', id: orderId },
        { type: 'Bill', id: 'ORDER' },
      ],
    }),

    // Calculate bill for specific orders (PUBLIC - no auth required)
    calculateOrdersBill: builder.mutation<BillCalculation, CalculateOrdersBillRequest>({
      query: (body) => ({
        url: '/billing/orders/calculate',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Bill', id: 'ORDERS' }],
    }),

    // Get detailed bill calculation with item-level breakdown (PUBLIC - no auth required)
    getDetailedSessionBill: builder.query<
      DetailedBillCalculation,
      { sessionId: string; includeUnpaid?: boolean }
    >({
      query: ({ sessionId, includeUnpaid }) => ({
        url: `/billing/session/${sessionId}/detailed`,
        params: includeUnpaid !== undefined ? { includeUnpaid: includeUnpaid.toString() } : {},
      }),
      providesTags: (result, error, { sessionId }) => [
        { type: 'Bill', id: `${sessionId}-detailed` },
        { type: 'Bill', id: 'SESSION_DETAILED' },
      ],
    }),

    // Update session billing totals (STAFF maintenance)
    updateSessionBillingTotals: builder.mutation<{ success: boolean }, string>({
      query: (sessionId) => ({
        url: `/billing/session/${sessionId}/update-totals`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, sessionId) => [
        { type: 'Bill', id: sessionId },
        { type: 'CustomerSession', id: sessionId },
      ],
    }),

    // Calculate bill with custom parameters (STAFF)
    calculateCustomBill: builder.mutation<BillCalculation, CalculateCustomBillRequest>({
      query: (body) => ({
        url: '/billing/calculate/custom',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Bill', id: 'CUSTOM' }],
    }),

    // Validate session billing consistency (STAFF)
    validateSessionBilling: builder.query<BillingValidationResult, string>({
      query: (sessionId) => `/billing/validate/session/${sessionId}`,
      providesTags: (result, error, sessionId) => [
        { type: 'Bill', id: `${sessionId}-validation` },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useCalculateSessionBillQuery,
  useCalculateOrderBillQuery,
  useCalculateOrdersBillMutation,
  useGetDetailedSessionBillQuery,
  useUpdateSessionBillingTotalsMutation,
  useCalculateCustomBillMutation,
  useValidateSessionBillingQuery,
} = billingApi;