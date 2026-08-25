import { notificationInboxService } from '@/services/notificationInboxService';
import { useNotificationInboxStore } from '@/store/notificationInboxStore';
import { inboxItemPath } from '@/utils/notificationCenter';

jest.mock('@/services/notificationInboxService', () => ({
  notificationInboxService: {
    list: jest.fn(),
    unreadCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
  },
}));

const item = {
  _id: 'rec-1',
  title: 'Mini Mission is waiting!',
  message: 'Find 7 objects with Child A.',
  imageUrl: 'https://cdn.example/mission.png',
  createdAt: '2026-08-20T18:00:00.000Z',
  readAt: null,
  isUnread: true,
  childId: 'child-a',
  destination: { kind: 'mini_mission' as const, contentId: 'hazel-poster' },
};

describe('Notification inbox e2e (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNotificationInboxStore.getState().reset();
  });

  it('loads history after a skipped push, keeps the badge in sync, and routes to the child destination', async () => {
    (notificationInboxService.list as jest.Mock).mockResolvedValue({
      success: true,
      data: [item],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
    });
    (notificationInboxService.unreadCount as jest.Mock).mockResolvedValue({
      success: true,
      data: { unreadCount: 1 },
    });
    (notificationInboxService.markRead as jest.Mock).mockResolvedValue({
      success: true,
      data: { ...item, isUnread: false, readAt: '2026-08-20T19:00:00.000Z' },
    });
    (notificationInboxService.markAllRead as jest.Mock).mockResolvedValue({
      success: true,
      data: { updated: 1, unreadCount: 0 },
    });

    await useNotificationInboxStore.getState().fetchInbox(1);
    expect(useNotificationInboxStore.getState().items).toHaveLength(1);
    expect(useNotificationInboxStore.getState().unreadCount).toBe(1);
    expect(
      inboxItemPath(useNotificationInboxStore.getState().items[0], 'child-b')
    ).toBe('/child/child-a/star-cam-mission-start?missionId=hazel-poster');

    await useNotificationInboxStore.getState().markRead('rec-1');
    expect(useNotificationInboxStore.getState().items[0].isUnread).toBe(false);
    expect(useNotificationInboxStore.getState().unreadCount).toBe(0);

    useNotificationInboxStore.setState({
      items: [{ ...item, _id: 'rec-2' }, useNotificationInboxStore.getState().items[0]],
      unreadCount: 1,
    });
    await useNotificationInboxStore.getState().markAllRead();
    expect(useNotificationInboxStore.getState().unreadCount).toBe(0);
    expect(useNotificationInboxStore.getState().items.every((row) => !row.isUnread)).toBe(true);

    useNotificationInboxStore.getState().reset();
    expect(useNotificationInboxStore.getState().items).toEqual([]);
    expect(useNotificationInboxStore.getState().unreadCount).toBe(0);
  });
});
