import { useEffect } from 'react';

import { applyScreenCaptureGuard } from '@/utils/screenCaptureGuard';

/** Drop-in replacement for expo-screen-capture's usePreventScreenCapture that honors the
 * screenshots-build flag (see utils/screenCaptureGuard.ts). */
export function useScreenCaptureGuard(key: string): void {
  useEffect(() => applyScreenCaptureGuard(key), [key]);
}
