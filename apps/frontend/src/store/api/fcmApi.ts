import { baseApi } from './baseApi';

export interface UpdateFcmTokenPayload {
  fcmToken: string;
}

interface UpdateFcmTokenResponse {
  success: boolean;
  message: string;
}

export interface CreateCallWaiterPayload {
  tableId: string;
  type: 'assistance' | 'emergency' | 'bill_request' | 'complaint' | 'feedback';
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  message?: string;
  orderId?: string;
}

interface CallWaiterResponse {
  id: string;
  tableId: string;
  type: string;
  urgency: string;
  message?: string;
  status: string;
  createdAt: string;
}

export const fcmApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateFcmToken: builder.mutation<UpdateFcmTokenResponse, UpdateFcmTokenPayload>({
      query: (body) => ({
        url: '/call-waiter/fcm-token',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Staff'],
    }),

    createCallWaiter: builder.mutation<CallWaiterResponse, { restaurantId: string } & CreateCallWaiterPayload>({
      query: ({ restaurantId, ...body }) => ({
        url: `/call-waiter/${restaurantId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CallWaiter'],
    }),
  }),
});

export const {
  useUpdateFcmTokenMutation,
  useCreateCallWaiterMutation,
} = fcmApi;