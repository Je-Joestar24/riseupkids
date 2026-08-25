/**
 * Phase 4 e2e: send (push skipped) → parent inbox → unread → mark read.
 * Uses mocked persistence with the real send + inbox services.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

const receiptStore = [];

function matchesReceipt(row, query = {}) {
  if (query.campaign && String(row.campaign) !== String(query.campaign)) return false;
  if (query.userId && String(row.userId) !== String(query.userId)) return false;
  if (query.isTest === false && row.isTest) return false;
  if (query.isTest === true && !row.isTest) return false;
  if (query.isTest?.$ne === true && row.isTest) return false;
  if (query.pushResult && typeof query.pushResult === 'string' && row.pushResult !== query.pushResult) return false;
  if (query.pushResult?.$nin && query.pushResult.$nin.includes(row.pushResult)) return false;
  if (query.readAt === null && row.readAt) return false;
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
    limit(count) {
      current = current.slice(0, count);
      return api;
    },
    lean: async () => current,
    then: (resolve, reject) => Promise.resolve(current).then(resolve, reject),
  };
  return api;
}

jest.mock('../models', () => ({
  NotificationCampaign: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  NotificationReceipt: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
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
const { sendCampaignNow } = require('../services/notificationSend.services');
const {
  listInbox,
  getUnreadCount,
  markInboxItemRead,
  markAllInboxRead,
} = require('../services/notificationInbox.services');

const adminId = '507f1f77bcf86cd799439011';
const parentA = 'parent-a';
const parentB = 'parent-b';
const childA = 'child-a';
const DAYTIME = new Date('2026-08-20T18:00:00.000Z');

function campaignDoc() {
  const doc = {
    _id: 'camp-inbox-e2e',
    status: 'draft',
    audience: 'children',
    destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
    fallbackLanguage: 'en',
    localizations: [
      {
        languageCode: 'en',
        title: 'Mini Mission is waiting!',
        message: 'Find 7 objects with Child A.',
        imageMediaId: { _id: 'media-1', url: 'https://cdn.example/mission.png' },
      },
    ],
    delivery: { targeted: 0, sent: 0, failed: 0, skipped: 0, opened: 0 },
    save: jest.fn().mockImplementation(async () => doc),
  };
  return doc;
}

describe('Notification inbox e2e (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    receiptStore.length = 0;
    const doc = campaignDoc();
    NotificationCampaign.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(doc) });
    NotificationCampaign.findOneAndUpdate.mockReturnValue({ populate: jest.fn().mockResolvedValue(doc) });
    deliverPush.mockResolvedValue({ status: 'skipped', reason: 'no_device_token' });
    listCampaignRecipients.mockResolvedValue([
      { userId: parentA, childId: childA, preferredLanguage: 'en', timezone: 'America/Sao_Paulo' },
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
  });

  it('send writes history even if push is skipped, then parent can read only their inbox', async () => {
    await sendCampaignNow('camp-inbox-e2e', adminId, { now: DAYTIME });

    const inbox = await listInbox(parentA, { page: 1, limit: 20 });
    expect(inbox.data).toHaveLength(1);
    expect(inbox.data[0]).toMatchObject({
      title: 'Mini Mission is waiting!',
      message: 'Find 7 objects with Child A.',
      imageUrl: 'https://cdn.example/mission.png',
      isUnread: true,
      childId: childA,
      destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
    });
    expect(inbox.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });

    await expect(getUnreadCount(parentA)).resolves.toEqual({ unreadCount: 1 });
    await expect(listInbox(parentB)).resolves.toMatchObject({ data: [], pagination: { total: 0 } });

    const marked = await markInboxItemRead(parentA, inbox.data[0]._id, new Date('2026-08-20T19:00:00.000Z'));
    expect(marked.isUnread).toBe(false);
    await expect(getUnreadCount(parentA)).resolves.toEqual({ unreadCount: 0 });
    await expect(markInboxItemRead(parentB, inbox.data[0]._id)).rejects.toMatchObject({ statusCode: 403 });

    receiptStore.push({
      _id: 'rec-parent-a-2',
      userId: parentA,
      childId: childA,
      isTest: false,
      title: 'Second',
      message: 'Another update',
      imageUrl: null,
      createdAt: new Date('2026-08-20T20:00:00.000Z'),
      readAt: null,
      pushResult: 'sent',
      destination: { kind: 'home', contentId: null },
      save: jest.fn(),
      toObject() {
        return { ...this };
      },
    });
    await markAllInboxRead(parentA);
    await expect(getUnreadCount(parentA)).resolves.toEqual({ unreadCount: 0 });
  });
});
