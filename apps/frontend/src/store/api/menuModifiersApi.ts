import { baseApi } from './baseApi';

export interface ModifierOption {
  id: string;
  name: string;
  description?: string;
  priceAdjustment: number;
  currency: string;
  isAvailable: boolean;
  displayOrder: number;
  imageUrl?: string;
  calories?: number;
  allergens: string[];
}

export interface MenuModifier {
  id: string;
  restaurantId: string;
  branchId: string;
  name: string;
  description?: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ModifierOption[];
  isActive: boolean;
  displayOrder: number;
  applicableMenuItems: string[];
  applicableCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateModifierOption {
  name: string;
  description?: string;
  priceAdjustment: number;
  currency: string;
  isAvailable?: boolean;
  displayOrder?: number;
  imageUrl?: string;
  calories?: number;
  allergens?: string[];
}

export interface CreateMenuModifierRequest {
  name: string;
  description?: string;
  selectionType: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  isRequired?: boolean;
  options: CreateModifierOption[];
  isActive?: boolean;
  displayOrder?: number;
  applicableMenuItems?: string[];
  applicableCategories?: string[];
}

export interface ModifierValidationResponse {
  isValid: boolean;
  error?: string;
  totalPriceAdjustment: number;
}

export interface ModifiersListResponse {
  data: MenuModifier[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const menuModifiersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // List modifiers by branch
    listMenuModifiersByBranch: builder.query<
      ModifiersListResponse,
      {
        restaurantId: string;
        branchId: string;
        search?: string;
        isActive?: boolean;
        menuItemId?: string;
        categoryName?: string;
        page?: number;
        limit?: number;
      }
    >({
      query: ({ restaurantId, branchId, ...params }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/branch/${branchId}`,
        params,
      }),
      providesTags: [{ type: 'MenuModifier', id: 'LIST' }],
    }),

    // Get single modifier
    getMenuModifier: builder.query<
      MenuModifier,
      { restaurantId: string; modifierId: string }
    >({
      query: ({ restaurantId, modifierId }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/${modifierId}`,
      }),
      providesTags: (result, error, { modifierId }) => [
        { type: 'MenuModifier', id: modifierId },
      ],
    }),

    // Create modifier
    createMenuModifierForBranch: builder.mutation<
      MenuModifier,
      {
        restaurantId: string;
        branchId: string;
        body: CreateMenuModifierRequest;
      }
    >({
      query: ({ restaurantId, branchId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/branch/${branchId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'MenuModifier', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Update modifier
    updateMenuModifier: builder.mutation<
      MenuModifier,
      {
        restaurantId: string;
        modifierId: string;
        body: Partial<CreateMenuModifierRequest>;
      }
    >({
      query: ({ restaurantId, modifierId, body }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/${modifierId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { modifierId }) => [
        { type: 'MenuModifier', id: modifierId },
        { type: 'MenuModifier', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Delete modifier
    deleteMenuModifier: builder.mutation<
      { success: boolean },
      { restaurantId: string; modifierId: string }
    >({
      query: ({ restaurantId, modifierId }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/${modifierId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'MenuModifier', id: 'LIST' },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),

    // Get modifiers for menu item
    getModifiersForMenuItem: builder.query<
      MenuModifier[],
      { restaurantId: string; menuItemId: string }
    >({
      query: ({ restaurantId, menuItemId }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/menu-item/${menuItemId}`,
      }),
      providesTags: (result, error, { menuItemId }) => [
        { type: 'MenuModifier', id: `MENU_ITEM_${menuItemId}` },
      ],
    }),

    // Validate modifier selections
    validateModifierSelections: builder.mutation<
      ModifierValidationResponse,
      {
        restaurantId: string;
        modifierId: string;
        selectedOptions: string[];
      }
    >({
      query: ({ restaurantId, modifierId, selectedOptions }) => ({
        url: `/restaurants/${restaurantId}/menu/modifiers/${modifierId}/validate-selections`,
        method: 'POST',
        body: { selectedOptions },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useListMenuModifiersByBranchQuery,
  useGetMenuModifierQuery,
  useCreateMenuModifierForBranchMutation,
  useUpdateMenuModifierMutation,
  useDeleteMenuModifierMutation,
  useGetModifiersForMenuItemQuery,
  useValidateModifierSelectionsMutation,
} = menuModifiersApi;