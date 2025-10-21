import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const API_BASE_URL =
  import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL }),
  tagTypes: [],
  endpoints: () => ({}),
});

export const {
  middleware: apiMiddleware,
  reducerPath: apiReducerPath,
  reducer: apiReducer,
} = baseApi;
