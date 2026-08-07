import { isRunningInExpoGo } from 'expo';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SplashScreen from 'expo-splash-screen';

import {
  hideSplashScreen,
  initSplashScreen,
  resetSplashScreenForTests,
} from '@/utils/splashScreen';

jest.mock('expo', () => ({
  isRunningInExpoGo: jest.fn(() => false),
}));

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(undefined),
  hide: jest.fn(),
}));

const mockedSplash = SplashScreen as jest.Mocked<typeof SplashScreen>;
const mockedIsExpoGo = isRunningInExpoGo as jest.MockedFunction<typeof isRunningInExpoGo>;
const mockedRequireNative = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>;

describe('splashScreen utils', () => {
  beforeEach(() => {
    resetSplashScreenForTests();
    jest.clearAllMocks();
    mockedIsExpoGo.mockReturnValue(false);
    mockedSplash.preventAutoHideAsync.mockResolvedValue(true);
    mockedRequireNative.mockReturnValue({
      hide: jest.fn().mockResolvedValue(undefined),
    });
  });

  it('does not call hide when preventAutoHideAsync fails', async () => {
    mockedSplash.preventAutoHideAsync.mockRejectedValueOnce(
      new Error('no native splash screen registered')
    );
    const hide = jest.fn();
    mockedRequireNative.mockReturnValue({ hide });

    initSplashScreen();
    await hideSplashScreen();

    expect(hide).not.toHaveBeenCalled();
  });

  it('does not call hide when preventAutoHideAsync returns false', async () => {
    mockedSplash.preventAutoHideAsync.mockResolvedValueOnce(false);
    const hide = jest.fn();
    mockedRequireNative.mockReturnValue({ hide });

    initSplashScreen();
    await hideSplashScreen();

    expect(hide).not.toHaveBeenCalled();
  });

  it('awaits native hide promise so iOS rejections are not uncaught', async () => {
    const hide = jest
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "No native splash screen registered for given view controller. Call 'SplashScreen.show' for given view controller first."
        )
      );
    mockedRequireNative.mockReturnValue({ hide });

    initSplashScreen();
    await expect(hideSplashScreen()).resolves.toBeUndefined();
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it('skips native splash entirely in Expo Go on iOS', async () => {
    mockedIsExpoGo.mockReturnValue(true);
    const hide = jest.fn();
    mockedRequireNative.mockReturnValue({ hide });

    // Re-import behavior uses Platform.OS from RN — force path via isRunningInExpoGo + ios.
    // Platform.OS in jest-expo is typically 'ios'.
    initSplashScreen();
    await hideSplashScreen();

    expect(mockedSplash.preventAutoHideAsync).not.toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();
  });

  it('only hides once', async () => {
    const hide = jest.fn().mockResolvedValue(undefined);
    mockedRequireNative.mockReturnValue({ hide });

    initSplashScreen();
    await hideSplashScreen();
    await hideSplashScreen();

    expect(hide).toHaveBeenCalledTimes(1);
  });
});
