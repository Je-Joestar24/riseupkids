import {
  CMS_DESIGN_HEIGHT,
  CMS_DESIGN_WIDTH,
  CMS_READING_FONT_MOBILE_BOOST,
  DEFAULT_CONTENT_READING_FONT_PX,
  getCmsStageScale,
  resolveContentReadingFontSizePx,
  scaleCmsReadingFontSizePx,
} from '@/components/child/common/cms-player-shared';

describe('getCmsStageScale', () => {
  it('is 1 on the design canvas', () => {
    expect(getCmsStageScale(CMS_DESIGN_WIDTH, CMS_DESIGN_HEIGHT)).toBe(1);
  });

  it('scales down on a half-size stage', () => {
    expect(getCmsStageScale(CMS_DESIGN_WIDTH / 2, CMS_DESIGN_HEIGHT / 2)).toBe(0.5);
  });
});

describe('scaleCmsReadingFontSizePx', () => {
  it('keeps design px on a full-size stage', () => {
    expect(scaleCmsReadingFontSizePx(56, CMS_DESIGN_WIDTH, CMS_DESIGN_HEIGHT)).toBe(56);
  });

  it('scales 2XL (56) down on a phone-sized landscape stage with mobile boost', () => {
    // ~854×480 is a common phone landscape 16:9 fit
    const stageScale = 480 / CMS_DESIGN_HEIGHT;
    const expected = Math.round(56 * Math.min(1, stageScale * CMS_READING_FONT_MOBILE_BOOST));
    const scaled = scaleCmsReadingFontSizePx(56, 854, 480);
    expect(scaled).toBe(expected);
    expect(scaled).toBeLessThan(56);
    expect(scaled).toBeGreaterThan(Math.round(56 * stageScale));
    expect(scaled).toBeGreaterThanOrEqual(10);
  });

  it('falls back to default design size when invalid', () => {
    expect(scaleCmsReadingFontSizePx(0, CMS_DESIGN_WIDTH, CMS_DESIGN_HEIGHT)).toBe(
      DEFAULT_CONTENT_READING_FONT_PX
    );
  });
});

describe('resolveContentReadingFontSizePx', () => {
  it('reads reading.fontSizePx', () => {
    expect(resolveContentReadingFontSizePx({ reading: { fontSizePx: 56 } })).toBe(56);
  });

  it('returns default when unset', () => {
    expect(resolveContentReadingFontSizePx({})).toBe(DEFAULT_CONTENT_READING_FONT_PX);
  });
});
