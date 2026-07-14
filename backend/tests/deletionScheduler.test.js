jest.mock('../services/accountDeletion.service', () => ({
  executeAllPendingRequests: jest.fn(),
}));

jest.mock('../services/deletionSchedulerLock.service', () => ({
  acquireDeletionSchedulerLock: jest.fn(),
  releaseDeletionSchedulerLock: jest.fn(),
}));

const accountDeletionService = require('../services/accountDeletion.service');
const {
  acquireDeletionSchedulerLock,
  releaseDeletionSchedulerLock,
} = require('../services/deletionSchedulerLock.service');
const { runDueDeletions, isSchedulerEnabled } = require('../jobs/deletionScheduler');

describe('deletionScheduler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    acquireDeletionSchedulerLock.mockResolvedValue(true);
    releaseDeletionSchedulerLock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is enabled in production by default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DELETION_SCHEDULER_ENABLED;
    expect(isSchedulerEnabled()).toBe(true);
  });

  it('is disabled in development unless explicitly enabled', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DELETION_SCHEDULER_ENABLED;
    expect(isSchedulerEnabled()).toBe(false);
  });

  it('runs due-only batch processing when lock is acquired', async () => {
    accountDeletionService.executeAllPendingRequests.mockResolvedValue([
      { requestId: 'req1', success: true },
    ]);

    const result = await runDueDeletions();

    expect(acquireDeletionSchedulerLock).toHaveBeenCalled();
    expect(accountDeletionService.executeAllPendingRequests).toHaveBeenCalledWith({ dueOnly: true });
    expect(releaseDeletionSchedulerLock).toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
  });

  it('skips batch when lock is not acquired', async () => {
    acquireDeletionSchedulerLock.mockResolvedValue(false);

    const result = await runDueDeletions();

    expect(accountDeletionService.executeAllPendingRequests).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('lock_not_acquired');
  });
});
