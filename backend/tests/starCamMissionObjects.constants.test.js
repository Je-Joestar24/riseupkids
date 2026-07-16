const {
  STARCAM_MIN_OBJECTS,
  STARCAM_MAX_OBJECTS,
  isStarCamObjectCountInRange,
  assertStarCamObjectCountInRange,
  starCamObjectCountRangeLabel,
} = require('../constants/starCamMissionObjects.constants');

describe('starCamMissionObjects.constants', () => {
  it('defines min 4 and max 7 objects', () => {
    expect(STARCAM_MIN_OBJECTS).toBe(4);
    expect(STARCAM_MAX_OBJECTS).toBe(7);
    expect(starCamObjectCountRangeLabel()).toBe('4-7');
  });

  it('isStarCamObjectCountInRange accepts 4 through 7', () => {
    expect(isStarCamObjectCountInRange(3)).toBe(false);
    expect(isStarCamObjectCountInRange(4)).toBe(true);
    expect(isStarCamObjectCountInRange(5)).toBe(true);
    expect(isStarCamObjectCountInRange(7)).toBe(true);
    expect(isStarCamObjectCountInRange(8)).toBe(false);
  });

  it('assertStarCamObjectCountInRange throws for invalid counts', () => {
    expect(() => assertStarCamObjectCountInRange(3)).toThrow(/between 4 and 7/);
    expect(() => assertStarCamObjectCountInRange(4)).not.toThrow();
  });
});
