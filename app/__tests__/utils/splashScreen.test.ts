import * as SplashScreen from 'expo-splash-screen';

import { hideSplashScreen, initSplashScreen } from '@/utils/splashScreen';

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockedSplash = SplashScreen as jest.Mocked<typeof SplashScreen>;

describe('splashScreen utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSplash.preventAutoHideAsync.mockResolvedValue(undefined);
    mockedSplash.hideAsync.mockResolvedValue(undefined);
  });

  it('does not call hideAsync when preventAutoHideAsync fails', async () => {
    mockedSplash.preventAutoHideAsync.mockRejectedValueOnce(
      new Error('no native splash screen registered')
    );

    await initSplashScreen();
    await hideSplashScreen();

    expect(mockedSplash.hideAsync).not.toHaveBeenCalled();
  });

  it('calls hideAsync once after successful init', async () => {
    await initSplashScreen();
    await hideSplashScreen();
    await hideSplashScreen();

    expect(mockedSplash.hideAsync).toHaveBeenCalledTimes(1);
  });
});
