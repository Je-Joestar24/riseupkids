import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { API_BASE_URL, APP_VERSION } from '@/config';
import { getExpoProjectId, getPushClientKind } from '@/utils/expoPushProject';

/** Only the exact string "true" enables the overlay. Missing / false / commented / any other value → off. */
export function isPushDebugEnvEnabled(
  raw: string | undefined = process.env.EXPO_PUBLIC_PUSH_DEBUG
): boolean {
  return (
    String(raw ?? '')
      .trim()
      .toLowerCase() === 'true'
  );
}

export const PUSH_DEBUG_ENABLED = isPushDebugEnvEnabled();

export function shouldShowPushDebug(): boolean {
  return isPushDebugEnvEnabled();
}

export function getFcmBuildProbe(
  extra: { fcm?: { fileFound?: string; packageName?: string; firebaseProjectId?: string; googleAppId?: string } } | undefined =
    Constants.expoConfig?.extra as
      | { fcm?: { fileFound?: string; packageName?: string; firebaseProjectId?: string; googleAppId?: string } }
      | undefined
) {
  const fcm = extra?.fcm;
  return {
    fcmFile: fcm?.fileFound || 'unknown',
    fcmPackage: fcm?.packageName || 'missing',
    fcmProject: fcm?.firebaseProjectId || 'missing',
    fcmAppId: fcm?.googleAppId || 'missing',
  };
}

export function redactExpoPushToken(token?: string | null): string | null {
  const value = String(token || '').trim();
  if (!value) return null;
  if (value.length <= 24) return `${value.slice(0, 12)}…`;
  return `${value.slice(0, 22)}…${value.slice(-4)}`;
}

export type PushDebugSnapshot = {
  time: string;
  platform: string;
  appVersion: string;
  api: string;
  clientKind: string;
  projectId: string;
  authenticatedHint: string;
  registered: string;
  permission: string;
  tokenPreview: string;
  reason: string;
  fcmFile: string;
  fcmPackage: string;
  fcmProject: string;
  fcmAppId: string;
};

const EMPTY: PushDebugSnapshot = {
  time: 'n/a',
  platform: Platform.OS,
  appVersion: APP_VERSION,
  api: API_BASE_URL,
  clientKind: getPushClientKind(),
  projectId: getExpoProjectId() || 'missing',
  authenticatedHint: 'n/a',
  registered: 'not-yet',
  permission: 'n/a',
  tokenPreview: 'none',
  reason: 'waiting',
  ...getFcmBuildProbe(),
};

let snapshot: PushDebugSnapshot = { ...EMPTY };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPushDebugSnapshot(): PushDebugSnapshot {
  return snapshot;
}

export function subscribePushDebug(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function recordPushDebug(partial: Partial<PushDebugSnapshot>) {
  snapshot = {
    ...snapshot,
    ...partial,
    time: new Date().toISOString(),
    platform: Platform.OS,
    appVersion: APP_VERSION,
    api: API_BASE_URL,
    clientKind: getPushClientKind(),
    projectId: getExpoProjectId() || snapshot.projectId || 'missing',
    ...getFcmBuildProbe(),
  };
  emit();
}

export function resetPushDebugSnapshot() {
  snapshot = { ...EMPTY };
  emit();
}
