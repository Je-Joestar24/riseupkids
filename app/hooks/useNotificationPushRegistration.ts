import { useEffect, useRef } from 'react';

import { registerDeviceForPushNotifications } from '@/services/notificationPushRegistration';
import { useAuthStore } from '@/store/useAuthStore';

const RETRY_DELAYS_MS = [0, 3000, 8000];

/**
 * Register the parent device for push after login. Asks permission once.
 * Retries a few times if the first attempt fails (hydrate / native token race).
 */
export function useNotificationPushRegistration(enabled: boolean) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const succeededRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isHydrated || !isAuthenticated || succeededRef.current) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const attempt = (index: number) => {
      void registerDeviceForPushNotifications()
        .then((result) => {
          if (cancelled) return;
          if (result.registered) {
            succeededRef.current = true;
            return;
          }
          console.warn('[notifications] device not registered:', result.reason);
          const nextDelay = RETRY_DELAYS_MS[index + 1];
          if (nextDelay == null) return;
          timeoutId = setTimeout(() => attempt(index + 1), nextDelay);
        })
        .catch((error) => {
          if (cancelled) return;
          console.warn('[notifications] device registration error:', error);
          const nextDelay = RETRY_DELAYS_MS[index + 1];
          if (nextDelay == null) return;
          timeoutId = setTimeout(() => attempt(index + 1), nextDelay);
        });
    };

    attempt(0);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled, isHydrated, isAuthenticated]);
}
