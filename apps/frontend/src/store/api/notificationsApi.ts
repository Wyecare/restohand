import { baseApi } from './baseApi';

// Types
export interface NotificationData {
  id: string;
  restaurantId: string;
  branchId?: string;
  recipientId: string;
  type: 'payment_confirmation' | 'call_waiter' | 'order_status_update' | 'order_ready' | 'table_status_update' | 'system_alert' | 'reminder';
  title: string;
  message: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  orderId?: string;
  orderNumber?: string;
  tableId?: string;
  tableNumber?: string;
  callWaiterId?: string;
  metadata?: Record<string, any>;
  fcmSent: boolean;
  fcmSentAt?: string;
  fcmMessageId?: string;
  readAt?: string;
  archivedAt?: string;
  senderId?: string;
  senderName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  urgent: number;
}

export interface NotificationsResponse {
  notifications: NotificationData[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationQuery {
  recipientId?: string;
  branchId?: string;
  type?: string;
  status?: 'unread' | 'read' | 'archived';
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateNotificationData {
  recipientId: string;
  branchId?: string;
  type: NotificationData['type'];
  title: string;
  message: string;
  urgency?: NotificationData['urgency'];
  orderId?: string;
  orderNumber?: string;
  tableId?: string;
  tableNumber?: string;
  callWaiterId?: string;
  metadata?: Record<string, any>;
  fcmSent?: boolean;
  fcmMessageId?: string;
  senderId?: string;
  senderName?: string;
}

export interface BulkUpdateData {
  notificationIds: string[];
  action: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive';
}

export interface BulkCreateData {
  recipientIds: string[];
  type: NotificationData['type'];
  title: string;
  message: string;
  urgency?: NotificationData['urgency'];
  orderId?: string;
  orderNumber?: string;
  tableId?: string;
  tableNumber?: string;
  callWaiterId?: string;
  metadata?: Record<string, any>;
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get notifications with pagination and filtering
    getNotifications: builder.query<NotificationsResponse, { restaurantId: string } & NotificationQuery>({
      query: ({ restaurantId, ...params }) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
        return {
          url: `/restaurants/${restaurantId}/notifications?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Notification'],
    }),

    // Get current user's notifications
    getMyNotifications: builder.query<NotificationsResponse, { restaurantId: string } & NotificationQuery>({
      query: ({ restaurantId, ...params }) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
        return {
          url: `/restaurants/${restaurantId}/notifications/my-notifications?${searchParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Notification'],
    }),

    // Get notification statistics
    getNotificationStats: builder.query<NotificationStats, { restaurantId: string }>({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/notifications/stats`,
        method: 'GET',
      }),
      providesTags: ['NotificationStats'],
    }),

    // Get single notification
    getNotification: builder.query<NotificationData, { restaurantId: string; id: string }>({
      query: ({ restaurantId, id }) => ({
        url: `/restaurants/${restaurantId}/notifications/${id}`,
        method: 'GET',
      }),
      providesTags: ['Notification'],
    }),

    // Create notification
    createNotification: builder.mutation<NotificationData, { restaurantId: string; data: CreateNotificationData }>({
      query: ({ restaurantId, data }) => ({
        url: `/restaurants/${restaurantId}/notifications`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),

    // Create bulk notifications
    createBulkNotifications: builder.mutation<NotificationData[], { restaurantId: string; data: BulkCreateData }>({
      query: ({ restaurantId, data }) => ({
        url: `/restaurants/${restaurantId}/notifications/bulk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),

    // Update notification
    updateNotification: builder.mutation<NotificationData, { restaurantId: string; id: string; data: Partial<NotificationData> }>({
      query: ({ restaurantId, id, data }) => ({
        url: `/restaurants/${restaurantId}/notifications/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),

    // Mark notification as read
    markNotificationAsRead: builder.mutation<NotificationData, { restaurantId: string; id: string }>({
      query: ({ restaurantId, id }) => ({
        url: `/restaurants/${restaurantId}/notifications/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),

    // Mark all notifications as read
    markAllNotificationsAsRead: builder.mutation<{ updated: number }, { restaurantId: string }>({
      query: ({ restaurantId }) => ({
        url: `/restaurants/${restaurantId}/notifications/mark-all-read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),

    // Bulk update notifications
    bulkUpdateNotifications: builder.mutation<{ updated: number }, { restaurantId: string; data: BulkUpdateData }>({
      query: ({ restaurantId, data }) => ({
        url: `/restaurants/${restaurantId}/notifications/bulk-update`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),

    // Cleanup old notifications (admin only)
    cleanupOldNotifications: builder.mutation<{ deleted: number }, { restaurantId: string; daysOld?: number }>({
      query: ({ restaurantId, daysOld }) => ({
        url: `/restaurants/${restaurantId}/notifications/cleanup`,
        method: 'POST',
        body: { daysOld },
      }),
      invalidatesTags: ['Notification', 'NotificationStats'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetMyNotificationsQuery,
  useGetNotificationStatsQuery,
  useGetNotificationQuery,
  useCreateNotificationMutation,
  useCreateBulkNotificationsMutation,
  useUpdateNotificationMutation,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useBulkUpdateNotificationsMutation,
  useCleanupOldNotificationsMutation,
} = notificationsApi;