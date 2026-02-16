import api from '../api/axios';
import { BACKEND_BASE_URL } from '../config/constants';

/**
 * Get launch URL for an HTML5 package (by package id).
 * Used for admin/teacher testing of HTML5 (Captivate) books.
 * @param {string} packageId - html5PackageId from the book
 * @returns {Promise<{ launchUrl: string, entryPoint: string }>}
 */
export async function getLaunchUrl(packageId) {
  if (!packageId) {
    throw new Error('HTML5 package ID is required');
  }
  const { data } = await api.get(`/html5handler/${packageId}/launch`);
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Failed to get HTML5 launch URL');
  }
  const { launchUrl, entryPoint } = data.data;
  // In dev, BACKEND_BASE_URL is '' so we build same-origin URL for iframe (proxy handles /html5)
  const base = BACKEND_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const resolvedEntry = entryPoint || 'index.html';
  const resolvedLaunchUrl = base ? `${base}/html5/${packageId}/${resolvedEntry}` : launchUrl;
  return { launchUrl: resolvedLaunchUrl, entryPoint: resolvedEntry };
}

export default { getLaunchUrl };
