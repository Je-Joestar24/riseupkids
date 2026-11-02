const mockPrefetch = jest.fn();
jest.mock('expo-image', () => ({
  Image: { prefetch: (urls: string[], policy: string) => mockPrefetch(urls, policy) },
}));

import { ABOVE_THE_FOLD_IMAGES, imageLoadPlan, prefetchImages } from '@/utils/remoteImage';

beforeEach(() => {
  mockPrefetch.mockReset();
  mockPrefetch.mockResolvedValue(true);
});

describe('imageLoadPlan — which pictures load first', () => {
  it('the pictures at the top load straight away with high priority', () => {
    for (let index = 0; index < ABOVE_THE_FOLD_IMAGES; index += 1) {
      expect(imageLoadPlan(index)).toEqual({ delayMs: 0, priority: 'high' });
    }
  });

  it('later pictures start one after another, with low priority', () => {
    const delays = [4, 5, 6, 7].map((index) => imageLoadPlan(index).delayMs);

    expect(delays[0]).toBeGreaterThan(0);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(new Set(delays).size).toBe(delays.length);
    expect(imageLoadPlan(4).priority).toBe('low');
    expect(imageLoadPlan(40).priority).toBe('low');
  });

  it('never makes a picture wait more than a couple of seconds, however far down it is', () => {
    expect(imageLoadPlan(500).delayMs).toBeLessThanOrEqual(1500);
    expect(imageLoadPlan(500).delayMs).toBe(imageLoadPlan(5000).delayMs);
  });

  it('treats a bad position as the first picture', () => {
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, undefined as unknown as number]) {
      expect(imageLoadPlan(bad)).toEqual({ delayMs: 0, priority: 'high' });
    }
  });
});

describe('prefetchImages — only the first few are fetched ahead of time', () => {
  const urls = Array.from({ length: 12 }, (_, i) => `https://api.example.com/uploads/c${i}.jpg`);

  it('fetches only the first few into the same cache the pictures are shown from', () => {
    prefetchImages(urls);

    expect(mockPrefetch).toHaveBeenCalledTimes(1);
    expect(mockPrefetch).toHaveBeenCalledWith(urls.slice(0, ABOVE_THE_FOLD_IMAGES), 'memory-disk');
  });

  it('respects a smaller limit', () => {
    prefetchImages(urls, 1);

    expect(mockPrefetch).toHaveBeenCalledWith([urls[0]], 'memory-disk');
  });

  it('skips missing links, and does nothing at all when there is nothing to fetch', () => {
    prefetchImages([null, undefined, '', urls[0], null]);
    expect(mockPrefetch).toHaveBeenCalledWith([urls[0]], 'memory-disk');

    mockPrefetch.mockClear();
    prefetchImages([null, undefined, '']);
    prefetchImages([]);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('a failed download is ignored — the picture just loads when it is shown', async () => {
    mockPrefetch.mockRejectedValue(new Error('network down'));

    expect(() => prefetchImages(urls)).not.toThrow();
    await Promise.resolve();
  });
});
