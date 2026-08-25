jest.mock('../models', () => ({
  NotificationCampaign: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    deleteMany: jest.fn(),
  },
  NotificationReceipt: {
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
  },
  NotificationSchedulerLock: {
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
  },
  DevicePushToken: {
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const {
  NotificationCampaign,
  NotificationReceipt,
  NotificationSchedulerLock,
  DevicePushToken,
} = require('../models');
const {
  CONFIRM_VALUE,
  parseArgs,
  describeMongoTarget,
  runNotificationCleanup,
} = require('../scripts/cleanupNotifications');

function mockInspect({ campaigns = 4, receipts = 12, testReceipts = 9, tokens = 3, locks = 1 } = {}) {
  NotificationCampaign.countDocuments.mockResolvedValue(campaigns);
  NotificationReceipt.countDocuments.mockImplementation(async (filter = {}) =>
    filter.isTest ? testReceipts : receipts
  );
  DevicePushToken.countDocuments.mockResolvedValue(tokens);
  NotificationSchedulerLock.countDocuments.mockResolvedValue(locks);
  NotificationCampaign.find.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([
      { internalName: 'INSTANT TEST', status: 'sent', createdAt: new Date('2026-08-25T00:00:00.000Z') },
    ]),
  });
}

describe('cleanupNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInspect();
  });

  it('requires the exact confirm phrase before deleting', () => {
    expect(parseArgs([])).toEqual({ confirm: false, confirmRejected: false });
    expect(parseArgs(['--confirm'])).toEqual({ confirm: false, confirmRejected: true });
    expect(parseArgs(['--confirm=yes'])).toEqual({ confirm: false, confirmRejected: true });
    expect(parseArgs([`--confirm=${CONFIRM_VALUE}`])).toEqual({ confirm: true, confirmRejected: false });
  });

  it('redacts credentials when describing the Mongo target', () => {
    expect(
      describeMongoTarget('mongodb+srv://user:secret@cluster0.example.net/lms_db?retryWrites=true')
    ).toBe('cluster0.example.net/lms_db');
  });

  it('dry-runs counts without deleting', async () => {
    const result = await runNotificationCleanup({ confirm: false });

    expect(result.dryRun).toBe(true);
    expect(result.deleted).toBeNull();
    expect(result.preview).toMatchObject({
      campaigns: 4,
      receipts: 12,
      testReceipts: 9,
      tokens: 3,
      locks: 1,
    });
    expect(NotificationCampaign.deleteMany).not.toHaveBeenCalled();
    expect(NotificationReceipt.deleteMany).not.toHaveBeenCalled();
    expect(DevicePushToken.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes campaigns, receipts, and scheduler locks but keeps device tokens', async () => {
    NotificationReceipt.deleteMany.mockResolvedValue({ deletedCount: 12 });
    NotificationCampaign.deleteMany.mockResolvedValue({ deletedCount: 4 });
    NotificationSchedulerLock.deleteMany.mockResolvedValue({ deletedCount: 1 });

    const result = await runNotificationCleanup({ confirm: true });

    expect(NotificationReceipt.deleteMany).toHaveBeenCalledWith({});
    expect(NotificationCampaign.deleteMany).toHaveBeenCalledWith({});
    expect(NotificationSchedulerLock.deleteMany).toHaveBeenCalledWith({});
    expect(DevicePushToken.deleteMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: false,
      deleted: { receipts: 12, campaigns: 4, schedulerLocks: 1 },
    });
  });
});
