import { useEffect } from 'react';

import { reportDeviceTimezone } from '@/services/deviceTimezoneReport';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Last-seen device timezone updates the parent account after login.
 */
export function useDeviceTimezoneReport(enabled: boolean) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!enabled || !isHydrated || !isAuthenticated) return;
    void reportDeviceTimezone().catch((error) => {
      console.warn('[notifications] timezone report failed:', error);
    });
  }, [enabled, isHydrated, isAuthenticated]);
}
