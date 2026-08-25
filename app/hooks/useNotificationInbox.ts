import { useCallback } from 'react';

import { useNotificationInboxStore } from '@/store/notificationInboxStore';

export function useNotificationInbox() {
  const items = useNotificationInboxStore((state) => state.items);
  const pagination = useNotificationInboxStore((state) => state.pagination);
  const unreadCount = useNotificationInboxStore((state) => state.unreadCount);
  const loading = useNotificationInboxStore((state) => state.loading);
  const error = useNotificationInboxStore((state) => state.error);
  const fetchInbox = useNotificationInboxStore((state) => state.fetchInbox);
  const fetchUnreadCount = useNotificationInboxStore((state) => state.fetchUnreadCount);
  const markRead = useNotificationInboxStore((state) => state.markRead);
  const markAllRead = useNotificationInboxStore((state) => state.markAllRead);
  const loadingMore = useNotificationInboxStore((state) => state.loadingMore);

  const refresh = useCallback(() => fetchInbox(1), [fetchInbox]);
  const loadMore = useCallback(() => {
    if (!pagination || loading || loadingMore || pagination.page >= pagination.pages) return;
    void fetchInbox(pagination.page + 1);
  }, [fetchInbox, loading, loadingMore, pagination]);

  return {
    items,
    pagination,
    unreadCount,
    loading,
    loadingMore,
    error,
    fetchInbox,
    fetchUnreadCount,
    markRead,
    markAllRead,
    refresh,
    loadMore,
  };
}
