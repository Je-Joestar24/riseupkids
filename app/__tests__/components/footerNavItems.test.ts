import { getActiveFromPath, getNavItems } from '@/components/child/common/footer-navigation';

import { withCleanKidsWallEnv } from '../helpers/kidsWallEnv';

withCleanKidsWallEnv();

const values = (platform: 'ios' | 'android' | 'web') => getNavItems(platform).map((i) => i.value);

describe('child footer navigation items — Kids Wall platform gate', () => {
  it("omits the Kid's Wall tab on iOS and shows Experience in its place", () => {
    expect(values('ios')).toEqual(['home', 'journey', 'explore', 'experience']);
    expect(values('ios')).not.toContain('wall');
  });

  it("includes the Kid's Wall tab on Android and Web, without the Experience tab", () => {
    expect(values('android')).toEqual(['home', 'journey', 'explore', 'wall']);
    expect(values('web')).toEqual(['home', 'journey', 'explore', 'wall']);
  });

  it('the Kid\'s Wall label is never the "Soon" placeholder', () => {
    const wall = getNavItems('android').find((i) => i.value === 'wall');
    expect(wall?.label).toBe("Kid's Wall");
  });

  it("omits Kid's Wall and shows Experience on every platform when the QA preview flag is on", () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';

    for (const platform of ['ios', 'android', 'web'] as const) {
      expect(values(platform)).toContain('experience');
      expect(values(platform)).not.toContain('wall');
    }
  });

  it("re-adds Kid's Wall on iOS when EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false, and drops Experience", () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    expect(values('ios')).toContain('wall');
    expect(values('ios')).not.toContain('experience');
  });
});

describe('child footer navigation items — Experience tab', () => {
  it("takes the place of Kid's Wall: four tabs on every platform, never both", () => {
    for (const platform of ['ios', 'android', 'web'] as const) {
      const tabs = values(platform);
      expect(tabs).toHaveLength(4);
      expect(tabs.includes('wall') && tabs.includes('experience')).toBe(false);
    }
  });

  it('is labelled "Experience" and is the last tab on iOS', () => {
    const ios = getNavItems('ios');

    expect(ios[ios.length - 1]).toEqual({ value: 'experience', label: 'Experience', isImage: false });
  });

  it('highlights Experience on its own page, and never mixes it up with Explore or Wall', () => {
    expect(getActiveFromPath('/child/abc/experience')).toBe('experience');
    expect(getActiveFromPath('/child/abc/explore')).toBe('explore');
    expect(getActiveFromPath('/child/abc/explore-content')).toBe('explore');
    expect(getActiveFromPath('/child/abc/wall')).toBe('wall');
    expect(getActiveFromPath('/child/abc/journey')).toBe('journey');
    expect(getActiveFromPath('/child/abc/home')).toBe('home');
  });
});
