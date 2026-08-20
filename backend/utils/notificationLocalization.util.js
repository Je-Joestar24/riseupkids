const { normalizeLanguageCode } = require('../config/notificationCatalog');

function listLocalizations(campaign) {
  return Array.isArray(campaign?.localizations) ? campaign.localizations : [];
}

function findLocalization(campaign, languageCode) {
  const code = normalizeLanguageCode(languageCode);
  return listLocalizations(campaign).find((entry) => entry.languageCode === code) || null;
}

/**
 * Prefer the user's language, then English fallback, then nothing.
 * English fallback is automatic when the preferred language is missing.
 */
function pickLocalizationForRecipient(campaign, preferredLanguage) {
  const preferred = normalizeLanguageCode(preferredLanguage) || campaign?.fallbackLanguage || 'en';
  const fallback = normalizeLanguageCode(campaign?.fallbackLanguage) || 'en';
  const exact = findLocalization(campaign, preferred);
  if (exact) {
    return { localization: exact, usedLanguage: exact.languageCode, fallbackUsed: false, reason: null };
  }
  const english = findLocalization(campaign, fallback);
  if (english) {
    return { localization: english, usedLanguage: english.languageCode, fallbackUsed: true, reason: null };
  }
  return {
    localization: null,
    usedLanguage: preferred,
    fallbackUsed: false,
    reason: 'missing_localization',
  };
}

function snapshotLocalization(localization) {
  if (!localization) return null;
  const image =
    localization.imageMediaId && typeof localization.imageMediaId === 'object'
      ? localization.imageMediaId
      : null;
  return {
    languageCode: localization.languageCode,
    title: localization.title,
    message: localization.message,
    imageMediaId: image?._id || localization.imageMediaId || null,
    imageUrl: image?.url || null,
    imageWidth: image?.width || null,
    imageHeight: image?.height || null,
  };
}

module.exports = {
  findLocalization,
  pickLocalizationForRecipient,
  snapshotLocalization,
};
