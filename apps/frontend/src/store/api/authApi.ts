import { baseApi } from './baseApi';
import type { StaffMember } from './types';

export interface StaffLoginPayload {
  identifier: string;
  pin: string;
}

interface StaffLoginResponse {
  token: string;
  staff: StaffMember;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    staffLogin: builder.mutation<StaffLoginResponse, StaffLoginPayload>({
      query: (body) => ({
        url: '/auth/staff/login',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useStaffLoginMutation } = authApi;
