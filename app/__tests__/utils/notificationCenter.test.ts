import { parseNotificationTapData, resolveNotificationDestinationPath } from '@/utils/notificationDeepLink';
import { countUnreadInbox, inboxItemPath } from '@/utils/notificationCenter';

describe('notificationCenter', () => {
  it('unread count matches receipts with empty readAt (4.3)', () => {
    expect(
      countUnreadInbox([
        { isUnread: true, readAt: null },
        { isUnread: false, readAt: '2026-08-25T12:00:00.000Z' },
        { isUnread: true, readAt: null },
      ])
    ).toBe(2);
  });

  it('tap payload includes destination for the child on the receipt (4.7)', () => {
    expect(
      inboxItemPath(
        {
          childId: 'child-a',
          destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
        },
        'child-b'
      )
    ).toBe('/child/child-a/star-cam-mission-start?missionId=hazel-poster');
    expect(resolveNotificationDestinationPath({ kind: 'book', contentId: 'cms-22' }, 'child-a')).toBe(
      '/child/child-a/module?bookId=cms-22'
    );
    expect(parseNotificationTapData({ destinationKind: 'home', childId: 'child-a' })).toBe(
      '/child/child-a/home'
    );
  });
});
