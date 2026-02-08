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
  CustomerSession,
  CreateCustomerSessionRequest,
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
      invalidatesTags: ['MenuCategory'],
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

    // Branch-aware menu endpoints
    listMenuCategoriesByBranch: builder.query<
      PaginatedResponse<MenuCategory>,
      {
        restaurantId: string;
        branchId: string;
        page?: number;
        limit?: number;
        search?: string;
      }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/categories/branch/${branchId}`,
        params,
      }),
      providesTags: ['MenuCategory'],
    }),

    createMenuCategoryForBranch: builder.mutation<
      MenuCategory,
      {
        restaurantId: string;
        branchId: string;
        body: CreateMenuCategoryPayload;
      }
    >({
      query: ({ restaurantId, branchId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/categories/branch/${branchId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['MenuCategory'],
    }),

    listMenuItemsByBranch: builder.query<
      PaginatedResponse<MenuItem>,
      {
        restaurantId: string;
        branchId: string;
        categoryId?: string;
        isAvailable?: boolean;
        search?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/items/branch/${branchId}`,
        params,
      }),
      providesTags: (_result, _error, { restaurantId, branchId }) => [
        { type: 'MenuItem', id: `LIST-${restaurantId}-${branchId}` },
      ],
    }),

    createMenuItemForBranch: builder.mutation<
      MenuItem,
      { restaurantId: string; branchId: string; body: CreateMenuItemPayload }
    >({
      query: ({ restaurantId, branchId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/items/branch/${branchId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, branchId }) => [
        { type: 'MenuItem', id: `LIST-${restaurantId}-${branchId}` },
      ],
    }),

    listRestaurantTables: builder.query<
      RestaurantTable[],
      { restaurantId: string; branchId?: string; includeInactive?: boolean }
    >({
      query: ({ restaurantId, includeInactive }) => ({
        url: `/restaurants/${restaurantId}/tables`,
        params: includeInactive ? { includeInactive } : undefined,
      }),
      providesTags: (result, _error, { restaurantId, branchId }) => {
        const branchSuffix = branchId ? `-${branchId}` : '';
        return result
          ? [
              ...result.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              { type: 'RestaurantTable' as const, id: `LIST-${restaurantId}${branchSuffix}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `LIST-${restaurantId}${branchSuffix}` }];
      },
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
          : [
              {
                type: 'RestaurantTable' as const,
                id: `SERVICE-${restaurantId}`,
              },
            ],
    }),

    listEnhancedTables: builder.query<
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
              {
                type: 'RestaurantTable' as const,
                id: `ENHANCED-${restaurantId}`,
              },
            ]
          : [
              {
                type: 'RestaurantTable' as const,
                id: `ENHANCED-${restaurantId}`,
              },
            ],
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
              {
                type: 'RestaurantTable' as const,
                id: `ENHANCED-LIST-${restaurantId}`,
              },
            ]
          : [
              {
                type: 'RestaurantTable' as const,
                id: `ENHANCED-LIST-${restaurantId}`,
              },
            ],
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
        {
          type: 'RestaurantTable' as const,
          id: `ENHANCED-LIST-${restaurantId}`,
        },
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
        {
          type: 'RestaurantTable' as const,
          id: `ENHANCED-LIST-${restaurantId}`,
        },
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
      {
        restaurant: PublicRestaurant;
        menu: PublicMenuPayload;
        activeOrder?: PublicOrder;
      },
      { slug: string; table?: string; tableId?: string }
    >({
      query: ({ slug, table, tableId }) => ({
        url: `/public/restaurants/${slug}/menu`,
        params: {
          ...(table && { table }),
          ...(tableId && { tableId })
        },
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

    getTableSessionPublic: builder.query<
      {
        restaurant: PublicRestaurant;
        tableSession: any; // Table session data with all orders
      },
      { slug: string; tableId: string }
    >({
      query: ({ slug, tableId }) =>
        `/public/restaurants/${slug}/table/${tableId}/session`,
    }),

    createPublicOrder: builder.mutation<
      Order,
      {
        slug: string;
        tableId?: string;
        tableNumber?: string;
        customerName?: string;
        customerPhone?: string;
        notes?: string;
        paymentMethod?: 'upi' | 'cash';
        items: Array<{
          menuItemId: string;
          name: string;
          quantity: number;
          pricing: {
            unitAmount: number;
            currency: string;
            taxAmount?: number;
            discountAmount?: number;
          };
          notes?: string;
        }>;
      }
    >({
      query: ({ slug, ...body }) => ({
        url: `/public/restaurants/${slug}/orders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order'],
    }),

    calculateCartTotal: builder.mutation<
      {
        subtotal: number;
        taxAmount: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        discountAmount: number;
        roundOffAmount: number;
        total: number;
        totalAmount: number;
        totalItems: number;
      },
      {
        restaurantId: string;
        tableNumber?: string;
        items: Array<{
          menuItemId: string;
          name: string;
          quantity: number;
          pricing: {
            unitAmount: number;
            currency: string;
            taxAmount?: number;
            discountAmount?: number;
          };
          notes?: string;
        }>;
        notes?: string;
      }
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/orders/calculate-cart-total`,
        method: 'POST',
        body,
      }),
    }),

    createPublicPaymentIntent: builder.mutation<
      {
        razorpayKey: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        restaurant: { id: string };
        settlementType: string;
      },
      { slug: string; orderId: string }
    >({
      query: ({ slug, orderId }) => ({
        url: `/public/restaurants/${slug}/orders/${orderId}/payment-intent`,
        method: 'POST',
      }),
    }),

    addItemsToPublicOrder: builder.mutation<
      Order,
      {
        slug: string;
        orderId: string;
        items: Array<{
          menuItemId: string;
          name: string;
          quantity: number;
          pricing: {
            unitAmount: number;
            currency: string;
            taxAmount?: number;
            discountAmount?: number;
          };
          notes?: string;
        }>;
      }
    >({
      query: ({ slug, orderId, ...body }) => ({
        url: `/public/restaurants/${slug}/orders/${orderId}/add-items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
      ],
    }),

    // Customer Session Management
    createCustomerSession: builder.mutation<
      CustomerSession,
      CreateCustomerSessionRequest
    >({
      query: ({ slug, tableId }) => ({
        url: `/public/restaurants/${slug}/table/${tableId}/session`,
        method: 'POST',
      }),
    }),

    createSessionPaymentIntent: builder.mutation<
      {
        razorpayKey: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        restaurant: { id: string };
        settlementType: string;
        orderIds: string[];
        orderCount: number;
        totalAmount: number;
      },
      { slug: string; tableId: string }
    >({
      query: ({ slug, tableId }) => ({
        url: `/public/restaurants/${slug}/table/${tableId}/session/payment-intent`,
        method: 'POST',
      }),
    }),

    getConsolidatedBill: builder.query<
      {
        restaurant: PublicRestaurant;
        bill: {
          tableNumber: string;
          orders: Array<{
            orderNumber: string;
            items: Array<{
              name: string;
              quantity: number;
              unitPrice: number;
              lineTotal: number;
              activePriceTagId?: string;
              selectedModifiers?: Array<{
                modifierName: string;
                selectedOptions: Array<{
                  optionName: string;
                  priceAdjustment: number;
                }>;
              }>;
              notes?: string;
            }>;
            orderTotal: number;
          }>;
          subtotal: number;
          taxAmount: number;
          cgstAmount: number;
          sgstAmount: number;
          igstAmount: number;
          roundOffAmount: number;
          totalAmount: number;
          billGeneratedAt: string;
        };
      },
      { slug: string; tableId: string }
    >({
      query: ({ slug, tableId }) => ({
        url: `/public/restaurants/${slug}/table/${tableId}/consolidated-bill`,
      }),
    }),

    downloadTableBill: builder.query<
      Blob,
      { slug: string; tableId: string }
    >({
      query: ({ slug, tableId }) => ({
        url: `/public/restaurants/${slug}/table/${tableId}/bill`,
        responseHandler: (response) => response.blob(),
      }),
      keepUnusedDataFor: 0, // Don't cache blob data
      serializeQueryArgs: ({ queryArgs }) => {
        // Always treat as a fresh request to avoid caching issues
        return JSON.stringify(queryArgs) + '-' + Date.now();
      },
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

    // Branch-aware zone endpoints
    getZonesByBranch: builder.query<
      ZonesListResponse,
      { restaurantId: string; branchId: string }
    >({
      query: ({ restaurantId, branchId }) =>
        `/restaurants/${restaurantId}/tables/zones/branch/${branchId}`,
      providesTags: (_result, _error, { restaurantId, branchId }) => [
        { type: 'Zone' as const, id: `LIST-${restaurantId}-${branchId}` },
        { type: 'Zone' as const, id: restaurantId },
      ],
    }),

    createZoneForBranch: builder.mutation<
      ZoneResponse,
      { restaurantId: string; branchId: string; body: CreateZonePayload }
    >({
      query: ({ restaurantId, branchId, body }) => ({
        url: `/restaurants/${restaurantId}/tables/zones/branch/${branchId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, branchId }) => [
        { type: 'Zone' as const, id: 'LIST' },
        { type: 'Zone' as const, id: `LIST-${restaurantId}-${branchId}` },
        { type: 'Zone' as const, id: restaurantId },
        { type: 'RestaurantTable' as const, id: 'LIST' },
      ],
    }),

    // Branch-aware table endpoints
    listRestaurantTablesByBranch: builder.query<
      RestaurantTable[],
      { restaurantId: string; branchId: string; includeInactive?: boolean }
    >({
      query: ({ restaurantId, branchId, includeInactive }) => ({
        url: `/restaurants/${restaurantId}/tables/branch/${branchId}`,
        params: includeInactive ? { includeInactive } : undefined,
      }),
      providesTags: (result, _error, { restaurantId, branchId }) =>
        result
          ? [
              ...result.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              { type: 'RestaurantTable' as const, id: `LIST-${restaurantId}-${branchId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `LIST-${restaurantId}-${branchId}` }],
    }),

    listServiceTablesByBranch: builder.query<
      ServiceTablesResponse,
      { restaurantId: string; branchId: string }
    >({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/tables/branch/${branchId}/service-view`,
      }),
      providesTags: (result, _error, { restaurantId, branchId }) =>
        result
          ? [
              ...result.tables.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              {
                type: 'RestaurantTable' as const,
                id: `SERVICE-${restaurantId}-${branchId}`,
              },
            ]
          : [
              {
                type: 'RestaurantTable' as const,
                id: `SERVICE-${restaurantId}-${branchId}`,
              },
            ],
    }),

    // Image Upload endpoints
    uploadMenuCategoryImage: builder.mutation<
      any,
      { restaurantId: string; categoryId: string; file: File }
    >({
      query: ({ restaurantId, categoryId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/restaurants/${restaurantId}/menu/categories/${categoryId}/upload-image`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['MenuCategory'],
    }),

    uploadMenuItemImage: builder.mutation<
      any,
      { restaurantId: string; itemId: string; file: File }
    >({
      query: ({ restaurantId, itemId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/restaurants/${restaurantId}/menu/items/${itemId}/upload-image`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['MenuItem'],
    }),

    // Cashfree vendor management endpoints
    onboardRestaurantToCashfree: builder.mutation<
      {
        success: boolean;
        vendorId: string;
        status: string;
        kycStatus: string;
      },
      { restaurantId: string; scheduleOption?: number; forceUpdate?: boolean }
    >({
      query: ({ restaurantId, scheduleOption = 17, forceUpdate = false }) => ({
        url: `/restaurants/${restaurantId}/cashfree/vendor/onboard`,
        method: 'POST',
        body: { scheduleOption, forceUpdate },
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Restaurant', id: restaurantId },
        { type: 'CashfreeVendor', id: restaurantId },
      ],
    }),

    getCashfreeVendorStatus: builder.query<
      {
        hasVendor: boolean;
        vendorId?: string;
        status?: string;
        kycStatus?: string;
        canReceiveSettlements: boolean;
        scheduleOption?: {
          scheduleId: number;
          settlementScheduleMessage: string;
        };
        error?: string;
      },
      string
    >({
      query: (restaurantId) => `/restaurants/${restaurantId}/cashfree/vendor/status`,
      providesTags: (_result, _error, restaurantId) => [
        { type: 'CashfreeVendor', id: restaurantId },
      ],
    }),

    syncCashfreeVendorStatus: builder.mutation<
      {
        success: boolean;
        vendorId?: string;
        status?: string;
        kycStatus?: string;
        message: string;
      },
      string
    >({
      query: (restaurantId) => ({
        url: `/restaurants/${restaurantId}/cashfree/vendor/sync`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, restaurantId) => [
        { type: 'CashfreeVendor', id: restaurantId },
        { type: 'Restaurant', id: restaurantId },
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
  // Branch-aware menu hooks
  useListMenuCategoriesByBranchQuery,
  useCreateMenuCategoryForBranchMutation,
  useListMenuItemsByBranchQuery,
  useCreateMenuItemForBranchMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useUploadMenuCategoryImageMutation,
  useUploadMenuItemImageMutation,
  useRemoveMenuItemImageMutation,
  useListRestaurantTablesQuery,
  useListServiceTablesQuery,
  useListEnhancedTablesQuery,
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
  useGetTableSessionPublicQuery,
  useCreatePublicOrderMutation,
  useCalculateCartTotalMutation,
  useCreatePublicPaymentIntentMutation,
  useAddItemsToPublicOrderMutation,
  useCreateCustomerSessionMutation,
  useCreateSessionPaymentIntentMutation,
  useGetConsolidatedBillQuery,
  useDownloadTableBillQuery,
  useGetRestaurantQrCodeQuery,
  useSetupLinkedAccountMutation,
  useGetPaymentStatusQuery,
  // Zone Management hooks
  useGetZonesQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
  useBulkUpdateZonesMutation,
  // Branch-aware zone hooks
  useGetZonesByBranchQuery,
  useCreateZoneForBranchMutation,
  // Branch-aware table hooks
  useListRestaurantTablesByBranchQuery,
  useListServiceTablesByBranchQuery,
  // Cashfree vendor management hooks
  useOnboardRestaurantToCashfreeMutation,
  useGetCashfreeVendorStatusQuery,
  useSyncCashfreeVendorStatusMutation,
} = restaurantsApi;
