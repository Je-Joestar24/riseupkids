/**
 * HTML5 package launch URL for child app.
 * Calls backend GET /api/html5handler/:id/launch and builds WebView URL from BACKEND_ORIGIN.
 */

import { api } from '@/services/api';
import { BACKEND_ORIGIN } from '@/config';

export interface GetLaunchUrlResult {
  launchUrl: string;
  entryPoint: string;
}

/**
 * Get launch URL for an HTML5 package. Uses backend response and builds URL from BACKEND_ORIGIN
 * so WebView loads the correct origin (static files are served at /html5, not under /api).
 */
export async function getLaunchUrl(
  packageId: string,
  entryPoint?: string | null
): Promise<GetLaunchUrlResult> {
  if (!packageId?.trim()) {
    throw new Error('HTML5 package ID is required');
  }

  const response = await api.get<{
    success: boolean;
    data?: { launchUrl: string; entryPoint: string };
    message?: string;
  }>(`/html5handler/${packageId}/launch`);

  if (!response?.success || !response?.data) {
    throw new Error(response?.message ?? 'Failed to get HTML5 launch URL');
  }

  const { launchUrl: serverLaunchUrl, entryPoint: resolvedEntry } = response.data;
  const entry = (entryPoint?.trim() || resolvedEntry || 'index.html').replace(/^\//, '');
  const base = BACKEND_ORIGIN.replace(/\/+$/, '');
  const launchUrl = `${base}/html5/${packageId}/${entry}`;

  return { launchUrl, entryPoint: entry };
}
