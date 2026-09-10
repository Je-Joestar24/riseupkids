import { getNavItems } from '@/components/child/common/footer-navigation';

describe('child footer navigation items — Kids Wall platform gate', () => {
  const originalPreview = process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
  const originalIosFlag = process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;

  afterEach(() => {
    if (originalPreview === undefined) delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    else process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = originalPreview;
    if (originalIosFlag === undefined) delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    else process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = originalIosFlag;
  });

  const values = (platform: 'ios' | 'android' | 'web') =>
    getNavItems(platform).map((i) => i.value);

  it('omits the Kid\'s Wall tab on iOS', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(values('ios')).toEqual(['home', 'journey', 'explore']);
    expect(values('ios')).not.toContain('wall');
  });

  it('includes the Kid\'s Wall tab on Android and Web', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    expect(values('android')).toEqual(['home', 'journey', 'explore', 'wall']);
    expect(values('web')).toContain('wall');
  });

  it('the Kid\'s Wall label is never the "Soon" placeholder', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON;
    const wall = getNavItems('android').find((i) => i.value === 'wall');
    expect(wall?.label).toBe("Kid's Wall");
  });

  it('omits the tab on every platform when the QA preview flag is on', () => {
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW = 'true';
    expect(values('android')).not.toContain('wall');
    expect(values('web')).not.toContain('wall');
  });

  it('re-adds the tab on iOS when EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false', () => {
    delete process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW;
    process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON = 'false';
    expect(values('ios')).toContain('wall');
  });
});
