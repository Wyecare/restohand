import { baseApi } from './baseApi';

export interface RecipeIngredient {
  inventoryItemId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit?: number;
  totalCost?: number;
  notes?: string;
}

export interface RecipeNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface RecipeCostAnalysis {
  totalIngredientCost: number;
  laborCost?: number;
  overheadCost?: number;
  totalCost: number;
  sellingPrice?: number;
  profitMargin?: number;
  profit?: number;
  lastCalculated?: string;
}

export interface Recipe {
  id: string;
  restaurantId: string;
  menuItemId?: string;
  name: string;
  description?: string;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  preparationTime?: number;
  cookingTime?: number;
  totalTime?: number;
  difficulty?: string;
  dietaryTags: string[];
  nutrition?: RecipeNutrition;
  costAnalysis: RecipeCostAnalysis;
  category?: string;
  isActive: boolean;
  isStandardized: boolean;
  notes?: string;
  imageUrls: string[];
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipePayload {
  restaurantId: string;
  menuItemId?: string;
  name: string;
  description?: string;
  servings: number;
  ingredients: {
    inventoryItemId: string;
    quantity: number;
    unit: string;
    notes?: string;
  }[];
  instructions?: string[];
  preparationTime?: number;
  cookingTime?: number;
  difficulty?: string;
  dietaryTags?: string[];
  category?: string;
  notes?: string;
  laborCostPerServing?: number;
  overheadCostPerServing?: number;
}

export interface UpdateRecipePayload extends Partial<CreateRecipePayload> {
  isStandardized?: boolean;
}

export interface RecipeFilters {
  restaurantId: string;
  category?: string;
  isStandardized?: boolean;
  hasMenuItem?: boolean;
  search?: string;
}

export interface RecipeCostSummary {
  totalRecipes: number;
  averageFoodCost: number;
  averageProfitMargin: number;
  topProfitableRecipes: {
    recipeId: string;
    name: string;
    profitMargin: number;
    profit: number;
  }[];
  lowMarginRecipes: {
    recipeId: string;
    name: string;
    profitMargin: number;
    totalCost: number;
  }[];
}

export const recipesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Recipe CRUD
    getRecipes: builder.query<Recipe[], RecipeFilters>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/recipes`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((recipe) => ({
                type: 'Recipe' as const,
                id: recipe.id,
              })),
              { type: 'Recipe' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'Recipe' as const, id: `LIST-${restaurantId}` }],
    }),

    getRecipe: builder.query<Recipe, { restaurantId: string; recipeId: string }>({
      query: ({ restaurantId, recipeId }) =>
        `/restaurants/${restaurantId}/recipes/${recipeId}`,
      providesTags: (_result, _error, { recipeId }) => [
        { type: 'Recipe', id: recipeId },
      ],
    }),

    createRecipe: builder.mutation<Recipe, CreateRecipePayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/recipes`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Recipe', id: `LIST-${restaurantId}` },
        { type: 'RecipeCostSummary', id: restaurantId },
        { type: 'InventoryItem', id: `LIST-${restaurantId}` }, // Recipes affect inventory usage
      ],
    }),

    updateRecipe: builder.mutation<
      Recipe,
      { restaurantId: string; recipeId: string } & UpdateRecipePayload
    >({
      query: ({ restaurantId, recipeId, ...body }) => ({
        url: `/restaurants/${restaurantId}/recipes/${recipeId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, recipeId }) => [
        { type: 'Recipe', id: recipeId },
        { type: 'Recipe', id: `LIST-${restaurantId}` },
        { type: 'RecipeCostSummary', id: restaurantId },
      ],
    }),

    deleteRecipe: builder.mutation<
      void,
      { restaurantId: string; recipeId: string }
    >({
      query: ({ restaurantId, recipeId }) => ({
        url: `/restaurants/${restaurantId}/recipes/${recipeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, recipeId }) => [
        { type: 'Recipe', id: recipeId },
        { type: 'Recipe', id: `LIST-${restaurantId}` },
        { type: 'RecipeCostSummary', id: restaurantId },
      ],
    }),

    // Cost management
    getRecipeCostSummary: builder.query<RecipeCostSummary, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/recipes/cost-summary`,
      providesTags: (result, _error, restaurantId) => [
        { type: 'RecipeCostSummary', id: restaurantId },
      ],
    }),

    recalculateAllCosts: builder.mutation<
      { success: boolean; message: string; updated: number },
      string
    >({
      query: (restaurantId) => ({
        url: `/restaurants/${restaurantId}/recipes/recalculate-costs`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, restaurantId) => [
        { type: 'Recipe', id: `LIST-${restaurantId}` },
        { type: 'RecipeCostSummary', id: restaurantId },
      ],
    }),

    // Standardization
    standardizeRecipe: builder.mutation<
      Recipe,
      { restaurantId: string; recipeId: string }
    >({
      query: ({ restaurantId, recipeId }) => ({
        url: `/restaurants/${restaurantId}/recipes/${recipeId}/standardize`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, { restaurantId, recipeId }) => [
        { type: 'Recipe', id: recipeId },
        { type: 'Recipe', id: `LIST-${restaurantId}` },
      ],
    }),

    unstandardizeRecipe: builder.mutation<
      Recipe,
      { restaurantId: string; recipeId: string }
    >({
      query: ({ restaurantId, recipeId }) => ({
        url: `/restaurants/${restaurantId}/recipes/${recipeId}/unstandardize`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, { restaurantId, recipeId }) => [
        { type: 'Recipe', id: recipeId },
        { type: 'Recipe', id: `LIST-${restaurantId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRecipesQuery,
  useGetRecipeQuery,
  useCreateRecipeMutation,
  useUpdateRecipeMutation,
  useDeleteRecipeMutation,
  useGetRecipeCostSummaryQuery,
  useRecalculateAllCostsMutation,
  useStandardizeRecipeMutation,
  useUnstandardizeRecipeMutation,
} = recipesApi;