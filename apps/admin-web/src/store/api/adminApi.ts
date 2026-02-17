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
  VatConfiguration,
  CreateVatConfigurationPayload,
  UpdateVatConfigurationPayload,
  BulkStateVatRatePayload,
  StateVatRateResponse,
  VatConfigurationActivationResponse,
  BulkUpdateResponse,
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

    // VAT Configuration Management
    getAllVatConfigurations: builder.query<VatConfiguration[], { activeOnly?: boolean }>({
      query: ({ activeOnly = false } = {}) => ({
        url: '/admin/vat-configurations',
        params: activeOnly ? { active: 'true' } : {},
      }),
      providesTags: ['VatConfiguration'],
    }),

    getVatConfiguration: builder.query<VatConfiguration, string>({
      query: (id) => `/admin/vat-configurations/${id}`,
      providesTags: (result, error, id) => [{ type: 'VatConfiguration', id }],
    }),

    getActiveVatConfiguration: builder.query<VatConfiguration | null, void>({
      query: () => '/admin/active-vat-configuration',
      providesTags: ['VatConfiguration'],
    }),

    createVatConfiguration: builder.mutation<VatConfiguration, CreateVatConfigurationPayload>({
      query: (configData) => ({
        url: '/admin/vat-configurations',
        method: 'POST',
        body: configData,
      }),
      invalidatesTags: ['VatConfiguration'],
    }),

    updateVatConfiguration: builder.mutation<VatConfiguration, { id: string; data: UpdateVatConfigurationPayload }>({
      query: ({ id, data }) => ({
        url: `/admin/vat-configurations/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['VatConfiguration'],
    }),

    deleteVatConfiguration: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/admin/vat-configurations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['VatConfiguration'],
    }),

    activateVatConfiguration: builder.mutation<VatConfigurationActivationResponse, string>({
      query: (id) => ({
        url: `/admin/vat-configurations/${id}/activate`,
        method: 'POST',
      }),
      invalidatesTags: ['VatConfiguration'],
    }),

    bulkUpdateStateVatRates: builder.mutation<BulkUpdateResponse, { id: string; data: BulkStateVatRatePayload }>({
      query: ({ id, data }) => ({
        url: `/admin/vat-configurations/${id}/bulk-update-states`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['VatConfiguration'],
    }),

    getStateVatRate: builder.query<StateVatRateResponse, { id: string; stateName: string; alcoholType?: string }>({
      query: ({ id, stateName, alcoholType }) => ({
        url: `/admin/vat-configurations/${id}/states/${stateName}/rate`,
        params: alcoholType ? { alcoholType } : {},
      }),
      providesTags: (result, error, { id, stateName }) => [
        { type: 'VatConfiguration', id: `${id}-${stateName}` }
      ],
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

  // VAT Configuration Management
  useGetAllVatConfigurationsQuery,
  useGetVatConfigurationQuery,
  useGetActiveVatConfigurationQuery,
  useCreateVatConfigurationMutation,
  useUpdateVatConfigurationMutation,
  useDeleteVatConfigurationMutation,
  useActivateVatConfigurationMutation,
  useBulkUpdateStateVatRatesMutation,
  useGetStateVatRateQuery,
} = adminApi;