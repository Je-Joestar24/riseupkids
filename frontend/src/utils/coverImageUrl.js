import { BACKEND_BASE_URL } from '../config/constants';

/**
 * Resolve cover image path to a full URL (S3 or local uploads).
 * @param {string|null|undefined} coverImagePath
 * @returns {string|null}
 */
export function getCoverImageUrl(coverImagePath) {
  if (!coverImagePath) return null;
  if (coverImagePath.startsWith('http://') || coverImagePath.startsWith('https://')) {
    return coverImagePath;
  }
  const baseUrl = BACKEND_BASE_URL;
  return `${baseUrl}${coverImagePath.startsWith('/') ? coverImagePath : `/${coverImagePath}`}`;
}

/** Axios config for multipart uploads (lets browser set boundary). */
export const multipartRequestConfig = {
  headers: { 'Content-Type': undefined },
};
