import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { env } from '@/config/env';

export const API_BASE_URL = env.apiBaseUrl.replace(/\/$/, '');

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.idToken;

      headers.set('ngrok-skip-browser-warning', 'true');

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      return headers;
    },
    fetchFn: async (url, options) => {
      // For FormData, don't set content-type - let browser handle it
      if (options?.body instanceof FormData) {
        // Remove any existing content-type header for FormData
        if (options.headers && 'content-type' in options.headers) {
          delete (options.headers as any)['content-type'];
        }
      } else {
        // For non-FormData requests, ensure we have JSON content-type
        if (options?.headers && !('content-type' in options.headers)) {
          (options.headers as any)['content-type'] = 'application/json';
        }
      }

      return fetch(url, options);
    },
  }),
  tagTypes: [
    'Restaurant',
    'MenuCategory',
    'MenuItem',
    'Order',
    'Profile',
    'Session',
    'Staff',
    'StaffInvitation',
    'RestaurantTable',
    'GstRate',
    'HsnCode',
    'TaxInvoice',
    'FloorPlan',
    'TableStatus',
    'FloorPlanOverview',
    'InventoryItem',
    'StockAlert',
    'InventoryAnalytics',
    'Recipe',
    'RecipeCostSummary',
    'Subscription',
    'Reports',
  ],
  endpoints: () => ({}),
});

export const {
  middleware: apiMiddleware,
  reducerPath: apiReducerPath,
  reducer: apiReducer,
} = baseApi;
