import { isExperienceTabEnabled } from '@/utils/experienceTab';

import { withCleanKidsWallEnv } from '../helpers/kidsWallEnv';

withCleanKidsWallEnv();

describe('isExperienceTabEnabled — iOS first, Android later', () => {
  it('is on for iOS, off for Android and Web (which keep Kid\'s Wall)', () => {
    expect(isExperienceTabEnabled('ios')).toBe(true);
    expect(isExperienceTabEnabled('android')).toBe(false);
    expect(isExperienceTabEnabled('web')).toBe(false);
  });

  it('follows Kids Wall: if Kids Wall is switched back on for iOS, Experience goes away', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    expect(isExperienceTabEnabled('ios')).toBe(false);
  });

  it('turns on everywhere with the QA preview flag', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    expect(isExperienceTabEnabled('android')).toBe(true);
    expect(isExperienceTabEnabled('web')).toBe(true);
  });
});
