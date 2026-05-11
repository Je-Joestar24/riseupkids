/**
 * Shared helpers for module components (image URLs, etc.)
 */

import { API_BASE_URL } from '@/config';

/** Minimal book shape for built-in CMS detection (avoids importing moduleService here). */
export type ModuleBookContentLike = {
  _contentType?: string;
  contentType?: string;
  packageType?: string;
  cmsBookId?: string | { _id?: string } | null;
};

/** Resolved CmsBook id for GET /api/parent/cms-books/:id/play when packageType is builtin. */
export function getBuiltinCmsBookId(
  book: ModuleBookContentLike | null | undefined
): string | null {
  if (!book) return null;
  const raw = book.cmsBookId;
  const id =
    typeof raw === 'string' && raw.trim()
      ? raw.trim()
      : raw && typeof raw === 'object' && raw._id != null
        ? String(raw._id)
        : null;
  if (!id) return null;

  const pkg = String(book.packageType ?? '').toLowerCase().trim();
  if (pkg === 'builtin') return id;
  if (!pkg) return id;
  return null;
}

export function isBuiltinCmsBook(book: ModuleBookContentLike | null | undefined): boolean {
  if (!book) return false;
  const id = getBuiltinCmsBookId(book);
  if (!id) return false;
  const pkg = String(book.packageType ?? '').toLowerCase().trim();
  if (pkg === 'builtin') return true;
  if (!pkg) return true;
  return false;
}

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
