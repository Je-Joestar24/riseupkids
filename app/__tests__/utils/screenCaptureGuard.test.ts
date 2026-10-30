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
const ORIGINAL_DEV = process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE;

afterEach(() => {
  jest.clearAllMocks();
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE;
  else process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE = ORIGINAL;
  if (ORIGINAL_DEV === undefined) delete process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE;
  else process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE = ORIGINAL_DEV;
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

describe('isScreenCaptureAllowed — the local-development setting (Expo Go)', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE;
    delete process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE;
  });

  it('is blocked by default in development when the setting is not in .env', () => {
    expect(isScreenCaptureAllowed(true)).toBe(false);
  });

  it('is allowed in development when EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE=true', () => {
    process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE = 'true';
    expect(isScreenCaptureAllowed(true)).toBe(true);
  });

  it('is IGNORED in a release build, even if it was left in .env', () => {
    process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE = 'true';
    expect(isScreenCaptureAllowed(false)).toBe(false);
  });

  it('only the exact string "true" counts; anything else keeps the protection on', () => {
    for (const value of ['false', '1', 'TRUE', 'yes', '', ' true']) {
      process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE = value;
      expect(isScreenCaptureAllowed(true)).toBe(false);
    }
  });

  it('removing the setting puts the protection straight back (nothing is remembered)', () => {
    process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE = 'true';
    expect(isScreenCaptureAllowed(true)).toBe(true);

    delete process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE;
    expect(isScreenCaptureAllowed(true)).toBe(false);
  });

  it('the store profile setting still works on its own, in any build', () => {
    process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE = 'true';
    expect(isScreenCaptureAllowed(false)).toBe(true);
    expect(isScreenCaptureAllowed(true)).toBe(true);
  });

  it('turning it on stops the protection from being applied at all', () => {
    process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE = 'true';
    const cleanup = applyScreenCaptureGuard('child-routes', isScreenCaptureAllowed(true));
    cleanup();

    expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
    expect(allowScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it('no EAS build profile sets the development-only setting', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const eas = require('../../eas.json');
    const withDevFlag = Object.entries(eas.build).filter(
      ([, profile]) =>
        (profile as { env?: Record<string, string> }).env?.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE !== undefined
    );

    expect(withDevFlag).toEqual([]);
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
