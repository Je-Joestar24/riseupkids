import {
  CMS_DESIGN_HEIGHT,
  CMS_DESIGN_WIDTH,
  CMS_IOS_STAGE_FIT_SCALE,
  computeCmsPlayerStageSize,
  computeStageSize,
} from '@/components/child/common/cms-player-shared';

describe('computeStageSize', () => {
  it('height-limits on a wide landscape viewport (longer phone → smaller width)', () => {
    // 19.5:9-style landscape — wider than 16:9
    const stage = computeStageSize(844, 390);
    expect(stage.height).toBeCloseTo(390, 5);
    expect(stage.width).toBeCloseTo(390 * (16 / 9), 5);
    expect(stage.width).toBeLessThan(844);
    expect(stage.width / stage.height).toBeCloseTo(CMS_DESIGN_WIDTH / CMS_DESIGN_HEIGHT, 5);
  });

  it('width-limits on a short/narrow viewport', () => {
    const stage = computeStageSize(640, 400);
    expect(stage.width).toBeCloseTo(640, 5);
    expect(stage.height).toBeCloseTo(640 / (16 / 9), 5);
    expect(stage.height).toBeLessThan(400);
  });
});

describe('computeCmsPlayerStageSize', () => {
  it('never exceeds the measured viewport (anti zoom-crop)', () => {
    const stage = computeCmsPlayerStageSize(844, 390, { platformOs: 'android' });
    expect(stage.width).toBeLessThanOrEqual(844 + 0.5);
    expect(stage.height).toBeLessThanOrEqual(390 + 0.5);
    expect(stage).toEqual(computeStageSize(844, 390));
  });

  it('shrinks iOS stage uniformly while keeping 16:9 and staying inside the box', () => {
    const android = computeCmsPlayerStageSize(844, 390, { platformOs: 'android' });
    const ios = computeCmsPlayerStageSize(844, 390, { platformOs: 'ios' });

    expect(ios.width / ios.height).toBeCloseTo(16 / 9, 5);
    expect(ios.width).toBeCloseTo(android.width * CMS_IOS_STAGE_FIT_SCALE, 5);
    expect(ios.height).toBeCloseTo(android.height * CMS_IOS_STAGE_FIT_SCALE, 5);
    expect(ios.width).toBeLessThanOrEqual(844);
    expect(ios.height).toBeLessThanOrEqual(390);
  });

  it('fits a tall measured box without overflowing (no zoom)', () => {
    const stage = computeCmsPlayerStageSize(390, 844, { platformOs: 'android' });
    expect(stage.width).toBeLessThanOrEqual(390 + 0.5);
    expect(stage.height).toBeLessThanOrEqual(844 + 0.5);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 5);
  });

  it('fits very short heights without overflowing', () => {
    const stage = computeCmsPlayerStageSize(800, 320, { platformOs: 'android' });
    expect(stage.height).toBeLessThanOrEqual(320 + 0.5);
    expect(stage.width).toBeLessThanOrEqual(800 + 0.5);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 5);
  });
});
