const { NotificationCampaign, NotificationReceipt } = require('../models');
const { listCampaignRecipients } = require('./notificationAudience.services');
const { deliverPush } = require('./notificationPush.services');
const {
  pickLocalizationForRecipient,
  snapshotLocalization,
} = require('../utils/notificationLocalization.util');
const { resolveDeliveryDecision } = require('../utils/notificationTiming.util');

const LOCALIZATION_POPULATE = {
  path: 'localizations.imageMediaId',
  select: 'type url mimeType width height size isActive',
};

const EDITABLE_STATUSES = ['draft', 'scheduled'];
const TERMINAL_PUSH_RESULTS = new Set(['sent', 'failed', 'skipped', 'expired']);

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function isDuplicateKey(error) {
  return error?.code === 11000;
}

async function loadCampaign(id) {
  const campaign = await NotificationCampaign.findById(id).populate(LOCALIZATION_POPULATE);
  if (!campaign) {
    throw httpError('Notification campaign not found', 404);
  }
  return campaign;
}

function assertSendableContent(campaign) {
  if (!Array.isArray(campaign.localizations) || campaign.localizations.length === 0) {
    throw httpError('Add at least one language before sending');
  }
}

async function loadReceiptMap(campaignId, isTest) {
  const rows = await NotificationReceipt.find({
    campaign: campaignId,
    isTest: Boolean(isTest),
  }).lean();
  const map = new Map();
  rows.forEach((row) => map.set(String(row.userId), row));
  return map;
}

async function writeReceipt({ campaign, recipient, localizationResult, isTest, pushResult, deliverAt, timezone }) {
  const snapshot = snapshotLocalization(localizationResult.localization);
  const payload = {
    campaign: campaign._id,
    userId: recipient.userId,
    childId: recipient.childId || null,
    isTest: Boolean(isTest),
    languageCode: snapshot.languageCode,
    fallbackUsed: Boolean(localizationResult.fallbackUsed),
    title: snapshot.title,
    message: snapshot.message,
    imageMediaId: snapshot.imageMediaId,
    imageUrl: snapshot.imageUrl,
    destination: {
      kind: campaign.destination?.kind,
      contentId: campaign.destination?.contentId || null,
    },
    pushResult: pushResult.status,
    failureReason: pushResult.status === 'sent' ? null : pushResult.reason || null,
    deliverAt: deliverAt || null,
    timezone: timezone || recipient.timezone || null,
  };

  try {
    return await NotificationReceipt.create(payload);
  } catch (error) {
    if (isDuplicateKey(error) && !isTest) {
      return null;
    }
    throw error;
  }
}

async function sendPush({ campaign, recipient, snapshot, isTest }) {
  try {
    return await deliverPush({
      userId: recipient.userId,
      childId: recipient.childId || null,
      title: snapshot.title,
      message: snapshot.message,
      destination: campaign.destination,
      campaignId: campaign._id,
      isTest,
    });
  } catch (error) {
    console.error(`[notifications] push failed campaign=${campaign._id} user=${recipient.userId}:`, error.message);
    return { status: 'failed', reason: error.message || 'provider_error' };
  }
}

async function claimQueuedReceipt(receiptId, now) {
  return NotificationReceipt.findOneAndUpdate(
    { _id: receiptId, isTest: false, pushResult: 'queued', deliverAt: { $lte: now } },
    { $set: { pushResult: 'sending' } },
    { new: true }
  );
}

async function finalizeQueuedReceipt(receipt, pushResult) {
  receipt.pushResult = pushResult.status;
  receipt.failureReason = pushResult.status === 'sent' ? null : pushResult.reason || null;
  await receipt.save();
  return receipt;
}

async function deliverDueQueuedReceipt(receipt, campaign, now) {
  if (campaign.expiresAt && now.getTime() >= new Date(campaign.expiresAt).getTime()) {
    receipt.pushResult = 'expired';
    receipt.failureReason = 'expired';
    await receipt.save();
    return receipt;
  }

  const claimed = await claimQueuedReceipt(receipt._id, now);
  if (!claimed) return receipt;

  const snapshot = {
    title: claimed.title,
    message: claimed.message,
  };
  const pushResult = await sendPush({
    campaign,
    recipient: { userId: claimed.userId, childId: claimed.childId },
    snapshot,
    isTest: false,
  });
  return finalizeQueuedReceipt(claimed, pushResult);
}

