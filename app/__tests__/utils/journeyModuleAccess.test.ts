import { isJourneyModuleLocked } from '@/utils/journeyModuleAccess';

describe('journeyModuleAccess', () => {
  it('treats force_lock and locked status as locked', () => {
    expect(isJourneyModuleLocked({ status: 'locked', accessible: false })).toBe(true);
    expect(
      isJourneyModuleLocked({
        status: 'in_progress',
        accessible: true,
        accessOverride: 'force_lock',
      })
    ).toBe(true);
    expect(isJourneyModuleLocked({ status: 'completed', accessible: false })).toBe(false);
  });

  it('opens force_unlock / accessible modules', () => {
    expect(
      isJourneyModuleLocked({
        status: 'not_started',
        accessible: true,
        accessOverride: 'force_unlock',
      })
    ).toBe(false);
    expect(
      isJourneyModuleLocked({
        status: 'in_progress',
        accessible: true,
        accessOverride: 'none',
      })
    ).toBe(false);
  });
});
