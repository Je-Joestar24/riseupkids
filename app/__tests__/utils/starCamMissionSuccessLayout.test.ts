import { getStarCamMissionSuccessLayout } from '@/utils/starCamMissionSuccessLayout';

describe('getStarCamMissionSuccessLayout', () => {
  it('shrinks the reward card on iPhone SE so STAR CAM and PLAY AGAIN stay visible', () => {
    const se = getStarCamMissionSuccessLayout(375, 667, { top: 20, bottom: 34 });
    expect(se.compact).toBe(true);
    expect(se.mediaSize).toBeLessThan(320);
    expect(se.mediaSize).toBeGreaterThanOrEqual(148);
    expect(se.contentPaddingTop).toBeLessThan(64);
    expect(se.mediaSize + se.primaryButtonHeight + se.secondaryButtonHeight).toBeLessThan(667);
  });

  it('shrinks further on original iPhone SE height', () => {
    const se1 = getStarCamMissionSuccessLayout(320, 568, { top: 20, bottom: 0 });
    expect(se1.compact).toBe(true);
    expect(se1.mediaSize).toBeLessThan(280);
    expect(se1.titleFontSize).toBeLessThan(42);
  });

  it('keeps a large reward card on taller phones', () => {
    const tall = getStarCamMissionSuccessLayout(390, 844, { top: 47, bottom: 34 });
    expect(tall.compact).toBe(false);
    expect(tall.mediaSize).toBeGreaterThanOrEqual(270);
    expect(tall.mediaSize).toBeLessThanOrEqual(320);
  });
});
