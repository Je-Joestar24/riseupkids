import {
  CMS_DESIGN_HEIGHT,
  CMS_DESIGN_WIDTH,
  computeCmsPlayerStageSize,
  computeStageSize,
} from '@/components/child/common/cms-player-shared';

describe('computeCmsPlayerStageSize', () => {
  it('keeps a strict 16:9 stage inside a landscape window', () => {
    const stage = computeCmsPlayerStageSize(844, 390);
    expect(stage.width / stage.height).toBeCloseTo(CMS_DESIGN_WIDTH / CMS_DESIGN_HEIGHT, 5);
    expect(stage.width).toBeLessThanOrEqual(844 + 0.5);
    expect(stage.height).toBeLessThanOrEqual(390 + 0.5);
  });

  it('prefers landscape logical size when the window is already landscape', () => {
    expect(computeCmsPlayerStageSize(844, 390)).toEqual(computeStageSize(844, 390));
  });

  it('clamps into the visible window if portrait is reported (no crop overflow)', () => {
    const stage = computeCmsPlayerStageSize(390, 844);
    expect(stage.width).toBeLessThanOrEqual(390 + 0.5);
    expect(stage.height).toBeLessThanOrEqual(844 + 0.5);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 5);
  });

  it('never exceeds a short landscape window (no crop)', () => {
    const stage = computeCmsPlayerStageSize(667, 375);
    expect(stage.width).toBeLessThanOrEqual(667 + 0.5);
    expect(stage.height).toBeLessThanOrEqual(375 + 0.5);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 5);
  });

  it('fits very short heights without overflowing', () => {
    const stage = computeCmsPlayerStageSize(800, 320);
    expect(stage.height).toBeLessThanOrEqual(320 + 0.5);
    expect(stage.width).toBeLessThanOrEqual(800 + 0.5);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 5);
  });
});
