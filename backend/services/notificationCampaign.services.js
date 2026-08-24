const { NotificationCampaign, Media } = require('../models');
const s3Service = require('./s3.service');
const {
  getNotificationAdminMeta,
  getNotificationLanguageCatalog,
  isCatalogLanguage,
  normalizeLanguageCode,
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_DESTINATION_KINDS,
  NOTIFICATION_STATUSES,
} = require('../config/notificationCatalog');
const { wallTimeToUtc, assertTimeZone } = require('../utils/notificationTimezone.util');
const {
  normalizeTimingMode,
  normalizeQuietHourBehavior,
  earliestWorldwideSendAt,
  parseExpiresAt,
} = require('../utils/notificationTiming.util');
const {
  assertNotificationImageMime,
  readImageDimensions,
} = require('../utils/notificationImage.util.js');

const LOCALIZATION_POPULATE = {
  path: 'localizations.imageMediaId',
  select: 'type url mimeType width height size isActive',
};

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function asTrimmedString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function parsePage(query) {
  const page = Number.parseInt(query?.page, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function parseLimit(query) {
  const limit = Number.parseInt(query?.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) return 10;
  return Math.min(limit, 100);
}

function assertAudience(audience) {
  const value = asTrimmedString(audience);
  const allowed = NOTIFICATION_AUDIENCES.map((item) => item.value);
  if (!allowed.includes(value)) {
    throw httpError('Audience must be all, parents, or children');
  }
  return value;
}

function normalizeDestination(destination = {}) {
  const kind = asTrimmedString(destination.kind);
  if (!kind) {
    throw httpError('Destination kind is required');
  }
  const known = NOTIFICATION_DESTINATION_KINDS.find((item) => item.value === kind);
  const contentId = asTrimmedString(destination.contentId) || null;
  if (known?.needsContentId && !contentId) {
    throw httpError(`Destination ${kind} requires a content id`);
  }
  return { kind, contentId };
}

function normalizeLocalization(entry = {}) {
  const languageCode = normalizeLanguageCode(entry.languageCode);
  if (!languageCode) {
    throw httpError('Localization language code is required');
  }
  if (!isCatalogLanguage(languageCode)) {
    throw httpError(`Language "${languageCode}" is not in the platform catalog`);
  }
  const title = asTrimmedString(entry.title);
  const message = asTrimmedString(entry.message);
  if (!title) {
    throw httpError(`Push title is required for ${languageCode}`);
  }
  if (!message) {
    throw httpError(`Push message is required for ${languageCode}`);
  }
  const imageMediaId = entry.imageMediaId || entry.imageMedia || null;
  return {
    languageCode,
    title,
    message,
    imageMediaId: imageMediaId || null,
  };
}

function normalizeLocalizations(localizations) {
  if (localizations == null) return [];
  if (!Array.isArray(localizations)) {
    throw httpError('Localizations must be an array');
  }
  const seen = new Set();
  return localizations.map((entry) => {
    const normalized = normalizeLocalization(entry);
    if (seen.has(normalized.languageCode)) {
      throw httpError(`Duplicate localization for language ${normalized.languageCode}`);
    }
    seen.add(normalized.languageCode);
    return normalized;
  });
}

const EDITABLE_STATUSES = ['draft', 'scheduled'];

function assertEditable(campaign) {
  if (!EDITABLE_STATUSES.includes(campaign.status)) {
    throw httpError('Sent or cancelled campaigns cannot be edited');
  }
}

async function populateCampaign(doc) {
  if (!doc) return null;
  if (typeof doc.populate === 'function') {
    return doc.populate([LOCALIZATION_POPULATE, { path: 'createdBy', select: 'name email' }]);
  }
  return NotificationCampaign.findById(doc._id)
    .populate(LOCALIZATION_POPULATE)
    .populate({ path: 'createdBy', select: 'name email' });
}

async function createCampaign(payload, adminId) {
  const internalName = asTrimmedString(payload.internalName);
  const type = asTrimmedString(payload.type);
  if (!internalName) throw httpError('Internal name is required');
  if (!type) throw httpError('Notification type is required');

  const campaign = await NotificationCampaign.create({
    internalName,
    type,
    audience: assertAudience(payload.audience),
    destination: normalizeDestination(payload.destination),
    fallbackLanguage: normalizeLanguageCode(payload.fallbackLanguage) || 'en',
    localizations: normalizeLocalizations(payload.localizations),
    status: 'draft',
    timingMode: normalizeTimingMode(payload.timingMode),
    quietHourBehavior: normalizeQuietHourBehavior(payload.quietHourBehavior),
    createdBy: adminId,
    updatedBy: adminId,
  });

  return populateCampaign(campaign);
}

async function listCampaigns(query = {}) {
  const page = parsePage(query);
  const limit = parseLimit(query);
  const filter = {};

  const status = asTrimmedString(query.status);
  if (status) {
    if (!NOTIFICATION_STATUSES.includes(status)) {
      throw httpError('Invalid campaign status');
    }
    filter.status = status;
  }

  const type = asTrimmedString(query.type);
  if (type) filter.type = type;

  const search = asTrimmedString(query.search);
  if (search) {
    filter.internalName = { $regex: search, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    NotificationCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(LOCALIZATION_POPULATE)
      .populate({ path: 'createdBy', select: 'name email' })
      .lean(),
    NotificationCampaign.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}

async function getCampaignById(id) {
  const campaign = await NotificationCampaign.findById(id)
    .populate(LOCALIZATION_POPULATE)
    .populate({ path: 'createdBy', select: 'name email' });
  if (!campaign) {
    throw httpError('Notification campaign not found', 404);
  }
  return campaign;
}

async function updateCampaign(id, payload, adminId) {
  const campaign = await NotificationCampaign.findById(id);
  if (!campaign) {
    throw httpError('Notification campaign not found', 404);
  }
  assertEditable(campaign);

  if (payload.internalName !== undefined) {
    const internalName = asTrimmedString(payload.internalName);
    if (!internalName) throw httpError('Internal name is required');
    campaign.internalName = internalName;
  }
  if (payload.type !== undefined) {
    const type = asTrimmedString(payload.type);
    if (!type) throw httpError('Notification type is required');
    campaign.type = type;
  }
  if (payload.audience !== undefined) {
    campaign.audience = assertAudience(payload.audience);
  }
  if (payload.destination !== undefined) {
    campaign.destination = normalizeDestination(payload.destination);
  }
  if (payload.fallbackLanguage !== undefined) {
    campaign.fallbackLanguage = normalizeLanguageCode(payload.fallbackLanguage) || 'en';
  }
  if (payload.localizations !== undefined) {
    campaign.localizations = normalizeLocalizations(payload.localizations);
  }
  if (payload.timingMode !== undefined) {
    campaign.timingMode = normalizeTimingMode(payload.timingMode);
  }
  if (payload.quietHourBehavior !== undefined) {
    campaign.quietHourBehavior = normalizeQuietHourBehavior(payload.quietHourBehavior);
  }
  campaign.updatedBy = adminId;
  await campaign.save();
  return populateCampaign(campaign);
}

function applyScheduleFields(campaign, payload, adminId) {
  const zone = assertTimeZone(payload.timezone);
  const timingMode = normalizeTimingMode(payload.timingMode ?? campaign.timingMode);
  const quietHourBehavior = normalizeQuietHourBehavior(
    payload.quietHourBehavior ?? campaign.quietHourBehavior
  );
  const sendAt =
    timingMode === 'recipient_local'
      ? earliestWorldwideSendAt({ sendDate: payload.sendDate, sendTime: payload.sendTime })
      : wallTimeToUtc({ sendDate: payload.sendDate, sendTime: payload.sendTime, timezone: zone });

  campaign.sendAt = sendAt;
  campaign.timezone = zone;
  campaign.sendLocalDate = String(payload.sendDate).trim();
  campaign.sendLocalTime = String(payload.sendTime).trim();
  campaign.timingMode = timingMode;
  campaign.quietHourBehavior = quietHourBehavior;
  campaign.expiresAt = parseExpiresAt(payload, zone);
  campaign.expiresLocalDate = campaign.expiresAt ? String(payload.expiresDate || '').trim() || null : null;
  campaign.expiresLocalTime = campaign.expiresAt ? String(payload.expiresTime || '').trim() || null : null;
  campaign.status = 'scheduled';
  campaign.scheduledBy = adminId;
  campaign.updatedBy = adminId;
  campaign.lastError = null;
}

async function scheduleCampaign(id, payload, adminId) {
  const campaign = await NotificationCampaign.findById(id);
  if (!campaign) {
    throw httpError('Notification campaign not found', 404);
  }
  assertEditable(campaign);
  if (!campaign.localizations?.length) {
    throw httpError('Add at least one language before scheduling');
  }
  applyScheduleFields(campaign, payload, adminId);
  await campaign.save();
  return populateCampaign(campaign);
}

async function cancelCampaign(id, adminId) {
  const campaign = await NotificationCampaign.findById(id);
  if (!campaign) {
    throw httpError('Notification campaign not found', 404);
  }
  if (campaign.status !== 'scheduled') {
    throw httpError('Only scheduled campaigns can be cancelled');
  }
  campaign.status = 'cancelled';
  campaign.updatedBy = adminId;
  await campaign.save();
  return populateCampaign(campaign);
}

async function duplicateCampaign(id, adminId) {
  const original = await NotificationCampaign.findById(id).lean();
  if (!original) {
    throw httpError('Notification campaign not found', 404);
  }

  const copy = await NotificationCampaign.create({
    internalName: `${original.internalName} (copy)`,
    type: original.type,
    audience: original.audience,
    destination: original.destination,
    fallbackLanguage: original.fallbackLanguage || 'en',
    localizations: (original.localizations || []).map((entry) => ({
      languageCode: entry.languageCode,
      title: entry.title,
      message: entry.message,
      imageMediaId: entry.imageMediaId || null,
    })),
    status: 'draft',
    sendAt: null,
    timezone: null,
    timingMode: original.timingMode || 'same_moment',
    quietHourBehavior: original.quietHourBehavior || 'defer',
    expiresAt: null,
    createdBy: adminId,
    updatedBy: adminId,
  });

  return populateCampaign(copy);
}

function pickLocalization(campaign, languageCode) {
  const requested = normalizeLanguageCode(languageCode) || campaign.fallbackLanguage || 'en';
  const localizations = campaign.localizations || [];
  return (
    localizations.find((entry) => entry.languageCode === requested) ||
    localizations.find((entry) => entry.languageCode === (campaign.fallbackLanguage || 'en')) ||
    localizations[0] ||
    null
  );
}

async function previewCampaign(id, languageCode) {
  const campaign = await getCampaignById(id);
  const localization = pickLocalization(campaign, languageCode);
  if (!localization) {
    throw httpError('No localization available to preview', 400);
  }

  const image = localization.imageMediaId && typeof localization.imageMediaId === 'object'
    ? localization.imageMediaId
    : null;

  return {
    campaignId: campaign._id,
    internalName: campaign.internalName,
    language: localization.languageCode,
    title: localization.title,
    message: localization.message,
    image: image
      ? {
          _id: image._id,
          url: image.url,
          width: image.width,
          height: image.height,
          mimeType: image.mimeType,
        }
      : null,
    destination: campaign.destination,
    audience: campaign.audience,
    type: campaign.type,
  };
}

async function uploadNotificationImage(file, adminId) {
  if (!file) {
    throw httpError('Notification image file is required');
  }
  const mimeType = assertNotificationImageMime(file.mimetype);
  const dimensions = readImageDimensions(file.buffer, mimeType);
  const { url, s3Key } = await s3Service.uploadFileFromMulter(file, 'media/images/notifications');

  return Media.create({
    type: 'image',
    title: file.originalname || 'notification-image',
    filePath: s3Key,
    url,
    mimeType,
    size: file.size || file.buffer?.length || 0,
    width: dimensions.width,
    height: dimensions.height,
    uploadedBy: adminId,
    isPublished: true,
    tags: ['notification'],
  });
}

function getAdminMeta() {
  return {
    ...getNotificationAdminMeta(),
    languages: getNotificationLanguageCatalog(),
  };
}

module.exports = {
  getAdminMeta,
  createCampaign,
  listCampaigns,
  getCampaignById,
  updateCampaign,
  duplicateCampaign,
  scheduleCampaign,
  cancelCampaign,
  previewCampaign,
  uploadNotificationImage,
  EDITABLE_STATUSES,
};
