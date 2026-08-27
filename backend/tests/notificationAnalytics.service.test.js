/**
 * Phase 5 notification analytics, audit, and sent-image safety.
 * @see docs/NOTIFICATION_SYSTEM_V1_PHASING.md
 */

jest.mock('../models', () => ({
  NotificationCampaign: {
    findById: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    exists: jest.fn(),
  },
  NotificationReceipt: {
    find: jest.fn(),
    exists: jest.fn(),
  },
  Media: {
    findById: jest.fn(),
  },
}));

const { NotificationCampaign, NotificationReceipt, Media } = require('../models');
const {
  summarizeReceipts,
  getCampaignAnalytics,
  getDashboardAnalytics,
  buildDashboardAnalytics,
  parseDashboardFilters,
  recordInboxOpens,
  deleteNotificationImage,
  normalizeFailureReason,
} = require('../services/notificationAnalytics.services');

const campaignId = 'camp-analytics-1';
const admin = { _id: 'admin-1', name: 'Viviana', email: 'viviana@example.com' };

function receipt(overrides = {}) {
  return {
    campaign: campaignId,
    userId: 'parent-1',
    isTest: false,
    pushResult: 'sent',
    failureReason: null,
    readAt: null,
    imageMediaId: 'media-sent',
    imageUrl: 'https://cdn.example/original.png',
    ...overrides,
  };
}

function mockCampaignLean(doc) {
  NotificationCampaign.findById.mockReturnValue({
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(doc),
  });
}

