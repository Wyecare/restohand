import { baseApi } from './baseApi';

export interface FloorPlanTable {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: 'rectangle' | 'circle' | 'square';
  label: string;
  capacity: number;
  zone?: string;
  color?: string;
  restaurantTableId?: string;
}

export interface FloorPlanDivider {
  id: string;
  type: 'wall' | 'divider' | 'barrier' | 'column';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  color: string;
  label?: string;
  isDoor: boolean;
  doorWidth?: number;
}

export interface FloorPlanSection {
  id: string;
  name: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  sectionType: 'dining' | 'bar' | 'private' | 'outdoor' | 'vip' | 'family' | 'waiting';
  displayOrder: number;
  showLabel: boolean;
  labelColor: string;
  labelSize: number;
}

export interface FloorPlanDecoration {
  id: string;
  type: 'plant' | 'artwork' | 'fixture' | 'entrance' | 'kitchen-door' | 'bathroom' | 'cashier';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
  color: string;
  icon?: string;
}

export interface FloorPlanMetadata {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  backgroundImage?: string;
  gridSize: number;
  showGrid: boolean;
  zoomLevel: number;
}

export interface FloorPlan {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  tables: FloorPlanTable[];
  sections: FloorPlanSection[];
  dividers: FloorPlanDivider[];
  decorations: FloorPlanDecoration[];
  metadata: FloorPlanMetadata;
  isActive: boolean;
  version?: string;
  lastUsedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFloorPlanRequest {
  name: string;
  description?: string;
  tables: Omit<FloorPlanTable, 'id'>[];
  sections: Omit<FloorPlanSection, 'id'>[];
  dividers: Omit<FloorPlanDivider, 'id'>[];
  decorations: Omit<FloorPlanDecoration, 'id'>[];
  metadata: FloorPlanMetadata;
  isActive?: boolean;
  version?: string;
}

export interface UpdateFloorPlanRequest extends Partial<CreateFloorPlanRequest> {}

export enum TableStatusType {
  Available = 'available',
  Occupied = 'occupied',
  Reserved = 'reserved',
  NeedsAttention = 'needs_attention',
  Cleaning = 'cleaning',
  OutOfOrder = 'out_of_order'
}

export enum TablePriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent'
}

export interface TableOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderedAt: string;
}

export interface TableReservation {
  guestName: string;
  guestPhone?: string;
  partySize: number;
  reservedFrom: string;
  reservedTo: string;
  notes?: string;
}

export interface TableMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  occupancyMinutes: number;
  turnoverCount: number;
  lastOrderAt?: string;
  lastOccupiedAt?: string;
}

