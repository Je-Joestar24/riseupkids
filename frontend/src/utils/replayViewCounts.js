/**
 * The child's own view count for each replay video, asked for together. A count that cannot be read
 * keeps its last known value (or 0), so a failed refresh never lowers a number already on screen.
 *
 * @param {Object} options
 * @param {Array} options.videos - Replay videos (each with an `_id`)
 * @param {String} options.childId
 * @param {Function} options.getStatus - `getExploreVideoWatchStatus` from the watch hook
 * @param {Object} [options.previousCounts] - The counts on screen, by video id
 * @returns {Promise<Object>} Counts by video id
 */
export async function loadReplayViewCounts({ videos, childId, getStatus, previousCounts = {} }) {
  const counts = {};
  if (!childId || !getStatus) return counts;

  await Promise.all(
    videos.map(async (video) => {
      const id = video._id.toString();
      try {
        const status = await getStatus(video._id);
        counts[id] = status?.currentWatchCount || 0;
      } catch (error) {
        console.error(`Error fetching view count for ${video._id}:`, error);
        counts[id] = previousCounts[id] || 0;
      }
    })
  );
  return counts;
}