describe('Notification analytics (Phase 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches targeted / sent / failed from production receipts (5.1)', () => {
    const summary = summarizeReceipts([
      receipt({ userId: 'p1', pushResult: 'sent' }),
      receipt({ userId: 'p2', pushResult: 'sent' }),
      receipt({ userId: 'p3', pushResult: 'failed', failureReason: 'provider_error' }),
      receipt({ userId: 'p4', pushResult: 'skipped', failureReason: 'no_device_token' }),
      receipt({ userId: 'tester', isTest: true, pushResult: 'sent' }),
    ]);

    expect(summary.delivery).toMatchObject({
      targeted: 4,
      sent: 2,
      failed: 1,
      skipped: 1,
      opened: 0,
    });
  });

  it('does not invent an open rate until in-app open is recorded (5.2)', async () => {
    mockCampaignLean({
      _id: campaignId,
      internalName: 'Story Time',
      status: 'sent',
      lastError: null,
      createdBy: admin,
      updatedBy: admin,
      scheduledBy: null,
      sentBy: admin,
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-20T12:00:00.000Z'),
      sentAt: new Date('2026-08-20T12:00:00.000Z'),
    });
    NotificationReceipt.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        receipt({ userId: 'p1', pushResult: 'sent', readAt: null }),
        receipt({ userId: 'p2', pushResult: 'sent', readAt: null }),
      ]),
    });

    const beforeOpen = await getCampaignAnalytics(campaignId);
    expect(beforeOpen.delivery.sent).toBe(2);
    expect(beforeOpen.delivery.opened).toBe(0);

    NotificationReceipt.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        receipt({ userId: 'p1', pushResult: 'sent', readAt: new Date('2026-08-20T13:00:00.000Z') }),
        receipt({ userId: 'p2', pushResult: 'sent', readAt: null }),
      ]),
    });
    const afterOpen = await getCampaignAnalytics(campaignId);
    expect(afterOpen.delivery.opened).toBe(1);
  });

  it('returns audit actors and timestamps (5.3)', async () => {
    mockCampaignLean({
      _id: campaignId,
      internalName: 'Live reminder',
      status: 'sent',
      lastError: null,
      createdBy: admin,
      updatedBy: { _id: 'admin-2', name: 'Editor', email: 'editor@example.com' },
      scheduledBy: { _id: 'admin-3', name: 'Scheduler', email: 'sched@example.com' },
      sentBy: admin,
      createdAt: new Date('2026-08-19T09:00:00.000Z'),
      updatedAt: new Date('2026-08-20T12:00:00.000Z'),
      sentAt: new Date('2026-08-20T12:00:00.000Z'),
    });
    NotificationReceipt.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const result = await getCampaignAnalytics(campaignId);
    expect(result.audit).toMatchObject({
      createdBy: { _id: 'admin-1', name: 'Viviana', email: 'viviana@example.com' },
      updatedBy: { _id: 'admin-2', name: 'Editor' },
      scheduledBy: { _id: 'admin-3', name: 'Scheduler' },
      sentBy: { _id: 'admin-1', name: 'Viviana' },
    });
    expect(result.audit.createdAt).toBeTruthy();
    expect(result.audit.sentAt).toBeTruthy();
  });

  it('exposes known failure reasons (5.7)', () => {
    expect(normalizeFailureReason('DeviceNotRegistered')).toBe('invalid_token');
    expect(normalizeFailureReason('missing_localization')).toBe('missing_localization');
    expect(normalizeFailureReason('job_failed')).toBe('job_failed');
    expect(normalizeFailureReason('')).toBe('provider_error');

    const summary = summarizeReceipts([
      receipt({ userId: 'p1', pushResult: 'failed', failureReason: 'DeviceNotRegistered' }),
      receipt({ userId: 'p2', pushResult: 'failed', failureReason: 'provider_error' }),
      receipt({ userId: 'p3', pushResult: 'failed', failureReason: 'missing_localization' }),
      receipt({ userId: 'p4', pushResult: 'failed', failureReason: 'job_failed' }),
    ]);
    expect(summary.failureCounts).toEqual({
      invalid_token: 1,
      provider_error: 1,
      missing_localization: 1,
      job_failed: 1,
    });
  });

  it('increments campaign opened only for first-time production reads (5.2)', async () => {
    NotificationCampaign.updateOne.mockResolvedValue({ modifiedCount: 1 });
    await recordInboxOpens([
      { campaign: campaignId, isTest: false },
      { campaign: campaignId, isTest: false },
      { campaign: { _id: 'camp-2' }, isTest: false },
      { campaign: campaignId, isTest: true },
    ]);
    expect(NotificationCampaign.updateOne).toHaveBeenCalledTimes(2);
    expect(NotificationCampaign.updateOne).toHaveBeenCalledWith(
      { _id: campaignId },
      { $inc: { 'delivery.opened': 2 } }
    );
    expect(NotificationCampaign.updateOne).toHaveBeenCalledWith(
      { _id: 'camp-2' },
      { $inc: { 'delivery.opened': 1 } }
    );
  });

  it('blocks deleting an image used on a sent receipt (5.6)', async () => {
    Media.findById.mockResolvedValue({
      _id: 'media-sent',
      isActive: true,
      save: jest.fn(),
    });
    NotificationReceipt.exists.mockResolvedValue({ _id: 'rec-1' });

    await expect(deleteNotificationImage('media-sent')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Sent notification images cannot be deleted',
    });
  });

  it('allows deleting an unused draft image (5.6)', async () => {
    const media = { _id: 'media-draft', isActive: true, save: jest.fn().mockResolvedValue(true) };
    Media.findById.mockResolvedValue(media);
    NotificationReceipt.exists.mockResolvedValue(null);
    NotificationCampaign.exists.mockResolvedValue(null);

    await expect(deleteNotificationImage('media-draft')).resolves.toEqual({
      deleted: true,
      mediaId: 'media-draft',
    });
    expect(media.isActive).toBe(false);
    expect(media.save).toHaveBeenCalledTimes(1);
  });

  it('builds filterable dashboard mix, trend, and type totals without inventing opens', () => {
    const now = new Date('2026-08-27T12:00:00.000Z');
    const filters = parseDashboardFilters({ range: '7d', type: 'story_time' }, now);
    const result = buildDashboardAnalytics({
      filters,
      campaigns: [
        { _id: 'c1', type: 'story_time', audience: 'all', status: 'sent' },
        { _id: 'c2', type: 'live_lesson', audience: 'all', status: 'sent' },
      ],
      receipts: [
        {
          campaign: 'c1',
          isTest: false,
          pushResult: 'sent',
          createdAt: '2026-08-25T10:00:00.000Z',
          readAt: '2026-08-26T11:00:00.000Z',
        },
        {
          campaign: 'c1',
          isTest: false,
          pushResult: 'failed',
          failureReason: 'invalid_token',
          createdAt: '2026-08-25T10:00:00.000Z',
        },
        {
          campaign: 'c2',
          isTest: false,
          pushResult: 'sent',
          createdAt: '2026-08-25T10:00:00.000Z',
          readAt: '2026-08-26T11:00:00.000Z',
        },
        {
          campaign: 'c1',
          isTest: true,
          pushResult: 'sent',
          createdAt: '2026-08-25T10:00:00.000Z',
        },
      ],
    });

    expect(result.delivery).toMatchObject({ targeted: 2, sent: 1, failed: 1, opened: 1 });
    expect(result.openRate).toBe(0.5);
    expect(result.mix.find((item) => item.key === 'sent').value).toBe(1);
    expect(result.byType).toEqual([
      { type: 'story_time', targeted: 2, sent: 1, opened: 1, failed: 1 },
    ]);
    const daySent = result.trend.find((row) => row.date === '2026-08-25');
    const dayOpened = result.trend.find((row) => row.date === '2026-08-26');
    expect(daySent).toMatchObject({ sent: 1, failed: 1, opened: 0 });
    expect(dayOpened).toMatchObject({ sent: 0, opened: 1 });
  });

  it('loads dashboard analytics from production receipts in the selected window', async () => {
    const now = new Date('2026-08-27T12:00:00.000Z');
    NotificationReceipt.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          campaign: 'c1',
          isTest: false,
          pushResult: 'sent',
          createdAt: '2026-08-20T10:00:00.000Z',
          readAt: null,
        },
      ]),
    });
    NotificationCampaign.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ _id: 'c1', type: 'mini_mission', audience: 'parents', status: 'sent' }]),
    });

    const result = await getDashboardAnalytics({ range: '30d' }, now);
    expect(result.delivery.sent).toBe(1);
    expect(result.delivery.opened).toBe(0);
    expect(result.trend).toHaveLength(31);
    expect(NotificationReceipt.find).toHaveBeenCalledWith({
      isTest: { $ne: true },
      createdAt: { $gte: expect.any(Date), $lte: expect.any(Date) },
    });
  });
});
