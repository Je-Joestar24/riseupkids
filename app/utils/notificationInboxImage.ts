export const DEFAULT_NOTIFICATION_INBOX_IMAGE = require('@/store-assets/play-store/app-icon-1024x1024.png');

/**
 * Left-side inbox thumbnail: campaign image, or the Play Store app icon when none was uploaded.
 */
export function getNotificationInboxImageSource(imageUrl?: string | null) {
  const url = String(imageUrl || '').trim();
  if (url) return { uri: url };
  return DEFAULT_NOTIFICATION_INBOX_IMAGE;
}

export function hasCampaignInboxImage(imageUrl?: string | null): boolean {
  return Boolean(String(imageUrl || '').trim());
}
