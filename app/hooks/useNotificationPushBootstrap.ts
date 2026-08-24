import { useEffect } from 'react';

import { bootstrapPushNotifications } from '@/services/notificationPushBootstrap';

/**
 * Show banners while the app is open and create the Android notification channel.
 */
export function useNotificationPushBootstrap() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;
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
