import { Platform } from 'react-native';

export const RISEUPKIDS_NOTIFICATION_CHANNEL = 'riseupkids-default';

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

  await Notifications.setNotificationChannelAsync(RISEUPKIDS_NOTIFICATION_CHANNEL, {
    name: 'Rise Up Kids',
    importance,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
}
