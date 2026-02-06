/**
 * Shared helpers for module components (image URLs, etc.)
 */

import { API_BASE_URL } from '@/config';

/** Build full image URL from backend path (e.g. /uploads/courses/xxx.jpeg). */
export function getCoverImageUrl(coverImagePath?: string | null): string | null {
  if (!coverImagePath) return null;
  if (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')) {
    return coverImagePath;
  }
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  const path = coverImagePath.startsWith('/') ? coverImagePath : `/${coverImagePath}`;
  return `${base}${path}`;
}

/** Build full media URL from backend path or Media object. Skips ObjectId-like strings. */
export function buildPublicUrl(
  maybeUrl?: string | { url?: string } | null
): string | null {
  if (!maybeUrl) return null;
  const urlStr = typeof maybeUrl === 'string' ? maybeUrl : maybeUrl?.url ?? '';
  if (!urlStr || /^[a-f0-9]{24}$/i.test(urlStr)) return null;
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return urlStr;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  const path = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
  return `${base}${path}`;
}
