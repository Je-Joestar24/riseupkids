import { useEffect, useRef } from 'react';

import { registerDeviceForPushNotifications } from '@/services/notificationPushRegistration';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Register the parent device for push after login. Asks permission once.
 */
export function useNotificationPushRegistration(enabled: boolean) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isAuthenticated || hasRegisteredRef.current) return;
    hasRegisteredRef.current = true;
    void registerDeviceForPushNotifications();
  }, [enabled, isAuthenticated]);
}
