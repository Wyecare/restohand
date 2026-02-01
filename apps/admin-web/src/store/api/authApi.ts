import { baseApi } from './baseApi';
import type { SuperAdminLoginPayload, SuperAdminLoginResponse } from './types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    superAdminLogin: builder.mutation<SuperAdminLoginResponse, SuperAdminLoginPayload>({
      query: (credentials) => ({
        url: '/auth/super-admin/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    refreshToken: builder.mutation<SuperAdminLoginResponse, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/super-admin/refresh',
        method: 'POST',
        body,
      }),
    }),

    logout: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/auth/super-admin/logout',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useSuperAdminLoginMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;