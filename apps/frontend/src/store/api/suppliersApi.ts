import { baseApi } from './baseApi';

export interface Supplier {
  id: string;
  restaurantId: string;
  name: string;
  supplierCode: string;
  contact: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    additionalEmails: string[];
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  gstin?: string;
  panNumber?: string;
  paymentTerms: {
    creditDays: number;
    paymentMethod: 'cash' | 'credit' | 'advance' | 'cod';
    discountPercent?: number;
    discountDays?: number;
    creditLimit?: number;
  };
  categories: string[];
  performance: {
    rating: number;
    onTimeDeliveryPercent: number;
    qualityRating: number;
    totalOrders: number;
    totalOrderValue: number;
    lastOrderDate?: string;
    lastEvaluationDate?: string;
  };
  suppliedBranches: string[];
  notes?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierPayload {
  restaurantId: string;
  name: string;
  supplierCode?: string;
  contact?: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    additionalEmails?: string[];
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  gstin?: string;
  panNumber?: string;
  paymentTerms?: {
    creditDays?: number;
    paymentMethod?: 'cash' | 'credit' | 'advance' | 'cod';
    discountPercent?: number;
    discountDays?: number;
    creditLimit?: number;
  };
  categories?: string[];
  suppliedBranches?: string[];
  notes?: string;
}

export interface UpdateSupplierPayload {
  name?: string;
  contact?: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    additionalEmails?: string[];
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  gstin?: string;
  panNumber?: string;
  paymentTerms?: {
    creditDays?: number;
    paymentMethod?: 'cash' | 'credit' | 'advance' | 'cod';
    discountPercent?: number;
    discountDays?: number;
    creditLimit?: number;
  };
  categories?: string[];
  suppliedBranches?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface SuppliersFilters {
  restaurantId: string;
  search?: string;
  category?: string;
  branchId?: string;
  isActive?: boolean;
  hasEmail?: boolean;
  page?: number;
  limit?: number;
}

export interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SupplierPerformancePayload {
  restaurantId: string;
  supplierId: string;
  rating?: number;
  onTimeDelivery?: boolean;
  qualityRating?: number;
  orderValue?: number;
}

export interface SupplierAnalytics {
  totalSuppliers: number;
  activeSuppliers: number;
  suppliersWithEmail: number;
  averageRating: number;
  categoryCounts: Record<string, number>;
  topRatedSuppliers: Supplier[];
}

export const suppliersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all suppliers
    getSuppliers: builder.query<SuppliersResponse, SuppliersFilters>({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/suppliers`,
        params,
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result?.suppliers
          ? [
              ...result.suppliers.map((supplier) => ({
                type: 'Supplier' as const,
                id: supplier.id,
              })),
              { type: 'Supplier' as const, id: `LIST-${restaurantId}` },
            ]
          : [{ type: 'Supplier' as const, id: `LIST-${restaurantId}` }],
    }),

    // Get supplier by ID
    getSupplierById: builder.query<Supplier, { restaurantId: string; supplierId: string }>({
      query: ({ restaurantId, supplierId }) => `/restaurants/${restaurantId}/suppliers/${supplierId}`,
      providesTags: (_result, _error, { supplierId }) => [
        { type: 'Supplier', id: supplierId },
      ],
    }),

    // Create supplier
    createSupplier: builder.mutation<Supplier, CreateSupplierPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/suppliers`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Supplier', id: `LIST-${restaurantId}` },
        { type: 'SupplierAnalytics', id: restaurantId },
      ],
    }),

    // Update supplier
    updateSupplier: builder.mutation<Supplier, { restaurantId: string; supplierId: string } & UpdateSupplierPayload>({
      query: ({ restaurantId, supplierId, ...body }) => ({
        url: `/restaurants/${restaurantId}/suppliers/${supplierId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, supplierId }) => [
        { type: 'Supplier', id: supplierId },
        { type: 'Supplier', id: `LIST-${restaurantId}` },
        { type: 'SupplierAnalytics', id: restaurantId },
      ],
    }),

    // Delete supplier
    deleteSupplier: builder.mutation<void, { restaurantId: string; supplierId: string }>({
      query: ({ restaurantId, supplierId }) => ({
        url: `/restaurants/${restaurantId}/suppliers/${supplierId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, supplierId }) => [
        { type: 'Supplier', id: supplierId },
        { type: 'Supplier', id: `LIST-${restaurantId}` },
        { type: 'SupplierAnalytics', id: restaurantId },
      ],
    }),

    // Update supplier performance
    updateSupplierPerformance: builder.mutation<Supplier, SupplierPerformancePayload>({
      query: ({ restaurantId, supplierId, ...body }) => ({
        url: `/restaurants/${restaurantId}/suppliers/${supplierId}/performance`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, supplierId }) => [
        { type: 'Supplier', id: supplierId },
        { type: 'Supplier', id: `LIST-${restaurantId}` },
        { type: 'SupplierAnalytics', id: restaurantId },
      ],
    }),

    // Get suppliers by category
    getSuppliersByCategory: builder.query<Supplier[], { restaurantId: string; category: string }>({
      query: ({ restaurantId, category }) => `/restaurants/${restaurantId}/suppliers/category/${category}`,
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map((supplier) => ({
                type: 'Supplier' as const,
                id: supplier.id,
              })),
              { type: 'Supplier' as const, id: `CATEGORY-${restaurantId}` },
            ]
          : [{ type: 'Supplier' as const, id: `CATEGORY-${restaurantId}` }],
    }),

    // Get suppliers by branch
    getSuppliersByBranch: builder.query<Supplier[], { restaurantId: string; branchId: string }>({
      query: ({ restaurantId, branchId }) => `/restaurants/${restaurantId}/suppliers/branch/${branchId}`,
      providesTags: (result, _error, { restaurantId, branchId }) =>
        result
          ? [
              ...result.map((supplier) => ({
                type: 'Supplier' as const,
                id: supplier.id,
              })),
              { type: 'Supplier' as const, id: `BRANCH-${restaurantId}-${branchId}` },
            ]
          : [{ type: 'Supplier' as const, id: `BRANCH-${restaurantId}-${branchId}` }],
    }),

    // Get supplier analytics
    getSupplierAnalytics: builder.query<SupplierAnalytics, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/suppliers/analytics/summary`,
      providesTags: (result, _error, restaurantId) => [
        { type: 'SupplierAnalytics', id: restaurantId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useUpdateSupplierPerformanceMutation,
  useGetSuppliersByCategoryQuery,
  useGetSuppliersByBranchQuery,
  useGetSupplierAnalyticsQuery,
} = suppliersApi;