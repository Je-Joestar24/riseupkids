import { describe, it, expect } from 'vitest';
import { phoneFluid, PHONE_FULL_SIZE_WIDTH, PHONE_PAGE_SIDE_PADDING } from './childPhoneLayout';

/** What the browser computes for a clamp() at a given screen width. */
const sizeAt = (css, width) => {
  const match = /^clamp\(([\d.]+)px, ([\d.]+)vw, ([\d.]+)px\)$/.exec(css);
  if (!match) return parseFloat(css);
  const [, min, vw, max] = match.map(Number);
  return Math.min(max, Math.max(min, (vw / 100) * width));
};

describe('phoneFluid', () => {
  it('reaches the full size on a large phone and stays there on anything wider', () => {
    const css = phoneFluid(20, 30);
    expect(sizeAt(css, PHONE_FULL_SIZE_WIDTH)).toBeCloseTo(30, 2);
    expect(sizeAt(css, 480)).toBe(30);
    expect(sizeAt(css, 599)).toBe(30);
  });

  it('shrinks smoothly on smaller phones (iPhone SE 375, Android 360, small 320)', () => {
    const css = phoneFluid(20, 30);
    expect(sizeAt(css, 375)).toBeCloseTo(27.3, 1);
    expect(sizeAt(css, 360)).toBeCloseTo(26.2, 1);
    expect(sizeAt(css, 320)).toBeCloseTo(23.3, 1);
    expect(sizeAt(css, 375)).toBeGreaterThan(sizeAt(css, 360));
    expect(sizeAt(css, 360)).toBeGreaterThan(sizeAt(css, 320));
  });

  it('never goes below the minimum, even on a very narrow screen', () => {
    expect(sizeAt(phoneFluid(20, 30), 200)).toBe(20);
    expect(sizeAt(phoneFluid(12, 14), 100)).toBe(12);
  });

  it('is a plain size when min and max are the same', () => {
    expect(phoneFluid(16, 16)).toBe('16px');
  });

  it('accepts another full-size width', () => {
    expect(sizeAt(phoneFluid(10, 40, 400), 400)).toBeCloseTo(40, 2);
    expect(sizeAt(phoneFluid(10, 40, 400), 200)).toBeCloseTo(20, 2);
  });

  it('refuses nonsense sizes instead of producing broken CSS', () => {
    expect(() => phoneFluid(0, 10)).toThrow();
    expect(() => phoneFluid(30, 20)).toThrow();
    expect(() => phoneFluid(10, 20, 0)).toThrow();
    expect(() => phoneFluid(NaN, 20)).toThrow();
  });

  it('gives a clamp() the browser understands', () => {
    expect(phoneFluid(20, 30)).toBe('clamp(20px, 7.282vw, 30px)');
    expect(PHONE_PAGE_SIDE_PADDING).toBe('clamp(12px, 4.854vw, 20px)');
  });
});
