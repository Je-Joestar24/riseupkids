import { describe, it, expect } from 'vitest';
import { starsPaidByWatch, toCourseVideoDialogResult, replayToastMessage } from './videoReplayStars';

describe('starsPaidByWatch', () => {
  it('reads starsToAward, then starsEarnedThisSession, and is 0 for nothing', () => {
    expect(starsPaidByWatch({ starsToAward: 2 })).toBe(2);
    expect(starsPaidByWatch({ starsEarnedThisSession: 10 })).toBe(10);
    expect(starsPaidByWatch({})).toBe(0);
    expect(starsPaidByWatch(null)).toBe(0);
  });
});

describe('toCourseVideoDialogResult', () => {
  it('a replay that paid stars shows "You earned N stars" (not the Explore "Replays category" screen)', () => {
    const shaped = toCourseVideoDialogResult({ isReplay: true, replayNumber: 1, starsToAward: 2, videoWatch: { starsAwarded: true } }, true);
    expect(shaped.isReplay).toBe(false);
    expect(shaped.starsJustAwarded).toBe(true);
    expect(shaped.starsWereAlreadyAwarded).toBe(false);
    expect(shaped.starsToAward).toBe(2);
    expect(shaped.wasReplay).toBe(true);
  });

  it('a replay after the fifth pays nothing and says the stars were already earned', () => {
    const shaped = toCourseVideoDialogResult({ isReplay: true, replayNumber: 0, starsToAward: 0, videoWatch: { starsAwarded: true } }, true);
    expect(shaped.starsJustAwarded).toBe(false);
    expect(shaped.starsWereAlreadyAwarded).toBe(true);
  });

  it('an ordinary required watch is unchanged: stars only when the server paid them', () => {
    const paid = toCourseVideoDialogResult({ starsToAward: 10, videoWatch: { starsAwarded: false } }, false);
    expect(paid.starsJustAwarded).toBe(true);
    expect(paid.wasReplay).toBe(false);
    const notYet = toCourseVideoDialogResult({ starsToAward: 0, requiredWatchCount: 5, videoWatch: { watchCount: 2 } }, false);
    expect(notYet.starsJustAwarded).toBe(false);
    expect(notYet.starsWereAlreadyAwarded).toBe(false);
  });
});

describe('replayToastMessage', () => {
  it('celebrates a paying replay and says how many can still earn stars', () => {
    expect(replayToastMessage({ isReplay: true, starsToAward: 2, replaysLeft: 4 })).toContain('2 stars');
    expect(replayToastMessage({ isReplay: true, starsToAward: 2, replaysLeft: 4 })).toContain('4 more replays');
    expect(replayToastMessage({ isReplay: true, starsToAward: 2, replaysLeft: 1 })).toContain('1 more replay can');
    expect(replayToastMessage({ isReplay: true, starsToAward: 2, replaysLeft: 0 })).toContain('last replay');
  });

  it('is silent for a first watch and for a replay that pays nothing', () => {
    expect(replayToastMessage({ isReplay: false, starsToAward: 10 })).toBeNull();
    expect(replayToastMessage({ isReplay: true, starsToAward: 0 })).toBeNull();
    expect(replayToastMessage(undefined)).toBeNull();
  });
});
