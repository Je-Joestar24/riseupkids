import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { devicePushTokenService } from '@/services/devicePushTokenService';
import { loadExpoNotificationsModule } from '@/services/expoNotificationsModule';
import { bootstrapPushNotifications } from '@/services/notificationPushBootstrap';
import { getDeviceTimeZone } from '@/utils/deviceTimeZone';
import {
  EXPO_GO_ANDROID_REMOTE_PUSH_REASON,
  getExpoProjectId,
  getPushClientKind,
  isRemotePushAvailable,
  type PushClientKind,
} from '@/utils/expoPushProject';
import { redactExpoPushToken, recordPushDebug } from '@/utils/notificationPushDebug';
import {
  NOTIFICATION_PERMISSION_ASKED_KEY,
  ensureNotificationPermission,
  type NotificationPermissionStatus,
} from '@/utils/notificationPermission';

type NotificationsModule = {
  getPermissionsAsync: () => Promise<{ status: string; granted?: boolean; canAskAgain?: boolean }>;
  requestPermissionsAsync: () => Promise<{ status: string; granted?: boolean; canAskAgain?: boolean }>;
  getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string }>;
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

function toPermissionStatus(result: {
  status: string;
  granted?: boolean;
  canAskAgain?: boolean;
}): NotificationPermissionStatus {
  return {
    granted: Boolean(result.granted) || result.status === 'granted',
    canAskAgain: result.canAskAgain,
  };
}

async function loadNotificationsModule(
  platform: string,
  clientKind: PushClientKind
): Promise<NotificationsModule | null> {
  const loaded = await loadExpoNotificationsModule({ platform, clientKind });
  return (loaded as NotificationsModule | null) ?? null;
}

/**
 * Ask once, then register the Expo push token on the parent account.
 * Business logic stays out of components.
 */
export async function registerDeviceForPushNotifications(deps?: {
  notifications?: NotificationsModule | null;
  registerToken?: typeof devicePushTokenService.register;
  platform?: typeof Platform.OS;
  projectId?: string;
  clientKind?: PushClientKind;
}): Promise<{ registered: boolean; reason?: string }> {
  const platform = deps?.platform ?? Platform.OS;
  const clientKind = deps?.clientKind ?? getPushClientKind();
  if (platform !== 'ios' && platform !== 'android') {
    recordPushDebug({ registered: 'false', reason: 'unsupported_platform', permission: 'n/a' });
    return { registered: false, reason: 'unsupported_platform' };
  }

  if (!isRemotePushAvailable(platform, clientKind)) {
    recordPushDebug({
      registered: 'false',
      permission: 'n/a',
      reason: EXPO_GO_ANDROID_REMOTE_PUSH_REASON,
      tokenPreview: 'none',
    });
    return { registered: false, reason: EXPO_GO_ANDROID_REMOTE_PUSH_REASON };
  }

  const Notifications =
    deps?.notifications === undefined
      ? await loadNotificationsModule(platform, clientKind)
      : deps.notifications;
  if (!Notifications) {
    recordPushDebug({ registered: 'false', reason: 'notifications_unavailable', permission: 'n/a' });
    return { registered: false, reason: 'notifications_unavailable' };
  }

  try {
    await bootstrapPushNotifications(Notifications, platform);
  } catch (error) {
    console.warn('[notifications] bootstrap failed:', error);
  }

  const decision = await ensureNotificationPermission({
    getPermissions: async () => toPermissionStatus(await Notifications.getPermissionsAsync()),
    requestPermissions: async () => toPermissionStatus(await Notifications.requestPermissionsAsync()),
    hasAskedOnce: async () => Boolean(await AsyncStorage.getItem(NOTIFICATION_PERMISSION_ASKED_KEY)),
    markAsked: async () => {
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_ASKED_KEY, '1');
    },
  });

  if (!decision.granted) {
    const reason = decision.shouldOpenSettings ? 'permission_denied' : 'permission_pending';
    recordPushDebug({
      registered: 'false',
      permission: 'denied',
      reason,
      tokenPreview: 'none',
    });
    return { registered: false, reason };
  }

  const projectId = deps?.projectId || getExpoProjectId();
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult?.data;
    if (!token) {
      recordPushDebug({
        registered: 'false',
        permission: 'granted',
        reason: 'missing_token',
        tokenPreview: 'none',
      });
      return { registered: false, reason: 'missing_token' };
    }

    const register = deps?.registerToken || devicePushTokenService.register;
    await register({
      platform,
      token,
      timezone: getDeviceTimeZone(),
      clientKind,
    });
    recordPushDebug({
      registered: 'true',
      permission: 'granted',
      reason: 'none',
      tokenPreview: redactExpoPushToken(token) || 'none',
    });
    return { registered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'token_register_failed';
    const fcmHint =
      platform === 'android' && clientKind === 'standalone'
        ? ' Preview Android needs Firebase FCM (google-services.json + FCM V1 on expo.dev), then a new preview build.'
        : '';
    console.warn('[notifications] token register failed:', reason + fcmHint);
    recordPushDebug({
      registered: 'false',
      permission: 'granted',
      reason: reason + fcmHint,
      tokenPreview: 'none',
    });
    return { registered: false, reason: reason + fcmHint };
  }
}
