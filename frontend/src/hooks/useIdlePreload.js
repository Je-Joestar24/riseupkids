import { useEffect } from 'react';
import { preloadInSequence } from '../utils/lazyChunk';

/**
 * Downloads the given lazy components quietly, one at a time, when the browser is idle, once
 * `enabled` is true. Used to have a pop-up's code ready before the child taps to open it.
 * Does nothing on save-data / very slow connections. `components` is read once per enabling.
 */
const useIdlePreload = (components, enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;
    return preloadInSequence(components, { timeout: 3000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
};

export default useIdlePreload;
