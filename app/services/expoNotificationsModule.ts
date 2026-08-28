import { Platform } from 'react-native';

import {
  getPushClientKind,
  isRemotePushAvailable,
  type PushClientKind,
} from '@/utils/expoPushProject';

/**
 * Importing `expo-notifications` on Android Expo Go (SDK 53+) throws a LogBox
 * error from DevicePushTokenAutoRegistration, even if we never mint a token.
 */
export function canLoadExpoNotificationsModule(
  platform: string = Platform.OS,
  clientKind: PushClientKind = getPushClientKind()
): boolean {
  return isRemotePushAvailable(platform, clientKind);
}

export async function loadExpoNotificationsModule(deps?: {
  platform?: string;
  clientKind?: PushClientKind;
  importModule?: () => Promise<unknown>;
}): Promise<unknown | null> {
  const platform = deps?.platform ?? Platform.OS;
  const clientKind = deps?.clientKind ?? getPushClientKind();
  if (!canLoadExpoNotificationsModule(platform, clientKind)) {
    return null;
  }
  try {
    const load = deps?.importModule ?? (() => import('expo-notifications'));
    return await load();
  } catch {
    return null;
  }
}
