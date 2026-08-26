import { exploreCacheKey, pickCachedExploreVideos } from '@/store/exploreStore';
import type { ExploreContentItem } from '@/services/exploreService';

function item(id: string): ExploreContentItem {
  return { _id: id, title: id } as ExploreContentItem;
}

describe('pickCachedExploreVideos', () => {
  it('prefers the requested limit when that cache exists', () => {
    const contentByType = {
      [exploreCacheKey('video', { videoType: 'cooking', page: 1, limit: 20 })]: [
        item('a'),
        item('b'),
      ],
      [exploreCacheKey('video', { videoType: 'cooking', page: 1, limit: 100 })]: [
        item('a'),
        item('b'),
        item('c'),
      ],
    };
    const picked = pickCachedExploreVideos(contentByType, 'cooking', 100);
    expect(picked.map((v) => v._id)).toEqual(['a', 'b', 'c']);
  });

  it('falls back to the longest cached list for the same video type', () => {
    const contentByType = {
      [exploreCacheKey('video', { videoType: 'music', page: 1, limit: 20 })]: [
        item('m1'),
        item('m2'),
      ],
      [exploreCacheKey('video', { videoType: 'cooking', page: 1, limit: 20 })]: [
        item('other'),
      ],
    };
    const picked = pickCachedExploreVideos(contentByType, 'music', 100);
    expect(picked.map((v) => v._id)).toEqual(['m1', 'm2']);
  });

  it('returns an empty list when nothing is cached', () => {
    expect(pickCachedExploreVideos({}, 'story_time', 100)).toEqual([]);
  });
});
