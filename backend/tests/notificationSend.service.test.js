/**
 * Phase 2 send-now, fallback, and test-send.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../models', () => ({
  NotificationCampaign: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  NotificationReceipt: {
    create: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  User: { find: jest.fn() },
  ChildProfile: { find: jest.fn() },
}));

jest.mock('../services/notificationPush.services', () => ({
  deliverPush: jest.fn(),
}));

jest.mock('../services/notificationAudience.services', () => ({
  listCampaignRecipients: jest.fn(),
}));

const { NotificationCampaign, NotificationReceipt } = require('../models');
const { deliverPush } = require('../services/notificationPush.services');
const { listCampaignRecipients } = require('../services/notificationAudience.services');
const { sendCampaignNow, sendCampaignTest } = require('../services/notificationSend.services');

const adminId = '507f1f77bcf86cd799439011';

function campaignDoc(overrides = {}) {
  const doc = {
    _id: 'camp-1',
    status: 'draft',
    audience: 'all',
    destination: { kind: 'home', contentId: null },
    fallbackLanguage: 'en',
    localizations: [
      { languageCode: 'en', title: 'Story Time is waiting!', message: 'A new adventure is ready for you.' },
    ],
    delivery: { targeted: 0, sent: 0, failed: 0, opened: 0 },
    save: jest.fn().mockImplementation(async () => doc),
    ...overrides,
  };
  return doc;
}

function mockLoad(doc) {
  NotificationCampaign.findById.mockReturnValue({
    populate: jest.fn().mockResolvedValue(doc),
  });
}

function mockClaim(doc) {
  NotificationCampaign.findOneAndUpdate.mockReturnValue({
    populate: jest.fn().mockResolvedValue(doc),
  });
}

const DAYTIME = new Date('2026-08-20T18:00:00.000Z');

describe('Notification send (Phase 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deliverPush.mockResolvedValue({ status: 'sent', reason: null });
    NotificationReceipt.create.mockImplementation(async (payload) => {
      const row = { _id: `r-${payload.userId}`, ...payload };
      row.save = jest.fn(async () => {
        row.pushResult = row.pushResult;
        return row;
      });
      return row;
    });
    NotificationReceipt.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
      limit: jest.fn().mockResolvedValue([]),
    });
  });

  it('send now moves draft to sending then sent and creates receipts (2.4)', async () => {
    const doc = campaignDoc({ status: 'sending' });
    mockLoad(campaignDoc());
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en' },
      { userId: 'parent-2', childId: null, preferredLanguage: 'en' },
    ]);

    const result = await sendCampaignNow('camp-1', adminId, { now: DAYTIME });

    expect(NotificationCampaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'camp-1', status: { $in: ['draft', 'scheduled'] } },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sending' }) }),
      { new: true }
    );
    expect(NotificationReceipt.create).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('sent');
    expect(result.delivery.targeted).toBe(2);
    expect(result.delivery.sent).toBe(2);
    expect(result.delivery.skipped).toBe(0);
    expect(deliverPush).toHaveBeenCalled();
  });

  it('does not count skipped pushes as sent when no device is registered', async () => {
    const doc = campaignDoc({ status: 'sending' });
    mockLoad(campaignDoc());
    mockClaim(doc);
    deliverPush.mockResolvedValue({ status: 'skipped', reason: 'no_device_token' });
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en' },
      { userId: 'parent-2', childId: null, preferredLanguage: 'en' },
    ]);

    const result = await sendCampaignNow('camp-1', adminId, { now: DAYTIME });

    expect(result.status).toBe('failed');
    expect(result.lastError).toBe('no_device_token');
    expect(result.delivery.targeted).toBe(2);
    expect(result.delivery.sent).toBe(0);
    expect(result.delivery.skipped).toBe(2);
    expect(NotificationReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'parent-1',
        pushResult: 'queued',
      })
    );
  });

  it('uses English when the user language is missing (2.8)', async () => {
    const doc = campaignDoc({ status: 'sending' });
    mockLoad(campaignDoc());
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-pt', childId: null, preferredLanguage: 'pt' },
    ]);

    await sendCampaignNow('camp-1', adminId, { now: DAYTIME });

    expect(NotificationReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'parent-pt',
        languageCode: 'en',
        fallbackUsed: true,
        title: 'Story Time is waiting!',
      })
    );
  });

  it('fails the recipient and campaign when English fallback is missing (2.9)', async () => {
    const doc = campaignDoc({
      status: 'sending',
      localizations: [{ languageCode: 'es', title: 'Hola', message: 'Listo' }],
    });
    mockLoad(campaignDoc({ localizations: doc.localizations }));
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-pt', childId: null, preferredLanguage: 'pt' },
    ]);

    const result = await sendCampaignNow('camp-1', adminId, { now: DAYTIME });

    expect(NotificationReceipt.create).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
    expect(result.lastError).toBe('missing_localization');
    expect(result.delivery.failed).toBe(1);
  });

  it('send test does not mark the campaign sent or fan out (2.10)', async () => {
    const doc = campaignDoc({ status: 'scheduled' });
    mockLoad(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'admin-test', childId: null, preferredLanguage: 'en' },
    ]);

    const result = await sendCampaignTest('camp-1', adminId, 'admin-test', { now: DAYTIME });

    expect(NotificationCampaign.findOneAndUpdate).not.toHaveBeenCalled();
    expect(listCampaignRecipients).toHaveBeenCalledWith('all', { testUserId: 'admin-test' });
    expect(NotificationReceipt.create).toHaveBeenCalledTimes(1);
    expect(NotificationReceipt.create.mock.calls[0][0].isTest).toBe(true);
    expect(result.campaign.status).toBe('scheduled');
    expect(result.targeted).toBe(1);
  });

  it('sends a test immediately during quiet hours', async () => {
    const doc = campaignDoc({ status: 'scheduled', quietHourBehavior: 'defer' });
    mockLoad(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
    ]);
    const night = new Date('2026-08-21T01:00:00.000Z');

    const result = await sendCampaignTest('camp-1', adminId, 'parent-1', { now: night });

    expect(deliverPush).toHaveBeenCalledTimes(1);
    expect(result.receipts[0].pushResult).toBe('sent');
  });

  it('defers a send-now during quiet hours until 07:00 local', async () => {
    const doc = campaignDoc({ status: 'sending', quietHourBehavior: 'defer' });
    mockLoad(campaignDoc({ quietHourBehavior: 'defer' }));
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
    ]);
    const night = new Date('2026-08-21T01:00:00.000Z');

    const result = await sendCampaignNow('camp-1', adminId, { now: night });

    expect(deliverPush).not.toHaveBeenCalled();
    expect(result.status).toBe('sending');
    expect(NotificationReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'parent-1',
        pushResult: 'queued',
        failureReason: 'quiet_hours_defer',
      })
    );
  });

  it('expires a live alert in quiet hours instead of deferring', async () => {
    const doc = campaignDoc({ status: 'sending', quietHourBehavior: 'expire' });
    mockLoad(campaignDoc({ quietHourBehavior: 'expire' }));
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
    ]);
    const night = new Date('2026-08-21T01:00:00.000Z');

    const result = await sendCampaignNow('camp-1', adminId, { now: night });

    expect(deliverPush).not.toHaveBeenCalled();
    expect(result.status).toBe('failed');
    expect(NotificationReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pushResult: 'expired',
        failureReason: 'quiet_hours_expire',
      })
    );
  });

  it('does not create a second production receipt for the same parent', async () => {
    const doc = campaignDoc({ status: 'sending' });
    mockLoad(campaignDoc());
    mockClaim(doc);
    const duplicate = new Error('duplicate');
    duplicate.code = 11000;
    NotificationReceipt.create.mockRejectedValue(duplicate);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en' },
    ]);

    const result = await sendCampaignNow('camp-1', adminId, { now: DAYTIME });

    expect(deliverPush).toHaveBeenCalledTimes(0);
    expect(result.delivery.sent).toBe(0);
  });
});
