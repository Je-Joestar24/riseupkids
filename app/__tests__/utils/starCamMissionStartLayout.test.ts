import { getStarCamMissionStartLayout } from '@/utils/starCamMissionStartLayout';

describe('getStarCamMissionStartLayout', () => {
  it('shrinks the intro image on iPhone SE height so the start button can stay visible', () => {
    const se = getStarCamMissionStartLayout(375, 667);
    expect(se.compact).toBe(true);
    expect(se.imageSize).toBeLessThan(292);
    expect(se.imageSize).toBeGreaterThanOrEqual(148);
    expect(se.contentPaddingTop).toBeLessThan(86);
    expect(se.descriptionMaxLines).toBe(3);
    expect(se.descriptionMaxHeight).toBe(se.descriptionMaxLines * se.descriptionLineHeight);
  });

  it('shrinks further on original iPhone SE height', () => {
    const se1 = getStarCamMissionStartLayout(320, 568);
    expect(se1.compact).toBe(true);
    expect(se1.imageSize).toBeLessThan(200);
    expect(se1.imageSize).toBeGreaterThanOrEqual(148);
    expect(se1.contentPaddingTop).toBe(48);
    expect(se1.descriptionMaxLines).toBe(2);
  });

  it('keeps the full image on taller phones', () => {
    const tall = getStarCamMissionStartLayout(390, 844);
    expect(tall.compact).toBe(false);
    expect(tall.imageSize).toBe(292);
  });
});
