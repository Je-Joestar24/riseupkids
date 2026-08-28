import {
  getPushDebugSnapshot,
  isPushDebugEnvEnabled,
  redactExpoPushToken,
  recordPushDebug,
  resetPushDebugSnapshot,
} from '@/utils/notificationPushDebug';

describe('notificationPushDebug', () => {
  const original = process.env.EXPO_PUBLIC_PUSH_DEBUG;

  afterEach(() => {
    if (original === undefined) delete process.env.EXPO_PUBLIC_PUSH_DEBUG;
    else process.env.EXPO_PUBLIC_PUSH_DEBUG = original;
    resetPushDebugSnapshot();
  });

  it('enables the overlay only when the flag is exactly true', () => {
    delete process.env.EXPO_PUBLIC_PUSH_DEBUG;
    expect(isPushDebugEnvEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_PUSH_DEBUG = 'false';
    expect(isPushDebugEnvEnabled()).toBe(false);
    process.env.EXPO_PUBLIC_PUSH_DEBUG = 'true';
    expect(isPushDebugEnvEnabled()).toBe(true);
  });

  it('redacts the Expo token so the overlay never shows the full value', () => {
    expect(redactExpoPushToken('ExponentPushToken[abcdefghijklmnop]')).toMatch(/…/);
    expect(redactExpoPushToken('ExponentPushToken[abcdefghijklmnop]')).not.toBe(
      'ExponentPushToken[abcdefghijklmnop]'
    );
  });

  it('records registration status for the debug panel', () => {
    recordPushDebug({
      registered: 'true',
      permission: 'granted',
      tokenPreview: 'ExponentPushToken[abc…]',
      reason: 'none',
    });
    expect(getPushDebugSnapshot().registered).toBe('true');
    expect(getPushDebugSnapshot().permission).toBe('granted');
  });
});
