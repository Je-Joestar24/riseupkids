import { experienceListRoute, exploreRoute, videoCountLabel } from '@/utils/experienceFormat';

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

describe('routes', () => {
  it('the list is a sibling screen of explore, named explore-experience', () => {
    expect(experienceListRoute('kid1')).toBe('/child/kid1/explore-experience');
  });

  it('Explore itself', () => {
    expect(exploreRoute('kid1')).toBe('/child/kid1/explore');
  });

  it('the list route contains /explore, so the footer keeps Explore lit', () => {
    expect(experienceListRoute('kid1')).toContain('/explore');
  });
});
