import { getStarCamPracticeModeLayout } from '@/utils/starCamPracticeModeLayout';

describe('getStarCamPracticeModeLayout', () => {
  it('shrinks both media squares on iPhone SE so video and sample fit', () => {
    const se = getStarCamPracticeModeLayout(375, 667, { top: 20, bottom: 34 });
    expect(se.compact).toBe(true);
    expect(se.mediaSize).toBeLessThan(280);
    expect(se.mediaSize).toBeGreaterThanOrEqual(128);
    expect(se.mediaSize * 2 + se.titleLineHeight + se.contentPaddingTop).toBeLessThan(667);
  });

  it('shrinks further on original iPhone SE height', () => {
    const se1 = getStarCamPracticeModeLayout(320, 568, { top: 20, bottom: 0 });
    expect(se1.compact).toBe(true);
    expect(se1.mediaSize).toBeLessThan(220);
    expect(se1.mediaSize).toBeGreaterThanOrEqual(128);
    expect(se1.titleFontSize).toBeLessThan(42);
  });

  it('keeps a full-size media square on taller phones', () => {
    const tall = getStarCamPracticeModeLayout(390, 844, { top: 47, bottom: 34 });
    expect(tall.compact).toBe(false);
    expect(tall.mediaSize).toBeGreaterThanOrEqual(270);
    expect(tall.mediaSize).toBeLessThanOrEqual(280);
  });
});
