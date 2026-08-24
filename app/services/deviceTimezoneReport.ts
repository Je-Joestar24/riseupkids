import { devicePushTokenService } from '@/services/devicePushTokenService';
import { getDeviceTimeZone } from '@/utils/deviceTimeZone';

/**
 * Keep the parent account timezone in sync with the last-seen device.
 */
export async function reportDeviceTimezone(deps?: {
  getTimeZone?: () => string | null;
  reportTimezone?: (timezone: string) => Promise<unknown>;
}): Promise<{ reported: boolean; timezone?: string | null }> {
  const timezone = (deps?.getTimeZone || getDeviceTimeZone)();
  if (!timezone) return { reported: false, timezone: null };
  const report = deps?.reportTimezone || devicePushTokenService.reportTimezone;
  await report(timezone);
  return { reported: true, timezone };
}
