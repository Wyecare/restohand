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

export const staffApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listStaff: builder.query<StaffMember[], void>({
      query: () => ({ url: '/users' }),
      providesTags: (result) =>
        result
          ? [
              ...result.map((member) => ({ type: 'Staff' as const, id: member.id })),
              { type: 'Staff' as const, id: 'LIST' },
            ]
          : [{ type: 'Staff' as const, id: 'LIST' }],
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
  }),
});

export const {
  useListStaffQuery,
  useInviteStaffMutation,
  useUpdateStaffMutation,
  useResetStaffPinMutation,
  useListStaffInvitationsQuery,
  useRevokeStaffInvitationMutation,
} = staffApi;
