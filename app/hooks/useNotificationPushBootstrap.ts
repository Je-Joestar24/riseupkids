import { useEffect } from 'react';

import { loadExpoNotificationsModule } from '@/services/expoNotificationsModule';
import { bootstrapPushNotifications } from '@/services/notificationPushBootstrap';

/**
 * Show banners while the app is open and create the Android notification channel.
 * Skipped on Android Expo Go — importing expo-notifications throws a SDK 53 error.
 */
export function useNotificationPushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const Notifications = await loadExpoNotificationsModule();
        if (cancelled || !Notifications) return;
        await bootstrapPushNotifications(Notifications);
      } catch {
        // expo-notifications is unavailable in some test / web environments.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
