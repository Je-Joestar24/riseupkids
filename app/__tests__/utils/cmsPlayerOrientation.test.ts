import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

import {
  CMS_BOOK_PLAYER_MODAL_ORIENTATIONS,
  CMS_PLAYER_MODAL_ORIENTATIONS,
  prepareCmsPlayerOrientation,
  reassertCmsPlayerLandscapeLock,
  resetCmsPlayerOrientationForTests,
  restoreAppPortraitOrientation,
} from '@/utils/cmsPlayerOrientation';

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: {
    PORTRAIT_UP: 1,
    LANDSCAPE: 2,
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
  },
  Orientation: {
    LANDSCAPE_LEFT: 3,
    LANDSCAPE_RIGHT: 4,
    PORTRAIT_UP: 1,
  },
  unlockAsync: jest.fn().mockResolvedValue(undefined),
  lockAsync: jest.fn().mockResolvedValue(undefined),
  addOrientationChangeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

describe('cmsPlayerOrientation', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    resetCmsPlayerOrientationForTests();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    jest.clearAllMocks();
  });

  it('CMS book player modal allows only landscape-right on iOS (no flip)', () => {
    expect(CMS_BOOK_PLAYER_MODAL_ORIENTATIONS).toEqual(['landscape-right']);
    expect(CMS_BOOK_PLAYER_MODAL_ORIENTATIONS).not.toContain('portrait');
    expect(CMS_BOOK_PLAYER_MODAL_ORIENTATIONS).not.toContain('landscape-left');
  });

  it('other video modals may still allow portrait on iOS', () => {
    expect(CMS_PLAYER_MODAL_ORIENTATIONS).toContain('portrait');
    expect(CMS_PLAYER_MODAL_ORIENTATIONS).toContain('landscape');
  });

  it('locks iOS CMS player to landscape-right without unlocking first', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    await prepareCmsPlayerOrientation();

    expect(ScreenOrientation.unlockAsync).not.toHaveBeenCalled();
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
    );
  });

  it('reassert does not stack another restore when depth is already open', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    await prepareCmsPlayerOrientation();
    jest.clearAllMocks();

    await reassertCmsPlayerLandscapeLock();
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT
    );

    await restoreAppPortraitOrientation();
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
  });
});
