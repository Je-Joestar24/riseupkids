import {
  MODULE_PROGRESS_CIRCLE_COUNT,
  MODULE_PROGRESS_CIRCLE_GAP,
  MODULE_PROGRESS_CIRCLE_MAX,
  MODULE_PROGRESS_CIRCLE_MIN,
  getModuleProgressCircleSize,
} from '@/utils/moduleProgressCircles';

describe('getModuleProgressCircleSize', () => {
  it('shrinks to fit five circles on an iPhone SE card row', () => {
    // ~320pt screen, 20pt page padding, 48% card, 4pt row padding each side.
    const rowWidth = 126;
    const size = getModuleProgressCircleSize(rowWidth);
    const used = size * MODULE_PROGRESS_CIRCLE_COUNT + MODULE_PROGRESS_CIRCLE_GAP * 4;
    expect(size).toBeGreaterThanOrEqual(MODULE_PROGRESS_CIRCLE_MIN);
    expect(size).toBeLessThanOrEqual(MODULE_PROGRESS_CIRCLE_MAX);
    expect(used).toBeLessThanOrEqual(rowWidth);
  });

  it('caps at the max size on wide cards', () => {
    expect(getModuleProgressCircleSize(400)).toBe(MODULE_PROGRESS_CIRCLE_MAX);
  });

  it('uses the max size before layout is known', () => {
    expect(getModuleProgressCircleSize(0)).toBe(MODULE_PROGRESS_CIRCLE_MAX);
  });
});
