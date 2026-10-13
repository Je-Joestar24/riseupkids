/**
 * Screen-capture protection must stay ON everywhere except a build explicitly made with
 * EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE=true (the `screenshots` EAS profile, used only to take App Store
 * screenshots). Production and every other profile must never turn it off by accident.
 */
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
}));

import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';

import { applyScreenCaptureGuard, isScreenCaptureAllowed } from '@/utils/screenCaptureGuard';

const ORIGINAL = process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE;

afterEach(() => {
  jest.clearAllMocks();
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE;
  else process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE = ORIGINAL;
});

describe('isScreenCaptureAllowed', () => {
  it('is false when the flag is not set (the production default)', () => {
    delete process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE;
    expect(isScreenCaptureAllowed()).toBe(false);
  });

  it('is only true for the exact string "true"', () => {
    for (const value of ['false', '1', 'TRUE', 'yes', '']) {
      process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE = value;
      expect(isScreenCaptureAllowed()).toBe(false);
    }
    process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE = 'true';
    expect(isScreenCaptureAllowed()).toBe(true);
  });
});

describe('applyScreenCaptureGuard', () => {
  it('blocks capture by default and releases it on cleanup', () => {
    delete process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE;
    const cleanup = applyScreenCaptureGuard('child-routes');

    expect(preventScreenCaptureAsync).toHaveBeenCalledWith('child-routes');
    cleanup();
    expect(allowScreenCaptureAsync).toHaveBeenCalledWith('child-routes');
  });

  it('does nothing at all when the screenshots flag is set', () => {
    process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE = 'true';
    const cleanup = applyScreenCaptureGuard('child-routes');
    cleanup();

    expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
    expect(allowScreenCaptureAsync).not.toHaveBeenCalled();
  });
});

describe('eas.json build profiles', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const eas = require('../../eas.json');

  it('only the screenshots profile turns screen-capture protection off', () => {
    const withFlag = Object.entries(eas.build)
      .filter(([, profile]) => (profile as { env?: Record<string, string> }).env?.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE === 'true')
      .map(([name]) => name);

    expect(withFlag).toEqual(['screenshots']);
  });
});
