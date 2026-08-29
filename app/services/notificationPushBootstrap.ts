import { Platform } from 'react-native';

export const RISEUPKIDS_NOTIFICATION_CHANNEL = 'riseupkids-default';
/** Expo docs require a channel named `default` before getExpoPushTokenAsync on Android 13+. */
export const EXPO_DEFAULT_NOTIFICATION_CHANNEL = 'default';

type NotificationsLike = {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner: boolean;
      shouldShowList: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync?: (
    id: string,
    config: {
      name: string;
      importance: number;
      vibrationPattern: number[];
      sound: string;
    }
  ) => Promise<unknown>;
  AndroidImportance?: { MAX?: number; HIGH?: number };
};

export const FOREGROUND_NOTIFICATION_BEHAVIOR = {
  shouldShowAlert: true,
  shouldPlaySound: true,
  shouldSetBadge: true,
  shouldShowBanner: true,
  shouldShowList: true,
};

/**
 * Show banners while the app is open, and create the Android channel
 * required for heads-up notifications.
 */
export async function bootstrapPushNotifications(
  Notifications: NotificationsLike,
  platform: typeof Platform.OS = Platform.OS
): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => FOREGROUND_NOTIFICATION_BEHAVIOR,
  });

  if (platform !== 'android' || !Notifications.setNotificationChannelAsync) return;

  const importance =
    Notifications.AndroidImportance?.MAX ?? Notifications.AndroidImportance?.HIGH ?? 5;
  const channelConfig = {
    name: 'Rise Up Kids',
    importance,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  };

  // Official setup: create a channel before requesting the push token.
  // https://docs.expo.dev/push-notifications/push-notifications-setup/
  await Notifications.setNotificationChannelAsync(EXPO_DEFAULT_NOTIFICATION_CHANNEL, {
    ...channelConfig,
    name: 'default',
  });
  await Notifications.setNotificationChannelAsync(RISEUPKIDS_NOTIFICATION_CHANNEL, channelConfig);
}
