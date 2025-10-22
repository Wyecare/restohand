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
      console.log('[baseApi] prepareHeaders', {
        hasToken: !!token,
        url: API_BASE_URL,
      });

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
        console.log('[baseApi] Attached Authorization header');
      }

      headers.set('content-type', 'application/json');
      return headers;
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
    'RestaurantTable',
  ],
  endpoints: () => ({}),
});

export const {
  middleware: apiMiddleware,
  reducerPath: apiReducerPath,
  reducer: apiReducer,
} = baseApi;
