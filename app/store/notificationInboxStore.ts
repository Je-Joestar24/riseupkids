import { create } from 'zustand';

import { notificationInboxService } from '@/services/notificationInboxService';
import type {
  NotificationInboxItem,
  NotificationInboxPagination,
} from '@/services/notificationInboxService';

const PAGE_SIZE = 20;

const EMPTY_PAGINATION: NotificationInboxPagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  pages: 1,
};

const EMPTY_STATE = {
  items: [] as NotificationInboxItem[],
  pagination: null as NotificationInboxPagination | null,
  unreadCount: 0,
  loading: false,
  loadingMore: false,
  error: null as string | null,
};

interface NotificationInboxState {
  items: NotificationInboxItem[];
  pagination: NotificationInboxPagination | null;
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  fetchInbox: (page?: number) => Promise<NotificationInboxItem[]>;
  fetchUnreadCount: () => Promise<number>;
  markRead: (id: string) => Promise<NotificationInboxItem | null>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

function mergeItems(current: NotificationInboxItem[], incoming: NotificationInboxItem[]) {
  const seen = new Set(current.map((row) => row._id));
  return [...current, ...incoming.filter((row) => !seen.has(row._id))];
}

export const useNotificationInboxStore = create<NotificationInboxState>((set, get) => ({
  ...EMPTY_STATE,

  fetchInbox: async (page = 1) => {
    const isRefresh = page <= 1;
    set(isRefresh ? { loading: true, error: null } : { loadingMore: true, error: null });
    try {
      const response = await notificationInboxService.list({ page, limit: PAGE_SIZE });
      const incoming = response.data || [];
      set({
        items: isRefresh ? incoming : mergeItems(get().items, incoming),
        pagination: response.pagination || EMPTY_PAGINATION,
        loading: false,
        loadingMore: false,
      });
      if (isRefresh) {
        await get().fetchUnreadCount();
      }
      return incoming;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notifications';
      set({ loading: false, loadingMore: false, error: message });
      return [];
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationInboxService.unreadCount();
      const unreadCount = response.data?.unreadCount ?? 0;
      set({ unreadCount });
      return unreadCount;
    } catch {
      return get().unreadCount;
    }
  },

  markRead: async (id) => {
    try {
      const response = await notificationInboxService.markRead(id);
      const updated = response.data;
      const wasUnread = get().items.find((row) => row._id === id)?.isUnread;
      set({
        items: get().items.map((row) => (row._id === id ? { ...row, ...updated } : row)),
        unreadCount: wasUnread ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
      });
      return updated;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark notification as read';
      set({ error: message });
      return null;
    }
  },

  markAllRead: async () => {
    try {
      await notificationInboxService.markAllRead();
      set({
        items: get().items.map((row) => ({
          ...row,
          isUnread: false,
          readAt: row.readAt || new Date().toISOString(),
        })),
        unreadCount: 0,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark notifications as read';
      set({ error: message });
    }
  },

  reset: () => set(EMPTY_STATE),
}));
