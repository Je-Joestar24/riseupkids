import { Linking } from 'react-native';

export const NOTIFICATION_PERMISSION_COPY =
  'Enable notifications to receive Live lesson reminders, new adventures, and important Rise Up Kids updates.';

export const NOTIFICATION_PERMISSION_ASKED_KEY = '@riseupkids_notificationPermissionAsked';

export type NotificationPermissionStatus = {
  granted: boolean;
  canAskAgain?: boolean;
};

export type NotificationPermissionDecision = {
  granted: boolean;
  shouldRequest: boolean;
  shouldOpenSettings: boolean;
};

/**
 * Ask once. If the parent already declined, never re-prompt in a loop.
 * Offer a settings path instead.
 */
export function decideNotificationPermissionAction(
  status: NotificationPermissionStatus,
  hasAskedOnce: boolean
): NotificationPermissionDecision {
  if (status.granted) {
    return { granted: true, shouldRequest: false, shouldOpenSettings: false };
  }

  if (hasAskedOnce || status.canAskAgain === false) {
    return { granted: false, shouldRequest: false, shouldOpenSettings: true };
  }

  return { granted: false, shouldRequest: true, shouldOpenSettings: false };
}

export async function ensureNotificationPermission(deps: {
  getPermissions: () => Promise<NotificationPermissionStatus>;
  requestPermissions: () => Promise<NotificationPermissionStatus>;
  hasAskedOnce: () => Promise<boolean>;
  markAsked: () => Promise<void>;
}): Promise<NotificationPermissionDecision> {
  const current = await deps.getPermissions();
  const asked = await deps.hasAskedOnce();
  const first = decideNotificationPermissionAction(current, asked);

  if (!first.shouldRequest) {
    return first;
  }

  await deps.markAsked();
  const afterRequest = await deps.requestPermissions();
  return decideNotificationPermissionAction(afterRequest, true);
}

export async function openNotificationSettings(
  openSettings: () => Promise<void> = () => Linking.openSettings()
): Promise<void> {
  await openSettings();
}

