import Constants from 'expo-constants';

export type PushClientKind = 'expo-go' | 'standalone';

/**
 * EAS project id used to mint Expo push tokens.
 * Standalone / preview builds need this; Expo Go can still mint without FCM.
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
