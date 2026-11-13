import { describe, it, expect } from 'vitest';
import { reachedLastPage } from './cmsBookReadComplete';

describe('reachedLastPage', () => {
  it.each([
    [0, 1, true],
    [1, 2, true],
    [4, 5, true],
    [5, 5, true],
    [0, 2, false],
    [3, 5, false],
    [0, 0, false],
  ])('furthest page %i of %i pages -> %p', (furthest, total, expected) => {
    expect(reachedLastPage(furthest, total)).toBe(expected);
  });
});
