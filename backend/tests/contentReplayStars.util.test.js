/**
 * The replay rules on their own: 2 stars per replay, at most 5 replays (10 stars) per book or video.
 */
const {
  REPLAY_STARS,
  MAX_REPLAYS,
  MAX_REPLAY_STARS,
  REPLAY_DUPLICATE_WINDOW_MS,
  getReplayStars,
  getReplaysLeft,
} = require('../utils/contentReplayStars.util');

describe('the numbers', () => {
  it('2 stars per replay, 5 replays at most, so 10 stars at most', () => {
    expect(REPLAY_STARS).toBe(2);
    expect(MAX_REPLAYS).toBe(5);
    expect(MAX_REPLAY_STARS).toBe(10);
  });

  it('two submissions within 5 seconds are one replay', () => {
    expect(REPLAY_DUPLICATE_WINDOW_MS).toBe(5000);
  });
});

describe('getReplayStars', () => {
  it.each([[0], [1], [2], [3], [4]])('pays 2 stars for the replay after %i paid ones', (paid) => {
    expect(getReplayStars(paid)).toBe(2);
  });

  it.each([[5], [6], [50]])('pays nothing once %i replays are paid', (paid) => {
    expect(getReplayStars(paid)).toBe(0);
  });

  it('the five paid replays add up to exactly 10 stars', () => {
    const total = [0, 1, 2, 3, 4, 5, 6].reduce((sum, paid) => sum + getReplayStars(paid), 0);
    expect(total).toBe(10);
  });

  it.each([[undefined], [null], ['x'], [NaN], [-3], [1.9]])('tolerates the odd count %p (whole numbers, never negative)', (paid) => {
    expect([0, 2]).toContain(getReplayStars(paid));
    expect(Number.isInteger(getReplayStars(paid))).toBe(true);
  });

  it('a fraction counts as the whole below it, so 4.9 paid replays still leaves one', () => {
    expect(getReplayStars(4.9)).toBe(2);
  });
});

describe('getReplaysLeft', () => {
  it.each([[0, 5], [1, 4], [4, 1], [5, 0], [9, 0]])('after %i paid replays, %i are left', (paid, left) => {
    expect(getReplaysLeft(paid)).toBe(left);
  });

  it('a fraction counts as the whole below it, so 4.9 paid replays leaves 1', () => {
    expect(getReplaysLeft(4.9)).toBe(1);
  });

  it('never goes negative for odd input', () => {
    expect(getReplaysLeft(undefined)).toBe(5);
    expect(getReplaysLeft(-4)).toBe(5);
  });
});
