import { baseApi } from './baseApi';

export interface BranchAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BranchCharge {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number;
  applicableFor: 'dine_in' | 'takeout' | 'delivery' | 'all';
  isActive: boolean;
  includedInGst: boolean;
  sortOrder: number;
}

export interface BranchSettings {
  orderNumberPrefix: string;
  enableTakeout: boolean;
  enableDineIn: boolean;
  enableDelivery: boolean;
  deliveryRadius: number;
  deliveryFee: number;
  minimumOrderValue: number;
  openingTime?: string;
  closingTime?: string;
  operatingDays: number[];
  charges: BranchCharge[];
}

export interface Branch {
  _id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description?: string;
  address: BranchAddress;
  contactPhone?: string;
  contactEmail?: string;
  isMainBranch: boolean;
  isActive: boolean;
  settings: BranchSettings;
  managerName?: string;
  managerPhone?: string;
  sortOrder: number;
  establishedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchPayload {
  name: string;
  slug: string;
  description?: string;
  address: BranchAddress;
  contactPhone?: string;
  contactEmail?: string;
  isMainBranch?: boolean;
  isActive?: boolean;
  settings?: Partial<BranchSettings>;
  managerName?: string;
  managerPhone?: string;
  sortOrder?: number;
  establishedDate?: string;
}

export type UpdateBranchPayload = Partial<CreateBranchPayload>;

export const branchesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all branches for the restaurant
    getBranches: builder.query<Branch[], void>({
      query: () => '/branches',
      providesTags: ['Branches'],
    }),

    // Get main branch
    getMainBranch: builder.query<Branch, void>({
      query: () => '/branches/main',
      providesTags: ['Branches'],
    }),

    // Get branch by ID
    getBranch: builder.query<Branch, string>({
      query: (id) => `/branches/${id}`,
      providesTags: (result, error, id) => [{ type: 'Branches', id }],
    }),

    // Get branch by slug
    getBranchBySlug: builder.query<Branch, string>({
      query: (slug) => `/branches/slug/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Branches', id: slug }],
    }),

    // Get branch count
    getBranchCount: builder.query<{ count: number }, void>({
      query: () => '/branches/count',
      providesTags: ['Branches'],
    }),

    // Create new branch
    createBranch: builder.mutation<Branch, CreateBranchPayload>({
      query: (payload) => ({
        url: '/branches',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Branches'],
    }),

    // Update branch
    updateBranch: builder.mutation<Branch, { id: string; payload: UpdateBranchPayload }>({
      query: ({ id, payload }) => ({
        url: `/branches/${id}`,
        method: 'PATCH',
        body: payload,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Branches', id },
        'Branches',
      ],
    }),

    // Delete branch
    deleteBranch: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/branches/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Branches'],
    }),

    // Branch Charges CRUD Operations

    // Get branch charges
    getBranchCharges: builder.query<BranchCharge[], string>({
      query: (branchId) => `/branches/${branchId}/charges`,
      providesTags: (result, error, branchId) => [
        { type: 'BranchCharges', id: branchId },
        'BranchCharges',
      ],
    }),

    // Add branch charge
    addBranchCharge: builder.mutation<BranchCharge, { branchId: string; charge: Omit<BranchCharge, 'sortOrder'> }>({
      query: ({ branchId, charge }) => ({
        url: `/branches/${branchId}/charges`,
        method: 'POST',
        body: charge,
      }),
      invalidatesTags: (result, error, { branchId }) => [
        { type: 'BranchCharges', id: branchId },
        'BranchCharges',
        'Branches',
      ],
    }),

    // Update branch charge
    updateBranchCharge: builder.mutation<BranchCharge, { branchId: string; chargeIndex: number; charge: BranchCharge }>({
      query: ({ branchId, chargeIndex, charge }) => ({
        url: `/branches/${branchId}/charges/${chargeIndex}`,
        method: 'PATCH',
        body: charge,
      }),
      invalidatesTags: (result, error, { branchId }) => [
        { type: 'BranchCharges', id: branchId },
        'BranchCharges',
        'Branches',
      ],
    }),

    // Delete branch charge
    deleteBranchCharge: builder.mutation<{ message: string }, { branchId: string; chargeIndex: number }>({
      query: ({ branchId, chargeIndex }) => ({
        url: `/branches/${branchId}/charges/${chargeIndex}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { branchId }) => [
        { type: 'BranchCharges', id: branchId },
        'BranchCharges',
        'Branches',
      ],
    }),

    // Reorder branch charges
    reorderBranchCharges: builder.mutation<BranchCharge[], { branchId: string; charges: BranchCharge[] }>({
      query: ({ branchId, charges }) => ({
        url: `/branches/${branchId}/charges/reorder`,
        method: 'PATCH',
        body: { charges },
      }),
      invalidatesTags: (result, error, { branchId }) => [
        { type: 'BranchCharges', id: branchId },
        'BranchCharges',
        'Branches',
      ],
    }),
  }),
});

export const {
  useGetBranchesQuery,
  useGetMainBranchQuery,
  useGetBranchQuery,
  useGetBranchBySlugQuery,
  useGetBranchCountQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  // Branch charges hooks
  useGetBranchChargesQuery,
  useAddBranchChargeMutation,
  useUpdateBranchChargeMutation,
  useDeleteBranchChargeMutation,
  useReorderBranchChargesMutation,
} = branchesApi;