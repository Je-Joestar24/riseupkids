/**
 * Pure helpers for automatic keep-open at ≥75% progress.
 */

jest.mock('../models', () => ({
  Course: {},
  CourseProgress: {},
  ChildProfile: {},
  Activity: {},
  Book: {},
  Media: {},
  AudioAssignment: {},
  Chant: {},
  VideoWatch: {},
}));

const {
  MODULE_ACCESS_AUTO_KEEP_OPEN_PCT,
  shouldKeepModuleOpenByProgress,
} = require('../services/courseProgress.services');

describe('shouldKeepModuleOpenByProgress', () => {
  it('uses 75% threshold', () => {
    expect(MODULE_ACCESS_AUTO_KEEP_OPEN_PCT).toBe(75);
  });

  it('keeps open at 75% and above under automatic rules', () => {
    expect(
      shouldKeepModuleOpenByProgress({
        status: 'in_progress',
        progressPercentage: 75,
        accessOverride: 'none',
      })
    ).toBe(true);
    expect(
      shouldKeepModuleOpenByProgress({
        status: 'locked',
        progressPercentage: 90,
        accessOverride: 'none',
      })
    ).toBe(true);
  });

  it('does not keep open below 75% or when force_locked / completed', () => {
    expect(
      shouldKeepModuleOpenByProgress({
        status: 'in_progress',
        progressPercentage: 74,
        accessOverride: 'none',
      })
    ).toBe(false);
    expect(
      shouldKeepModuleOpenByProgress({
        status: 'in_progress',
        progressPercentage: 80,
        accessOverride: 'force_lock',
      })
    ).toBe(false);
    expect(
      shouldKeepModuleOpenByProgress({
        status: 'completed',
        progressPercentage: 100,
        accessOverride: 'none',
      })
    ).toBe(false);
  });
});
