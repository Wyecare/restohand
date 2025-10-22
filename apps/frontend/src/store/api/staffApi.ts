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
  }),
});

export const {
  useListStaffQuery,
  useInviteStaffMutation,
  useUpdateStaffMutation,
  useResetStaffPinMutation,
} = staffApi;
