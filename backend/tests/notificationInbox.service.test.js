/**
 * Phase 4 in-app notification inbox.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../models', () => ({
  NotificationReceipt: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../services/notificationAnalytics.services', () => ({
  recordInboxOpens: jest.fn().mockResolvedValue(undefined),
}));

const { NotificationReceipt } = require('../models');
const {
  listInbox,
  getUnreadCount,
  markInboxItemRead,
  markAllInboxRead,
} = require('../services/notificationInbox.services');

const parentA = 'parent-a';
const parentB = 'parent-b';

function receipt(overrides = {}) {
  return {
    _id: 'rec-1',
    userId: parentA,
    childId: 'child-a',
    isTest: false,
    title: 'Story Time is waiting!',
    message: 'A new adventure is ready.',
    imageUrl: 'https://cdn.example/story.png',
    createdAt: new Date('2026-08-25T10:00:00.000Z'),
    readAt: null,
    pushResult: 'skipped',
    destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
    toObject() {
      return { ...this };
    },
    save: jest.fn().mockImplementation(async function save() {
      return this;
    }),
    ...overrides,
  };
}

describe('Notification inbox (Phase 4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists image, title, message, date, and unread (4.2)', async () => {
    NotificationReceipt.countDocuments.mockResolvedValue(1);
    NotificationReceipt.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([receipt()]),
    });

    const result = await listInbox(parentA, { page: 1, limit: 20 });

    expect(NotificationReceipt.find).toHaveBeenCalledWith({
      userId: parentA,
      isTest: { $ne: true },
      pushResult: { $nin: ['expired'] },
    });
    expect(result.data[0]).toMatchObject({
      title: 'Story Time is waiting!',
      message: 'A new adventure is ready.',
      imageUrl: 'https://cdn.example/story.png',
      isUnread: true,
      childId: 'child-a',
      destination: { kind: 'mini_mission', contentId: 'hazel-poster' },
    });
    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, pages: 1 });
  });

  it('includes skipped-push receipts so history does not depend on Expo (4.1, 4.8)', async () => {
    NotificationReceipt.countDocuments.mockResolvedValue(1);
    NotificationReceipt.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([receipt({ pushResult: 'skipped' })]),
    });

    const result = await listInbox(parentA);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].childId).toBe('child-a');
  });

  it('unread count matches receipts with empty readAt (4.3)', async () => {
    NotificationReceipt.countDocuments.mockResolvedValue(3);
    await expect(getUnreadCount(parentA)).resolves.toEqual({ unreadCount: 3 });
    expect(NotificationReceipt.countDocuments).toHaveBeenCalledWith({
      userId: parentA,
      isTest: { $ne: true },
      pushResult: { $nin: ['expired'] },
      readAt: null,
    });
  });

  it('marks one receipt read without touching others (4.4)', async () => {
    const row = receipt();
    NotificationReceipt.findById.mockResolvedValue(row);

    const result = await markInboxItemRead(parentA, 'rec-1', new Date('2026-08-25T12:00:00.000Z'));

    expect(row.readAt.toISOString()).toBe('2026-08-25T12:00:00.000Z');
    expect(row.save).toHaveBeenCalledTimes(1);
    expect(result.isUnread).toBe(false);
  });

  it('marks all current-user receipts read (4.5)', async () => {
    NotificationReceipt.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'rec-1', campaign: 'camp-1', isTest: false },
        { _id: 'rec-2', campaign: 'camp-1', isTest: false },
        { _id: 'rec-3', campaign: 'camp-2', isTest: false },
        { _id: 'rec-4', campaign: 'camp-2', isTest: false },
      ]),
    });
    NotificationReceipt.updateMany.mockResolvedValue({ modifiedCount: 4 });
    await expect(markAllInboxRead(parentA)).resolves.toEqual({ updated: 4, unreadCount: 0 });
    expect(NotificationReceipt.updateMany).toHaveBeenCalledWith(
      {
        userId: parentA,
        isTest: { $ne: true },
        pushResult: { $nin: ['expired'] },
        readAt: null,
      },
      { $set: { readAt: expect.any(Date) } }
    );
  });

  it('does not let parent A read parent B inbox (4.6)', async () => {
    NotificationReceipt.findById.mockResolvedValue(receipt({ userId: parentB }));
    await expect(markInboxItemRead(parentA, 'rec-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('exposes destination for tap routing (4.7)', async () => {
    NotificationReceipt.countDocuments.mockResolvedValue(1);
    NotificationReceipt.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([receipt()]),
    });
    const result = await listInbox(parentA);
    expect(result.data[0].destination).toEqual({
      kind: 'mini_mission',
      contentId: 'hazel-poster',
    });
  });
});
