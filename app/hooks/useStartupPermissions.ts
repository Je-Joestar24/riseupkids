import { useEffect, useRef } from 'react';

import { requestStartupAppPermissions } from '@/services/appPermissionsService';

export function useStartupPermissions(enabled: boolean) {
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    void requestStartupAppPermissions();
  }, [enabled]);
}
