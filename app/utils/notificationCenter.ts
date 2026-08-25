import { parseNotificationTapData } from '@/utils/notificationDeepLink';
import type { NotificationInboxItem } from '@/services/notificationInboxService';

export function countUnreadInbox(
  items: Array<Pick<NotificationInboxItem, 'isUnread' | 'readAt'>>
): number {
  return items.filter((row) => row.isUnread || !row.readAt).length;
}

export function inboxItemPath(
  item: Pick<NotificationInboxItem, 'childId' | 'destination'>,
  fallbackChildId?: string | null
): string | null {
  return parseNotificationTapData(
    {
      destinationKind: item.destination?.kind,
      contentId: item.destination?.contentId,
      childId: item.childId,
    },
    fallbackChildId
  );
}

export function formatInboxDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