export interface TableStatus {
  id: string;
  restaurantId: string;
  tableId: string;
  tableLabel: string;
  status: TableStatusType;
  priority: TablePriority;
  currentOrders: TableOrder[];
  currentReservation?: TableReservation;
  currentPartySize?: number;
  assignedWaiter?: string;
  statusNote?: string;
  statusChangedAt: string;
  statusChangedBy?: string;
  occupiedSince?: string;
  estimatedAvailableAt?: string;
  dailyMetrics: TableMetrics;
  date: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTableStatusRequest {
  status: TableStatusType;
  priority?: TablePriority;
  currentPartySize?: number;
  assignedWaiter?: string;
  statusNote?: string;
  estimatedAvailableAt?: string;
}

export interface CreateReservationRequest {
  guestName: string;
  guestPhone?: string;
  partySize: number;
  reservedFrom: string;
  reservedTo: string;
  notes?: string;
}

export interface FloorPlanStatusOverview {
  restaurantId: string;
  floorPlanId: string;
  totalTables: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  tablesNeedingAttention: number;
  totalSeats: number;
  occupiedSeats: number;
  todayRevenue: number;
  todayOrders: number;
  averageTurnover: number;
  peakOccupancyTime?: string;
  lastUpdated: string;
}

export const floorPlansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Floor Plan Management
    getFloorPlans: builder.query<{ data: FloorPlan[]; total: number; page: number; limit: number }, { restaurantId: string; page?: number; limit?: number }>({
      query: ({ restaurantId, page = 1, limit = 10 }) => ({
        url: `restaurants/${restaurantId}/floor-plans`,
        params: { page, limit },
      }),
      providesTags: (result, error, { restaurantId }) => [
        { type: 'FloorPlan', id: 'LIST' },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    getActiveFloorPlan: builder.query<FloorPlan | null, { restaurantId: string }>({
      query: ({ restaurantId }) => ({
        url: `restaurants/${restaurantId}/floor-plans/active`,
      }),
      providesTags: (result, error, { restaurantId }) => [
        { type: 'FloorPlan', id: 'ACTIVE' },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    getFloorPlan: builder.query<FloorPlan, { restaurantId: string; id: string }>({
      query: ({ restaurantId, id }) => ({
        url: `restaurants/${restaurantId}/floor-plans/${id}`,
      }),
      providesTags: (result, error, { restaurantId, id }) => [
        { type: 'FloorPlan', id },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    createFloorPlan: builder.mutation<FloorPlan, { restaurantId: string; data: CreateFloorPlanRequest }>({
      query: ({ restaurantId, data }) => ({
        url: `restaurants/${restaurantId}/floor-plans`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId }) => [
        { type: 'FloorPlan', id: 'LIST' },
        { type: 'FloorPlan', id: 'ACTIVE' },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    updateFloorPlan: builder.mutation<FloorPlan, { restaurantId: string; id: string; data: UpdateFloorPlanRequest }>({
      query: ({ restaurantId, id, data }) => ({
        url: `restaurants/${restaurantId}/floor-plans/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId, id }) => [
        { type: 'FloorPlan', id },
        { type: 'FloorPlan', id: 'LIST' },
        { type: 'FloorPlan', id: 'ACTIVE' },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    setActiveFloorPlan: builder.mutation<FloorPlan, { restaurantId: string; id: string }>({
      query: ({ restaurantId, id }) => ({
        url: `restaurants/${restaurantId}/floor-plans/${id}/activate`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, { restaurantId }) => [
        { type: 'FloorPlan', id: 'ACTIVE' },
        { type: 'FloorPlan', id: 'LIST' },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    deleteFloorPlan: builder.mutation<void, { restaurantId: string; id: string }>({
      query: ({ restaurantId, id }) => ({
        url: `restaurants/${restaurantId}/floor-plans/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { restaurantId, id }) => [
        { type: 'FloorPlan', id },
        { type: 'FloorPlan', id: 'LIST' },
        { type: 'FloorPlan', id: restaurantId },
      ],
    }),

    // Table Status Management
    getTableStatuses: builder.query<TableStatus[], { restaurantId: string; date?: string }>({
      query: ({ restaurantId, date }) => ({
        url: `restaurants/${restaurantId}/floor-plans/tables/status`,
        params: date ? { date } : {},
      }),
      providesTags: (result, error, { restaurantId }) => [
        { type: 'TableStatus', id: 'LIST' },
        { type: 'TableStatus', id: restaurantId },
      ],
    }),

    getTableStatus: builder.query<TableStatus | null, { restaurantId: string; tableId: string }>({
      query: ({ restaurantId, tableId }) => ({
        url: `restaurants/${restaurantId}/floor-plans/tables/${tableId}/status`,
      }),
      providesTags: (result, error, { restaurantId, tableId }) => [
        { type: 'TableStatus', id: tableId },
        { type: 'TableStatus', id: restaurantId },
      ],
    }),

    updateTableStatus: builder.mutation<TableStatus, { restaurantId: string; tableId: string; data: UpdateTableStatusRequest }>({
      query: ({ restaurantId, tableId, data }) => ({
        url: `restaurants/${restaurantId}/floor-plans/tables/${tableId}/status`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId, tableId }) => [
        { type: 'TableStatus', id: tableId },
        { type: 'TableStatus', id: 'LIST' },
        { type: 'TableStatus', id: restaurantId },
        { type: 'FloorPlanOverview', id: restaurantId },
      ],
    }),

    createReservation: builder.mutation<TableStatus, { restaurantId: string; tableId: string; data: CreateReservationRequest }>({
      query: ({ restaurantId, tableId, data }) => ({
        url: `restaurants/${restaurantId}/floor-plans/tables/${tableId}/reservation`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { restaurantId, tableId }) => [
        { type: 'TableStatus', id: tableId },
        { type: 'TableStatus', id: 'LIST' },
        { type: 'TableStatus', id: restaurantId },
        { type: 'FloorPlanOverview', id: restaurantId },
      ],
    }),

    // Overview and Analytics
    getFloorPlanOverview: builder.query<FloorPlanStatusOverview, { restaurantId: string }>({
      query: ({ restaurantId }) => ({
        url: `restaurants/${restaurantId}/floor-plans/overview`,
      }),
      providesTags: (result, error, { restaurantId }) => [
        { type: 'FloorPlanOverview', id: restaurantId },
      ],
    }),
  }),
});

export const {
  useGetFloorPlansQuery,
  useGetActiveFloorPlanQuery,
  useGetFloorPlanQuery,
  useCreateFloorPlanMutation,
  useUpdateFloorPlanMutation,
  useSetActiveFloorPlanMutation,
  useDeleteFloorPlanMutation,
  useGetTableStatusesQuery,
  useGetTableStatusQuery,
  useUpdateTableStatusMutation,
  useCreateReservationMutation,
  useGetFloorPlanOverviewQuery,
} = floorPlansApi;