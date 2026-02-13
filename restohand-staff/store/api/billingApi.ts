import { baseApi } from './baseApi';

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

export interface DetailedBillCalculation {
  // Basic bill totals
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
  taxType: 'intra-state' | 'inter-state';

  // Restaurant details
  restaurant: {
    id: string;
    name: string;
    address: any;
    phone?: string;
    email?: string;
    gstin?: string;
  };

  // Session details
  session: {
    sessionId: string;
    tableId: string;
    tableNumber: string;
    customerNumber: number;
    startedAt: string;
    customerName?: string;
    customerPhone?: string;
  };

  // Detailed item breakdown
  allItems: BillItemDetail[];
  orderBreakdown: OrderBillBreakdown[];
}

// Billing API Endpoints
export const billingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get detailed bill calculation with item-level breakdown (STAFF)
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
  }),
  overrideExisting: false,
});

// Export hooks for use in components
export const {
  useGetDetailedSessionBillQuery,
} = billingApi;