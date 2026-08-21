import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { parseNotificationTapData } from '@/utils/notificationDeepLink';

/**
 * Open the campaign destination when a push is tapped (app open, background, or cold start).
 */
export function useNotificationTapRouting(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let remove: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (cancelled) return;

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