async function processRecipient({ campaign, recipient, existing, isTest, trigger, now }) {
  const picked = pickLocalizationForRecipient(campaign, recipient.preferredLanguage);
  if (!picked.localization) {
    console.error(
      `[notifications] missing_localization campaign=${campaign._id} user=${recipient.userId} lang=${recipient.preferredLanguage}`
    );
    return {
      receipt: null,
      failure: { userId: recipient.userId, reason: 'missing_localization' },
      pending: false,
    };
  }

  if (existing && TERMINAL_PUSH_RESULTS.has(existing.pushResult)) {
    return { receipt: existing, failure: null, pending: false };
  }

  if (existing?.pushResult === 'sending') {
    return { receipt: existing, failure: null, pending: true };
  }

  if (existing?.pushResult === 'queued') {
    if (existing.deliverAt && new Date(existing.deliverAt).getTime() > now.getTime()) {
      return { receipt: existing, failure: null, pending: true };
    }
    const campaignDoc = campaign;
    const updated = isTest
      ? existing
      : await deliverDueQueuedReceipt(existing, campaignDoc, now);
    const failed = updated?.pushResult === 'failed';
    return {
      receipt: updated,
      failure: failed ? { userId: recipient.userId, reason: updated.failureReason || 'provider_error' } : null,
      pending: updated?.pushResult === 'queued' || updated?.pushResult === 'sending',
    };
  }

  const decision = resolveDeliveryDecision({
    campaign,
    timezone: recipient.timezone,
    now,
    trigger,
  });

  if (decision.action === 'wait') {
    return { receipt: null, failure: null, pending: true };
  }

  if (decision.action === 'defer') {
    const receipt = await writeReceipt({
      campaign,
      recipient,
      localizationResult: picked,
      isTest,
      pushResult: { status: 'queued', reason: decision.reason },
      deliverAt: decision.sendAt,
      timezone: decision.timezone,
    });
    return { receipt, failure: null, pending: true };
  }

  if (decision.action === 'expire') {
    const receipt = await writeReceipt({
      campaign,
      recipient,
      localizationResult: picked,
      isTest,
      pushResult: { status: 'expired', reason: decision.reason },
      timezone: decision.timezone,
    });
    return { receipt, failure: null, pending: false };
  }

  const snapshot = snapshotLocalization(picked.localization);
  const claimed = await writeReceipt({
    campaign,
    recipient,
    localizationResult: picked,
    isTest,
    pushResult: { status: 'queued', reason: 'sending' },
    timezone: decision.timezone,
  });
  if (!claimed && !isTest) {
    return { receipt: null, failure: null, pending: false };
  }
  const pushResult = await sendPush({ campaign, recipient, snapshot, isTest });
  if (claimed?.save) {
    const updated = await finalizeQueuedReceipt(claimed, pushResult);
    const failed = pushResult.status === 'failed';
    return {
      receipt: updated,
      failure: failed ? { userId: recipient.userId, reason: pushResult.reason || 'provider_error' } : null,
      pending: false,
    };
  }
  const receipt = claimed;
  const failed = pushResult.status === 'failed';
  return {
    receipt,
    failure: failed ? { userId: recipient.userId, reason: pushResult.reason || 'provider_error' } : null,
    pending: false,
  };
}

async function deliverToRecipients({ campaign, recipients, isTest, trigger, now }) {
  const receipts = [];
  const failures = [];
  let pending = false;
  const existingMap = await loadReceiptMap(campaign._id, isTest);

  for (const recipient of recipients) {
    const existing = existingMap.get(String(recipient.userId));
    const result = await processRecipient({
      campaign,
      recipient,
      existing,
      isTest,
      trigger,
      now,
    });
    if (result.receipt) receipts.push(result.receipt);
    if (result.failure) failures.push(result.failure);
    if (result.pending) pending = true;
  }

  return { receipts, failures, pending };
}

function summarizeDelivery({ recipients, receipts, failures }) {
  const skipped = receipts.filter((row) => row.pushResult === 'skipped').length;
  const expired = receipts.filter((row) => row.pushResult === 'expired').length;
  const queued = receipts.filter((row) => row.pushResult === 'queued' || row.pushResult === 'sending').length;
  return {
    targeted: recipients.length,
    sent: receipts.filter((row) => row.pushResult === 'sent').length,
    failed: failures.length,
    skipped,
    expired,
    queued,
  };
}

function finalizeCampaignStatus({ recipients, receipts, failures, pending, delivery }) {
  if (pending) {
    return { status: 'sending', lastError: null };
  }
  const missingAll = recipients.length > 0 && receipts.length === 0;
  const skippedAll = receipts.length > 0 && delivery.sent === 0 && delivery.failed === 0;
  const status = missingAll || skippedAll || (recipients.length === 0 && failures.length > 0) ? 'failed' : 'sent';
  const lastError = missingAll
    ? 'missing_localization'
    : skippedAll
      ? receipts[0]?.failureReason || receipts[0]?.pushResult || 'no_device_token'
      : failures[0]?.reason || null;
  return { status, lastError };
}

