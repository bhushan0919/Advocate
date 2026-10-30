import { apiClient } from './client';
import { NotificationRecord } from '../types/notification';

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean | string;
  type?: string;
}

export interface NotificationListResponse {
  notifications: NotificationRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const notificationsApi = {
  getNotifications: async (params?: GetNotificationsParams): Promise<NotificationListResponse> => {
    const res = await apiClient.get('/notifications', { params });
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data.data.unreadCount;
  },

  markAsRead: async (id: string): Promise<NotificationRecord> => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`);
  },
};

