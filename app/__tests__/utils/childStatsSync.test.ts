import { resolveNextChildTotalStars } from '@/utils/childStatsSync';

describe('childStatsSync', () => {
  it('increments by starsToAward when totalStars is absent', () => {
    expect(resolveNextChildTotalStars(100, { starsToAward: 10 })).toBe(110);
  });

  it('prefers API totalStars when provided', () => {
    expect(resolveNextChildTotalStars(100, { starsToAward: 10, totalStars: 125 })).toBe(125);
  });

  it('returns null when no reward data is present', () => {
    expect(resolveNextChildTotalStars(100, {})).toBeNull();
    expect(resolveNextChildTotalStars(100, { starsToAward: 0 })).toBeNull();
  });
});