async function processCampaignDelivery(id, adminId, { now = new Date(), trigger = 'send_now' } = {}) {
  const campaign = await loadCampaign(id);
  assertSendableContent(campaign);

  let claimed = campaign;
  if (campaign.status === 'scheduled' || campaign.status === 'draft') {
    claimed = await NotificationCampaign.findOneAndUpdate(
      { _id: id, status: { $in: EDITABLE_STATUSES } },
      {
        $set: {
          status: 'sending',
          sentBy: adminId || campaign.sentBy,
          updatedBy: adminId || campaign.updatedBy,
          sendAt: campaign.sendAt || now,
        },
      },
      { new: true }
    ).populate(LOCALIZATION_POPULATE);

    if (!claimed) {
      throw httpError('Campaign is already sending or no longer editable');
    }
  } else if (campaign.status !== 'sending') {
    throw httpError('Only draft, scheduled, or sending campaigns can be sent');
  }

  try {
    const recipients = await listCampaignRecipients(claimed.audience);
    const { receipts, failures, pending } = await deliverToRecipients({
      campaign: claimed,
      recipients,
      isTest: false,
      trigger,
      now,
    });
    const delivery = summarizeDelivery({ recipients, receipts, failures });
    const { status, lastError } = finalizeCampaignStatus({
      recipients,
      receipts,
      failures,
      pending,
      delivery,
    });

    claimed.status = status;
    if (status !== 'sending') {
      claimed.sentAt = new Date();
    }
    claimed.delivery = {
      ...claimed.delivery,
      ...delivery,
      opened: claimed.delivery?.opened || 0,
    };
    claimed.lastError = lastError;
    await claimed.save();
    return claimed;
  } catch (error) {
    claimed.status = 'failed';
    claimed.lastError = error.message || 'job_failed';
    await claimed.save();
    console.error(`[notifications] send failed campaign=${id}:`, error.message);
    throw error;
  }
}

async function sendCampaignNow(id, adminId, options = {}) {
  const campaign = await loadCampaign(id);
  if (!EDITABLE_STATUSES.includes(campaign.status) && campaign.status !== 'sending') {
    throw httpError('Only draft or scheduled campaigns can be sent');
  }
  return processCampaignDelivery(id, adminId, {
    now: options.now || new Date(),
    trigger: 'send_now',
  });
}

async function sendScheduledCampaign(id, adminId, options = {}) {
  return processCampaignDelivery(id, adminId, {
    now: options.now || new Date(),
    trigger: 'scheduled',
  });
}

async function processDueQueuedReceipts(now = new Date()) {
  const due = await NotificationReceipt.find({
    isTest: false,
    pushResult: 'queued',
    deliverAt: { $lte: now },
  }).limit(200);

  const results = [];
  const campaignIds = new Set();

  for (const receipt of due) {
    const campaign = await loadCampaign(receipt.campaign);
    if (!campaign || campaign.status === 'cancelled') continue;
    const updated = await deliverDueQueuedReceipt(receipt, campaign, now);
    results.push({ receiptId: String(updated._id), status: updated.pushResult });
    if (campaign.status === 'sending' || campaign.status === 'scheduled') {
      campaignIds.add(String(campaign._id));
    }
  }

  for (const campaignId of campaignIds) {
    const campaign = await loadCampaign(campaignId);
    await processCampaignDelivery(campaign._id, campaign.sentBy || campaign.scheduledBy, {
      now,
      trigger: 'scheduled',
    });
  }

  return results;
}

async function sendCampaignTest(id, adminId, testUserId, options = {}) {
  const campaign = await loadCampaign(id);
  if (!EDITABLE_STATUSES.includes(campaign.status) && campaign.status !== 'sending') {
    throw httpError('Tests can only be sent for draft or scheduled campaigns');
  }
  assertSendableContent(campaign);

  const designatedUserId = testUserId || process.env.NOTIFICATION_TEST_USER_ID || adminId;
  if (!designatedUserId) {
    throw httpError('A test user is required');
  }

  const originalStatus = campaign.status;
  const now = options.now || new Date();
  const recipients = await listCampaignRecipients(campaign.audience, { testUserId: designatedUserId });
  const { receipts, failures, pending } = await deliverToRecipients({
    campaign,
    recipients,
    isTest: true,
    trigger: 'test',
    now,
  });

  const reloaded = await loadCampaign(id);
  if (reloaded.status !== originalStatus) {
    reloaded.status = originalStatus;
    await reloaded.save();
  }

  return {
    campaign: reloaded,
    receipts,
    failures,
    pending,
    targeted: recipients.length,
  };
}

module.exports = {
  sendCampaignNow,
  sendScheduledCampaign,
  sendCampaignTest,
  processDueQueuedReceipts,
  processCampaignDelivery,
  EDITABLE_STATUSES,
};
