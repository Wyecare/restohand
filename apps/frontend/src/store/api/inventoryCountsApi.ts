import { baseApi } from './baseApi';

export interface CountItem {
  inventoryItemId: string;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    category: string;
  };
  systemCount: number;
  physicalCount: number;
  difference: number;
  unitCost?: number;
  valueDifference?: number;
  notes?: string;
  countedBy?: string;
  countedAt?: string;
}

export interface CountSummary {
  totalItems: number;
  itemsWithVariance: number;
  totalSystemValue: number;
  totalPhysicalValue: number;
  totalVarianceValue: number;
  variancePercentage: number;
}

export interface InventoryCount {
  id: string;
  restaurantId: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
  countNumber: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'cancelled';
  countType: 'spot_check' | 'full_count' | 'cycle_count' | 'category_count';
  categories: string[];
  items: CountItem[];
  summary: CountSummary;
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  createdBy?: string;
  assignedTo: string[];
  approvedBy?: string;
  notes?: string;
  updateSystemStock: boolean;
  systemStockUpdated: boolean;
  adjustmentMovements: string[];
  accuracyThreshold?: number;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryCountPayload {
  restaurantId: string;
  branchId: string;
  name: string;
  countType: 'spot_check' | 'full_count' | 'cycle_count' | 'category_count';
  categories?: string[];
  scheduledDate?: string;
  assignedTo?: string[];
  notes?: string;
  accuracyThreshold?: number;
}

export interface UpdateCountItemPayload {
  restaurantId: string;
  countId: string;
  itemId: string;
  physicalCount: number;
  notes?: string;
}

export interface InventoryCountsFilters {
  restaurantId: string;
  status?: string;
  countType?: string;
  branchId?: string;
  assignedTo?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InventoryCountsResponse {
  inventoryCounts: InventoryCount[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InventoryCountAnalytics {
  totalCounts: number;
  completedCounts: number;
  avgAccuracy: number;
  statusBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  accuracyTrend: Array<{ date: string; accuracy: number }>;
  topVarianceItems: Array<{
    itemName: string;
    variance: number;
    frequency: number;
  }>;
}

export interface InventoryCountType {
  value: string;
  label: string;
  description: string;
}

export const inventoryCountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all inventory counts
    getInventoryCounts: builder.query<InventoryCountsResponse, InventoryCountsFilters>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result?.inventoryCounts
          ? [
              ...result.inventoryCounts.map((count) => ({
                type: 'InventoryCount' as const,
                id: count.id,
              })),
              { type: 'InventoryCount' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'InventoryCount' as const, id: `LIST-${restaurantId}` }],
    }),

    // Get inventory count by ID
    getInventoryCountById: builder.query<InventoryCount, { restaurantId: string; countId: string }>({
      query: ({ restaurantId, countId }) => `/restaurants/${restaurantId}/inventory-counts/${countId}`,
      providesTags: (_result, _error, { countId }) => [
        { type: 'InventoryCount', id: countId },
      ],
    }),

    // Create inventory count
    createInventoryCount: builder.mutation<InventoryCount, CreateInventoryCountPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'InventoryCount', id: `LIST-${restaurantId}` },
        { type: 'InventoryCountAnalytics', id: restaurantId },
      ],
    }),

    // Start inventory count
    startInventoryCount: builder.mutation<InventoryCount, { restaurantId: string; countId: string }>({
      query: ({ restaurantId, countId }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts/${countId}/start`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, countId }) => [
        { type: 'InventoryCount', id: countId },
        { type: 'InventoryCount', id: `LIST-${restaurantId}` },
      ],
    }),

    // Update count item
    updateCountItem: builder.mutation<InventoryCount, UpdateCountItemPayload>({
      query: ({ restaurantId, countId, itemId, ...body }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts/${countId}/items/${itemId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, countId }) => [
        { type: 'InventoryCount', id: countId },
        { type: 'InventoryCount', id: `LIST-${restaurantId}` },
      ],
    }),

    // Complete inventory count
    completeInventoryCount: builder.mutation<InventoryCount, { restaurantId: string; countId: string }>({
      query: ({ restaurantId, countId }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts/${countId}/complete`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, countId }) => [
        { type: 'InventoryCount', id: countId },
        { type: 'InventoryCount', id: `LIST-${restaurantId}` },
      ],
    }),

    // Approve inventory count
    approveInventoryCount: builder.mutation<InventoryCount, { restaurantId: string; countId: string; updateSystemStock?: boolean }>({
      query: ({ restaurantId, countId, updateSystemStock = false }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts/${countId}/approve`,
        method: 'PUT',
        body: { updateSystemStock },
      }),
      invalidatesTags: (_result, _error, { restaurantId, countId }) => [
        { type: 'InventoryCount', id: countId },
        { type: 'InventoryCount', id: `LIST-${restaurantId}` },
        { type: 'InventoryItem', id: `LIST-${restaurantId}` },
        { type: 'InventoryAnalytics', id: restaurantId },
      ],
    }),

    // Cancel inventory count
    cancelInventoryCount: builder.mutation<InventoryCount, { restaurantId: string; countId: string; reason?: string }>({
      query: ({ restaurantId, countId, reason }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts/${countId}/cancel`,
        method: 'PUT',
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { restaurantId, countId }) => [
        { type: 'InventoryCount', id: countId },
        { type: 'InventoryCount', id: `LIST-${restaurantId}` },
      ],
    }),

    // Get inventory count analytics
    getInventoryCountAnalytics: builder.query<InventoryCountAnalytics, { restaurantId: string; branchId?: string }>({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/inventory-counts/analytics/summary`,
        params: branchId ? { branchId } : {},
      }),
      providesTags: (result, _error, { restaurantId }) => [
        { type: 'InventoryCountAnalytics', id: restaurantId },
      ],
    }),

    // Get inventory count types
    getInventoryCountTypes: builder.query<{ types: InventoryCountType[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/inventory-counts/types/all`,
    }),

    // Get inventory count statuses
    getInventoryCountStatuses: builder.query<{ statuses: string[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/inventory-counts/statuses/all`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetInventoryCountsQuery,
  useGetInventoryCountByIdQuery,
  useCreateInventoryCountMutation,
  useStartInventoryCountMutation,
  useUpdateCountItemMutation,
  useCompleteInventoryCountMutation,
  useApproveInventoryCountMutation,
  useCancelInventoryCountMutation,
  useGetInventoryCountAnalyticsQuery,
  useGetInventoryCountTypesQuery,
  useGetInventoryCountStatusesQuery,
} = inventoryCountsApi;