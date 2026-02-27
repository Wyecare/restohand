import { baseApi } from './baseApi';
import type { Order } from './types';

export interface TillSession {
  id: string;
  _id?: string;
  restaurantId: string;
  branchId: string;
  cashierId?: string;
  cashierName?: string;
  status: 'open' | 'closed';
  openingFloat: number;
  closingCash?: number;
  transactions: {
    cashTotal: number;
    cardTotal: number;
    upiTotal: number;
    totalCollected: number;
    orderCount: number;
    refundTotal: number;
  };
  openedAt: string;
  closedAt?: string;
  openingNotes?: string;
  closingNotes?: string;
}

export interface TillHistoryResponse {
  sessions: TillSession[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const tillApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentTill: builder.query<
      TillSession | null,
      { restaurantId: string; branchId?: string }
    >({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/till/current`,
        params: branchId ? { branchId } : {},
      }),
      providesTags: ['Till'],
    }),

    getTillHistory: builder.query<
      TillHistoryResponse,
      { restaurantId: string; branchId?: string; page?: number; limit?: number }
    >({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/till`,
        params,
      }),
      providesTags: ['Till'],
    }),

    openTill: builder.mutation<
      TillSession,
      {
        restaurantId: string;
        branchId: string;
        openingFloat: number;
        openingNotes?: string;
      }
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/till/open`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Till'],
    }),

    closeTill: builder.mutation<
      TillSession,
      {
        restaurantId: string;
        tillId: string;
        closingCash: number;
        closingNotes?: string;
      }
    >({
      query: ({ restaurantId, tillId, ...body }) => ({
        url: `/restaurants/${restaurantId}/till/${tillId}/close`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Till'],
    }),

    recordTillTransaction: builder.mutation<
      TillSession,
      {
        restaurantId: string;
        tillId: string;
        paymentMethod: 'cash' | 'card' | 'upi';
        amount: number;
        isRefund?: boolean;
      }
    >({
      query: ({ restaurantId, tillId, ...body }) => ({
        url: `/restaurants/${restaurantId}/till/${tillId}/transaction`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Till'],
    }),

    acceptOrder: builder.mutation<
      Order,
      { restaurantId: string; orderId: string }
    >({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/accept`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, { restaurantId }) => [
        { type: 'Order', id: `LIST-${restaurantId}` },
        { type: 'Order', id: 'LIST' },
      ],
    }),

    rejectOrder: builder.mutation<
      Order,
      { restaurantId: string; orderId: string }
    >({
      query: ({ restaurantId, orderId }) => ({
        url: `/restaurants/${restaurantId}/orders/${orderId}/reject`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, { restaurantId }) => [
        { type: 'Order', id: `LIST-${restaurantId}` },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCurrentTillQuery,
  useGetTillHistoryQuery,
  useOpenTillMutation,
  useCloseTillMutation,
  useRecordTillTransactionMutation,
  useAcceptOrderMutation,
  useRejectOrderMutation,
} = tillApi;
