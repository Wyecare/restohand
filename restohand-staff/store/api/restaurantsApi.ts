import { baseApi } from './baseApi';
import type {
  Restaurant,
  RestaurantTable,
  EnhancedRestaurantTable,
} from './types';

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

export const restaurantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRestaurant: builder.query<Restaurant, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}`,
      providesTags: (_result, _error, restaurantId) => [
        { type: 'Restaurant', id: restaurantId },
      ],
    }),

    listServiceTables: builder.query<ServiceTablesResponse, { restaurantId: string }>({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/tables/service`,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.tables.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              { type: 'RestaurantTable' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `LIST-${restaurantId}` }],
    }),

    listEnhancedTables: builder.query<EnhancedRestaurantTable[], { restaurantId: string }>({
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
              { type: 'RestaurantTable' as const, id: `ENHANCED-${restaurantId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `ENHANCED-${restaurantId}` }],
    }),

    listRestaurantTables: builder.query<RestaurantTable[], { restaurantId: string; includeInactive?: boolean }>({
      query: ({ restaurantId, includeInactive }) => ({
        url: `/restaurants/${restaurantId}/tables`,
        params: includeInactive ? { includeInactive: 'true' } : {},
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((table) => ({
                type: 'RestaurantTable' as const,
                id: table.id,
              })),
              { type: 'RestaurantTable' as const, id: `ALL-${restaurantId}` },
            ]
          : [{ type: 'RestaurantTable' as const, id: `ALL-${restaurantId}` }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRestaurantQuery,
  useListServiceTablesQuery,
  useListEnhancedTablesQuery,
  useListRestaurantTablesQuery,
} = restaurantsApi;