import { baseApi } from "./baseApi";
import type {
  EnhancedRestaurantTable,
  Restaurant,
  RestaurantTable,
} from "./types";

export interface ServiceTablesStats {
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  readyTables: number;
}

export interface ServiceTablesResponse {
  tables: RestaurantTable[];
  stats: ServiceTablesStats;
}

export interface CombinedTableInvoice {
  restaurant: {
    id: string;
    name: string;
    address: any;
    gstin: string;
  };
  bill: {
    tableNumber: string;
    orders: any[];
    subtotal: number;
    taxAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    discountAmount?: number;
    roundOffAmount: number;
    billGeneratedAt: string;
  };
}

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRestaurant: builder.query<Restaurant, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}`,
      providesTags: (_result, _error, restaurantId) => [
        { type: "Restaurant", id: restaurantId },
      ],
    }),

    listServiceTables: builder.query<
      ServiceTablesResponse,
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/tables/service`,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.tables.map((table) => ({
                type: "RestaurantTable" as const,
                id: table.id,
              })),
              { type: "RestaurantTable" as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: "RestaurantTable" as const, id: `LIST-${restaurantId}` }],
    }),

    listEnhancedTables: builder.query<
      EnhancedRestaurantTable[],
      { restaurantId: string }
    >({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/tables/enhanced`,
      }),
      providesTags: ["RestaurantTable"],
    }),

    listRestaurantTables: builder.query<
      RestaurantTable[],
      { restaurantId: string; includeInactive?: boolean }
    >({
      query: ({ restaurantId, includeInactive }) => ({
        url: `/restaurants/${restaurantId}/tables`,
        params: includeInactive ? { includeInactive: "true" } : {},
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((table) => ({
                type: "RestaurantTable" as const,
                id: table.id,
              })),
              { type: "RestaurantTable" as const, id: `ALL-${restaurantId}` },
            ]
          : [{ type: "RestaurantTable" as const, id: `ALL-${restaurantId}` }],
    }),

    getCombinedTableInvoice: builder.query<
      CombinedTableInvoice,
      { slug: string; tableId: string; sessionId?: string }
    >({
      query: ({ slug, tableId, sessionId }) => ({
        url: `/public/restaurants/${slug}/table/${tableId}/consolidated-bill`,
        params: sessionId ? { sessionId } : {},
      }),
      keepUnusedDataFor: 0,
    }),

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
              ...result.map((t) => ({ type: 'RestaurantTable' as const, id: t.id })),
              { type: 'RestaurantTable' as const, id: `BRANCH-${restaurantId}-${branchId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `BRANCH-${restaurantId}-${branchId}` }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRestaurantQuery,
  useListServiceTablesQuery,
  useListEnhancedTablesQuery,
  useListRestaurantTablesQuery,
  useGetCombinedTableInvoiceQuery,
  useListRestaurantTablesByBranchQuery,
} = restaurantsApi;
