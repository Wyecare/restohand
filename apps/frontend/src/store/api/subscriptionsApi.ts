import { baseApi } from './baseApi';

export interface SubscriptionStatus {
  restaurantId: string;
  plan: 'starter' | 'pro' | 'enterprise';
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  isActive: boolean;
  trialEndsAt: string;
  nextBillingDate: string;
  monthlyPrice: number;
  daysUntilBilling: number;
}

export interface UpgradeSubscriptionRequest {
  plan: 'starter' | 'pro' | 'enterprise';
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

    upgradeSubscription: builder.mutation<SubscriptionStatus, { restaurantId: string; data: UpgradeSubscriptionRequest }>({
      query: ({ restaurantId, data }) => ({
        url: `/restaurants/${restaurantId}/subscription/upgrade`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Subscription'],
    }),

    reactivateSubscription: builder.mutation<SubscriptionStatus, string>({
      query: (restaurantId) => ({
        url: `/restaurants/${restaurantId}/subscription/reactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Subscription'],
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

    createSubscriptionPaymentIntent: builder.mutation<
      {
        razorpayOrderId: string;
        razorpayKey: string;
        amount: number;
        currency: string;
        description: string;
      },
      { restaurantId: string; plan: 'starter' | 'pro' | 'enterprise' }
    >({
      query: ({ restaurantId, plan }) => ({
        url: `/restaurants/${restaurantId}/subscription/create-payment-intent`,
        method: 'POST',
        body: { plan },
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSubscriptionStatusQuery,
  useUpgradeSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useOnboardRestaurantMutation,
  useCreateSubscriptionPaymentIntentMutation,
} = subscriptionsApi;