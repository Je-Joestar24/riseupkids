import Constants from 'expo-constants';

export type PushClientKind = 'expo-go' | 'standalone';

/**
 * EAS project id used to mint Expo push tokens.
 * Standalone / preview / development builds need this.
 */
export function getExpoProjectId(
  constants: {
    easConfig?: { projectId?: string } | null;
    expoConfig?: { extra?: { eas?: { projectId?: string } } } | null;
  } = Constants
): string | undefined {
  return constants.easConfig?.projectId || constants.expoConfig?.extra?.eas?.projectId;
}

export function getPushClientKind(
  constants: { appOwnership?: string | null } = Constants
): PushClientKind {
  return constants.appOwnership === 'expo' ? 'expo-go' : 'standalone';
}

/**
 * Expo Go on Android (SDK 53+) cannot mint or receive remote push.
 * Use a development or preview build instead.
 */
export function isRemotePushAvailable(
  platform: string,
  clientKind: PushClientKind = getPushClientKind()
): boolean {
  if (platform === 'android' && clientKind === 'expo-go') return false;
  return platform === 'ios' || platform === 'android';
}

export const EXPO_GO_ANDROID_REMOTE_PUSH_REASON =
  'expo_go_android_no_remote_push: Android Expo Go cannot receive remote push on SDK 53+. Use a development or preview build.';
