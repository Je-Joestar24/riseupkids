import { Platform } from 'react-native';

import {
  isKidsWallComingSoon,
  isKidsWallComingSoonEnabledForIos,
  isKidsWallComingSoonPreviewForced,
  isKidsWallHidden,
} from '@/utils/kidsWallComingSoon';

describe('kidsWallComingSoon (Kids Wall platform gate)', () => {
  const originalPreview = process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
  const originalIosFlag = process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;

  afterEach(() => {
    if (originalPreview === undefined) {
      delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    } else {
      process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = originalPreview;
    }
    if (originalIosFlag === undefined) {
      delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    } else {
      process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = originalIosFlag;
    }
  });

  it('hides Kids Wall on iOS by default', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(isKidsWallComingSoon('ios')).toBe(true);
    expect(isKidsWallHidden('ios')).toBe(true);
  });

  it('keeps Kids Wall visible on android and web by default', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(isKidsWallComingSoon('android')).toBe(false);
    expect(isKidsWallComingSoon('web')).toBe(false);
  });

  it('forces the hidden state on every platform when the preview env is true', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    expect(isKidsWallComingSoonPreviewForced()).toBe(true);
    expect(isKidsWallComingSoon('android')).toBe(true);
    expect(isKidsWallComingSoon('web')).toBe(true);
    expect(isKidsWallComingSoon('ios')).toBe(true);
  });

  it('can re-enable Kids Wall on an iOS build with EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    expect(isKidsWallComingSoonEnabledForIos()).toBe(false);
    expect(isKidsWallComingSoon('ios')).toBe(false);
  });

  it('the preview flag overrides the iOS re-enable flag', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    expect(isKidsWallComingSoon('ios')).toBe(true);
  });

  it('uses Platform.OS when the platform arg is omitted', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(isKidsWallComingSoon()).toBe(Platform.OS === 'ios');
  });
});
