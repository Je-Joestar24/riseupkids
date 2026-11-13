/**
 * A built-in (CMS) book counts as read only when the child got to its last page.
 */
import { reachedLastPage, shouldSubmitBookRead } from '@/utils/cmsBookReadComplete';

describe('reachedLastPage', () => {
  it.each([
    [0, 10, false],
    [8, 10, false],
    [9, 10, true],
    [10, 10, true],
    [0, 1, true],
  ])('furthest page %i of %i pages -> %p', (furthest, total, expected) => {
    expect(reachedLastPage(furthest, total)).toBe(expected);
  });

  it('a book with no pages never counts', () => {
    expect(reachedLastPage(0, 0)).toBe(false);
  });
});

describe('shouldSubmitBookRead', () => {
  const session = (overrides = {}) => ({ reachedEnd: true, score: 0, maxScore: 0, trigger: 'close' as const, ...overrides });

  it('never submits a book closed before its last page, whatever the score or the button', () => {
    expect(shouldSubmitBookRead(session({ reachedEnd: false }))).toBe(false);
    expect(shouldSubmitBookRead(session({ reachedEnd: false, score: 5, maxScore: 5 }))).toBe(false);
    expect(shouldSubmitBookRead(session({ reachedEnd: false, trigger: 'home' }))).toBe(false);
  });

  it('submits a book read to the end with no interactive pages', () => {
    expect(shouldSubmitBookRead(session())).toBe(true);
  });

  it('submits at the end with 75% or more right, and with full marks', () => {
    expect(shouldSubmitBookRead(session({ score: 3, maxScore: 4 }))).toBe(true);
    expect(shouldSubmitBookRead(session({ score: 4, maxScore: 4 }))).toBe(true);
  });

  it('does not submit at the end with less than 75% right, unless the home button was used', () => {
    expect(shouldSubmitBookRead(session({ score: 2, maxScore: 4 }))).toBe(false);
    expect(shouldSubmitBookRead(session({ score: 2, maxScore: 4, trigger: 'home' }))).toBe(true);
  });

  it('a score above the maximum counts as full marks, not more', () => {
    expect(shouldSubmitBookRead(session({ score: 9, maxScore: 4 }))).toBe(true);
  });
});
