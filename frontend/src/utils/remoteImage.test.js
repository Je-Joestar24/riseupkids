import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ABOVE_THE_FOLD_IMAGES, imageLoadPlan, prefetchImages } from './remoteImage';

describe('imageLoadPlan', () => {
  it('loads the first pictures on the page at once, with high priority', () => {
    for (let index = 0; index < ABOVE_THE_FOLD_IMAGES; index += 1) {
      expect(imageLoadPlan(index)).toEqual({ delayMs: 0, priority: 'high' });
    }
  });

  it('starts the later pictures one after another, 150 ms apart, with low priority', () => {
    expect(imageLoadPlan(4)).toEqual({ delayMs: 150, priority: 'low' });
    expect(imageLoadPlan(5)).toEqual({ delayMs: 300, priority: 'low' });
    expect(imageLoadPlan(8)).toEqual({ delayMs: 750, priority: 'low' });
  });

  it('never makes a picture wait more than 1.5 s, however far down the page it is', () => {
    expect(imageLoadPlan(13)).toEqual({ delayMs: 1500, priority: 'low' });
    expect(imageLoadPlan(200)).toEqual({ delayMs: 1500, priority: 'low' });
  });

  it('treats a missing or odd position as the first picture', () => {
    for (const odd of [undefined, null, NaN, -3, Infinity]) {
      expect(imageLoadPlan(odd)).toEqual({ delayMs: 0, priority: 'high' });
    }
  });

  it('rounds a fractional position down', () => {
    expect(imageLoadPlan(3.9)).toEqual({ delayMs: 0, priority: 'high' });
    expect(imageLoadPlan(4.9)).toEqual({ delayMs: 150, priority: 'low' });
  });
});

describe('prefetchImages', () => {
  let created;
  let RealImage;

  beforeEach(() => {
    created = [];
    RealImage = globalThis.Image;
    globalThis.Image = class {
      constructor() {
        created.push(this);
      }
    };
  });
  afterEach(() => {
    globalThis.Image = RealImage;
  });

  const urlsOf = (pictures) => pictures.map((picture) => picture.src);

  it('starts downloading each picture, with high priority', () => {
    prefetchImages(['https://x.test/p1-a.png', 'https://x.test/p1-b.png']);

    expect(urlsOf(created)).toEqual(['https://x.test/p1-a.png', 'https://x.test/p1-b.png']);
    created.forEach((picture) => expect(picture.fetchPriority).toBe('high'));
  });

  it('only fetches the first four by default, and never more than the limit given', () => {
    const many = Array.from({ length: 10 }, (_, i) => `https://x.test/p2-${i}.png`);

    prefetchImages(many);
    expect(urlsOf(created)).toEqual(many.slice(0, ABOVE_THE_FOLD_IMAGES));

    created.length = 0;
    prefetchImages(many, 6);
    // The first four were asked for already; the limit lets two more through.
    expect(urlsOf(created)).toEqual(many.slice(4, 6));
  });

  it('skips empty entries (a course with no cover) and fetches the pictures that exist', () => {
    const list = ['https://x.test/p3-a.png', null, '', undefined, 'https://x.test/p3-b.png'];

    prefetchImages(list);

    expect(urlsOf(created)).toEqual(['https://x.test/p3-a.png', 'https://x.test/p3-b.png']);
  });

  it('does not ask for the same picture twice', () => {
    prefetchImages(['https://x.test/p4.png']);
    prefetchImages(['https://x.test/p4.png']);

    expect(created).toHaveLength(1);
  });

  it('asks again after the picture failed to load', () => {
    prefetchImages(['https://x.test/p5.png']);
    created[0].onerror();

    prefetchImages(['https://x.test/p5.png']);

    expect(created).toHaveLength(2);
  });

  it('does not ask again once the picture has loaded', () => {
    prefetchImages(['https://x.test/p6.png']);
    created[0].onload();

    prefetchImages(['https://x.test/p6.png']);

    expect(created).toHaveLength(1);
  });

  it('does nothing for an empty or odd list, and does not throw', () => {
    expect(() => {
      prefetchImages([]);
      prefetchImages(undefined);
      prefetchImages(null);
      prefetchImages('https://x.test/p7.png');
    }).not.toThrow();
    expect(created).toHaveLength(0);
  });

  it('does nothing where pictures cannot be created', () => {
    delete globalThis.Image;

    expect(() => prefetchImages(['https://x.test/p8.png'])).not.toThrow();
  });
});
