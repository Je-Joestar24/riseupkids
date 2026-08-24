/**
 * Phase 2 notification scheduler / schedule / cancel tests.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../models', () => ({
  NotificationCampaign: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
  NotificationReceipt: {
    create: jest.fn(),
    countDocuments: jest.fn(),
  },
  Media: { create: jest.fn() },
}));

jest.mock('../services/notificationSchedulerLock.service', () => ({
  acquireNotificationSchedulerLock: jest.fn(),
  releaseNotificationSchedulerLock: jest.fn(),
}));

jest.mock('../services/notificationSend.services', () => ({
  sendScheduledCampaign: jest.fn(),
  processDueQueuedReceipts: jest.fn().mockResolvedValue([]),
}));

const fs = require('node:fs');
const path = require('node:path');
const { NotificationCampaign, NotificationReceipt } = require('../models');
const {
  acquireNotificationSchedulerLock,
  releaseNotificationSchedulerLock,
} = require('../services/notificationSchedulerLock.service');
const { sendScheduledCampaign } = require('../services/notificationSend.services');
const {
  createCampaign,
  scheduleCampaign,
  cancelCampaign,
  updateCampaign,
} = require('../services/notificationCampaign.services');
const {
  runDueNotifications,
  findDueCampaigns,
} = require('../jobs/notificationScheduler');
const { hasHardCodedWeeklyCadence } = require('../utils/notificationTimezone.util');

const adminId = '507f1f77bcf86cd799439011';

function mockDoc(data) {
  const doc = {
    ...data,
    save: jest.fn().mockImplementation(async () => doc),
    populate: jest.fn().mockImplementation(async () => doc),
  };
  return doc;
}

describe('Notification schedule and cancel (Phase 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves a draft with no send time, receipts, or push (2.1)', async () => {
    NotificationCampaign.create.mockImplementation(async (payload) =>
      mockDoc({ ...payload, _id: 'camp-draft' })
    );

    const created = await createCampaign(
      {
        internalName: 'Draft only',
        type: 'story_time',
        audience: 'all',
        destination: { kind: 'home' },
        localizations: [{ languageCode: 'en', title: 'Hi', message: 'There' }],
      },
      adminId
    );

    expect(created.status).toBe('draft');
    expect(created.sendAt).toBeUndefined();
    expect(NotificationReceipt.create).not.toHaveBeenCalled();
    expect(sendScheduledCampaign).not.toHaveBeenCalled();
  });

  it('schedules in a named timezone and stores sendAt + timezone (2.2)', async () => {
    const doc = mockDoc({
      _id: 'camp-1',
      status: 'draft',
      localizations: [{ languageCode: 'en', title: 'Hi', message: 'There' }],
    });
    NotificationCampaign.findById.mockResolvedValue(doc);

    const scheduled = await scheduleCampaign(
      'camp-1',
      { sendDate: '2026-08-20', sendTime: '09:00', timezone: 'America/Sao_Paulo' },
      adminId
    );

    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.timezone).toBe('America/Sao_Paulo');
    expect(scheduled.sendAt.toISOString()).toBe('2026-08-20T12:00:00.000Z');
    expect(scheduled.sendLocalDate).toBe('2026-08-20');
    expect(scheduled.sendLocalTime).toBe('09:00');
    expect(scheduled.timingMode).toBe('same_moment');
    expect(scheduled.quietHourBehavior).toBe('defer');
    expect(scheduled.scheduledBy).toBe(adminId);
  });

  it('schedules recipient local time from the earliest worldwide wall clock', async () => {
    const doc = mockDoc({
      _id: 'camp-local',
      status: 'draft',
      localizations: [{ languageCode: 'en', title: 'Hi', message: 'There' }],
    });
    NotificationCampaign.findById.mockResolvedValue(doc);

    const scheduled = await scheduleCampaign(
      'camp-local',
      {
        sendDate: '2026-08-20',
        sendTime: '16:00',
        timezone: 'America/Sao_Paulo',
        timingMode: 'recipient_local',
      },
      adminId
    );

    expect(scheduled.timingMode).toBe('recipient_local');
    expect(scheduled.sendAt.toISOString()).toBe('2026-08-20T02:00:00.000Z');
  });

  it('reschedules a scheduled campaign without sending early (2.5)', async () => {
    const doc = mockDoc({
      _id: 'camp-1',
      status: 'scheduled',
      sendAt: new Date('2026-08-20T12:00:00.000Z'),
      timezone: 'America/Sao_Paulo',
      localizations: [{ languageCode: 'en', title: 'Hi', message: 'There' }],
    });
    NotificationCampaign.findById.mockResolvedValue(doc);

    await scheduleCampaign(
      'camp-1',
      { sendDate: '2026-08-21', sendTime: '10:00', timezone: 'America/Sao_Paulo' },
      adminId
    );

    expect(doc.status).toBe('scheduled');
    expect(doc.sendAt.toISOString()).toBe('2026-08-21T13:00:00.000Z');
    expect(sendScheduledCampaign).not.toHaveBeenCalled();
  });

  it('cancels a scheduled campaign so the scheduler skips it (2.6)', async () => {
    const doc = mockDoc({
      _id: 'camp-1',
      status: 'scheduled',
      sendAt: new Date('2026-08-20T12:00:00.000Z'),
      localizations: [{ languageCode: 'en', title: 'Hi', message: 'There' }],
    });
    NotificationCampaign.findById.mockResolvedValue(doc);

    const cancelled = await cancelCampaign('camp-1', adminId);

    expect(cancelled.status).toBe('cancelled');
    expect(NotificationReceipt.create).not.toHaveBeenCalled();
    expect(sendScheduledCampaign).not.toHaveBeenCalled();
  });

  it('rejects edit and cancel after sent (2.7)', async () => {
    const sent = mockDoc({
      _id: 'camp-1',
      status: 'sent',
      internalName: 'Already sent',
      localizations: [{ languageCode: 'en', title: 'Hi', message: 'There' }],
    });
    NotificationCampaign.findById.mockResolvedValue(sent);

    await expect(updateCampaign('camp-1', { internalName: 'Nope' }, adminId)).rejects.toThrow(
      /cannot be edited/i
    );
    await expect(cancelCampaign('camp-1', adminId)).rejects.toThrow(/Only scheduled campaigns/i);
    expect(sent.status).toBe('sent');
    expect(sent.internalName).toBe('Already sent');
  });
});

describe('Notification scheduler job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acquireNotificationSchedulerLock.mockResolvedValue(true);
    releaseNotificationSchedulerLock.mockResolvedValue(undefined);
    sendScheduledCampaign.mockResolvedValue({ status: 'sent' });
  });

  it('only selects scheduled campaigns whose sendAt is due', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: 'due-1' }]);
    const select = jest.fn().mockReturnValue({ lean });
    NotificationCampaign.find.mockReturnValue({ select });

    const now = new Date('2026-08-20T12:00:00.000Z');
    await findDueCampaigns(now);

    expect(NotificationCampaign.find).toHaveBeenCalledWith({
      status: { $in: ['scheduled', 'sending'] },
      sendAt: { $lte: now },
    });
  });

  it('has no hard-coded weekly cadence (2.11)', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../jobs/notificationScheduler.js'),
      'utf8'
    );
    expect(hasHardCodedWeeklyCadence(source)).toBe(false);
    expect(source).toContain('scheduled');
    expect(source).toContain('sendAt');
    expect(source).not.toMatch(/Monday|0 0 \* \* 1/i);
  });

  it('skips a second overlapping tick when the lock is held (2.12)', async () => {
    let release;
    acquireNotificationSchedulerLock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(true);
        })
    );
    NotificationCampaign.find.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ _id: 'due-1' }]) }),
    });

    const first = runDueNotifications();
    const second = await runDueNotifications();
    expect(second).toEqual({ skipped: true, reason: 'already_running' });
    expect(sendScheduledCampaign).not.toHaveBeenCalled();

    release();
    await first;
    expect(sendScheduledCampaign).toHaveBeenCalledTimes(1);
    expect(releaseNotificationSchedulerLock).toHaveBeenCalled();
  });

  it('does not send when the cluster lock is not acquired (2.12)', async () => {
    acquireNotificationSchedulerLock.mockResolvedValue(false);
    const result = await runDueNotifications();
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('lock_not_acquired');
    expect(sendScheduledCampaign).not.toHaveBeenCalled();
  });
});
