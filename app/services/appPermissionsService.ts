import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type AppPermissionKey = 'camera' | 'microphone' | 'mediaLibrary';

export interface AppPermissionResult {
  key: AppPermissionKey;
  granted: boolean;
  canAskAgain?: boolean;
}

async function requestCameraPermission(): Promise<AppPermissionResult> {
  const permission = await Camera.requestCameraPermissionsAsync();
  return {
    key: 'camera',
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
  };
}

async function requestMicrophonePermission(): Promise<AppPermissionResult> {
  const permission = await Audio.requestPermissionsAsync();
  return {
    key: 'microphone',
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
  };
}

async function requestMediaLibraryPermission(): Promise<AppPermissionResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return {
    key: 'mediaLibrary',
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
  };
}

export async function requestStartupAppPermissions(): Promise<AppPermissionResult[]> {
  if (Platform.OS === 'web') return [];

  const results: AppPermissionResult[] = [];
  for (const requestPermission of [
    requestCameraPermission,
    requestMicrophonePermission,
    requestMediaLibraryPermission,
  ]) {
    try {
      results.push(await requestPermission());
    } catch {
      // Feature screens keep their own permission checks as a fallback.
    }
  }

  return results;
}
