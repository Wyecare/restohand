import { baseApi } from './baseApi';

export interface InventoryItem {
  id: string;
  restaurantId: string;
  branchId?: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  sku?: string;
  pricing: {
    costPerUnit: number;
    currency: string;
    sellingPrice?: number;
    supplier?: string;
    lastPurchaseDate?: string;
  };
  stockLevels: {
    currentStock: number;
    minimumStock: number;
    maximumStock?: number;
    reorderPoint: number;
    reorderQuantity: number;
  };
  tracking: {
    lastUpdated: string;
    lastUpdatedBy?: string;
    totalConsumed: number;
    totalPurchased: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
  };
  tags: string[];
  expiryDate?: string;
  shelfLifeDays?: number;
  storageLocation?: string;
  isActive: boolean;
  trackStock: boolean;
  usedInMenuItems: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StockAlert {
  id: string;
  restaurantId: string;
  branchId?: string;
  inventoryItemId: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry_warning' | 'reorder_point';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  currentStock?: number;
  minimumStock?: number;
  expiryDate?: string;
  isRead: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryAnalytics {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  monthlyConsumption: number;
  monthlyPurchases: number;
  wastePercentage: number;
  topConsumedItems: Array<{
    itemId: string;
    name: string;
    consumed: number;
    value: number;
  }>;
}

export interface CreateInventoryItemPayload {
  restaurantId: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  sku?: string;
  costPerUnit: number;
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  currentStock?: number;
  supplier?: string;
  tags?: string[];
  storageLocation?: string;
  shelfLifeDays?: number;
  usedInMenuItems?: string[];
}

export interface UpdateStockPayload {
  restaurantId: string;
  itemId: string;
  quantity: number;
  type: 'purchase' | 'consumption' | 'waste' | 'adjustment' | 'transfer';
  unitCost?: number;
  reason?: string;
  supplier?: string;
  batchNumber?: string;
  expiryDate?: string;
  invoiceNumber?: string;
  orderId?: string;
  reference?: string;
}

export interface InventoryFilters {
  restaurantId: string;
  category?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  search?: string;
}

export interface BranchInventoryFilters {
  restaurantId: string;
  branchId: string;
  category?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  search?: string;
}

export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Items
    getInventoryItems: builder.query<InventoryItem[], InventoryFilters>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/inventory/items`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((item) => ({
                type: 'InventoryItem' as const,
                id: item.id,
              })),
              { type: 'InventoryItem' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'InventoryItem' as const, id: `LIST-${restaurantId}` }],
    }),

    createInventoryItem: builder.mutation<InventoryItem, CreateInventoryItemPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/inventory/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'InventoryItem', id: `LIST-${restaurantId}` },
        { type: 'InventoryAnalytics', id: restaurantId },
      ],
    }),

    updateStock: builder.mutation<InventoryItem, UpdateStockPayload>({
      query: ({ restaurantId, itemId, ...body }) => ({
        url: `/restaurants/${restaurantId}/inventory/items/${itemId}/stock`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, itemId }) => [
        { type: 'InventoryItem', id: itemId },
        { type: 'InventoryItem', id: `LIST-${restaurantId}` },
        { type: 'InventoryAnalytics', id: restaurantId },
        { type: 'StockAlert', id: `LIST-${restaurantId}` },
      ],
    }),

    // Analytics
    getInventoryAnalytics: builder.query<InventoryAnalytics, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/inventory/analytics`,
      providesTags: (result, _error, restaurantId) => [
        { type: 'InventoryAnalytics', id: restaurantId },
      ],
    }),

    // Alerts
    getStockAlerts: builder.query<StockAlert[], string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/inventory/alerts`,
      providesTags: (result, _error, restaurantId) =>
        result
          ? [
              ...result.map((alert) => ({
                type: 'StockAlert' as const,
                id: alert.id,
              })),
              { type: 'StockAlert' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'StockAlert' as const, id: `LIST-${restaurantId}` }],
    }),

    markAlertAsRead: builder.mutation<StockAlert, { restaurantId: string; alertId: string }>({
      query: ({ restaurantId, alertId }) => ({
        url: `/restaurants/${restaurantId}/inventory/alerts/${alertId}/read`,
        method: 'PUT',
      }),
      invalidatesTags: (_result, _error, { restaurantId, alertId }) => [
        { type: 'StockAlert', id: alertId },
        { type: 'StockAlert', id: `LIST-${restaurantId}` },
      ],
    }),

    // Categories and Units
    getInventoryCategories: builder.query<{
      categories: string[];
      predefinedCategories: string[];
    }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/inventory/categories`,
    }),

    getInventoryUnits: builder.query<{ units: string[] }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/inventory/units`,
    }),

    // Branch-aware endpoints
    getInventoryItemsByBranch: builder.query<InventoryItem[], BranchInventoryFilters>({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/inventory/branches/${branchId}/items`,
        params,
      }),
      providesTags: (result, _error, { restaurantId, branchId }) =>
        result
          ? [
              ...result.map((item) => ({
                type: 'InventoryItem' as const,
                id: item.id,
              })),
              { type: 'InventoryItem' as const, id: `LIST-${restaurantId}-${branchId}` },
            ]
          : [{ type: 'InventoryItem' as const, id: `LIST-${restaurantId}-${branchId}` }],
    }),

    createInventoryItemForBranch: builder.mutation<InventoryItem, CreateInventoryItemPayload & { branchId: string }>({
      query: ({ restaurantId, branchId, ...body }) => ({
        url: `/restaurants/${restaurantId}/inventory/branches/${branchId}/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, branchId }) => [
        { type: 'InventoryItem', id: `LIST-${restaurantId}-${branchId}` },
        { type: 'InventoryAnalytics', id: `${restaurantId}-${branchId}` },
      ],
    }),

    getStockAlertsByBranch: builder.query<StockAlert[], { restaurantId: string; branchId: string }>({
      query: ({ restaurantId, branchId }) => `/restaurants/${restaurantId}/inventory/branches/${branchId}/alerts`,
      providesTags: (result, _error, { restaurantId, branchId }) =>
        result
          ? [
              ...result.map((alert) => ({
                type: 'StockAlert' as const,
                id: alert.id,
              })),
              { type: 'StockAlert' as const, id: `LIST-${restaurantId}-${branchId}` },
            ]
          : [{ type: 'StockAlert' as const, id: `LIST-${restaurantId}-${branchId}` }],
    }),

    getInventoryAnalyticsByBranch: builder.query<InventoryAnalytics, { restaurantId: string; branchId: string }>({
      query: ({ restaurantId, branchId }) => `/restaurants/${restaurantId}/inventory/branches/${branchId}/analytics`,
      providesTags: (result, _error, { restaurantId, branchId }) => [
        { type: 'InventoryAnalytics', id: `${restaurantId}-${branchId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetInventoryItemsQuery,
  useCreateInventoryItemMutation,
  useUpdateStockMutation,
  useGetInventoryAnalyticsQuery,
  useGetStockAlertsQuery,
  useMarkAlertAsReadMutation,
  useGetInventoryCategoriesQuery,
  useGetInventoryUnitsQuery,
  // Branch-aware hooks
  useGetInventoryItemsByBranchQuery,
  useCreateInventoryItemForBranchMutation,
  useGetStockAlertsByBranchQuery,
  useGetInventoryAnalyticsByBranchQuery,
} = inventoryApi;