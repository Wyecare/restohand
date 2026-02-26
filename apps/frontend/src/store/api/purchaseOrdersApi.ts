import { baseApi } from './baseApi';

export interface PurchaseOrderItem {
  inventoryItemId: string;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
  receivedQuantity: number;
  status: 'pending' | 'partial' | 'received' | 'cancelled';
}

export interface PurchaseOrder {
  id: string;
  _id: string;
  restaurantId: string;
  branchId: string;
  branch?: { id: string; name: string; };
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
    supplierCode: string;
    contact: { email?: string; phone?: string; contactPerson?: string; };
  };
  poNumber: string;
  status: 'draft' | 'pending' | 'sent' | 'acknowledged' | 'partial' | 'delivered' | 'cancelled' | 'closed';
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  delivery?: {
    expectedDate?: string;
    expectedTime?: string;
    actualDate?: string;
    actualTime?: string;
    deliveryInstructions?: string;
  };
  tracking: {
    sentAt?: string;
    sentBy?: string;
    acknowledgedAt?: string;
    acknowledgmentMethod?: string;
    deliveredAt?: string;
    receivedBy?: string;
    cancellationReason?: string;
    cancelledAt?: string;
    cancelledBy?: string;
  };
  invoice?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceAmount?: number;
    notes?: string;
    receivedAt?: string;
  };
  payment?: {
    status: 'unpaid' | 'partial' | 'paid';
    paidAmount: number;
    paidAt?: string;
    method?: string;
    reference?: string;
    notes?: string;
  };
  notes?: string;
  terms?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  revision: number;
  previousVersionId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseOrderPayload {
  restaurantId: string;
  branchId: string;
  supplierId: string;
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  delivery?: {
    expectedDate?: string;
    expectedTime?: string;
    deliveryInstructions?: string;
  };
  notes?: string;
  terms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface UpdatePurchaseOrderPayload {
  items?: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
  }>;
  delivery?: {
    expectedDate?: string;
    expectedTime?: string;
    deliveryInstructions?: string;
  };
  notes?: string;
  terms?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface PurchaseOrdersFilters {
  restaurantId: string;
  status?: string;
  supplierId?: string;
  branchId?: string;
  priority?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseOrdersResponse {
  purchaseOrders: PurchaseOrder[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReceivePurchaseOrderPayload {
  restaurantId: string;
  poId: string;
  items: Array<{
    inventoryItemId: string;
    receivedQuantity: number;
    actualUnitCost?: number;
    notes?: string;
  }>;
  actualDeliveryDate?: string;
  actualDeliveryTime?: string;
  notes?: string;
}

export interface RecordInvoicePayload {
  restaurantId: string;
  poId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  notes?: string;
}

export interface RecordPaymentPayload {
  restaurantId: string;
  poId: string;
  paidAmount: number;
  method: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'credit';
  reference?: string;
  notes?: string;
}

export interface PurchaseOrderAnalytics {
  totalPOs: number;
  totalValue: number;
  statusBreakdown: Record<string, number>;
  supplierBreakdown: Array<{ name: string; count: number; value: number }>;
  avgDeliveryTime: number;
  onTimeDeliveryPercent: number;
}

export const purchaseOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all purchase orders
    getPurchaseOrders: builder.query<PurchaseOrdersResponse, PurchaseOrdersFilters>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result?.purchaseOrders
          ? [
              ...result.purchaseOrders.map((po) => ({
                type: 'PurchaseOrder' as const,
                id: po._id || po.id,
              })),
              { type: 'PurchaseOrder' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'PurchaseOrder' as const, id: `LIST-${restaurantId}` }],
    }),

    // Get purchase order by ID
    getPurchaseOrderById: builder.query<PurchaseOrder, { restaurantId: string; poId: string }>({
      query: ({ restaurantId, poId }) => `/restaurants/${restaurantId}/purchase-orders/${poId}`,
      providesTags: (_result, _error, { poId }) => [
        { type: 'PurchaseOrder', id: poId },
      ],
    }),

    // Create purchase order
    createPurchaseOrder: builder.mutation<PurchaseOrder, CreatePurchaseOrderPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
        { type: 'PurchaseOrderAnalytics', id: restaurantId },
      ],
    }),

    // Update purchase order
    updatePurchaseOrder: builder.mutation<PurchaseOrder, { restaurantId: string; poId: string } & UpdatePurchaseOrderPayload>({
      query: ({ restaurantId, poId, ...body }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Approve purchase order
    approvePurchaseOrder: builder.mutation<PurchaseOrder, { restaurantId: string; poId: string }>({
      query: ({ restaurantId, poId }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/approve`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Send purchase order
    sendPurchaseOrder: builder.mutation<PurchaseOrder, { restaurantId: string; poId: string }>({
      query: ({ restaurantId, poId }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/send`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Acknowledge purchase order
    acknowledgePurchaseOrder: builder.mutation<PurchaseOrder, { restaurantId: string; poId: string; acknowledgmentMethod?: string }>({
      query: ({ restaurantId, poId, acknowledgmentMethod }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/acknowledge`,
        method: 'PUT',
        body: { acknowledgmentMethod },
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Receive purchase order
    receivePurchaseOrder: builder.mutation<PurchaseOrder, ReceivePurchaseOrderPayload>({
      query: ({ restaurantId, poId, ...body }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/receive`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
        { type: 'InventoryItem', id: `LIST-${restaurantId}` },
        { type: 'InventoryAnalytics', id: restaurantId },
        { type: 'Supplier', id: `LIST-${restaurantId}` },
      ],
    }),

    // Cancel purchase order
    cancelPurchaseOrder: builder.mutation<PurchaseOrder, { restaurantId: string; poId: string; reason: string }>({
      query: ({ restaurantId, poId, reason }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/cancel`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Generate purchase order PDF
    generatePurchaseOrderPdf: builder.mutation<Blob, { restaurantId: string; poId: string }>({
      query: ({ restaurantId, poId }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/pdf`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Get purchase order analytics
    getPurchaseOrderAnalytics: builder.query<PurchaseOrderAnalytics, { restaurantId: string; branchId?: string }>({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/analytics/summary`,
        params: branchId ? { branchId } : {},
      }),
      providesTags: (result, _error, { restaurantId }) => [
        { type: 'PurchaseOrderAnalytics', id: restaurantId },
      ],
    }),

    // Record invoice
    recordInvoice: builder.mutation<PurchaseOrder, RecordInvoicePayload>({
      query: ({ restaurantId, poId, ...body }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/invoice`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Record payment
    recordPayment: builder.mutation<PurchaseOrder, RecordPaymentPayload>({
      query: ({ restaurantId, poId, ...body }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/payment`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
        { type: 'PurchaseOrderAnalytics', id: restaurantId },
      ],
    }),

    // Close purchase order
    closePurchaseOrder: builder.mutation<PurchaseOrder, { restaurantId: string; poId: string }>({
      query: ({ restaurantId, poId }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/close`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, poId }) => [
        { type: 'PurchaseOrder', id: poId },
        { type: 'PurchaseOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Download invoice receipt PDF
    generateInvoiceReceiptPdf: builder.mutation<Blob, { restaurantId: string; poId: string }>({
      query: ({ restaurantId, poId }) => ({
        url: `/restaurants/${restaurantId}/purchase-orders/${poId}/invoice/pdf`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),

    // Get purchase order statuses
    getPurchaseOrderStatuses: builder.query<{ statuses: string[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/purchase-orders/statuses/all`,
    }),

    // Get purchase order priorities
    getPurchaseOrderPriorities: builder.query<{ priorities: string[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/purchase-orders/priorities/all`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderByIdQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useSendPurchaseOrderMutation,
  useAcknowledgePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useGeneratePurchaseOrderPdfMutation,
  useRecordInvoiceMutation,
  useRecordPaymentMutation,
  useClosePurchaseOrderMutation,
  useGetPurchaseOrderAnalyticsQuery,
  useGenerateInvoiceReceiptPdfMutation,
  useGetPurchaseOrderStatusesQuery,
  useGetPurchaseOrderPrioritiesQuery,
} = purchaseOrdersApi;