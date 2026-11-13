import { describe, it, expect } from 'vitest';
import { videoCountLabel, experienceListPath, explorePath } from './experienceChildFormat';

describe('videoCountLabel', () => {
  it.each([
    [1, '1 video'],
    [2, '2 videos'],
    [3, '3 videos'],
    [20, '20 videos'],
    [0, 'No videos yet'],
    [-1, 'No videos yet'],
    [undefined, 'No videos yet'],
    [null, 'No videos yet'],
    ['abc', 'No videos yet'],
    [NaN, 'No videos yet'],
    [Infinity, 'No videos yet'],
    ['4', '4 videos'],
    [2.9, '2 videos'],
    [1.5, '1 video'],
    [0.5, 'No videos yet'],
    [0.99, 'No videos yet'],
  ])('%s -> %s', (count, label) => {
    expect(videoCountLabel(count)).toBe(label);
  });
});

describe('paths', () => {
  it('the list lives under the child\'s Explore page', () => {
    expect(experienceListPath('kid1')).toBe('/child/kid1/explore/experience');
  });

  it('Explore itself', () => {
    expect(explorePath('kid1')).toBe('/child/kid1/explore');
  });

  it('the list path starts with the Explore path, so the bottom bar keeps Explore lit', () => {
    expect(experienceListPath('kid1').startsWith(explorePath('kid1'))).toBe(true);
  });
});
