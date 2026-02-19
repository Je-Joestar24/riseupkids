import api from '../api/axios';
import { BACKEND_BASE_URL } from '../config/constants';

/**
 * Get launch URL for an HTML5 package (by package id).
 * Used for admin/teacher testing of HTML5 (Captivate) books.
 * When S3/CloudFront is used, the API returns a full CloudFront URL — use it as-is.
 * Otherwise build from BACKEND_BASE_URL for legacy disk-backed packages.
 * @param {string} packageId - html5PackageId from the book
 * @param {string} [entryPoint] - optional entry point (e.g. index.html)
 * @returns {Promise<{ launchUrl: string, entryPoint: string }>}
 */
export async function getLaunchUrl(packageId, entryPoint) {
  if (!packageId?.trim()) {
    throw new Error('HTML5 package ID is required');
  }
  const { data } = await api.get(`/html5handler/${packageId}/launch`);
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Failed to get HTML5 launch URL');
  }
  const { launchUrl: serverLaunchUrl, entryPoint: resolvedEntryPoint } = data.data;
  const resolvedEntry = (entryPoint || resolvedEntryPoint || 'index.html').replace(/^\//, '');

  const launchUrl =
    serverLaunchUrl && typeof serverLaunchUrl === 'string' && serverLaunchUrl.startsWith('http')
      ? serverLaunchUrl
      : (() => {
          const base = (BACKEND_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
          return base ? `${base}/html5/${packageId}/${resolvedEntry}` : serverLaunchUrl || '';
        })();

  return { launchUrl, entryPoint: resolvedEntry };
}

export default { getLaunchUrl };
