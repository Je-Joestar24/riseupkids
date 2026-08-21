import { parseNotificationTapData, resolveNotificationDestinationPath } from '@/utils/notificationDeepLink';

describe('notificationDeepLink', () => {
  it('maps kind + id to an app route (3.8)', () => {
    expect(resolveNotificationDestinationPath({ kind: 'home' }, 'child-1')).toBe('/child/child-1/home');
    expect(resolveNotificationDestinationPath({ kind: 'journey' }, 'child-1')).toBe('/child/child-1/journey');
    expect(resolveNotificationDestinationPath({ kind: 'book', contentId: 'cms-22' }, 'child-1')).toBe(
      '/child/child-1/module?bookId=cms-22'
    );
    expect(resolveNotificationDestinationPath({ kind: 'live_lesson', contentId: 'live-9' }, 'child-1')).toBe(
      '/child/child-1/home?liveId=live-9'
    );
    expect(resolveNotificationDestinationPath({ kind: 'mini_mission', contentId: 'hazel' }, 'child-1')).toBe(
      '/child/child-1/star-cam-mission-start?missionId=hazel'
    );
    expect(resolveNotificationDestinationPath({ kind: 'parent_progress' }, 'child-1')).toBe('/parent/settings');
  });

  it('unknown kind does not crash', () => {
    expect(resolveNotificationDestinationPath({ kind: 'not-a-real-screen' }, 'child-1')).toBeNull();
    expect(parseNotificationTapData(undefined, 'child-1')).toBeNull();
  });
});
