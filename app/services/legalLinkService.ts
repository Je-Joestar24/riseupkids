import * as WebBrowser from 'expo-web-browser';

import { LEGAL_URLS } from '@/config/legal';

/** Opens a legal or marketing URL in the system browser (Safari / Chrome). */
export async function openLegalUrl(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    enableBarCollapsing: true,
    showInRecents: true,
  });
}

export async function openPrivacyPolicy(): Promise<void> {
  await openLegalUrl(LEGAL_URLS.privacy);
}

export async function openTermsOfUse(): Promise<void> {
  await openLegalUrl(LEGAL_URLS.terms);
}

export async function openSignupPage(): Promise<void> {
  await openLegalUrl(LEGAL_URLS.signup);
}
