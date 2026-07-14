/**
 * Public legal URLs for App Store / Play Store compliance.
 */
export const LEGAL_URLS = {
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://riseup.kids/privacy',
  terms: process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://riseup.kids/terms',
  signup: process.env.EXPO_PUBLIC_SIGNUP_URL ?? 'https://riseup.kids/checkout/register',
} as const;

export const TERMS_VERSION = '2026-07-14';
