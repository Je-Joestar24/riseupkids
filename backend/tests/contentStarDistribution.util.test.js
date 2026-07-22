const {
  getStarsForSession,
  getDistributionPlan,
  getTotalStarsForSessions,
} = require('../utils/contentStarDistribution.util');

describe('contentStarDistribution.util', () => {
  it('splits 50 stars evenly across 5 sessions', () => {
    expect(getDistributionPlan(50, 5)).toEqual([10, 10, 10, 10, 10]);
    expect(getTotalStarsForSessions(50, 5)).toBe(50);
  });

  it('puts remainder on the final session for odd totals', () => {
    expect(getDistributionPlan(53, 5)).toEqual([10, 10, 10, 10, 13]);
    expect(getStarsForSession(5, 53, 5)).toBe(13);
    expect(getTotalStarsForSessions(53, 5)).toBe(53);
  });

  it('handles 7 stars across 3 sessions', () => {
    expect(getDistributionPlan(7, 3)).toEqual([2, 2, 3]);
    expect(getTotalStarsForSessions(7, 3)).toBe(7);
  });

  it('returns 0 for out-of-range sessions', () => {
    expect(getStarsForSession(0, 50, 5)).toBe(0);
    expect(getStarsForSession(6, 50, 5)).toBe(0);
  });

  it('returns 0 when total stars is 0', () => {
    expect(getStarsForSession(1, 0, 5)).toBe(0);
    expect(getDistributionPlan(0, 5)).toEqual([0, 0, 0, 0, 0]);
  });
});
