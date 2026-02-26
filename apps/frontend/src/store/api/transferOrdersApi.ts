import { baseApi } from './baseApi';

export interface TransferOrderItem {
  inventoryItemId: string;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
  requestedQuantity: number;
  approvedQuantity: number;
  transferredQuantity: number;
  unitCost?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'partial' | 'transferred' | 'cancelled';
}

export interface TransferOrder {
  id: string;
  restaurantId: string;
  sourceBranchId: string;
  sourceBranch?: {
    id: string;
    name: string;
  };
  destinationBranchId: string;
  destinationBranch?: {
    id: string;
    name: string;
  };
  transferNumber: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'in_transit' | 'partial' | 'completed' | 'cancelled';
  items: TransferOrderItem[];
  totalValue: number;
  requestedDeliveryDate?: string;
  reason: string;
  notes?: string;
  tracking: {
    requestedAt?: string;
    requestedBy?: string;
    approvedAt?: string;
    approvedBy?: string;
    sentAt?: string;
    sentBy?: string;
    receivedAt?: string;
    receivedBy?: string;
    rejectionReason?: string;
    rejectedAt?: string;
    rejectedBy?: string;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdBy: string;
  stockMovementIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferOrderPayload {
  restaurantId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  items: Array<{
    inventoryItemId: string;
    requestedQuantity: number;
    notes?: string;
  }>;
  reason: string;
  requestedDeliveryDate?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
}

export interface ApproveTransferOrderPayload {
  restaurantId: string;
  transferId: string;
  items: Array<{
    inventoryItemId: string;
    approvedQuantity: number;
  }>;
  notes?: string;
}

export interface ProcessTransferOrderPayload {
  restaurantId: string;
  transferId: string;
  items: Array<{
    inventoryItemId: string;
    transferredQuantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface TransferOrdersFilters {
  restaurantId: string;
  status?: string;
  sourceBranchId?: string;
  destinationBranchId?: string;
  priority?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TransferOrdersResponse {
  transferOrders: TransferOrder[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TransferOrderAnalytics {
  totalTransfers: number;
  totalValue: number;
  statusBreakdown: Record<string, number>;
  branchTransferStats: Array<{
    branchId: string;
    branchName: string;
    sentCount: number;
    receivedCount: number;
    sentValue: number;
    receivedValue: number;
  }>;
  avgProcessingTime: number;
}

export const transferOrdersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all transfer orders
    getTransferOrders: builder.query<TransferOrdersResponse, TransferOrdersFilters>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result?.transferOrders
          ? [
              ...result.transferOrders.map((transfer) => ({
                type: 'TransferOrder' as const,
                id: transfer.id,
              })),
              { type: 'TransferOrder' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'TransferOrder' as const, id: `LIST-${restaurantId}` }],
    }),

    // Get transfer order by ID
    getTransferOrderById: builder.query<TransferOrder, { restaurantId: string; transferId: string }>({
      query: ({ restaurantId, transferId }) => `/restaurants/${restaurantId}/transfer-orders/${transferId}`,
      providesTags: (_result, _error, { transferId }) => [
        { type: 'TransferOrder', id: transferId },
      ],
    }),

    // Create transfer order
    createTransferOrder: builder.mutation<TransferOrder, CreateTransferOrderPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'TransferOrder', id: `LIST-${restaurantId}` },
        { type: 'TransferOrderAnalytics', id: restaurantId },
      ],
    }),

    // Submit transfer order for approval
    submitTransferOrder: builder.mutation<TransferOrder, { restaurantId: string; transferId: string }>({
      query: ({ restaurantId, transferId }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders/${transferId}/submit`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, transferId }) => [
        { type: 'TransferOrder', id: transferId },
        { type: 'TransferOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Approve transfer order
    approveTransferOrder: builder.mutation<TransferOrder, ApproveTransferOrderPayload>({
      query: ({ restaurantId, transferId, ...body }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders/${transferId}/approve`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, transferId }) => [
        { type: 'TransferOrder', id: transferId },
        { type: 'TransferOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Reject transfer order
    rejectTransferOrder: builder.mutation<TransferOrder, { restaurantId: string; transferId: string; reason: string }>({
      query: ({ restaurantId, transferId, reason }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders/${transferId}/reject`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { restaurantId, transferId }) => [
        { type: 'TransferOrder', id: transferId },
        { type: 'TransferOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Process transfer order (execute transfer)
    processTransferOrder: builder.mutation<TransferOrder, ProcessTransferOrderPayload>({
      query: ({ restaurantId, transferId, ...body }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders/${transferId}/process`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, transferId }) => [
        { type: 'TransferOrder', id: transferId },
        { type: 'TransferOrder', id: `LIST-${restaurantId}` },
        { type: 'InventoryItem', id: `LIST-${restaurantId}` },
        { type: 'InventoryAnalytics', id: restaurantId },
      ],
    }),

    // Cancel transfer order
    cancelTransferOrder: builder.mutation<TransferOrder, { restaurantId: string; transferId: string; reason: string }>({
      query: ({ restaurantId, transferId, reason }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders/${transferId}/cancel`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { restaurantId, transferId }) => [
        { type: 'TransferOrder', id: transferId },
        { type: 'TransferOrder', id: `LIST-${restaurantId}` },
      ],
    }),

    // Get transfer order analytics
    getTransferOrderAnalytics: builder.query<TransferOrderAnalytics, { restaurantId: string; branchId?: string }>({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/transfer-orders/analytics/summary`,
        params: branchId ? { branchId } : {},
      }),
      providesTags: (result, _error, { restaurantId }) => [
        { type: 'TransferOrderAnalytics', id: restaurantId },
      ],
    }),

    // Get transfer order statuses
    getTransferOrderStatuses: builder.query<{ statuses: string[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/transfer-orders/statuses/all`,
    }),

    // Get transfer order priorities
    getTransferOrderPriorities: builder.query<{ priorities: string[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/transfer-orders/priorities/all`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTransferOrdersQuery,
  useGetTransferOrderByIdQuery,
  useCreateTransferOrderMutation,
  useSubmitTransferOrderMutation,
  useApproveTransferOrderMutation,
  useRejectTransferOrderMutation,
  useProcessTransferOrderMutation,
  useCancelTransferOrderMutation,
  useGetTransferOrderAnalyticsQuery,
  useGetTransferOrderStatusesQuery,
  useGetTransferOrderPrioritiesQuery,
} = transferOrdersApi;