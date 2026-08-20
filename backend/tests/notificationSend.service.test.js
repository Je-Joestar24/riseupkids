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

describe('Notification send (Phase 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deliverPush.mockResolvedValue({ status: 'skipped', reason: 'push_provider_not_configured' });
    NotificationReceipt.create.mockImplementation(async (payload) => ({ _id: `r-${payload.userId}`, ...payload }));
  });

  it('send now moves draft to sending then sent and creates receipts (2.4)', async () => {
    const doc = campaignDoc({ status: 'sending' });
    mockLoad(campaignDoc());
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-1', childId: null, preferredLanguage: 'en' },
      { userId: 'parent-2', childId: null, preferredLanguage: 'en' },
    ]);

    const result = await sendCampaignNow('camp-1', adminId);

    expect(NotificationCampaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'camp-1', status: { $in: ['draft', 'scheduled'] } },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sending' }) }),
      { new: true }
    );
    expect(NotificationReceipt.create).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('sent');
    expect(result.delivery.targeted).toBe(2);
    expect(result.delivery.sent).toBe(2);
    expect(deliverPush).toHaveBeenCalled();
  });

  it('uses English when the user language is missing (2.8)', async () => {
    const doc = campaignDoc({ status: 'sending' });
    mockLoad(campaignDoc());
    mockClaim(doc);
    listCampaignRecipients.mockResolvedValue([
      { userId: 'parent-pt', childId: null, preferredLanguage: 'pt' },
    ]);

    await sendCampaignNow('camp-1', adminId);

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

    const result = await sendCampaignNow('camp-1', adminId);

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

    const result = await sendCampaignTest('camp-1', adminId, 'admin-test');

    expect(NotificationCampaign.findOneAndUpdate).not.toHaveBeenCalled();
    expect(listCampaignRecipients).toHaveBeenCalledWith('all', { testUserId: 'admin-test' });
    expect(NotificationReceipt.create).toHaveBeenCalledTimes(1);
    expect(NotificationReceipt.create.mock.calls[0][0].isTest).toBe(true);
    expect(result.campaign.status).toBe('scheduled');
    expect(result.targeted).toBe(1);
  });
});
