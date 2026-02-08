import { baseApi } from './baseApi';

export interface PriceTagRule {
  type: 'always' | 'date_range' | 'day_of_week' | 'time_range';
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
}

export interface ItemPriceOverride {
  menuItemId: string;
  price: number;
  currency: string;
  discountType: 'fixed' | 'percentage_off' | 'amount_off';
  discountValue?: number;
  isActive: boolean;
}

export interface MenuPriceTag {
  id: string;
  restaurantId: string;
  branchId: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  priority: number;
  applicabilityRule?: PriceTagRule;
  itemPrices: ItemPriceOverride[];
  autoActivate: boolean;
  activatedAt?: string;
  deactivatedAt?: string;
  activatedBy?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPriceOverride {
  menuItemId: string;
  price: number;
  currency: string;
  discountType?: 'fixed' | 'percentage_off' | 'amount_off';
  discountValue?: number;
  isActive?: boolean;
}

export interface CreateMenuPriceTagRequest {
  name: string;
  description?: string;
  color: string;
  isActive?: boolean;
  isDefault?: boolean;
  priority?: number;
  applicabilityRule?: PriceTagRule;
  itemPrices: CreateItemPriceOverride[];
  autoActivate?: boolean;
  displayOrder?: number;
}

export interface ActivatePriceTagRequest {
  isActive: boolean;
  force?: boolean;
}

export interface ItemPriceResponse {
  originalPrice: number;
  currentPrice: number;
  discountAmount?: number;
  priceTag?: MenuPriceTag;
}

export interface PriceTagsListResponse {
  data: MenuPriceTag[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const menuPriceTagsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List price tags by branch
    listMenuPriceTagsByBranch: builder.query<
      PriceTagsListResponse,
      {
        restaurantId: string;
        branchId: string;
        search?: string;
        isActive?: boolean;
        isDefault?: boolean;
        menuItemId?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/branch/${branchId}`,
        params,
      }),
      providesTags: [{ type: 'MenuPriceTag', id: 'LIST' }],
    }),

    // Get single price tag
    getMenuPriceTag: builder.query<
      MenuPriceTag,
      { restaurantId: string; priceTagId: string }
    >({
      query: ({ restaurantId, priceTagId }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/${priceTagId}`,
      }),
      providesTags: (result, error, { priceTagId }) => [
        { type: 'MenuPriceTag', id: priceTagId },
      ],
    }),

    // Create price tag
    createMenuPriceTagForBranch: builder.mutation<
      MenuPriceTag,
      {
        restaurantId: string;
        branchId: string;
        body: CreateMenuPriceTagRequest;
      }
    >({
      query: ({ restaurantId, branchId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/branch/${branchId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'MenuPriceTag', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Update price tag
    updateMenuPriceTag: builder.mutation<
      MenuPriceTag,
      {
        restaurantId: string;
        priceTagId: string;
        body: Partial<CreateMenuPriceTagRequest>;
      }
    >({
      query: ({ restaurantId, priceTagId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/${priceTagId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { priceTagId }) => [
        { type: 'MenuPriceTag', id: priceTagId },
        { type: 'MenuPriceTag', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Delete price tag
    deleteMenuPriceTag: builder.mutation<
      { success: boolean },
      { restaurantId: string; priceTagId: string }
    >({
      query: ({ restaurantId, priceTagId }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/${priceTagId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'MenuPriceTag', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Activate/deactivate price tag
    activateMenuPriceTag: builder.mutation<
      MenuPriceTag,
      {
        restaurantId: string;
        branchId: string;
        priceTagId: string;
        body: ActivatePriceTagRequest;
      }
    >({
      query: ({ restaurantId, branchId, priceTagId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/branch/${branchId}/${priceTagId}/activate`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'MenuPriceTag', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Get active price tag for branch
    getActivePriceTag: builder.query<
      MenuPriceTag | { message: string },
      { restaurantId: string; branchId: string }
    >({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/branch/${branchId}/active`,
      }),
      providesTags: [{ type: 'MenuPriceTag', id: 'ACTIVE' }],
    }),

    // Get item price with current pricing
    getItemPrice: builder.query<
      ItemPriceResponse,
      { restaurantId: string; menuItemId: string; priceTagId?: string }
    >({
      query: ({ restaurantId, menuItemId, priceTagId }) => ({
        url: `/restaurants/${restaurantId}/menu/price-tags/menu-item/${menuItemId}/price`,
        params: priceTagId ? { priceTagId } : undefined,
      }),
      providesTags: (result, error, { menuItemId }) => [
        { type: 'MenuPriceTag', id: `ITEM_PRICE_${menuItemId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListMenuPriceTagsByBranchQuery,
  useGetMenuPriceTagQuery,
  useCreateMenuPriceTagForBranchMutation,
  useUpdateMenuPriceTagMutation,
  useDeleteMenuPriceTagMutation,
  useActivateMenuPriceTagMutation,
  useGetActivePriceTagQuery,
  useGetItemPriceQuery,
} = menuPriceTagsApi;