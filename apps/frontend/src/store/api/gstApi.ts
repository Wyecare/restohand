import { baseApi } from './baseApi';

export interface GstRate {
  id: string;
  restaurantId: string;
  categoryName: string;
  description?: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  totalGstRate: number;
  isActive: boolean;
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HsnCode {
  id: string;
  code: string;
  description: string;
  chapter?: string;
  heading?: string;
  defaultGstRate: number;
  keywords: string[];
  category: 'food' | 'beverage' | 'other';
  isActive: boolean;
  isPopular: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGstRateRequest {
  categoryName?: string;
  description?: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  totalGstRate: number;
  isActive?: boolean;
  isDefault?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
}

export interface TaxCalculationRequest {
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    hsnCode?: string;
    gstRateId?: string;
  }>;
  customerState?: string;
}

export interface OrderItemWithTax {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  hsnCode?: string;
  gstRateId?: string;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  discountAmount: number;
  taxableAmount: number;
  grossAmount: number;
  totalWithTax: number;
  isTaxInclusive: boolean;
}

export interface TaxCalculationResponse {
  items: OrderItemWithTax[];
  summary: {
    grossAmount: number;
    discountAmount: number;
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTaxAmount: number;
    totalAmount: number;
    taxType: 'intra-state' | 'inter-state';
  };
}

export const gstApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GST Rates
    createGstRate: builder.mutation<GstRate, { restaurantId: string; data: CreateGstRateRequest }>({
      query: ({ restaurantId, data }) => ({
        url: `/restaurants/${restaurantId}/gst/rates`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['GstRate'],
    }),

    getGstRates: builder.query<{ data: GstRate[]; total: number }, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/gst/rates`,
      providesTags: ['GstRate'],
    }),

    getDefaultGstRate: builder.query<GstRate | null, string>({
      query: (restaurantId) => `/restaurants/${restaurantId}/gst/rates/default`,
      providesTags: ['GstRate'],
    }),

    updateGstRate: builder.mutation<GstRate, { restaurantId: string; id: string; data: Partial<CreateGstRateRequest> }>({
      query: ({ restaurantId, id, data }) => ({
        url: `/restaurants/${restaurantId}/gst/rates/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['GstRate'],
    }),

    deleteGstRate: builder.mutation<{ success: boolean }, { restaurantId: string; id: string }>({
      query: ({ restaurantId, id }) => ({
        url: `/restaurants/${restaurantId}/gst/rates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['GstRate'],
    }),

    // Tax Calculation
    calculateTax: builder.mutation<TaxCalculationResponse, { restaurantId: string; data: TaxCalculationRequest }>({
      query: ({ restaurantId, data }) => ({
        url: `/restaurants/${restaurantId}/gst/calculate`,
        method: 'POST',
        body: data,
      }),
    }),

    // HSN Codes
    getHsnCodes: builder.query<{ data: HsnCode[]; total: number }, { search?: string; category?: string; isPopular?: boolean }>({
      query: (params) => ({
        url: '/hsn-codes',
        params,
      }),
      providesTags: ['HsnCode'],
    }),

    getHsnCodeByCode: builder.query<HsnCode | null, string>({
      query: (code) => `/hsn-codes/by-code/${code}`,
      providesTags: ['HsnCode'],
    }),
  }),
});

export const {
  useCreateGstRateMutation,
  useGetGstRatesQuery,
  useGetDefaultGstRateQuery,
  useUpdateGstRateMutation,
  useDeleteGstRateMutation,
  useCalculateTaxMutation,
  useGetHsnCodesQuery,
  useGetHsnCodeByCodeQuery,
} = gstApi;
