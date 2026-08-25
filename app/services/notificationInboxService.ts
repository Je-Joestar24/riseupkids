import { api } from './api';

export interface NotificationInboxDestination {
  kind: string | null;
  contentId: string | null;
}

export interface NotificationInboxItem {
  _id: string;
  title: string;
  message: string;
  imageUrl: string | null;
  createdAt: string;
  readAt: string | null;
  isUnread: boolean;
  childId: string | null;
  destination: NotificationInboxDestination;
}

export interface NotificationInboxPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ApiListResponse {
  success: boolean;
  data: NotificationInboxItem[];
  pagination: NotificationInboxPagination;
}

interface ApiItemResponse {
  success: boolean;
  data: NotificationInboxItem;
}

interface ApiUnreadResponse {
  success: boolean;
  data: { unreadCount: number };
}

interface ApiMarkAllResponse {
  success: boolean;
  data: { updated: number; unreadCount: number };
}

export const notificationInboxService = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<ApiListResponse>('/notifications/inbox', { params }),

  unreadCount: () => api.get<ApiUnreadResponse>('/notifications/inbox/unread-count'),

  markRead: (id: string) => api.post<ApiItemResponse>(`/notifications/inbox/${id}/read`),

  markAllRead: () => api.post<ApiMarkAllResponse>('/notifications/inbox/read-all'),
};
