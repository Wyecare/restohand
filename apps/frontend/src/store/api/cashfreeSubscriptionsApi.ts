import { baseApi } from './baseApi';

// Cashfree Subscription Types
export interface CashfreeSubscriptionPlan {
  _id?: string;
  cashfree_plan_id: string;
  plan_name: string;
  plan_type: 'PERIODIC' | 'ON_DEMAND';
  plan_currency: string;
  plan_recurring_amount: number;
  plan_max_amount: number;
  plan_max_cycles?: number;
  plan_intervals: number;
  plan_interval_type: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  plan_note?: string;
  plan_status: 'ACTIVE' | 'INACTIVE';

  // Business metadata
  tier: 'basic' | 'professional' | 'enterprise';
  display_name: string;
  description: string;
  features: string[];
  is_popular: boolean;
  metadata: {
    max_locations?: number;
    max_tables?: number;
    max_staff?: number;
    max_monthly_orders?: number;
    target_segment?: string;
    key_benefit?: string;
    savings_percent?: number;
    [key: string]: any;
  };

  // Audit fields
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CashfreeSubscription {
  _id: string;
  restaurant_id: string;
  cashfree_subscription_id: string;
  cashfree_customer_id: string;
  plan: CashfreeSubscriptionPlan;
  status: 'INITIALIZED' | 'ACTIVE' | 'CANCELLED' | 'BANK_APPROVAL_PENDING' | 'AUTHORIZATION_FAILED';
  current_cycle: number;
  cycles_completed: number;
  failure_reason?: string;

  // Payment authorization
  authorization_amount: number;
  auth_link?: string; // Cashfree payment link for authorization
  is_authorized: boolean;

  // Billing dates
  current_cycle_start?: string;
  current_cycle_end?: string;
  next_billing_at?: string;

  // Trial information
  trial_ends_at?: string;
  is_in_trial: boolean;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

export interface CreateCashfreeSubscriptionRequest {
  restaurant_id: string;
  plan_id: string; // MongoDB ObjectId of the plan
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  return_url?: string;
}

export interface CreateCashfreeSubscriptionResponse {
  subscription: CashfreeSubscription;
  authorization_url: string | null;
  requires_authorization: boolean;
}

export interface SubscriptionStatusResponse {
  restaurant_id: string;
  has_subscription: boolean;
  subscription?: CashfreeSubscription;
  is_active: boolean;
  is_in_trial: boolean;
  trial_ends_at?: string;
  next_billing_at?: string;
  features: string[];
  usage_limits: {
    max_locations: number;
    max_tables: number;
    max_staff: number;
    max_monthly_orders: number;
  };
}

export interface PlansListResponse {
  plans: CashfreeSubscriptionPlan[];
  total: number;
  featured_plans: CashfreeSubscriptionPlan[];
}

export interface UpdateSubscriptionRequest {
  plan_id: string;
  notes?: Record<string, any>;
}

export interface SubscriptionPaymentHistory {
  subscription_id: string;
  payments: Array<{
    payment_id: string;
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    payment_method: string;
    paid_at: string;
    failure_reason?: string;
  }>;
  cycles: Array<{
    cycle_number: number;
    cycle_start: string;
    cycle_end: string;
    amount_due: number;
    payment_status: 'PAID' | 'UNPAID' | 'FAILED';
    payment_date?: string;
  }>;
}


// Create the RTK Query API slice
export const cashfreeSubscriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all available Cashfree subscription plans for restaurants
    getCashfreeSubscriptionPlans: builder.query<PlansListResponse, void>({
      query: () => '/subscriptions/cashfree/plans',
      providesTags: ['CashfreeSubscriptionPlan'],
    }),

    // Get subscription status for current restaurant
    getCashfreeSubscriptionStatus: builder.query<SubscriptionStatusResponse, string>({
      query: (restaurantId) => `/subscriptions/cashfree/restaurant/${restaurantId}/status`,
      providesTags: (result, error, restaurantId) => [
        { type: 'CashfreeSubscription', id: restaurantId },
      ],
    }),

    // Create new Cashfree subscription
    createCashfreeSubscription: builder.mutation<CreateCashfreeSubscriptionResponse, CreateCashfreeSubscriptionRequest>({
      query: (data) => ({
        url: '/subscriptions/cashfree',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurant_id }) => [
        { type: 'CashfreeSubscription', id: restaurant_id },
        'CashfreeSubscriptionPlan',
      ],
    }),

    // Update/upgrade subscription plan
    updateCashfreeSubscription: builder.mutation<{
      message: string;
      subscription: CashfreeSubscription;
    }, { subscription_id: string; data: UpdateSubscriptionRequest }>({
      query: ({ subscription_id, data }) => ({
        url: `/subscriptions/cashfree/${subscription_id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { subscription_id }) => [
        { type: 'CashfreeSubscription', id: subscription_id },
      ],
    }),

    // Cancel subscription
    cancelCashfreeSubscription: builder.mutation<{
      message: string;
      subscription: CashfreeSubscription;
    }, { subscription_id: string; reason?: string }>({
      query: ({ subscription_id, reason }) => ({
        url: `/subscriptions/cashfree/${subscription_id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { subscription_id }) => [
        { type: 'CashfreeSubscription', id: subscription_id },
      ],
    }),

    // Get payment history
    getCashfreePaymentHistory: builder.query<SubscriptionPaymentHistory, string>({
      query: (restaurantId) => `/subscriptions/cashfree/restaurant/${restaurantId}/payment-history`,
      providesTags: (result, error, restaurantId) => [
        { type: 'CashfreePaymentHistory', id: restaurantId },
      ],
    }),

    // Retry failed payment
    retryFailedPayment: builder.mutation<AuthorizePaymentResponse, {
      subscription_id: string;
      cycle_number?: number;
    }>({
      query: (data) => ({
        url: '/subscriptions/cashfree/retry-payment',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { subscription_id }) => [
        { type: 'CashfreeSubscription', id: subscription_id },
        { type: 'CashfreePaymentHistory', id: subscription_id },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for components
export const {
  useGetCashfreeSubscriptionPlansQuery,
  useGetCashfreeSubscriptionStatusQuery,
  useCreateCashfreeSubscriptionMutation,
  useUpdateCashfreeSubscriptionMutation,
  useCancelCashfreeSubscriptionMutation,
  useGetCashfreePaymentHistoryQuery,
  useRetryFailedPaymentMutation,
} = cashfreeSubscriptionsApi;

// Helper functions for formatting
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount / 100);
};

export const formatPlanInterval = (intervals: number, intervalType: string) => {
  if (intervals === 1) {
    return intervalType.toLowerCase();
  }
  return `${intervals} ${intervalType.toLowerCase()}s`;
};

export const getStatusColor = (status: CashfreeSubscription['status']) => {
  switch (status) {
    case 'ACTIVE':
      return 'text-green-600';
    case 'BANK_APPROVAL_PENDING':
    case 'INITIALIZED':
      return 'text-yellow-600';
    case 'CANCELLED':
    case 'AUTHORIZATION_FAILED':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export const getStatusBadgeVariant = (status: CashfreeSubscription['status']) => {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'BANK_APPROVAL_PENDING':
    case 'INITIALIZED':
      return 'secondary';
    case 'CANCELLED':
    case 'AUTHORIZATION_FAILED':
      return 'destructive';
    default:
      return 'outline';
  }
};