import { resolveKidsWallEnabled } from '@/utils/kidsWallConsent';

describe('resolveKidsWallEnabled', () => {
  it('returns true when kidsWallEnabled is true', () => {
    expect(resolveKidsWallEnabled({ kidsWallEnabled: true })).toBe(true);
  });

  it('returns false when disabled or missing', () => {
    expect(resolveKidsWallEnabled({ kidsWallEnabled: false })).toBe(false);
    expect(resolveKidsWallEnabled({})).toBe(false);
    expect(resolveKidsWallEnabled(null)).toBe(false);
  });
});
