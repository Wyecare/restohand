import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

export const API_BASE_URL =
  import.meta.env['VITE_API_BASE_URL'] || 'http://localhost:3000';

export const baseApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api`,
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
    'Dashboard',
    'Restaurant',
    'Settlement',
    'Analytics',
    'SuperAdmin',
  ],
  endpoints: () => ({}),
});

export const {
  middleware: apiMiddleware,
  reducerPath: apiReducerPath,
  reducer: apiReducer,
} = baseApi;
