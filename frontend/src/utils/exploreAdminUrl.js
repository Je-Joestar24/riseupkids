/**
 * Build URLSearchParams for admin Explore page from filter state.
 * Keeps filter ↔ URL behavior consistent across header, filters bar, and post-save sync.
 *
 * @param {Object} newFilters
 * @returns {URLSearchParams}
 */
export function buildExploreAdminSearchParams(newFilters) {
  const params = new URLSearchParams();
  const videoType = newFilters.videoType || 'replay';
  params.set('videoType', videoType);
  if (newFilters.search) {
    params.set('search', newFilters.search);
  }
  if (newFilters.isPublished !== undefined) {
    params.set('isPublished', String(newFilters.isPublished));
  }
  if (newFilters.isFeatured !== undefined) {
    params.set('isFeatured', String(newFilters.isFeatured));
  }
  if (newFilters.sortBy) {
    params.set('sortBy', newFilters.sortBy);
  }
  if (newFilters.page && newFilters.page > 1) {
    params.set('page', String(newFilters.page));
  }
  if (newFilters.limit && newFilters.limit !== 10) {
    params.set('limit', String(newFilters.limit));
  }
  return params;
}
