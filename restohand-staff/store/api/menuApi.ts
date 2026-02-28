import { baseApi } from "./baseApi";
import type { PublicMenuPayload, PublicRestaurant, PublicOrder } from "./types";

// Re-export types from the main types file to maintain compatibility
export type { PublicMenuPayload, PublicRestaurant, PublicOrder } from "./types";

export interface MenuModifierOption {
  id: string;
  name: string;
  priceAdjustment: number;
  isDefault?: boolean;
  isAvailable?: boolean;
}

export interface MenuModifier {
  id: string;
  restaurantId: string;
  name: string;
  isRequired?: boolean;
  minSelections?: number;
  maxSelections?: number;
  isActive: boolean;
  options: MenuModifierOption[];
  applicableMenuItems?: string[];
  applicableCategories?: string[];
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  pricing: {
    amount: number;
    currency: string;
  };
  isAvailable: boolean;
  preparationTime?: number;
  imageUrls?: string[];
  tags?: string[];
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export const menuApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Use the correct public menu endpoint matching the web version
    getPublicMenu: builder.query<
      {
        restaurant: PublicRestaurant;
        menu: PublicMenuPayload;
        tableSession?: any; // Table session data if available
      },
      { slug: string; table?: string; tableId?: string }
    >({
      query: ({ slug, table, tableId }) => ({
        url: `/public/restaurants/${slug}/menu`,
        params: {
          ...(table && { table }),
          ...(tableId && { tableId }),
          includeUnavailable: true, // Staff should see all items
        },
      }),
      providesTags: ["MenuCategory"],
    }),

    // Legacy endpoint for backward compatibility
    getRestaurantMenu: builder.query<
      MenuCategoryWithItems[],
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/public/restaurants/${restaurantId}/menu`,
      }),
      providesTags: ["MenuCategory"],
    }),

    getMenuCategories: builder.query<
      MenuCategory[],
      { restaurantId: string; includeInactive?: boolean }
    >({
      query: ({ restaurantId, includeInactive }) => ({
        url: `/public/restaurants/${restaurantId}/menu/categories`,
        params: includeInactive ? { includeInactive: "true" } : {},
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "MenuCategory" as const,
                id,
              })),
              {
                type: "MenuCategory" as const,
                id: `CATEGORIES-${restaurantId}`,
              },
            ]
          : [
              {
                type: "MenuCategory" as const,
                id: `CATEGORIES-${restaurantId}`,
              },
            ],
    }),

    // Enhanced public menu that includes unavailable items for staff use
    getPublicMenuWithAvailability: builder.query<
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
          ...(tableId && { tableId }),
          includeUnavailable: true, // Key difference - include unavailable items
        },
      }),
      providesTags: ["MenuCategory"],
    }),

    getMenuItems: builder.query<
      MenuItem[],
      {
        restaurantId: string;
        categoryId?: string;
        includeUnavailable?: boolean;
      }
    >({
      query: ({ restaurantId, categoryId, includeUnavailable }) => ({
        url: `/public/restaurants/${restaurantId}/menu/items`,
        params: Object.fromEntries(
          Object.entries({ categoryId, includeUnavailable }).filter(
            ([_, v]) => v != null,
          ),
        ),
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "MenuItem" as const, id })),
              { type: "MenuItem" as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: "MenuItem" as const, id: `LIST-${restaurantId}` }],
    }),

    updateMenuItem: builder.mutation<
      MenuItem,
      {
        restaurantId: string;
        itemId: string;
        data: Partial<MenuItem>;
      }
    >({
      query: ({ restaurantId, itemId, data }) => ({
        url: `/restaurants/${restaurantId}/menu/items/${itemId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId, itemId }) =>
        error
          ? []
          : [
              { type: 'MenuItem' as const, id: itemId },
              { type: 'MenuItem' as const, id: `LIST-${restaurantId}` },
              { type: 'MenuCategory' as const, id: 'LIST' },
            ],
    }),

    listMenuCategoriesByBranch: builder.query<
      { data: MenuCategory[]; meta?: any },
      { restaurantId: string; branchId: string; limit?: number }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/categories/branch/${branchId}`,
        params,
      }),
      providesTags: ['MenuCategory'],
    }),

    listMenuItemsByBranch: builder.query<
      { data: MenuItem[]; meta?: any },
      { restaurantId: string; branchId: string; isAvailable?: boolean; categoryId?: string; limit?: number }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/items/branch/${branchId}`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'MenuItem' as const, id })),
              { type: 'MenuItem' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'MenuItem' as const, id: `LIST-${restaurantId}` }],
    }),

    listMenuModifiersByBranch: builder.query<
      { data: MenuModifier[]; meta?: any },
      { restaurantId: string; branchId: string; isActive?: boolean; limit?: number }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/branch/${branchId}`,
        params,
      }),
      providesTags: ['MenuCategory'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPublicMenuQuery,
  useGetPublicMenuWithAvailabilityQuery,
  useGetRestaurantMenuQuery,
  useGetMenuCategoriesQuery,
  useGetMenuItemsQuery,
  useUpdateMenuItemMutation,
  useListMenuCategoriesByBranchQuery,
  useListMenuItemsByBranchQuery,
  useListMenuModifiersByBranchQuery,
} = menuApi;
