import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { loadExpoNotificationsModule } from '@/services/expoNotificationsModule';
import { parseNotificationTapData } from '@/utils/notificationDeepLink';

type NotificationsTapModule = {
  getLastNotificationResponseAsync: () => Promise<{
    notification?: { request?: { content?: { data?: unknown } } };
  } | null>;
  addNotificationResponseReceivedListener: (
    listener: (response: { notification?: { request?: { content?: { data?: unknown } } } }) => void
  ) => { remove: () => void };
};

/**
 * Open the campaign destination when a push is tapped (app open, background, or cold start).
 * Skipped on Android Expo Go — importing expo-notifications throws a SDK 53 error.
 */
export function useNotificationTapRouting(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let remove: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const loaded = await loadExpoNotificationsModule();
        if (cancelled || !loaded) return;
        const Notifications = loaded as NotificationsTapModule;

        const last = await Notifications.getLastNotificationResponseAsync();
        const lastPath = parseNotificationTapData(last?.notification?.request?.content?.data);
        if (lastPath) {
          router.push(lastPath as never);
        }

        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const path = parseNotificationTapData(response?.notification?.request?.content?.data);
          if (path) router.push(path as never);
        });
        remove = () => subscription.remove();
      } catch {
        // expo-notifications is unavailable in some test / web environments.
      }
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [enabled, router]);
}
