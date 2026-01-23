import { baseApi } from './baseApi';

export interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    successRate: number;
    totalTax: number;
    totalDiscount: number;
  };
  trends: {
    revenueChange: number;
    ordersChange: number;
    avgOrderValueChange: number;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
    amount: number;
  }>;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
    timesOrdered: number;
  }>;
  dailyPerformance: Array<{
    date: string;
    revenue: number;
    orders: number;
    avgOrder: number;
  }>;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalytics: builder.query<AnalyticsData, { startDate?: string; endDate?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/reports/analytics?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { startDate, endDate }) => [
        { type: 'Reports', id: `analytics-${startDate || 'default'}-${endDate || 'default'}` },
      ],
    }),
    downloadPdfReport: builder.mutation<Blob, { startDate?: string; endDate?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/reports/pdf?${searchParams.toString()}`,
          method: 'GET',
          responseHandler: (response) => response.blob(),
        };
      },
    }),
  }),
});

export const {
  useGetAnalyticsQuery,
  useDownloadPdfReportMutation,
} = reportsApi;