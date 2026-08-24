import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { devicePushTokenService } from '@/services/devicePushTokenService';
import { bootstrapPushNotifications } from '@/services/notificationPushBootstrap';
import { getDeviceTimeZone } from '@/utils/deviceTimeZone';
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

async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  try {
    const Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
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
}): Promise<{ registered: boolean; reason?: string }> {
  const platform = deps?.platform ?? Platform.OS;
  if (platform !== 'ios' && platform !== 'android') {
    return { registered: false, reason: 'unsupported_platform' };
  }

  const Notifications = deps?.notifications === undefined ? await loadNotificationsModule() : deps.notifications;
  if (!Notifications) {
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
    return { registered: false, reason: decision.shouldOpenSettings ? 'permission_denied' : 'permission_pending' };
  }

  const projectId = deps?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult?.data;
    if (!token) {
      return { registered: false, reason: 'missing_token' };
    }

    const register = deps?.registerToken || devicePushTokenService.register;
    await register({ platform, token, timezone: getDeviceTimeZone() });
    return { registered: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'token_register_failed';
    console.warn('[notifications] token register failed:', reason);
    return { registered: false, reason };
  }
}
