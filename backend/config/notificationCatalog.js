/**
 * Notification platform catalog.
 * Language tabs come from here — not a hard-coded EN/PT/ES schema enum.
 * Tests (and a future language admin) can register extra codes without a schema change.
 */

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
];

const extraLanguages = [];

const NOTIFICATION_TYPES = [
  { value: 'learning_engagement', label: 'Learning / Engagement' },
  { value: 'live_lesson', label: 'Live Lesson' },
  { value: 'story_time', label: 'Story Time' },
  { value: 'new_content', label: 'New Content' },
  { value: 'new_book', label: 'New Book' },
  { value: 'mini_mission', label: 'Mini Mission' },
  { value: 'reward', label: 'Reward' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'streak', label: 'Streak' },
  { value: 'parent_progress', label: 'Parent Progress' },
  { value: 'general_announcement', label: 'General Announcement' },
];

const NOTIFICATION_AUDIENCES = [
  { value: 'all', label: 'All Users' },
  { value: 'parents', label: 'Parents' },
  { value: 'children', label: 'Children' },
];

const NOTIFICATION_DESTINATION_KINDS = [
  { value: 'home', label: 'Home', needsContentId: false },
  { value: 'journey', label: 'Journey', needsContentId: false },
  { value: 'explore', label: 'Explore', needsContentId: false },
  { value: 'story_time', label: 'Story Time', needsContentId: false },
  { value: 'live_lesson', label: 'Live Lesson', needsContentId: true },
  { value: 'book', label: 'Specific Book', needsContentId: true },
  { value: 'mini_mission', label: 'Mini Mission', needsContentId: true },
  { value: 'rewards', label: 'Rewards', needsContentId: false },
  { value: 'wall', label: 'Wall', needsContentId: false },
  { value: 'parent_progress', label: 'Parent Progress', needsContentId: false },
  { value: 'announcement', label: 'General Announcement Page', needsContentId: false },
];

const NOTIFICATION_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'];

function normalizeLanguageCode(code) {
  return String(code || '')
    .trim()
    .toLowerCase();
}

function getNotificationLanguageCatalog() {
  const seen = new Set();
  const merged = [];
  [...DEFAULT_LANGUAGES, ...extraLanguages].forEach((entry) => {
    const code = normalizeLanguageCode(entry.code);
    if (!code || seen.has(code)) return;
    seen.add(code);
    merged.push({
      code,
      name: String(entry.name || code).trim() || code,
    });
  });
  return merged;
}

function isCatalogLanguage(code) {
  const normalized = normalizeLanguageCode(code);
  return getNotificationLanguageCatalog().some((lang) => lang.code === normalized);
}

function registerNotificationLanguage({ code, name } = {}) {
  const normalized = normalizeLanguageCode(code);
  if (!normalized) {
    throw new Error('Language code is required');
  }
  const existing = extraLanguages.find((lang) => lang.code === normalized);
  if (existing) {
    existing.name = name || existing.name;
    return { ...existing };
  }
  extraLanguages.push({ code: normalized, name: name || normalized });
  return { code: normalized, name: name || normalized };
}

function resetNotificationLanguageCatalog() {
  extraLanguages.length = 0;
}

function getNotificationAdminMeta() {
  return {
    languages: getNotificationLanguageCatalog(),
    types: NOTIFICATION_TYPES,
    audiences: NOTIFICATION_AUDIENCES,
    destinationKinds: NOTIFICATION_DESTINATION_KINDS,
    statuses: NOTIFICATION_STATUSES,
    fallbackLanguage: 'en',
    recommendedImage: {
      width: 1920,
      height: 600,
      aspectRatio: '3.2:1',
      formats: ['image/jpeg', 'image/png', 'image/webp'],
    },
  };
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_DESTINATION_KINDS,
  NOTIFICATION_STATUSES,
  getNotificationLanguageCatalog,
  isCatalogLanguage,
  registerNotificationLanguage,
  resetNotificationLanguageCatalog,
  getNotificationAdminMeta,
  normalizeLanguageCode,
};
