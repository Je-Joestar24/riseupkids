import {
  STARCAM_MAX_OBJECTS,
  buildStarCamSuccessSubtitle,
  isStarCamObjectCountInRange,
  resolveStarCamTotalObjects,
} from '@/constants/starCamMissionObjects';

describe('starCamMissionObjects', () => {
  it('resolveStarCamTotalObjects prefers hunt items length', () => {
    expect(resolveStarCamTotalObjects([{}, {}, {}, {}], 7)).toBe(4);
    expect(resolveStarCamTotalObjects([], 5)).toBe(5);
    expect(resolveStarCamTotalObjects([], null)).toBe(STARCAM_MAX_OBJECTS);
  });

  it('buildStarCamSuccessSubtitle uses dynamic count', () => {
    expect(buildStarCamSuccessSubtitle(4)).toBe('You found all 4 objects!');
    expect(buildStarCamSuccessSubtitle(7)).toBe('You found all 7 objects!');
  });

  it('isStarCamObjectCountInRange matches backend limits', () => {
    expect(isStarCamObjectCountInRange(4)).toBe(true);
    expect(isStarCamObjectCountInRange(3)).toBe(false);
  });
});
