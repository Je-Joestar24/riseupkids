import {
  FOREGROUND_NOTIFICATION_BEHAVIOR,
  RISEUPKIDS_NOTIFICATION_CHANNEL,
  bootstrapPushNotifications,
} from '@/services/notificationPushBootstrap';

describe('notificationPushBootstrap', () => {
  it('shows banners while the app is open and creates the Android channel', async () => {
    const Notifications = {
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
      AndroidImportance: { MAX: 5 },
    };

    await bootstrapPushNotifications(Notifications, 'android');

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    const handler = Notifications.setNotificationHandler.mock.calls[0][0];
    await expect(handler.handleNotification()).resolves.toEqual(FOREGROUND_NOTIFICATION_BEHAVIOR);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      RISEUPKIDS_NOTIFICATION_CHANNEL,
      expect.objectContaining({
        name: 'Rise Up Kids',
        importance: 5,
        sound: 'default',
      })
    );
  });

  it('does not create an Android channel on iOS', async () => {
    const Notifications = {
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
    };

    await bootstrapPushNotifications(Notifications, 'ios');

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
