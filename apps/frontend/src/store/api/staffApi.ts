import { baseApi } from './baseApi';
import type { StaffInviteResponse, StaffMember } from './types';

export interface InviteStaffPayload {
  name: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  announce?: boolean;
}

export interface UpdateStaffPayload {
  id: string;
  roles?: string[];
  isActive?: boolean;
}

export interface StaffInvitation {
  id: string;
  restaurantId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: string;
  invitationToken: string;
  expiresAt: string;
  isUsed: boolean;
  createdAt: string;
  usedAt?: string;
}

// New email-based invitation interfaces
export interface EmailInviteStaffPayload {
  restaurantId: string;
  email: string;
  role: 'chef' | 'waiter' | 'cashier';
}

export interface EmailInviteStaffResponse {
  message: string;
  token: string;
}

export interface VerifyInviteResponse {
  valid: boolean;
  email?: string;
  role?: string;
  restaurantName?: string;
  message?: string;
}

export interface CompleteSignupPayload {
  token: string;
  firebaseUid: string;
}

export interface CompleteSignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    role: string;
    restaurantId: string;
  };
}

// JWT-based staff signup interfaces
export interface JwtStaffSignupPayload {
  token: string;
  name: string;
  password: string;
}

export interface JwtStaffSignupResponse {
  access_token: string;
  refresh_token: string;
  user: {
    uid: string;
    email: string;
    displayName: string;
    roles: string[];
    restaurantId: string;
  };
  expires_in: number;
}

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listStaff: builder.query<StaffMember[], void>({
      query: () => ({ url: '/users' }),
      providesTags: ['Staff'],
    }),

    listWaiters: builder.query<StaffMember[], { restaurantId: string }>({
      query: () => ({
        url: `/users?role=waiter`
      }),
      providesTags: ['Staff'],
      transformResponse: (response: { data: StaffMember[] }) => response.data,
    }),

    inviteStaff: builder.mutation<StaffInviteResponse, InviteStaffPayload>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),

    updateStaff: builder.mutation<StaffMember, UpdateStaffPayload>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Staff', id },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    resetStaffPin: builder.mutation<StaffInviteResponse, string>({
      query: (id) => ({
        url: `/users/${id}/reset-pin`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Staff', id },
        { type: 'Staff', id: 'LIST' },
      ],
    }),

    // New invitation-based endpoints
    listStaffInvitations: builder.query<StaffInvitation[], void>({
      query: () => ({ url: '/users/invitations' }),
      providesTags: [{ type: 'StaffInvitation', id: 'LIST' }],
    }),

    revokeStaffInvitation: builder.mutation<void, string>({
      query: (invitationId) => ({
        url: `/users/invitations/${invitationId}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'StaffInvitation', id: 'LIST' }],
    }),

    // New email-based invitation endpoints
    inviteStaffByEmail: builder.mutation<EmailInviteStaffResponse, EmailInviteStaffPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/staff/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Staff', id: 'LIST' }],
    }),

    verifyInvite: builder.query<VerifyInviteResponse, string>({
      query: (token) => ({
        url: `/staff/invitations/verify/${token}`,
        method: 'GET',
      }),
    }),

    completeSignup: builder.mutation<CompleteSignupResponse, CompleteSignupPayload>({
      query: (body) => ({
        url: `/staff/invitations/complete-signup`,
        method: 'POST',
        body,
      }),
    }),

    // JWT-based staff signup
    jwtStaffSignup: builder.mutation<JwtStaffSignupResponse, JwtStaffSignupPayload>({
      query: (body) => ({
        url: `/staff/invitations/jwt-signup`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useListStaffQuery,
  useListWaitersQuery,
  useInviteStaffMutation,
  useUpdateStaffMutation,
  useResetStaffPinMutation,
  useListStaffInvitationsQuery,
  useRevokeStaffInvitationMutation,
  useInviteStaffByEmailMutation,
  useVerifyInviteQuery,
  useCompleteSignupMutation,
  useJwtStaffSignupMutation,
} = staffApi;
