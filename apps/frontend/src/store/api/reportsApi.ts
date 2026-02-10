import { baseApi } from './baseApi';
import type {
  ReportsMetrics,
  ReportsQueryParams,
  LegacyAnalyticsData
} from './types/reports.types';

// Export legacy interface for backward compatibility
export type AnalyticsData = LegacyAnalyticsData;

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // New comprehensive analytics endpoint
    getComprehensiveAnalytics: builder.query<ReportsMetrics, ReportsQueryParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.period) searchParams.append('period', params.period);
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        if (params.branchId) searchParams.append('branchId', params.branchId);

        return {
          url: `/reports/analytics?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, params) => [
        {
          type: 'Reports',
          id: `comprehensive-${params.period || 'custom'}-${params.from || 'default'}-${params.to || 'default'}-${params.branchId || 'all'}`
        },
      ],
    }),

    // Legacy analytics endpoint (backward compatibility)
    getAnalytics: builder.query<AnalyticsData, { startDate?: string; endDate?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.startDate) searchParams.append('startDate', params.startDate);
        if (params.endDate) searchParams.append('endDate', params.endDate);

        return {
          url: `/reports/analytics/legacy?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { startDate, endDate }) => [
        { type: 'Reports', id: `legacy-analytics-${startDate || 'default'}-${endDate || 'default'}` },
      ],
    }),

    // New optimized PDF report
    downloadOptimizedPdfReport: builder.mutation<Blob, ReportsQueryParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.period) searchParams.append('period', params.period);
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        if (params.branchId) searchParams.append('branchId', params.branchId);

        return {
          url: `/reports/pdf?${searchParams.toString()}`,
          method: 'GET',
          responseHandler: (response) => response.blob(),
        };
      },
    }),

    // Legacy PDF report (backward compatibility)
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
  useGetComprehensiveAnalyticsQuery,
  useGetAnalyticsQuery,
  useDownloadOptimizedPdfReportMutation,
  useDownloadPdfReportMutation,
} = reportsApi;