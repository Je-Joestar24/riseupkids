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

module.exports = {
  summarizeReceipts,
  getCampaignAnalytics,
  recordInboxOpens,
  assertNotificationImageDeletable,
  deleteNotificationImage,
  normalizeFailureReason,
};
