const { NotificationCampaign, NotificationReceipt } = require('../models');
const { listCampaignRecipients } = require('./notificationAudience.services');
const { deliverPush } = require('./notificationPush.services');
const {
  pickLocalizationForRecipient,
  snapshotLocalization,
} = require('../utils/notificationLocalization.util');

const LOCALIZATION_POPULATE = {
  path: 'localizations.imageMediaId',
  select: 'type url mimeType width height size isActive',
};

const EDITABLE_STATUSES = ['draft', 'scheduled'];

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
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

async function writeReceipt({ campaign, recipient, localizationResult, isTest, pushResult }) {
  const snapshot = snapshotLocalization(localizationResult.localization);
  return NotificationReceipt.create({
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
    failureReason: pushResult.status === 'failed' ? pushResult.reason || 'provider_error' : null,
  });
}

async function deliverToRecipients({ campaign, recipients, isTest }) {
  const receipts = [];
  const failures = [];

  for (const recipient of recipients) {
    const picked = pickLocalizationForRecipient(campaign, recipient.preferredLanguage);
    if (!picked.localization) {
      failures.push({
        userId: recipient.userId,
        reason: 'missing_localization',
      });
      console.error(
        `[notifications] missing_localization campaign=${campaign._id} user=${recipient.userId} lang=${recipient.preferredLanguage}`
      );
      continue;
    }

    const snapshot = snapshotLocalization(picked.localization);
    let pushResult = { status: 'skipped', reason: 'push_provider_not_configured' };
    try {
      pushResult = await deliverPush({
        userId: recipient.userId,
        title: snapshot.title,
        message: snapshot.message,
        destination: campaign.destination,
        campaignId: campaign._id,
        isTest,
      });
    } catch (error) {
      pushResult = { status: 'failed', reason: error.message || 'provider_error' };
      console.error(`[notifications] push failed campaign=${campaign._id} user=${recipient.userId}:`, error.message);
    }

    const receipt = await writeReceipt({
      campaign,
      recipient,
      localizationResult: picked,
      isTest,
      pushResult,
    });
    receipts.push(receipt);
    if (pushResult.status === 'failed') {
      failures.push({ userId: recipient.userId, reason: pushResult.reason || 'provider_error' });
    }
  }

  return { receipts, failures };
}

function summarizeDelivery({ recipients, receipts, failures }) {
  return {
    targeted: recipients.length,
    sent: receipts.filter((row) => row.pushResult !== 'failed').length,
    failed: failures.length,
  };
}

async function sendCampaignNow(id, adminId) {
  const campaign = await loadCampaign(id);
  if (!EDITABLE_STATUSES.includes(campaign.status)) {
    throw httpError('Only draft or scheduled campaigns can be sent');
  }
  assertSendableContent(campaign);

  const claimed = await NotificationCampaign.findOneAndUpdate(
    { _id: id, status: { $in: EDITABLE_STATUSES } },
    {
      $set: {
        status: 'sending',
        sentBy: adminId || campaign.sentBy,
        updatedBy: adminId || campaign.updatedBy,
      },
    },
    { new: true }
  ).populate(LOCALIZATION_POPULATE);

  if (!claimed) {
    throw httpError('Campaign is already sending or no longer editable');
  }

  try {
    const recipients = await listCampaignRecipients(claimed.audience);
    const { receipts, failures } = await deliverToRecipients({
      campaign: claimed,
      recipients,
      isTest: false,
    });
    const delivery = summarizeDelivery({ recipients, receipts, failures });
    const missingAll = recipients.length > 0 && receipts.length === 0;
    const status = missingAll || (recipients.length === 0 && failures.length > 0) ? 'failed' : 'sent';
    const lastError = missingAll ? 'missing_localization' : failures[0]?.reason || null;

    claimed.status = status;
    claimed.sentAt = new Date();
    claimed.delivery = { ...claimed.delivery, ...delivery, opened: claimed.delivery?.opened || 0 };
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

async function sendCampaignTest(id, adminId, testUserId) {
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
  const recipients = await listCampaignRecipients(campaign.audience, { testUserId: designatedUserId });
  const { receipts, failures } = await deliverToRecipients({
    campaign,
    recipients,
    isTest: true,
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
    targeted: recipients.length,
  };
}

module.exports = {
  sendCampaignNow,
  sendCampaignTest,
  EDITABLE_STATUSES,
};
