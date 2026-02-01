import { baseApi } from './baseApi';
import type {
  DashboardOverview,
  PaginatedRestaurants,
  RestaurantDetails,
  PendingSettlement,
  SettlementCalculation,
  SettlementExecution,
  PaginatedSettlements,
  AnalyticsOverview,
  SuperAdminListResponse,
  CreateSuperAdminPayload,
  SuperAdminUser,
} from './types';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard
    getDashboard: builder.query<DashboardOverview, void>({
      query: () => '/admin/dashboard',
      providesTags: ['Dashboard'],
    }),

    // Restaurants
    getAllRestaurants: builder.query<
      PaginatedRestaurants,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 50 } = {}) => ({
        url: '/admin/restaurants',
        params: { page, limit },
      }),
      providesTags: ['Restaurant'],
    }),

    getRestaurantDetails: builder.query<RestaurantDetails, string>({
      query: (restaurantId) => `/admin/restaurants/${restaurantId}`,
      providesTags: (result, error, restaurantId) => [
        { type: 'Restaurant', id: restaurantId },
      ],
    }),

    // Settlements
    getPendingSettlements: builder.query<PendingSettlement[], void>({
      query: () => '/admin/settlements/pending',
      providesTags: ['Settlement'],
    }),

    getSettlementHistory: builder.query<
      PaginatedSettlements,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 50 } = {}) => ({
        url: '/admin/settlements/history',
        params: { page, limit },
      }),
      providesTags: ['Settlement'],
    }),

    calculateSettlement: builder.mutation<SettlementCalculation, string>({
      query: (restaurantId) => ({
        url: `/admin/settlements/${restaurantId}/calculate`,
        method: 'POST',
      }),
      invalidatesTags: ['Settlement'],
    }),

    executeSettlement: builder.mutation<
      SettlementExecution,
      { restaurantId: string; settlementData: any }
    >({
      query: ({ restaurantId, settlementData }) => ({
        url: `/admin/settlements/${restaurantId}/execute`,
        method: 'POST',
        body: settlementData,
      }),
      invalidatesTags: ['Settlement', 'Dashboard'],
    }),

    // Analytics
    getAnalyticsOverview: builder.query<AnalyticsOverview, void>({
      query: () => '/admin/analytics/overview',
      providesTags: ['Analytics'],
    }),

    // Super Admin Management
    getSuperAdmins: builder.query<SuperAdminListResponse, void>({
      query: () => '/admin/super-admins',
      providesTags: ['SuperAdmin'],
    }),

    createSuperAdmin: builder.mutation<SuperAdminUser, CreateSuperAdminPayload>({
      query: (adminData) => ({
        url: '/admin/super-admins',
        method: 'POST',
        body: adminData,
      }),
      invalidatesTags: ['SuperAdmin'],
    }),
  }),
});

export const {
  // Dashboard
  useGetDashboardQuery,

  // Restaurants
  useGetAllRestaurantsQuery,
  useGetRestaurantDetailsQuery,

  // Settlements
  useGetPendingSettlementsQuery,
  useGetSettlementHistoryQuery,
  useCalculateSettlementMutation,
  useExecuteSettlementMutation,

  // Analytics
  useGetAnalyticsOverviewQuery,

  // Super Admin Management
  useGetSuperAdminsQuery,
  useCreateSuperAdminMutation,
} = adminApi;