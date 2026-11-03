import { describe, it, expect } from 'vitest';
import { ABOVE_THE_FOLD_IMAGES, imageLoadPlan } from './remoteImage';

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
