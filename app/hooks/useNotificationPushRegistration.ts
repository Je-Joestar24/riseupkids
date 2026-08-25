import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { registerDeviceForPushNotifications } from '@/services/notificationPushRegistration';
import { useAuthStore } from '@/store/useAuthStore';

const RETRY_DELAYS_MS = [0, 3000, 8000];

/**
 * Register the parent device for push after login, and again whenever the app
 * returns to the foreground so a preview build can store its own token
 * (Expo Go tokens do not deliver to a standalone/preview install).
 */
export function useNotificationPushRegistration(enabled: boolean) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isHydrated || !isAuthenticated) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = (index = 0) => {
      if (cancelled || inFlightRef.current) return;
      inFlightRef.current = true;

      void registerDeviceForPushNotifications()
        .then((result) => {
          inFlightRef.current = false;
          if (cancelled) return;
          if (result.registered) return;
          console.warn('[notifications] device not registered:', result.reason);
          const nextDelay = RETRY_DELAYS_MS[index + 1];
          if (nextDelay == null) return;
          timeoutId = setTimeout(() => run(index + 1), nextDelay);
        })
        .catch((error) => {
          inFlightRef.current = false;
          if (cancelled) return;
          console.warn('[notifications] device registration error:', error);
          const nextDelay = RETRY_DELAYS_MS[index + 1];
          if (nextDelay == null) return;
          timeoutId = setTimeout(() => run(index + 1), nextDelay);
        });
    };

    run(0);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') run(0);
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      sub.remove();
    };
  }, [enabled, isHydrated, isAuthenticated]);
}
