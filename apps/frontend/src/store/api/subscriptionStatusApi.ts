import { baseApi } from './baseApi';

export interface SubscriptionStatus {
  hasPlan: boolean;
  plan?: {
    tier: string;
    display_name: string;
  };
  usage?: {
    branches: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
    tables: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
    staff: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
    menuItems: {
      current: number;
      limit: number;
      unlimited: boolean;
      percentage: number;
    };
  };
  feature_access?: {
    qr_menu_ordering: boolean;
    digital_receipts: boolean;
    basic_pos: boolean;
    order_management: boolean;
    real_time_analytics: boolean;
    advanced_analytics: boolean;
    customer_crm: boolean;
    inventory_management: boolean;
    multi_location_management: boolean;
    priority_support: boolean;
    custom_integrations: boolean;
    api_access: boolean;
    white_label_options: boolean;
  };
}

export interface SubscriptionLimits {
  limits: {
    canAddBranch: boolean;
    canAddTable: boolean;
    canAddStaff: boolean;
    canAddMenuItem: boolean;
  };
  errors: string[];
}

export const subscriptionStatusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionStatus: builder.query<SubscriptionStatus, { restaurantId: string }>({
      query: ({ restaurantId }) => `/restaurants/${restaurantId}/subscription/status`,
      providesTags: (result, error, { restaurantId }) => [
        { type: 'SubscriptionStatus', id: restaurantId },
      ],
    }),

    checkSubscriptionLimits: builder.query<SubscriptionLimits, { restaurantId: string }>({
      query: ({ restaurantId }) => `/restaurants/${restaurantId}/subscription/limits/check`,
      providesTags: (result, error, { restaurantId }) => [
        { type: 'SubscriptionLimits', id: restaurantId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubscriptionStatusQuery,
  useCheckSubscriptionLimitsQuery,
} = subscriptionStatusApi;