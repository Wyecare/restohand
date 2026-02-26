import { baseApi } from './baseApi';

export interface TillTransactions {
  cashTotal: number;
  cardTotal: number;
  upiTotal: number;
  totalCollected: number;
  orderCount: number;
  refundTotal: number;
}

export interface TillSession {
  _id: string;
  id: string;
  restaurantId: string;
  branchId: string;
  cashierId: string;
  cashierName?: string;
  status: 'open' | 'closed';
  openingFloat: number;
  closingCash?: number;
  transactions: TillTransactions;
  openedAt: string;
  closedAt?: string;
  openingNotes?: string;
  closingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TillHistoryResponse {
  sessions: TillSession[];
  total: number;
  page: number;
  totalPages: number;
}

export const tillApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    openTill: builder.mutation<
      TillSession,
      { restaurantId: string; branchId: string; openingFloat: number; openingNotes?: string }
    >({
      query: ({ restaurantId, ...body }) => ({
        url: `/restaurants/${restaurantId}/till/open`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Till', id: `CURRENT-${restaurantId}` },
        { type: 'Till', id: `LIST-${restaurantId}` },
      ],
    }),

    closeTill: builder.mutation<
      TillSession,
      { restaurantId: string; tillId: string; closingCash: number; closingNotes?: string }
    >({
      query: ({ restaurantId, tillId, ...body }) => ({
        url: `/restaurants/${restaurantId}/till/${tillId}/close`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, tillId }) => [
        { type: 'Till', id: `CURRENT-${restaurantId}` },
        { type: 'Till', id: tillId },
        { type: 'Till', id: `LIST-${restaurantId}` },
      ],
    }),

    getCurrentTill: builder.query<
      TillSession | null,
      { restaurantId: string; branchId: string }
    >({
      query: ({ restaurantId, branchId }) => ({
        url: `/restaurants/${restaurantId}/till/current`,
        params: { branchId },
      }),
      providesTags: (_result, _error, { restaurantId }) => [
        { type: 'Till', id: `CURRENT-${restaurantId}` },
      ],
    }),

    getTillHistory: builder.query<
      TillHistoryResponse,
      { restaurantId: string; branchId?: string; page?: number; limit?: number }
    >({
      query: ({ restaurantId, ...params }) => ({
        url: `/restaurants/${restaurantId}/till`,
        params,
      }),
      providesTags: (_result, _error, { restaurantId }) => [
        { type: 'Till', id: `LIST-${restaurantId}` },
      ],
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
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'Till', id: `CURRENT-${restaurantId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useOpenTillMutation,
  useCloseTillMutation,
  useGetCurrentTillQuery,
  useGetTillHistoryQuery,
  useRecordTillTransactionMutation,
} = tillApi;
