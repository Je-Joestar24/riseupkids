import { useEffect, useState } from 'react';
import { fetchCheckoutPricing } from '../services/checkoutService';

/**
 * The Family Plan prices from the backend (the one price list), for screens that show a plan's price.
 * Nothing is asked when `enabled` is false (for example for a legacy subscription, which has no Family Plan price).
 *
 * @param {{ enabled?: boolean }} [options]
 * @returns {{ status: 'idle'|'loading'|'ready'|'error', data: object|null }}
 */
export function useCheckoutPricing({ enabled = true } = {}) {
  const [state, setState] = useState({ status: 'idle', data: null });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((current) => (current.status === 'ready' ? current : { status: 'loading', data: null }));
    fetchCheckoutPricing()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

export default useCheckoutPricing;
