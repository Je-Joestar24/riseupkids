import { describe, expect, it } from 'vitest';
import { fileSizeLabel, pageRange, updatedLabel, videoCountLabel } from './experienceAdminFormat';

describe('videoCountLabel', () => {
  it('says "No videos", "1 video" and "N videos"', () => {
    expect(videoCountLabel(0)).toBe('No videos');
    expect(videoCountLabel(1)).toBe('1 video');
    expect(videoCountLabel(2)).toBe('2 videos');
    expect(videoCountLabel(20)).toBe('20 videos');
  });

  it('treats anything that is not a number, or is negative, as no videos', () => {
    for (const bad of [undefined, null, NaN, 'x', -3]) expect(videoCountLabel(bad)).toBe('No videos');
  });
});

describe('updatedLabel', () => {
  it('writes the date in full', () => {
    expect(updatedLabel('2026-11-10T10:00:00.000Z')).toBe('Updated 10 Nov 2026');
    expect(updatedLabel('2026-01-05T12:00:00.000Z')).toBe('Updated 5 Jan 2026');
  });

  it('gives nothing for a missing or unusable date', () => {
    for (const bad of [undefined, null, '', 'yesterday', {}]) expect(updatedLabel(bad)).toBe('');
  });
});

describe('pageRange', () => {
  it('gives the first and last row on the page', () => {
    expect(pageRange({ page: 1, limit: 12, total: 30 })).toEqual({ from: 1, to: 12, total: 30 });
    expect(pageRange({ page: 2, limit: 12, total: 30 })).toEqual({ from: 13, to: 24, total: 30 });
    expect(pageRange({ page: 3, limit: 12, total: 30 })).toEqual({ from: 25, to: 30, total: 30 });
  });

  it('a page with fewer rows than the size, and a single row', () => {
    expect(pageRange({ page: 1, limit: 12, total: 3 })).toEqual({ from: 1, to: 3, total: 3 });
    expect(pageRange({ page: 1, limit: 12, total: 1 })).toEqual({ from: 1, to: 1, total: 1 });
  });

  it('is all zeros when there is nothing, or no paging at all', () => {
    expect(pageRange({ page: 1, limit: 12, total: 0 })).toEqual({ from: 0, to: 0, total: 0 });
    expect(pageRange(null)).toEqual({ from: 0, to: 0, total: 0 });
    expect(pageRange(undefined)).toEqual({ from: 0, to: 0, total: 0 });
  });

  it('never starts past the end (a page that no longer exists)', () => {
    expect(pageRange({ page: 9, limit: 12, total: 30 })).toEqual({ from: 30, to: 30, total: 30 });
  });

  it('copes with missing page or limit', () => {
    expect(pageRange({ total: 5 })).toEqual({ from: 1, to: 1, total: 5 });
  });
});

describe('fileSizeLabel', () => {
  it.each([
    [1, '1 B'],
    [1023, '1023 B'],
    [1024, '1 KB'],
    [2048, '2 KB'],
    [350 * 1024, '350 KB'],
    [1024 * 1024 - 1, '1024 KB'],
    [1024 * 1024, '1 MB'],
    [Math.round(2.4 * 1024 * 1024), '2.4 MB'],
    [10 * 1024 * 1024, '10 MB'],
    [Math.round(12.6 * 1024 * 1024), '13 MB'],
    [20 * 1024 * 1024, '20 MB'],
  ])('%i bytes is %s', (bytes, label) => {
    expect(fileSizeLabel(bytes)).toBe(label);
  });

  it.each([0, -5, NaN, undefined, null, 'abc'])('%j is nothing to show', (value) => {
    expect(fileSizeLabel(value)).toBe('');
  });
});
