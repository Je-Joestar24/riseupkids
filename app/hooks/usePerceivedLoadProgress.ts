import { useEffect, useRef, useState } from 'react';

/**
 * Display progress that moves faster than real download progress (UX illusion).
 * Caps below 99% until real work reaches 100%, then snaps to 100%.
 */
export function usePerceivedLoadProgress(realProgress: number, active: boolean): number {
  const [display, setDisplay] = useState(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setDisplay(0);
      startedAtRef.current = 0;
      return;
    }

    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
    }

    const tick = setInterval(() => {
      setDisplay((prev) => {
        const real = Math.max(0, Math.min(100, realProgress));
        if (real >= 100) return 100;

        const elapsed = Date.now() - startedAtRef.current;
        const timeBoost = Math.min(82, (elapsed / 1400) * 82);
        const aheadOfReal = Math.min(96, real + 32);
        const creep = prev >= 82 ? Math.min(96, prev + 1.2) : 0;

        const next = Math.max(prev, timeBoost, aheadOfReal, creep);
        return Math.min(99, Math.round(next));
      });
    }, 55);

    return () => clearInterval(tick);
  }, [active, realProgress]);

  useEffect(() => {
    if (active && realProgress >= 100) {
      setDisplay(100);
    }
  }, [active, realProgress]);

  return display;
}
