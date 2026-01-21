import { baseApi } from './baseApi';
import type {
  KitchenStation,
  KitchenStationMetrics,
  OrderStationAssignment,
  CreateKitchenStationRequest,
  UpdateKitchenStationRequest,
  AssignOrderToStationRequest,
  AssignmentStatus,
} from './types';

export const kitchenApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Kitchen Stations
    createKitchenStation: builder.mutation<KitchenStation, { restaurantId: string; body: CreateKitchenStationRequest }>({
      query: ({ restaurantId, body }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId }) => [
        { type: 'KitchenStation', id: 'LIST' },
        { type: 'KitchenStation', id: `LIST-${restaurantId}` },
      ],
    }),

    listKitchenStations: builder.query<KitchenStation[], { restaurantId: string; includeInactive?: boolean }>({
      query: ({ restaurantId, includeInactive }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations`,
        params: includeInactive ? { includeInactive: 'true' } : {},
      }),
      providesTags: (result, _error, { restaurantId }) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'KitchenStation' as const, id })),
              { type: 'KitchenStation', id: 'LIST' },
              { type: 'KitchenStation', id: `LIST-${restaurantId}` },
            ]
          : [
              { type: 'KitchenStation', id: 'LIST' },
              { type: 'KitchenStation', id: `LIST-${restaurantId}` },
            ],
    }),

    getKitchenStation: builder.query<KitchenStation, { restaurantId: string; stationId: string }>({
      query: ({ restaurantId, stationId }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/${stationId}`,
      }),
      providesTags: (_result, _error, { stationId }) => [
        { type: 'KitchenStation', id: stationId },
      ],
    }),

    updateKitchenStation: builder.mutation<KitchenStation, { restaurantId: string; stationId: string; body: UpdateKitchenStationRequest }>({
      query: ({ restaurantId, stationId, body }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/${stationId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, stationId }) => [
        { type: 'KitchenStation', id: stationId },
        { type: 'KitchenStation', id: 'LIST' },
        { type: 'KitchenStation', id: `LIST-${restaurantId}` },
        { type: 'KitchenStation', id: 'METRICS' },
      ],
    }),

    deleteKitchenStation: builder.mutation<{ message: string }, { restaurantId: string; stationId: string }>({
      query: ({ restaurantId, stationId }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/${stationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { restaurantId, stationId }) => [
        { type: 'KitchenStation', id: stationId },
        { type: 'KitchenStation', id: 'LIST' },
        { type: 'KitchenStation', id: `LIST-${restaurantId}` },
        { type: 'KitchenStation', id: 'METRICS' },
      ],
    }),

    getStationMetrics: builder.query<KitchenStationMetrics[], { restaurantId: string }>({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/metrics`,
      }),
      providesTags: (_result, _error, { restaurantId }) => [
        { type: 'KitchenStation', id: 'METRICS' },
        { type: 'KitchenStation', id: `METRICS-${restaurantId}` },
      ],
    }),

    // Station Assignments
    assignOrderToStation: builder.mutation<OrderStationAssignment, { restaurantId: string; orderId: string; body: AssignOrderToStationRequest }>({
      query: ({ restaurantId, orderId, body }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/assign/${orderId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { restaurantId, orderId }) => [
        { type: 'StationAssignment', id: 'LIST' },
        { type: 'StationAssignment', id: `ORDER-${orderId}` },
        { type: 'KitchenStation', id: 'METRICS' },
        { type: 'Order', id: orderId },
      ],
    }),

    getStationAssignments: builder.query<OrderStationAssignment[], { restaurantId: string; stationId?: string; status?: AssignmentStatus }>({
      query: ({ restaurantId, stationId, status }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/assignments`,
        params: Object.fromEntries(
          Object.entries({ stationId, status }).filter(([_, v]) => v != null)
        ),
      }),
      providesTags: (result, _error, { restaurantId, stationId }) => {
        const tags: any[] = [
          { type: 'StationAssignment', id: 'LIST' },
          { type: 'StationAssignment', id: `LIST-${restaurantId}` },
        ];

        if (stationId) {
          tags.push({ type: 'StationAssignment', id: `STATION-${stationId}` });
        }

        if (result) {
          result.forEach(assignment => {
            tags.push({ type: 'StationAssignment', id: assignment.id });
            tags.push({ type: 'StationAssignment', id: `ORDER-${assignment.orderId}` });
          });
        }

        return tags;
      },
    }),

    updateAssignmentStatus: builder.mutation<OrderStationAssignment, { restaurantId: string; assignmentId: string; status: AssignmentStatus }>({
      query: ({ restaurantId, assignmentId, status }) => ({
        url: `/restaurants/${restaurantId}/kitchen/stations/assignments/${assignmentId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { restaurantId, assignmentId }) => [
        { type: 'StationAssignment', id: assignmentId },
        { type: 'StationAssignment', id: 'LIST' },
        { type: 'StationAssignment', id: `LIST-${restaurantId}` },
        { type: 'KitchenStation', id: 'METRICS' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  // Kitchen Station Hooks
  useCreateKitchenStationMutation,
  useListKitchenStationsQuery,
  useGetKitchenStationQuery,
  useUpdateKitchenStationMutation,
  useDeleteKitchenStationMutation,
  useGetStationMetricsQuery,
  // Station Assignment Hooks
  useAssignOrderToStationMutation,
  useGetStationAssignmentsQuery,
  useUpdateAssignmentStatusMutation,
} = kitchenApi;