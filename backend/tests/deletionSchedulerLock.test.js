jest.mock('../models/DeletionSchedulerLock', () => ({
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
}));

const DeletionSchedulerLock = require('../models/DeletionSchedulerLock');
const {
  acquireDeletionSchedulerLock,
  releaseDeletionSchedulerLock,
} = require('../services/deletionSchedulerLock.service');

describe('deletionSchedulerLock.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('acquires lock when document is free', async () => {
    const { getLockOwner } = require('../services/deletionSchedulerLock.service');
    const owner = getLockOwner();
    DeletionSchedulerLock.findOneAndUpdate.mockResolvedValue({
      _id: 'deletion-scheduler',
      lockedBy: owner,
    });

    const acquired = await acquireDeletionSchedulerLock();

    expect(acquired).toBe(true);
    expect(DeletionSchedulerLock.findOneAndUpdate).toHaveBeenCalled();
  });

  it('releases lock for current owner', async () => {
    DeletionSchedulerLock.updateOne.mockResolvedValue({ modifiedCount: 1 });

    await releaseDeletionSchedulerLock();

    expect(DeletionSchedulerLock.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'deletion-scheduler' }),
      expect.objectContaining({
        $set: expect.objectContaining({ lockedUntil: null, lockedBy: null }),
      })
    );
  });
});
