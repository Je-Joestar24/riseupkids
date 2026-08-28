import {
  DEFAULT_NOTIFICATION_INBOX_IMAGE,
  getNotificationInboxImageSource,
  hasCampaignInboxImage,
} from '@/utils/notificationInboxImage';

describe('notificationInboxImage', () => {
  it('uses the Play Store app icon when the campaign has no image', () => {
    expect(getNotificationInboxImageSource(null)).toBe(DEFAULT_NOTIFICATION_INBOX_IMAGE);
    expect(getNotificationInboxImageSource('')).toBe(DEFAULT_NOTIFICATION_INBOX_IMAGE);
    expect(getNotificationInboxImageSource('   ')).toBe(DEFAULT_NOTIFICATION_INBOX_IMAGE);
    expect(hasCampaignInboxImage(null)).toBe(false);
  });

  it('uses the campaign image on the left when one was uploaded', () => {
    expect(getNotificationInboxImageSource('https://cdn.example/mission.png')).toEqual({
      uri: 'https://cdn.example/mission.png',
    });
    expect(hasCampaignInboxImage('https://cdn.example/mission.png')).toBe(true);
  });
});
