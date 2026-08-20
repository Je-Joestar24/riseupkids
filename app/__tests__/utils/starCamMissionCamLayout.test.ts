import { getStarCamMissionCamLayout } from '@/utils/starCamMissionCamLayout';

describe('getStarCamMissionCamLayout', () => {
  it('shrinks the magnifier on iPhone SE so the scan button can stay visible', () => {
    const se = getStarCamMissionCamLayout(375, 667, { top: 20, bottom: 34 });
    expect(se.compact).toBe(true);
    expect(se.magnifierSize).toBeLessThan(430);
    expect(se.magnifierSize).toBeGreaterThanOrEqual(220);
    expect(se.contentPaddingTop).toBeLessThan(116);
    expect(se.magnifierSize + se.contentPaddingTop + 56).toBeLessThan(667);
  });

  it('shrinks further on original iPhone SE height', () => {
    const se1 = getStarCamMissionCamLayout(320, 568, { top: 20, bottom: 0 });
    expect(se1.compact).toBe(true);
    expect(se1.magnifierSize).toBeLessThan(360);
    expect(se1.promptFontSize).toBeLessThan(34);
  });

  it('keeps a large magnifier on taller phones', () => {
    const tall = getStarCamMissionCamLayout(390, 844, { top: 47, bottom: 34 });
    expect(tall.compact).toBe(false);
    expect(tall.magnifierSize).toBeGreaterThanOrEqual(360);
  });
});
