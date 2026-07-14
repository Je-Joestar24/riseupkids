/**
 * Canonical public legal URLs (App Store, Play Store, in-app browsers).
 */
export const LEGAL_URLS = {
  privacy: import.meta.env.VITE_PRIVACY_POLICY_URL || 'https://riseup.kids/privacy',
  terms: import.meta.env.VITE_TERMS_URL || 'https://riseup.kids/terms',
  marketingSite: import.meta.env.VITE_MARKETING_SITE_URL || 'https://riseup.kids',
};

export const TERMS_VERSION = '2026-07-14';
