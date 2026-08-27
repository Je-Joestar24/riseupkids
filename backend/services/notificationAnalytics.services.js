const { NotificationCampaign, NotificationReceipt, Media } = require('../models');

const SENT_STATUSES = ['sent', 'sending', 'failed'];

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function asId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

function asAuditUser(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    return {
      _id: asId(value._id || value),
      name: value.name || null,
      email: value.email || null,
    };
  }
  return { _id: String(value), name: null, email: null };
}

function normalizeFailureReason(reason) {
  const value = String(reason || '').trim();
  if (!value) return 'provider_error';
  if (/invalid_token|DeviceNotRegistered/i.test(value)) return 'invalid_token';
  if (/missing_localization/i.test(value)) return 'missing_localization';
  if (/job_failed/i.test(value)) return 'job_failed';
  if (/no_device_token/i.test(value)) return 'no_device_token';
  if (/provider_error/i.test(value)) return 'provider_error';
  return value;
}

function emptyDelivery() {
  return { targeted: 0, sent: 0, failed: 0, skipped: 0, expired: 0, opened: 0 };
}

function summarizeReceipts(rows = []) {
  const production = rows.filter((row) => !row.isTest);
  const delivery = emptyDelivery();
  delivery.targeted = production.length;
  const failures = [];

  production.forEach((row) => {
    if (row.pushResult === 'sent') delivery.sent += 1;
    else if (row.pushResult === 'failed') delivery.failed += 1;
    else if (row.pushResult === 'skipped') delivery.skipped += 1;
    else if (row.pushResult === 'expired') delivery.expired += 1;
    if (row.readAt) delivery.opened += 1;
    if (row.pushResult === 'failed' || row.pushResult === 'skipped') {
      failures.push({
        userId: asId(row.userId),
        reason: normalizeFailureReason(row.failureReason || row.pushResult),
      });
    }
  });

  const failureCounts = {};
  failures.forEach((row) => {
    failureCounts[row.reason] = (failureCounts[row.reason] || 0) + 1;
  });

  return {
    delivery,
    failures,
    failureCounts,
  };
}

async function loadProductionReceipts(campaignId) {
  return NotificationReceipt.find({ campaign: campaignId, isTest: { $ne: true } }).lean();
}

async function getCampaignAnalytics(campaignId) {
  const campaign = await NotificationCampaign.findById(campaignId)
    .populate({ path: 'createdBy', select: 'name email' })
    .populate({ path: 'updatedBy', select: 'name email' })
    .populate({ path: 'scheduledBy', select: 'name email' })
    .populate({ path: 'sentBy', select: 'name email' })
    .lean();
  if (!campaign) {
    throw httpError('Notification campaign not found', 404);
  }

  const receipts = await loadProductionReceipts(campaignId);
  const { delivery, failures, failureCounts } = summarizeReceipts(receipts);

  return {
    campaignId: asId(campaign._id),
    internalName: campaign.internalName,
    status: campaign.status,
    lastError: campaign.lastError || null,
    delivery,
    failures,
    failureCounts,
    audit: {
      createdBy: asAuditUser(campaign.createdBy),
      updatedBy: asAuditUser(campaign.updatedBy),
      scheduledBy: asAuditUser(campaign.scheduledBy),
      sentBy: asAuditUser(campaign.sentBy),
      createdAt: campaign.createdAt || null,
      updatedAt: campaign.updatedAt || null,
      sentAt: campaign.sentAt || null,
    },
  };
}

async function recordInboxOpens(receipts = []) {
  const counts = new Map();
  receipts.forEach((row) => {
    if (!row?.campaign || row.isTest) return;
    const key = asId(row.campaign);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  await Promise.all(
    [...counts.entries()].map(([campaignId, opened]) =>
      NotificationCampaign.updateOne({ _id: campaignId }, { $inc: { 'delivery.opened': opened } })
    )
  );
}

async function assertNotificationImageDeletable(mediaId) {
  if (!mediaId) throw httpError('Notification image is required');
  const media = await Media.findById(mediaId);
  if (!media) throw httpError('Notification image not found', 404);

  const usedOnReceipt = await NotificationReceipt.exists({
    imageMediaId: mediaId,
    isTest: { $ne: true },
  });
  if (usedOnReceipt) {
    throw httpError('Sent notification images cannot be deleted', 409);
  }

  const usedOnSentCampaign = await NotificationCampaign.exists({
    status: { $in: SENT_STATUSES },
    'localizations.imageMediaId': mediaId,
  });
  if (usedOnSentCampaign) {
    throw httpError('Sent notification images cannot be deleted', 409);
  }

  return media;
}

async function deleteNotificationImage(mediaId) {
  const media = await assertNotificationImageDeletable(mediaId);
  media.isActive = false;
  await media.save();
  return { deleted: true, mediaId: asId(media._id) };
}

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function parseDashboardFilters(query = {}, now = new Date()) {
  const range = RANGE_DAYS[query.range] ? query.range : '30d';
  const to = query.to ? new Date(query.to) : new Date(now);
  if (Number.isNaN(to.getTime())) throw httpError('Invalid to date');
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime())) throw httpError('Invalid from date');
  if (from.getTime() > to.getTime()) throw httpError('from must be before to');
  return {
    range,
    from,
    to,
    type: String(query.type || '').trim() || '',
    status: String(query.status || '').trim() || '',
    audience: String(query.audience || '').trim() || '',
  };
}

function utcDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function eachUtcDay(from, to) {
  const days = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function buildDashboardAnalytics({ receipts = [], campaigns = [], filters }) {
  const campaignMap = new Map(campaigns.map((row) => [asId(row._id), row]));
  const filtered = receipts.filter((row) => {
    if (row.isTest) return false;
    const campaign = campaignMap.get(asId(row.campaign));
    if (!campaign) return false;
    if (filters.type && campaign.type !== filters.type) return false;
    if (filters.status && campaign.status !== filters.status) return false;
    if (filters.audience && campaign.audience !== filters.audience) return false;
    return true;
  });

  const { delivery, failureCounts } = summarizeReceipts(filtered);
  const mix = [
    { key: 'sent', label: 'Sent', value: delivery.sent },
    { key: 'failed', label: 'Failed', value: delivery.failed },
    { key: 'skipped', label: 'Skipped', value: delivery.skipped },
    { key: 'expired', label: 'Expired', value: delivery.expired },
  ];

  const days = eachUtcDay(filters.from, filters.to);
  const trendMap = Object.fromEntries(days.map((date) => [date, { date, sent: 0, opened: 0, failed: 0 }]));
  filtered.forEach((row) => {
    const sentDay = utcDateKey(row.createdAt);
    if (sentDay && trendMap[sentDay]) {
      if (row.pushResult === 'sent') trendMap[sentDay].sent += 1;
      if (row.pushResult === 'failed') trendMap[sentDay].failed += 1;
    }
    if (row.readAt) {
      const openDay = utcDateKey(row.readAt);
      if (openDay && trendMap[openDay]) trendMap[openDay].opened += 1;
    }
  });

  const byTypeMap = {};
  filtered.forEach((row) => {
    const type = campaignMap.get(asId(row.campaign))?.type || 'unknown';
    if (!byTypeMap[type]) {
      byTypeMap[type] = { type, targeted: 0, sent: 0, opened: 0, failed: 0 };
    }
    byTypeMap[type].targeted += 1;
    if (row.pushResult === 'sent') byTypeMap[type].sent += 1;
    if (row.pushResult === 'failed') byTypeMap[type].failed += 1;
    if (row.readAt) byTypeMap[type].opened += 1;
  });

  return {
    filters: {
      range: filters.range,
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
      type: filters.type || null,
      status: filters.status || null,
      audience: filters.audience || null,
    },
    delivery,
    openRate: delivery.targeted ? Number((delivery.opened / delivery.targeted).toFixed(4)) : 0,
    mix,
    trend: days.map((date) => trendMap[date]),
    byType: Object.values(byTypeMap).sort((a, b) => b.targeted - a.targeted),
    failureCounts,
  };
}

async function getDashboardAnalytics(query = {}, now = new Date()) {
  const filters = parseDashboardFilters(query, now);
  const receipts = await NotificationReceipt.find({
    isTest: { $ne: true },
    createdAt: { $gte: filters.from, $lte: filters.to },
  })
    .select('campaign pushResult failureReason readAt createdAt isTest')
    .lean();

  const campaignIds = [...new Set((receipts || []).map((row) => asId(row.campaign)).filter(Boolean))];
  const campaignQuery = { _id: { $in: campaignIds } };
  if (filters.type) campaignQuery.type = filters.type;
  if (filters.status) campaignQuery.status = filters.status;
  if (filters.audience) campaignQuery.audience = filters.audience;

  const campaigns = campaignIds.length
    ? await NotificationCampaign.find(campaignQuery).select('_id type audience status').lean()
    : [];

  return buildDashboardAnalytics({ receipts: receipts || [], campaigns: campaigns || [], filters });
}

module.exports = {
  summarizeReceipts,
  getCampaignAnalytics,
  getDashboardAnalytics,
  buildDashboardAnalytics,
  parseDashboardFilters,
  recordInboxOpens,
  assertNotificationImageDeletable,
  deleteNotificationImage,
  normalizeFailureReason,
};
