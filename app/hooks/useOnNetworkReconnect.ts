import { useEffect, useRef } from 'react';

import { useNetworkStore } from '@/store/networkStore';

/**
 * Re-run a screen fetch after the global no-internet modal reconnects.
 * Skips the initial mount so existing load effects stay in charge.
 */
export function useOnNetworkReconnect(callback: () => void): void {
  const generation = useNetworkStore((s) => s.reconnectGeneration);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    callbackRef.current();
  }, [generation]);
}
