import { getActiveFromPath, getNavItems } from '@/components/child/common/footer-navigation';

import { withCleanKidsWallEnv } from '../helpers/kidsWallEnv';

withCleanKidsWallEnv();

const values = (platform: 'ios' | 'android' | 'web') => getNavItems(platform).map((i) => i.value);

describe('child footer navigation items — Kids Wall platform gate', () => {
  it("omits the Kid's Wall tab on iOS, which has three tabs and no replacement tab", () => {
    expect(values('ios')).toEqual(['home', 'journey', 'explore']);
  });

  it("includes the Kid's Wall tab on Android and Web", () => {
    expect(values('android')).toEqual(['home', 'journey', 'explore', 'wall']);
    expect(values('web')).toEqual(['home', 'journey', 'explore', 'wall']);
  });

  it('the Kid\'s Wall label is never the "Soon" placeholder', () => {
    const wall = getNavItems('android').find((i) => i.value === 'wall');
    expect(wall?.label).toBe("Kid's Wall");
  });

  it("omits Kid's Wall on every platform when the QA preview flag is on", () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';

    for (const platform of ['ios', 'android', 'web'] as const) {
      expect(values(platform)).toEqual(['home', 'journey', 'explore']);
    }
  });

  it("re-adds Kid's Wall on iOS when EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false", () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    expect(values('ios')).toEqual(['home', 'journey', 'explore', 'wall']);
  });
});

describe('child footer navigation items — no Experience tab', () => {
  it('has no Experience tab on any platform, with or without the flags', () => {
    for (const platform of ['ios', 'android', 'web'] as const) {
      expect(values(platform)).not.toContain('experience');
      expect(getNavItems(platform).some((i) => /experience/i.test(i.label))).toBe(false);
    }
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    for (const platform of ['ios', 'android', 'web'] as const) {
      expect(values(platform)).not.toContain('experience');
    }
  });

  it('keeps Explore lit on the experience screens (reached from the button on Explore)', () => {
    expect(getActiveFromPath('/child/abc/explore')).toBe('explore');
    expect(getActiveFromPath('/child/abc/explore-experience')).toBe('explore');
    expect(getActiveFromPath('/child/abc/explore-experience-detail')).toBe('explore');
  });

  it('still tells every other tab apart', () => {
    expect(getActiveFromPath('/child/abc/explore-content')).toBe('explore');
    expect(getActiveFromPath('/child/abc/replays')).toBe('explore');
    expect(getActiveFromPath('/child/abc/wall')).toBe('wall');
    expect(getActiveFromPath('/child/abc/journey')).toBe('journey');
    expect(getActiveFromPath('/child/abc/module')).toBe('journey');
    expect(getActiveFromPath('/child/abc/home')).toBe('home');
  });
});
