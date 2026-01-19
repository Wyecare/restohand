import { baseApi } from './baseApi';
import type {
  PaginatedResponse,
  Restaurant,
  MenuCategory,
  MenuItem,
  PublicMenuPayload,
  RestaurantQrCodeResponse,
  PublicRestaurant,
  PublicOrder,
  RestaurantTable,
  Order,
  ServiceTablesResponse,
  EnhancedRestaurantTable,
  TableStatus,
  TableStatusStats,
  UpdateTableStatusPayload,
  ZoneResponse,
  ZonesListResponse,
  CreateZonePayload,
  UpdateZonePayload,
  BulkUpdateZonesPayload,
} from './types';

export interface ListRestaurantsParams {
  search?: string;
  isActive?: boolean;
  city?: string;
  page?: number;
  limit?: number;
}

export interface CreateRestaurantPayload {
  name: string;
  legalName?: string;
  slug: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  address: Restaurant['address'];
  upi: Restaurant['upi'];
  settings?: Partial<Restaurant['settings']>;
  languages?: string[];
  gstin?: string;
  applyDefaultGstToMenuItems?: boolean;
  isActive?: boolean;
}

export type UpdateRestaurantPayload = Partial<CreateRestaurantPayload>;

export interface CreateMenuCategoryPayload {
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateMenuCategoryPayload = Partial<CreateMenuCategoryPayload>;

export interface CreateMenuItemPayload {
  categoryId?: string;
  name: string;
  description?: string;
  pricing: MenuItem['pricing'];
  tags?: string[];
  isAvailable?: boolean;
  displayOrder?: number;
  imageUrls?: string[];
  hsnCode?: string;
  gstRateId?: string;
  gstRate?: number;
}

export type UpdateMenuItemPayload = Partial<CreateMenuItemPayload>;

export interface CreateRestaurantTablePayload {
  tableNumber: string;
  displayName?: string;
  capacity?: number;
  zone?: string;
  displayOrder?: number;
  layoutX?: number;
  layoutY?: number;
  layoutWidth?: number;
  layoutHeight?: number;
  layoutRotation?: number;
}

export interface BulkCreateTablesPayload {
  layout: '4' | '6' | '8' | '16';
  tablePrefix?: string;
  capacity?: number;
  zone?: string;
}

export type UpdateRestaurantTablePayload =
  Partial<CreateRestaurantTablePayload> & {
    isActive?: boolean;
  };

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listRestaurants: builder.query<
      PaginatedResponse<Restaurant>,
      ListRestaurantsParams | void
    >({
      query: (params) => ({
        url: '/restaurants',
        params: params ?? {},
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((restaurant) => ({
                type: 'Restaurant' as const,
                id: restaurant.id,
              })),
              { type: 'Restaurant' as const, id: 'LIST' },
            ]
          : [{ type: 'Restaurant' as const, id: 'LIST' }],
    }),

    getRestaurant: builder.query<Restaurant, string>({
      query: (id) => `/restaurants/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Restaurant', id }],
    }),

    createRestaurant: builder.mutation<Restaurant, CreateRestaurantPayload>({
      query: (body) => ({
        url: '/restaurants',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Restaurant', id: 'LIST' }],
    }),

    updateRestaurant: builder.mutation<
      Restaurant,
      { id: string; body: UpdateRestaurantPayload }
    >({
      query: ({ id, body }) => ({
        url: `/restaurants/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Restaurant', id },
        { type: 'Restaurant', id: 'LIST' },
      ],
    }),

    archiveRestaurant: builder.mutation<{ success: boolean }, { id: string }>({
      query: ({ id }) => ({
        url: `/restaurants/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Restaurant', id },
        { type: 'Restaurant', id: 'LIST' },
      ],
    }),

    listMenuCategories: builder.query<
      PaginatedResponse<MenuCategory>,
      { restaurantId: string; page?: number; limit?: number; search?: string }
    >({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/categories`,
        params,
      }),
      providesTags: (_result, _error, { restaurantId }) => [
        { type: 'MenuCategory', id: `LIST-${restaurantId}` },
      ],
    }),

