import { baseApi } from './baseApi';

export interface SubscriptionStatus {
  restaurantId: string;
  plan: 'standard';
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  isActive: boolean;
  trialEndsAt: string;
  nextBillingDate: string;
  monthlyPrice: number;
  daysUntilBilling: number;
  billingCycle: 'monthly';
  razorpaySubscription?: {
    id: string;
    status: string;
    plan_id: string;
    customer_id: string;
    current_start: string;
    current_end: string;
    ended_at?: string;
    charge_at: string;
    total_count: number;
    paid_count: number;
    remaining_count: number;
  };
}

export interface RestaurantOnboardingData {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessType: 'sole_proprietorship' | 'partnership' | 'private_limited' | 'public_limited';
  gstNumber?: string;
  panNumber?: string;
  bankAccount: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
}

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubscriptionStatus: builder.query<SubscriptionStatus, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/subscription/status`,
      providesTags: ['Subscription'],
    }),

    createSubscription: builder.mutation<{
      message: string;
      subscriptionId: string;
      customerId: string;
      planId: string;
      status: string;
      amount: number;
      nextBillingDate: string;
    }, string>({
      query: (restaurantId) => ({
        url: `/restaurants/${restaurantId}/subscription/create`,
        method: 'POST',
      }),
      invalidatesTags: ['Subscription'],
    }),

    reactivateSubscription: builder.mutation<{ message: string }, string>({
      query: (restaurantId) => ({
        url: `/restaurants/${restaurantId}/subscription/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: ['Subscription'],
    }),

    getPaymentHistory: builder.query<{
      subscription?: {
        id: string;
        status: string;
        plan_id: string;
        created_at: number;
        current_start: number;
        current_end: number;
      };
      payments: any[];
    }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/subscription/payment-history`,
      providesTags: ['Subscription'],
    }),

    onboardRestaurant: builder.mutation<{
      message: string;
      restaurant: {
        id: string;
        name: string;
        slug: string;
        saasConfig: any;
        paymentConfig: any;
      }
    }, RestaurantOnboardingData>({
      query: (data) => ({
        url: '/restaurants/onboard',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Restaurant', 'Subscription'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubscriptionStatusQuery,
  useCreateSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useGetPaymentHistoryQuery,
  useOnboardRestaurantMutation,
} = subscriptionsApi;