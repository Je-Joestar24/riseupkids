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
    expect(isPushDebugEnvEnabled(undefined)).toBe(false);
    expect(isPushDebugEnvEnabled('')).toBe(false);
    expect(isPushDebugEnvEnabled('false')).toBe(false);
    expect(isPushDebugEnvEnabled('FALSE')).toBe(false);
    expect(isPushDebugEnvEnabled('0')).toBe(false);
    expect(isPushDebugEnvEnabled('#EXPO_PUBLIC_PUSH_DEBUG=true')).toBe(false);
    expect(isPushDebugEnvEnabled('true')).toBe(true);
    expect(isPushDebugEnvEnabled(' TRUE ')).toBe(true);
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