    createMenuCategory: builder.mutation<
      MenuCategory,
      { restaurantId: string; body: CreateMenuCategoryPayload }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/categories`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'MenuCategory', id: `LIST-${restaurantId}` },
      ],
    }),

    updateMenuCategory: builder.mutation<
      MenuCategory,
      {
        restaurantId: string;
        categoryId: string;
        body: UpdateMenuCategoryPayload;
      }
    >({
      query: ({ restaurantId, categoryId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/categories/${categoryId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, categoryId }) => [
        { type: 'MenuCategory', id: categoryId },
        { type: 'MenuCategory', id: `LIST-${restaurantId}` },
      ],
    }),

    deleteMenuCategory: builder.mutation<
      { success: boolean },
      { restaurantId: string; categoryId: string }
    >({
      query: ({ restaurantId, categoryId }) => ({
        url: `/restaurants/${restaurantId}/menu/categories/${categoryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, categoryId }) => [
        { type: 'MenuCategory', id: categoryId },
        { type: 'MenuCategory', id: `LIST-${restaurantId}` },
      ],
    }),
    listMenuItems: builder.query<
      PaginatedResponse<MenuItem>,
      {
        restaurantId: string;
        categoryId?: string;
        isAvailable?: boolean;
        search?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/items`,
        params,
      }),
      providesTags: (_result, _error, { restaurantId }) => [
        { type: 'MenuItem', id: `LIST-${restaurantId}` },
      ],
    }),

    getMenuItem: builder.query<
      MenuItem,
      { restaurantId: string; itemId: string }
    >({
      query: ({ restaurantId, itemId }) =>
        `/restaurants/${restaurantId}/menu/items/${itemId}`,
      providesTags: (_result, _error, { itemId }) => [
        { type: 'MenuItem', id: itemId },
      ],
    }),

    createMenuItem: builder.mutation<
      MenuItem,
      { restaurantId: string; body: CreateMenuItemPayload }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'MenuItem', id: `LIST-${restaurantId}` },
      ],
    }),

    listRestaurantTables: builder.query<
      RestaurantTable[],
      { restaurantId: string; includeInactive?: boolean }
    >({
      query: ({ restaurantId, includeInactive }) => ({
        url: `/restaurants/${restaurantId}/tables`,
        params: includeInactive ? { includeInactive } : undefined,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              { type: 'RestaurantTable' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `LIST-${restaurantId}` }],
    }),

    listServiceTables: builder.query<
      ServiceTablesResponse,
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/tables/service-view`,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.tables.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              {
                type: 'RestaurantTable' as const,
                id: `SERVICE-${restaurantId}`,
              },
            ]
          : [{ type: 'RestaurantTable' as const, id: `SERVICE-${restaurantId}` }],
    }),

    createRestaurantTable: builder.mutation<
      RestaurantTable,
      { restaurantId: string; body: CreateRestaurantTablePayload }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/tables`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'RestaurantTable', id: `LIST-${restaurantId}` },
      ],
    }),

    bulkCreateRestaurantTables: builder.mutation<
      RestaurantTable[],
      { restaurantId: string; body: BulkCreateTablesPayload }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/bulk`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'RestaurantTable', id: `LIST-${restaurantId}` },
      ],
    }),

    updateRestaurantTable: builder.mutation<
      RestaurantTable,
      {
        restaurantId: string;
        tableId: string;
        body: UpdateRestaurantTablePayload;
      }
    >({
      query: ({ restaurantId, tableId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, tableId }) => [
        { type: 'RestaurantTable', id: tableId },
        { type: 'RestaurantTable', id: `LIST-${restaurantId}` },
      ],
    }),

    archiveRestaurantTable: builder.mutation<
      { success: boolean },
      { restaurantId: string; tableId: string }
    >({
      query: ({ restaurantId, tableId }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, tableId }) => [
        { type: 'RestaurantTable', id: tableId },
        { type: 'RestaurantTable', id: `LIST-${restaurantId}` },
      ],
    }),

    reactivateRestaurantTable: builder.mutation<
      RestaurantTable,
      { restaurantId: string; tableId: string }
    >({
      query: ({ restaurantId, tableId }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { restaurantId, tableId }) => [
        { type: 'RestaurantTable', id: tableId },
        { type: 'RestaurantTable', id: `LIST-${restaurantId}` },
      ],
    }),

    generateRestaurantTableQr: builder.mutation<
      RestaurantQrCodeResponse,
      { restaurantId: string; tableId: string }
    >({
      query: ({ restaurantId, tableId }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}/qrcode`,
        method: 'GET',
      }),
    }),
    // Enhanced table status endpoints for Command Center
    listEnhancedRestaurantTables: builder.query<
      EnhancedRestaurantTable[],
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/tables/enhanced`,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              ...result.map((table) => ({
                type: 'TableStatus' as const,
                id: table.id,
              })),
              { type: 'RestaurantTable' as const, id: `ENHANCED-LIST-${restaurantId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `ENHANCED-LIST-${restaurantId}` }],
    }),
    getTableStatusStats: builder.query<
      TableStatusStats,
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/tables/stats`,
      }),
      providesTags: (_result, _error, { restaurantId }) => [
        { type: 'TableStatus' as const, id: `STATS-${restaurantId}` },
      ],
    }),
    getTableStatus: builder.query<
      TableStatus,
      { restaurantId: string; tableId: string }
    >({
      query: ({ restaurantId, tableId }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}/status`,
      }),
      providesTags: (_result, _error, { tableId }) => [
        { type: 'TableStatus' as const, id: tableId },
      ],
    }),
    updateTableStatus: builder.mutation<
      TableStatus,
      { restaurantId: string; tableId: string; body: UpdateTableStatusPayload }
    >({
      query: ({ restaurantId, tableId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, tableId }) => [
        { type: 'TableStatus' as const, id: tableId },
        { type: 'TableStatus' as const, id: `STATS-${restaurantId}` },
        { type: 'RestaurantTable' as const, id: tableId },
        { type: 'RestaurantTable' as const, id: `ENHANCED-LIST-${restaurantId}` },
        { type: 'RestaurantTable' as const, id: `LIST-${restaurantId}` },
      ],
    }),
    initializeTableStatus: builder.mutation<
      TableStatus,
      { restaurantId: string; tableId: string }
    >({
      query: ({ restaurantId, tableId }) => ({
        url: `/restaurants/${restaurantId}/tables/${tableId}/status/initialize`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { restaurantId, tableId }) => [
        { type: 'TableStatus' as const, id: tableId },
        { type: 'TableStatus' as const, id: `STATS-${restaurantId}` },
        { type: 'RestaurantTable' as const, id: `ENHANCED-LIST-${restaurantId}` },
      ],
    }),

    updateMenuItem: builder.mutation<
      MenuItem,
      {
        restaurantId: string;
        itemId: string;
        body: UpdateMenuItemPayload;
      }
    >({
      query: ({ restaurantId, itemId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/items/${itemId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: `LIST-${restaurantId}` },
      ],
    }),

    deleteMenuItem: builder.mutation<
      { success: boolean },
      { restaurantId: string; itemId: string }
    >({
      query: ({ restaurantId, itemId }) => ({
        url: `/restaurants/${restaurantId}/menu/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: `LIST-${restaurantId}` },
      ],
    }),

    uploadMenuItemImage: builder.mutation<
      { success: boolean; imageUrl: string; fileName: string },
      { restaurantId: string; itemId: string; image: File }
    >({
      query: ({ restaurantId, itemId, image }) => {
        const formData = new FormData();
        formData.append('file', image); // Changed from 'image' to 'file'

        return {
          url: `/restaurants/${restaurantId}/menu/items/${itemId}/upload-image`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { restaurantId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: `LIST-${restaurantId}` },
      ],
    }),
    removeMenuItemImage: builder.mutation<
      { success: boolean },
      { restaurantId: string; itemId: string; imageIndex: number }
    >({
      query: ({ restaurantId, itemId, imageIndex }) => ({
        url: `/restaurants/${restaurantId}/menu/items/${itemId}/images/${imageIndex}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, itemId }) => [
        { type: 'MenuItem', id: itemId },
        { type: 'MenuItem', id: `LIST-${restaurantId}` },
      ],
    }),

    getPublicRestaurant: builder.query<PublicRestaurant, string>({
      query: (slug) => `/public/restaurants/${slug}`,
    }),

    getPublicMenu: builder.query<
      { restaurant: PublicRestaurant; menu: PublicMenuPayload; activeOrder?: PublicOrder },
      { slug: string; table?: string }
    >({
      query: ({ slug, table }) => ({
        url: `/public/restaurants/${slug}/menu`,
        params: table ? { table } : {}
      }),
    }),

    getPublicOrder: builder.query<
      PublicOrder,
      { slug: string; orderId: string }
    >({
      query: ({ slug, orderId }) =>
        `/public/restaurants/${slug}/orders/${orderId}`,
      providesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
      ],
    }),

    cancelPublicOrder: builder.mutation<
      Order,
      { slug: string; orderId: string }
    >({
      query: ({ slug, orderId }) => ({
        url: `/public/restaurants/${slug}/orders/${orderId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
      ],
    }),

    getRestaurantQrCode: builder.query<
      RestaurantQrCodeResponse,
      { restaurantId: string; table?: string }
    >({
      query: ({ restaurantId, table }) => ({
        url: `/restaurants/${restaurantId}/qrcode`,
        params: table ? { table } : undefined,
      }),
    }),

    setupLinkedAccount: builder.mutation<
      {
        success: boolean;
        linkedAccountId?: string;
        status?: string;
        error?: string;
      },
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/payment/setup-linked-account`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Restaurant', id: restaurantId },
      ],
    }),

    getPaymentStatus: builder.query<
      {
        status: string;
        canReceivePayments: boolean;
        linkedAccountId?: string;
        error?: string;
        setupAttempts: number;
        lastAttempt?: string;
      },
      string
    >({
      query: (restaurantId) => `/restaurants/${restaurantId}/payment/status`,
      providesTags: (_result, _error, restaurantId) => [
        { type: 'Restaurant', id: restaurantId },
      ],
    }),

    // Zone Management endpoints
    getZones: builder.query<ZonesListResponse, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/tables/zones`,
      providesTags: (_result, _error, restaurantId) => [
        { type: 'Zone' as const, id: 'LIST' },
        { type: 'Zone' as const, id: restaurantId },
      ],
    }),

    createZone: builder.mutation<
      ZoneResponse,
      { restaurantId: string; body: CreateZonePayload }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/zones`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Zone' as const, id: 'LIST' },
        { type: 'Zone' as const, id: restaurantId },
        { type: 'RestaurantTable' as const, id: 'LIST' },
      ],
    }),

    updateZone: builder.mutation<
      ZoneResponse,
      { restaurantId: string; zoneId: string; body: UpdateZonePayload }
    >({
      query: ({ restaurantId, zoneId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/zones/${zoneId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, zoneId }) => [
        { type: 'Zone' as const, id: 'LIST' },
        { type: 'Zone' as const, id: restaurantId },
        { type: 'Zone' as const, id: zoneId },
        { type: 'RestaurantTable' as const, id: 'LIST' },
      ],
    }),

    deleteZone: builder.mutation<
      { success: boolean },
      { restaurantId: string; zoneId: string }
    >({
      query: ({ restaurantId, zoneId }) => ({
        url: `/restaurants/${restaurantId}/tables/zones/${zoneId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, zoneId }) => [
        { type: 'Zone' as const, id: 'LIST' },
        { type: 'Zone' as const, id: restaurantId },
        { type: 'Zone' as const, id: zoneId },
        { type: 'RestaurantTable' as const, id: 'LIST' },
      ],
    }),

    bulkUpdateZones: builder.mutation<
      ZonesListResponse,
      { restaurantId: string; body: BulkUpdateZonesPayload }
    >({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/zones`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Zone' as const, id: 'LIST' },
        { type: 'Zone' as const, id: restaurantId },
        { type: 'RestaurantTable' as const, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListRestaurantsQuery,
  useGetRestaurantQuery,
  useCreateRestaurantMutation,
  useUpdateRestaurantMutation,
  useArchiveRestaurantMutation,
  useListMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useListMenuItemsQuery,
  useGetMenuItemQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useUploadMenuItemImageMutation,
  useRemoveMenuItemImageMutation,
  useListRestaurantTablesQuery,
  useListServiceTablesQuery,
  useCreateRestaurantTableMutation,
  useBulkCreateRestaurantTablesMutation,
  useUpdateRestaurantTableMutation,
  useArchiveRestaurantTableMutation,
  useReactivateRestaurantTableMutation,
  useGenerateRestaurantTableQrMutation,
  // Enhanced table status hooks for Command Center
  useListEnhancedRestaurantTablesQuery,
  useGetTableStatusStatsQuery,
  useGetTableStatusQuery,
  useUpdateTableStatusMutation,
  useInitializeTableStatusMutation,
  useGetPublicRestaurantQuery,
  useGetPublicMenuQuery,
  useGetPublicOrderQuery,
  useCancelPublicOrderMutation,
  useGetRestaurantQrCodeQuery,
  useSetupLinkedAccountMutation,
  useGetPaymentStatusQuery,
  // Zone Management hooks
  useGetZonesQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
  useBulkUpdateZonesMutation,
} = restaurantsApi;
