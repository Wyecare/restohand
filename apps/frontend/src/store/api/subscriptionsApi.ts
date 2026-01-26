import { baseApi } from './baseApi';

export enum SubscriptionPlan {
  STARTER_MONTHLY = 'starter_monthly',
  STARTER_YEARLY = 'starter_yearly',
  PROFESSIONAL_MONTHLY = 'professional_monthly',
  PROFESSIONAL_YEARLY = 'professional_yearly',
  ENTERPRISE_MONTHLY = 'enterprise_monthly',
  ENTERPRISE_YEARLY = 'enterprise_yearly',
  FOUNDING_MEMBER = 'founding_member',
  EARLY_ADOPTER = 'early_adopter',
}

export enum SubscriptionStatus {
  CREATED = 'created',
  AUTHENTICATED = 'authenticated',
  ACTIVE = 'active',
  PENDING = 'pending',
  HALTED = 'halted',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export interface PlanFeatures {
  locations?: number | string;
  tables?: number | string;
  analytics?: string;
  support?: string;
  customBranding?: boolean;
  inventoryAlerts?: boolean;
  customIntegrations?: boolean;
  dedicatedManager?: boolean;
}

export interface SubscriptionPlanDetails {
  razorpayPlanId: string;
  planType: SubscriptionPlan;
  name: string;
  amount: number;
  currency: string;
  period: string;
  interval: number;
  features: PlanFeatures;
}

export interface SubscriptionData {
  id: string;
  razorpaySubscriptionId: string;
  razorpayCustomerId?: string;
  plan: SubscriptionPlanDetails;
  status: SubscriptionStatus;
  isGrandfathered: boolean;
  grandfatherReason?: string;
  currentStart?: string;
  currentEnd?: string;
  // Trial period handled by Razorpay start_at date
  startAt?: string;
  chargeAt?: string;
  quantity: number;
  totalCount?: number;
  paidCount: number;
  remainingCount?: number;
  authAttempts?: number;
  expireBy?: string;
  shortUrl?: string; // CRITICAL: Payment authorization URL
  hasScheduledChanges?: boolean;
  scheduleChangeAt?: string;
  customerNotify?: boolean;
  billingHistory?: Array<{
    invoiceId: string;
    amount: number;
    paidAt: string;
    status: string;
  }>;
  lastWebhookAt?: string;
  lastWebhookEvent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionStatusResponse {
  restaurantId: string;
  hasSubscription: boolean;
  subscription?: SubscriptionData;
  plan?: SubscriptionPlanDetails;
  status?: SubscriptionStatus;
  isActive: boolean;
  isInTrialPeriod: boolean;
  trialEndsAt?: string;
  currentStart?: string;
  currentEnd?: string;
  nextChargeAt?: string;
  features?: PlanFeatures;
  razorpayData?: {
    id: string;
    status: string;
    currentStart?: string;
    currentEnd?: string;
    chargeAt?: string;
    totalCount?: number;
    paidCount?: number;
    remainingCount?: number;
  };
}

export interface PlanOption {
  id: string; // Razorpay plan ID
  name: string;
  description?: string;
  amount: number;
  currency: string;
  period: string;
  interval: number;
  tier: string;
  isTestPlan: boolean;
  billingCycle?: string;
  features: string[]; // Array of feature strings
  popular?: boolean;
  createdAt?: number;
}

export interface PlansResponse {
  plans: PlanOption[];
  total: number;
  isDevMode: boolean;
}

export interface CreateSubscriptionRequest {
  restaurantId: string;
  planId: string; // Use Razorpay plan ID directly
  totalCount?: number;
  startAt?: number;
  customerNotify?: boolean;
  notes?: Record<string, any>;
}

export interface UpdateSubscriptionRequest {
  planType?: SubscriptionPlan;
  scheduleChangeAt?: string;
  customerNotify?: boolean;
  notes?: Record<string, any>;
}

export interface PaymentHistoryResponse {
  subscription?: {
    id: string;
    razorpayId: string;
    status: SubscriptionStatus;
    plan: SubscriptionPlanDetails;
    currentStart?: string;
    currentEnd?: string;
    totalCount?: number;
    paidCount: number;
    remainingCount?: number;
    createdAt: string;
  };
  payments: Array<{
    invoiceId: string;
    amount: number;
    paidAt: string;
    status: string;
  }>;
  razorpayData?: {
    status: string;
    currentStart?: number;
    currentEnd?: number;
    chargeAt?: number;
  };
}

export interface SubscriptionAnalytics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  monthlyRecurringRevenue: number;
  planDistribution: Record<string, { count: number; revenue: number }>;
  statusDistribution: Array<{
    _id: { status: string; planType: string };
    count: number;
    totalRevenue: number;
  }>;
  churnRate: string;
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
}

export const subscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all available subscription plans
    getAllPlans: builder.query<PlansResponse, void>({
      query: () => '/plans',
      providesTags: ['SubscriptionPlans'],
    }),

