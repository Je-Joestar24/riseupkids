import { Platform } from 'react-native';

import {
  getKidsWallNavLabel,
  isKidsWallComingSoon,
  isKidsWallComingSoonEnabledForIos,
  isKidsWallComingSoonPreviewForced,
} from '@/utils/kidsWallComingSoon';

describe('kidsWallComingSoon', () => {
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

  it('is on for iOS by default', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(isKidsWallComingSoon('ios')).toBe(true);
    expect(getKidsWallNavLabel('ios')).toBe('Soon');
  });

  it('is off for android and web by default', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(isKidsWallComingSoon('android')).toBe(false);
    expect(isKidsWallComingSoon('web')).toBe(false);
    expect(getKidsWallNavLabel('android')).toBe("Kid's Wall");
  });

  it('forces Coming Soon on all platforms when preview env is true', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    expect(isKidsWallComingSoonPreviewForced()).toBe(true);
    expect(isKidsWallComingSoon('android')).toBe(true);
    expect(isKidsWallComingSoon('web')).toBe(true);
    expect(isKidsWallComingSoon('ios')).toBe(true);
    expect(getKidsWallNavLabel('web')).toBe('Soon');
  });

  it('can disable iOS Coming Soon with EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    expect(isKidsWallComingSoonEnabledForIos()).toBe(false);
    expect(isKidsWallComingSoon('ios')).toBe(false);
    expect(getKidsWallNavLabel('ios')).toBe("Kid's Wall");
  });

  it('preview flag overrides iOS disable', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    expect(isKidsWallComingSoon('ios')).toBe(true);
  });

  it('uses Platform.OS when platform arg is omitted', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    const expected = Platform.OS === 'ios';
    expect(isKidsWallComingSoon()).toBe(expected);
  });
});
