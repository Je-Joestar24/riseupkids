/**
 * @jest-environment node
 */

const badgeCheck = require('../services/badgeCheck.service');
const { scheduleBadgeUpdate } = require('../utils/scheduleBadgeUpdate.util');

jest.mock('../services/badgeCheck.service', () => ({
  updateBadges: jest.fn().mockResolvedValue({ success: true, newBadges: [] }),
}));

function flushImmediate() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function drainScheduledBadges() {
  await flushImmediate();
  await flushImmediate();
}

describe('scheduleBadgeUpdate', () => {
  beforeEach(async () => {
    await drainScheduledBadges();
    jest.clearAllMocks();
    badgeCheck.updateBadges.mockResolvedValue({ success: true, newBadges: [] });
  });

  afterEach(async () => {
    await drainScheduledBadges();
  });

  it('schedules updateBadges asynchronously (not on the same turn)', async () => {
    scheduleBadgeUpdate('child-abc');
    expect(badgeCheck.updateBadges).not.toHaveBeenCalled();

    await flushImmediate();

    expect(badgeCheck.updateBadges).toHaveBeenCalledTimes(1);
    expect(badgeCheck.updateBadges).toHaveBeenCalledWith('child-abc', { silent: false });
  });

  it('ignores empty childId', async () => {
    scheduleBadgeUpdate('');
    scheduleBadgeUpdate(null);
    await flushImmediate();
    expect(badgeCheck.updateBadges).not.toHaveBeenCalled();
  });

  it('does not throw when updateBadges rejects', async () => {
    badgeCheck.updateBadges.mockRejectedValueOnce(new Error('badge boom'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => scheduleBadgeUpdate('child1')).not.toThrow();
    await flushImmediate();
    await flushImmediate();

    expect(badgeCheck.updateBadges).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
