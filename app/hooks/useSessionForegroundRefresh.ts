import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAuthStore } from '@/store/useAuthStore';

/**
 * Chunk 9 Phase C — silently renew the session whenever the app returns to the foreground. The
 * access token is short-lived and very likely expired after any real time backgrounded; without
 * this, the first API call after resuming would 401, and while api.ts's own interceptor also
 * refreshes reactively on a 401, doing it proactively here means the user doesn't see even a
 * brief failed-request flicker on the screen they're returning to.
 *
 * Does nothing before the initial hydrate() (launch-time refresh) has completed, and does
 * nothing if the user was never logged in — a background/foreground cycle on the login screen
 * has no session to renew.
 */
export function useSessionForegroundRefresh() {
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!useAuthStore.getState().isAuthenticated) return;
      void useAuthStore.getState().refreshSession();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [isHydrated]);
}
