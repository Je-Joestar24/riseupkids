/**
 * IANA timezone from the device. Never inferred from language.
 */
export function getDeviceTimeZone(
  resolve: () => { timeZone?: string } = () => Intl.DateTimeFormat().resolvedOptions()
): string | null {
  try {
    const zone = String(resolve()?.timeZone || '').trim();
    return zone || null;
  } catch {
    return null;
  }
}
