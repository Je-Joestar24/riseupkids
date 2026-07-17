import { resolveKidsWallEnabled } from '@/utils/kidsWallConsent';

describe('resolveKidsWallEnabled', () => {
  it('returns true when kidsWallEnabled is true', () => {
    expect(resolveKidsWallEnabled({ kidsWallEnabled: true })).toBe(true);
  });

  it('returns true when kidsWallEnabled is missing', () => {
    expect(resolveKidsWallEnabled({})).toBe(true);
    expect(resolveKidsWallEnabled(null)).toBe(true);
  });

  it('returns false only when explicitly blocked', () => {
    expect(resolveKidsWallEnabled({ kidsWallEnabled: false })).toBe(false);
  });
});