    // Get subscription status for a restaurant
    getSubscriptionStatus: builder.query<SubscriptionStatusResponse, string>({
      query: (restaurantId) => `/subscriptions/restaurant/${restaurantId}/status`,
      providesTags: (result, error, restaurantId) => [
        { type: 'Subscription', id: restaurantId },
      ],
    }),

    // Create a new subscription
    createSubscription: builder.mutation<{
      message: string;
      subscription: SubscriptionData;
    }, CreateSubscriptionRequest>({
      query: (data) => ({
        url: '/subscriptions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId }) => [
        { type: 'Subscription', id: restaurantId },
      ],
    }),

    // Update subscription (upgrade/downgrade)
    updateSubscription: builder.mutation<{
      message: string;
      subscription: SubscriptionData;
    }, { subscriptionId: string; data: UpdateSubscriptionRequest }>({
      query: ({ subscriptionId, data }) => ({
        url: `/subscriptions/${subscriptionId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { subscriptionId }) => [
        { type: 'Subscription', id: subscriptionId },
      ],
    }),

    // Pause subscription
    pauseSubscription: builder.mutation<{
      message: string;
      subscription: SubscriptionData;
    }, string>({
      query: (subscriptionId) => ({
        url: `/subscriptions/${subscriptionId}/pause`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, subscriptionId) => [
        { type: 'Subscription', id: subscriptionId },
      ],
    }),

    // Resume subscription
    resumeSubscription: builder.mutation<{
      message: string;
      subscription: SubscriptionData;
    }, string>({
      query: (subscriptionId) => ({
        url: `/subscriptions/${subscriptionId}/resume`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, subscriptionId) => [
        { type: 'Subscription', id: subscriptionId },
      ],
    }),

    // Cancel subscription
    cancelSubscription: builder.mutation<{
      message: string;
      subscription: SubscriptionData;
    }, { subscriptionId: string; cancelAtCycleEnd?: boolean }>({
      query: ({ subscriptionId, cancelAtCycleEnd = true }) => ({
        url: `/subscriptions/${subscriptionId}?cancelAtCycleEnd=${cancelAtCycleEnd}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { subscriptionId }) => [
        { type: 'Subscription', id: subscriptionId },
      ],
    }),

    // Get payment history
    getPaymentHistory: builder.query<PaymentHistoryResponse, string>({
      query: (restaurantId) => `/subscriptions/restaurant/${restaurantId}/payment-history`,
      providesTags: (result, error, restaurantId) => [
        { type: 'PaymentHistory', id: restaurantId },
      ],
    }),

    // Admin endpoints
    getSubscriptionAnalytics: builder.query<SubscriptionAnalytics, void>({
      query: () => '/subscriptions/analytics',
      providesTags: ['SubscriptionAnalytics'],
    }),

    // Create grandfathered subscription for early customers
    createGrandfatheredSubscription: builder.mutation<{
      message: string;
      subscription: SubscriptionData;
    }, {
      restaurantId: string;
      planType: SubscriptionPlan.FOUNDING_MEMBER | SubscriptionPlan.EARLY_ADOPTER;
      reason: string;
    }>({
      query: ({ restaurantId, ...data }) => ({
        url: `/subscriptions/restaurant/${restaurantId}/grandfathered`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId }) => [
        { type: 'Subscription', id: restaurantId },
        'SubscriptionAnalytics',
      ],
    }),

    // Migrate legacy subscription
    migrateLegacySubscription: builder.mutation<{
      message: string;
      subscription?: SubscriptionData;
    }, string>({
      query: (restaurantId) => ({
        url: `/subscriptions/restaurant/${restaurantId}/migrate`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, restaurantId) => [
        { type: 'Subscription', id: restaurantId },
        'SubscriptionAnalytics',
      ],
    }),

    // Legacy onboarding endpoint (kept for compatibility)
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
  useGetAllPlansQuery,
  useGetSubscriptionStatusQuery,
  useCreateSubscriptionMutation,
  useUpdateSubscriptionMutation,
  usePauseSubscriptionMutation,
  useResumeSubscriptionMutation,
  useCancelSubscriptionMutation,
  useGetPaymentHistoryQuery,
  useGetSubscriptionAnalyticsQuery,
  useCreateGrandfatheredSubscriptionMutation,
  useMigrateLegacySubscriptionMutation,
  useOnboardRestaurantMutation,
} = subscriptionsApi;