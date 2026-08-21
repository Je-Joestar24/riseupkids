import {
  NOTIFICATION_PERMISSION_COPY,
  decideNotificationPermissionAction,
  ensureNotificationPermission,
  openNotificationSettings,
} from '@/utils/notificationPermission';

describe('notificationPermission', () => {
  it('uses the client permission copy', () => {
    expect(NOTIFICATION_PERMISSION_COPY).toContain('Live lesson reminders');
    expect(NOTIFICATION_PERMISSION_COPY).toContain('Rise Up Kids');
  });

  it('does not re-prompt after a denial and offers settings instead (3.7)', async () => {
    const requestPermissions = jest.fn();
    const decision = await ensureNotificationPermission({
      getPermissions: async () => ({ granted: false, canAskAgain: true }),
      requestPermissions,
      hasAskedOnce: async () => true,
      markAsked: async () => undefined,
    });

    expect(requestPermissions).not.toHaveBeenCalled();
    expect(decision.granted).toBe(false);
    expect(decision.shouldRequest).toBe(false);
    expect(decision.shouldOpenSettings).toBe(true);
  });

  it('exposes a settings path when permission is denied', async () => {
    const openSettings = jest.fn().mockResolvedValue(undefined);
    await openNotificationSettings(openSettings);
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('asks once when permission has never been requested', () => {
    expect(decideNotificationPermissionAction({ granted: false, canAskAgain: true }, false)).toEqual({
      granted: false,
      shouldRequest: true,
      shouldOpenSettings: false,
    });
  });
});
