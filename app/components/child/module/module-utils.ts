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
