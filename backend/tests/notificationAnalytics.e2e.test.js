/**
 * Phase 5 e2e: mocked send → analytics match receipts → inbox open increments
 * opens → history keeps the image snapshot → sent images cannot be deleted.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

const receiptStore = [];
const mediaStore = new Map();
const campaignStore = new Map();

function matchesReceipt(row, query = {}) {
  if (query.campaign && String(row.campaign) !== String(query.campaign)) return false;
  if (query.userId && String(row.userId) !== String(query.userId)) return false;
  if (query.isTest === false && row.isTest) return false;
  if (query.isTest === true && !row.isTest) return false;
  if (query.isTest?.$ne === true && row.isTest) return false;
  if (query.pushResult && typeof query.pushResult === 'string' && row.pushResult !== query.pushResult) return false;
  if (query.pushResult?.$nin && query.pushResult.$nin.includes(row.pushResult)) return false;
  if (query.readAt === null && row.readAt) return false;
  if (query.imageMediaId && String(row.imageMediaId) !== String(query.imageMediaId)) return false;
  return true;
}

function createQuery(rows) {
  let current = rows;
  const api = {
    sort(spec = {}) {
      const entry = Object.entries(spec)[0];
      if (entry) {
        const [key, dir] = entry;
        current = [...current].sort((a, b) => {
          const left = new Date(a[key] || 0).getTime();
          const right = new Date(b[key] || 0).getTime();
          return dir < 0 ? right - left : left - right;
        });
      }
      return api;
    },
    skip(count) {
      current = current.slice(count);
      return api;
    },
    select() {
      return api;
    },
    limit(count) {
      current = current.slice(0, count);
      return api;
    },
    lean: async () => current,
    then: (resolve, reject) => Promise.resolve(current).then(resolve, reject),
  };
  return api;
}

function campaignMatches(row, query = {}) {
  if (query.status?.$in && !query.status.$in.includes(row.status)) return false;
  if (query['localizations.imageMediaId'] && !row.localizations?.some((item) => String(item.imageMediaId?._id || item.imageMediaId) === String(query['localizations.imageMediaId']))) {
    return false;
  }
  return true;
}

jest.mock('../models', () => ({
  NotificationCampaign: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
    exists: jest.fn(),
  },
  NotificationReceipt: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    exists: jest.fn(),
  },
  Media: {
    findById: jest.fn(),
  },
}));

jest.mock('../services/notificationPush.services', () => ({
  deliverPush: jest.fn(),
}));

jest.mock('../services/notificationAudience.services', () => ({
  listCampaignRecipients: jest.fn(),
}));

const { NotificationCampaign, NotificationReceipt, Media } = require('../models');
const { deliverPush } = require('../services/notificationPush.services');
const { listCampaignRecipients } = require('../services/notificationAudience.services');
const { sendCampaignNow } = require('../services/notificationSend.services');
const { listInbox, markInboxItemRead } = require('../services/notificationInbox.services');
const {
  getCampaignAnalytics,
  deleteNotificationImage,
} = require('../services/notificationAnalytics.services');

const adminId = '507f1f77bcf86cd799439011';
const parentSent = 'parent-sent';
const parentFailed = 'parent-failed';
const parentSkipped = 'parent-skipped';
const DAYTIME = new Date('2026-08-20T18:00:00.000Z');
const ORIGINAL_IMAGE = 'https://cdn.example/original.png';
const REPLACED_IMAGE = 'https://cdn.example/replaced.png';

function campaignDoc() {
  const doc = {
    _id: 'camp-analytics-e2e',
    internalName: 'Mini Mission August',
    status: 'draft',
    audience: 'parents',
    type: 'mini_mission',
    destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
    fallbackLanguage: 'en',
    localizations: [
      {
        languageCode: 'en',
        title: 'Mini Mission is waiting!',
        message: 'Find 7 objects.',
        imageMediaId: { _id: 'media-sent', url: ORIGINAL_IMAGE },
      },
    ],
    delivery: { targeted: 0, sent: 0, failed: 0, skipped: 0, expired: 0, opened: 0 },
    createdBy: { _id: adminId, name: 'Admin', email: 'admin@example.com' },
    updatedBy: { _id: adminId, name: 'Admin', email: 'admin@example.com' },
    scheduledBy: null,
    sentBy: null,
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    sentAt: null,
    lastError: null,
    save: jest.fn().mockImplementation(async () => doc),
  };
  return doc;
}

function campaignQuery(doc) {
  const query = {
    populate: jest.fn().mockImplementation(() => query),
    lean: jest.fn().mockResolvedValue(doc),
    then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
  };
  return query;
}

describe('Notification analytics e2e (Phase 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    receiptStore.length = 0;
    mediaStore.clear();
    campaignStore.clear();

    const doc = campaignDoc();
    campaignStore.set(String(doc._id), doc);
    mediaStore.set('media-sent', {
      _id: 'media-sent',
      url: ORIGINAL_IMAGE,
      isActive: true,
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    });
    mediaStore.set('media-draft', {
      _id: 'media-draft',
      url: 'https://cdn.example/draft.png',
      isActive: true,
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    });

    NotificationCampaign.findById.mockImplementation((id) => {
      return campaignQuery(campaignStore.get(String(id)) || null);
    });
    NotificationCampaign.findOneAndUpdate.mockImplementation((_filter, update) => {
      const doc = campaignStore.get('camp-analytics-e2e');
      if (update?.$set) Object.assign(doc, update.$set);
      return campaignQuery(doc);
    });
    NotificationCampaign.updateOne.mockImplementation(async (filter, update) => {
      const doc = campaignStore.get(String(filter._id));
      if (doc && update?.$inc?.['delivery.opened']) {
        doc.delivery.opened = (doc.delivery.opened || 0) + update.$inc['delivery.opened'];
      }
      return { modifiedCount: doc ? 1 : 0 };
    });
    NotificationCampaign.exists.mockImplementation(async (query) => {
      return [...campaignStore.values()].some((row) => campaignMatches(row, query)) || null;
    });

    deliverPush.mockImplementation(async ({ userId }) => {
      if (userId === parentSent) return { status: 'sent' };
      if (userId === parentFailed) return { status: 'failed', reason: 'DeviceNotRegistered' };
      return { status: 'skipped', reason: 'no_device_token' };
    });
    listCampaignRecipients.mockResolvedValue([
      { userId: parentSent, childId: null, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
      { userId: parentFailed, childId: null, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
      { userId: parentSkipped, childId: null, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
    ]);

    NotificationReceipt.create.mockImplementation(async (payload) => {
      const row = {
        _id: `rec-${receiptStore.length + 1}`,
        createdAt: new Date('2026-08-20T18:00:00.000Z'),
        readAt: null,
        ...payload,
      };
      row.save = jest.fn(async () => row);
      row.toObject = () => ({ ...row });
      receiptStore.push(row);
      return row;
    });
    NotificationReceipt.find.mockImplementation((query) =>
      createQuery(receiptStore.filter((row) => matchesReceipt(row, query)))
    );
    NotificationReceipt.countDocuments.mockImplementation(async (query) =>
      receiptStore.filter((row) => matchesReceipt(row, query)).length
    );
    NotificationReceipt.findById.mockImplementation(async (id) =>
      receiptStore.find((row) => String(row._id) === String(id)) || null
    );
    NotificationReceipt.updateMany.mockImplementation(async (query, update) => {
      const rows = receiptStore.filter((row) => matchesReceipt(row, query));
      rows.forEach((row) => Object.assign(row, update.$set || {}));
      return { modifiedCount: rows.length };
    });
    NotificationReceipt.exists.mockImplementation(async (query) =>
      receiptStore.find((row) => matchesReceipt(row, query)) || null
    );
    Media.findById.mockImplementation(async (id) => mediaStore.get(String(id)) || null);
  });

  it('send totals, opens, snapshot image, and image delete rules (5.1–5.7)', async () => {
    await sendCampaignNow('camp-analytics-e2e', adminId, { now: DAYTIME });

    const afterSend = await getCampaignAnalytics('camp-analytics-e2e');
    expect(afterSend.delivery).toMatchObject({
      targeted: 3,
      sent: 1,
      failed: 1,
      skipped: 1,
      opened: 0,
    });
    expect(afterSend.failureCounts.invalid_token).toBe(1);
    expect(afterSend.audit.sentBy._id).toBe(adminId);
    expect(afterSend.audit.createdBy._id).toBe(adminId);

    const inbox = await listInbox(parentSent);
    expect(inbox.data[0].imageUrl).toBe(ORIGINAL_IMAGE);
    expect(inbox.data[0].isUnread).toBe(true);

    const campaign = campaignStore.get('camp-analytics-e2e');
    campaign.localizations[0].imageMediaId.url = REPLACED_IMAGE;
    mediaStore.get('media-sent').url = REPLACED_IMAGE;

    const inboxAfterReplace = await listInbox(parentSent);
    expect(inboxAfterReplace.data[0].imageUrl).toBe(ORIGINAL_IMAGE);

    await markInboxItemRead(parentSent, inbox.data[0]._id, new Date('2026-08-20T19:00:00.000Z'));
    const afterOpen = await getCampaignAnalytics('camp-analytics-e2e');
    expect(afterOpen.delivery.opened).toBe(1);
    expect(campaign.delivery.opened).toBe(1);

    await expect(deleteNotificationImage('media-sent')).rejects.toMatchObject({ statusCode: 409 });
    await expect(deleteNotificationImage('media-draft')).resolves.toEqual({
      deleted: true,
      mediaId: 'media-draft',
    });
    expect(mediaStore.get('media-draft').isActive).toBe(false);
  });
});
