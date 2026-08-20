/**
 * Phase 2 end-to-end: create → schedule → due tick → receipts.
 * Uses mocked persistence but the real schedule/send/scheduler orchestration.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../models', () => ({
  NotificationCampaign: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  },
  NotificationReceipt: {
    create: jest.fn(),
  },
  Media: { create: jest.fn() },
  User: { find: jest.fn() },
  ChildProfile: { find: jest.fn() },
}));

jest.mock('../services/notificationSchedulerLock.service', () => ({
  acquireNotificationSchedulerLock: jest.fn(),
  releaseNotificationSchedulerLock: jest.fn(),
}));

jest.mock('../services/notificationPush.services', () => ({
  deliverPush: jest.fn(),
}));

jest.mock('../services/notificationAudience.services', () => ({
  listCampaignRecipients: jest.fn(),
}));

const { NotificationCampaign, NotificationReceipt } = require('../models');
const {
  acquireNotificationSchedulerLock,
  releaseNotificationSchedulerLock,
} = require('../services/notificationSchedulerLock.service');
const { deliverPush } = require('../services/notificationPush.services');
const { listCampaignRecipients } = require('../services/notificationAudience.services');
const { createCampaign, scheduleCampaign } = require('../services/notificationCampaign.services');
const { runDueNotifications } = require('../jobs/notificationScheduler');

const adminId = '507f1f77bcf86cd799439011';
const store = new Map();

function wrap(doc) {
  doc.save = jest.fn(async () => doc);
  doc.populate = jest.fn(async () => doc);
  return doc;
}

describe('Notification scheduler e2e (Phase 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
    acquireNotificationSchedulerLock.mockResolvedValue(true);
    releaseNotificationSchedulerLock.mockResolvedValue(undefined);
    deliverPush.mockResolvedValue({ status: 'skipped', reason: 'push_provider_not_configured' });
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'pt' },
    ]);
    NotificationReceipt.create.mockImplementation(async (payload) => ({ _id: 'receipt-1', ...payload }));

    NotificationCampaign.create.mockImplementation(async (payload) => {
      const doc = wrap({ _id: 'camp-e2e', ...payload });
      store.set(String(doc._id), doc);
      return doc;
    });
    NotificationCampaign.findById.mockImplementation((id) => {
      const doc = store.get(String(id));
      return {
        populate: async () => doc,
        lean: async () => doc,
        then: (resolve) => resolve(doc),
      };
    });
    NotificationCampaign.findOneAndUpdate.mockImplementation((query, update) => {
      const doc = store.get(String(query._id));
      if (!doc) return { populate: async () => null };
      if (query.status && query.status.$in && !query.status.$in.includes(doc.status)) {
        return { populate: async () => null };
      }
      Object.assign(doc, update.$set || {});
      return { populate: async () => doc };
    });
  });

  it('creates, schedules in Sao Paulo, ignores an early UTC tick, then sends on the real due time', async () => {
    const created = await createCampaign(
      {
        internalName: 'Story Time Reminder - August Week 2',
        type: 'story_time',
        audience: 'all',
        destination: { kind: 'story_time' },
        localizations: [
          { languageCode: 'en', title: 'Story Time is waiting!', message: 'A new adventure is ready for you.' },
        ],
      },
      adminId
    );
    expect(created.status).toBe('draft');

    const scheduled = await scheduleCampaign(
      created._id,
      { sendDate: '2026-08-20', sendTime: '09:00', timezone: 'America/Sao_Paulo' },
      adminId
    );
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.sendAt.toISOString()).toBe('2026-08-20T12:00:00.000Z');

    NotificationCampaign.find.mockReturnValue({
      select: () => ({
        lean: async () => [],
      }),
    });
    const early = await runDueNotifications(new Date('2026-08-20T09:00:00.000Z'));
    expect(early.results || []).toHaveLength(0);
    expect(store.get('camp-e2e').status).toBe('scheduled');
    expect(NotificationReceipt.create).not.toHaveBeenCalled();

    NotificationCampaign.find.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: 'camp-e2e', status: 'scheduled', sendAt: scheduled.sendAt }],
      }),
    });
    const due = await runDueNotifications(new Date('2026-08-20T12:00:00.000Z'));
    expect(due.skipped).toBe(false);
    expect(due.results[0].success).toBe(true);
    expect(store.get('camp-e2e').status).toBe('sent');
    expect(NotificationReceipt.create).toHaveBeenCalledTimes(1);
    expect(NotificationReceipt.create.mock.calls[0][0]).toMatchObject({
      userId: 'parent-1',
      languageCode: 'en',
      fallbackUsed: true,
      isTest: false,
      title: 'Story Time is waiting!',
    });
    expect(deliverPush).toHaveBeenCalledTimes(1);
  });
});
