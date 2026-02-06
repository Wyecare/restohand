import { baseApi } from './baseApi';

export interface CashfreePlan {
  _id?: string;
  cashfree_plan_id: string;
  plan_id?: string; // for backward compatibility
  plan_name: string;
  plan_type: string;
  plan_currency: string;
  plan_recurring_amount?: number;
  plan_amount?: number; // for backward compatibility
  plan_max_amount: number;
  plan_max_cycles?: number;
  plan_intervals: number;
  plan_interval_type: string;
  plan_note?: string;
  plan_status: string;

  // Our custom business fields
  tier?: string;
  display_name?: string;
  description?: string;
  features?: string[];
  is_popular?: boolean;
  metadata?: {
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
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
  cashfree_sync_status?: 'PENDING' | 'SYNCED' | 'FAILED';
  last_synced_at?: string;

  // For backward compatibility
  plan_metadata?: {
    tier?: string;
    features?: string;
    display_name?: string;
    is_popular?: boolean;
    [key: string]: any;
  };
}

export interface CreateCashfreePlanRequest {
  plan_name: string;
  plan_type: 'PERIODIC' | 'ON_DEMAND';
  plan_amount: number;
  plan_max_amount: number;
  plan_max_cycles: number;
  plan_intervals: number;
  plan_currency: string;
  plan_interval_type: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  plan_note?: string;
  plan_metadata?: {
    tier?: string;
    features?: string;
    display_name?: string;
    is_popular?: boolean;
    [key: string]: any;
  };
}

export interface UpdateCashfreePlanRequest {
  plan_amount?: number;
  plan_max_amount?: number;
  plan_note?: string;
  plan_metadata?: {
    tier?: string;
    features?: string;
    display_name?: string;
    is_popular?: boolean;
    [key: string]: any;
  };
}

export interface PlanTemplate {
  id: string;
  name: string;
  plan_id: string;
  plan_name: string;
  plan_type: string;
  plan_recurring_amount: number;
  plan_max_amount: number;
  plan_max_cycles: number;
  plan_intervals: number;
  plan_currency: string;
  plan_interval_type: string;
  plan_note: string;
  tier: string;
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
}

// Updated baseApi with SubscriptionPlan tag type
const updatedBaseApi = baseApi.enhanceEndpoints({
  addTagTypes: ['SubscriptionPlan'],
});

export const subscriptionPlanApiSlice = updatedBaseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all Cashfree subscription plans
    getCashfreePlans: builder.query<CashfreePlan[], void>({
      query: () => '/admin/cashfree/plans',
      providesTags: ['SubscriptionPlan'],
    }),

    // Get specific Cashfree subscription plan
    getCashfreePlan: builder.query<CashfreePlan, string>({
      query: (planId) => `/admin/cashfree/plans/${planId}`,
      providesTags: (_result, _error, planId) => [
        { type: 'SubscriptionPlan', id: planId },
      ],
    }),

    // Create new Cashfree subscription plan
    createCashfreePlan: builder.mutation<CashfreePlan, CreateCashfreePlanRequest>({
      query: (planData) => ({
        url: '/admin/cashfree/plans',
        method: 'POST',
        body: planData,
      }),
      invalidatesTags: ['SubscriptionPlan'],
    }),

    // Update Cashfree subscription plan
    updateCashfreePlan: builder.mutation<
      CashfreePlan,
      { planId: string; planData: UpdateCashfreePlanRequest }
    >({
      query: ({ planId, planData }) => ({
        url: `/admin/cashfree/plans/${planId}`,
        method: 'PUT',
        body: planData,
      }),
      invalidatesTags: (_result, _error, { planId }) => [
        { type: 'SubscriptionPlan', id: planId },
        'SubscriptionPlan',
      ],
    }),

    // Delete Cashfree subscription plan
    deleteCashfreePlan: builder.mutation<{ success: boolean }, string>({
      query: (planId) => ({
        url: `/admin/cashfree/plans/${planId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SubscriptionPlan'],
    }),

    // Get recommended plan templates
    getRecommendedPlanTemplates: builder.query<PlanTemplate[], void>({
      query: () => '/admin/cashfree/plans/templates/recommended',
    }),

    // Import existing Cashfree plan
    importCashfreePlan: builder.mutation<CashfreePlan, string>({
      query: (cashfreePlanId) => ({
        url: `/admin/cashfree/plans/import/${cashfreePlanId}`,
        method: 'POST',
      }),
      invalidatesTags: ['SubscriptionPlan'],
    }),
  }),
});

// Export hooks for components to use
export const {
  useGetCashfreePlansQuery,
  useGetCashfreePlanQuery,
  useCreateCashfreePlanMutation,
  useUpdateCashfreePlanMutation,
  useDeleteCashfreePlanMutation,
  useGetRecommendedPlanTemplatesQuery,
  useImportCashfreePlanMutation,
} = subscriptionPlanApiSlice;

// Export API functions for non-React code
export const subscriptionPlanApi = {
  getPlans: async (): Promise<CashfreePlan[]> => {
    const response = await fetch('/api/admin/cashfree/plans', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch plans: ${response.statusText}`);
    }

    return response.json();
  },

  getPlan: async (planId: string): Promise<CashfreePlan> => {
    const response = await fetch(`/api/admin/cashfree/plans/${planId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch plan: ${response.statusText}`);
    }

    return response.json();
  },

  createPlan: async (planData: CreateCashfreePlanRequest): Promise<CashfreePlan> => {
    const response = await fetch('/api/admin/cashfree/plans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create plan: ${response.statusText}`);
    }

    return response.json();
  },

  updatePlan: async (planId: string, planData: UpdateCashfreePlanRequest): Promise<CashfreePlan> => {
    const response = await fetch(`/api/admin/cashfree/plans/${planId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(planData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update plan: ${response.statusText}`);
    }

    return response.json();
  },

  deletePlan: async (planId: string): Promise<{ success: boolean }> => {
    const response = await fetch(`/api/admin/cashfree/plans/${planId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete plan: ${response.statusText}`);
    }

    return { success: true };
  },

  getRecommendedTemplates: async (): Promise<PlanTemplate[]> => {
    const response = await fetch('/api/admin/cashfree/plans/templates/recommended', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    return response.json();
  },
};