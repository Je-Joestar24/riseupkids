const { ExploreContent, Media } = require('../models');
const {
  ALL_EXPLORE_VIDEO_TYPE_VALUES,
  EXPLORE_VIDEO_MEDIA_TAG,
} = require('../constants/exploreVideoTypes');

const EXPLORE_CONTENT_VIDEO_QUERY = {
  $or: [
    { type: 'video' },
    { videoType: { $in: ALL_EXPLORE_VIDEO_TYPE_VALUES } },
    { videoFile: { $ne: null } },
  ],
};

function collectMediaIdsFromExploreRows(rows = []) {
  const ids = new Set();

  for (const item of rows) {
    if (item.videoFile) {
      ids.add(String(item.videoFile));
    }
    if (item.contentRefModel === 'Media' && item.contentRef) {
      ids.add(String(item.contentRef));
    }
  }

  return ids;
}

/**
 * Collect Media IDs for videos owned by Explore page content (all video types).
 * Includes linked ExploreContent rows and Media tagged `explore-video` for legacy/orphan records.
 */
async function getExploreVideoMediaIds() {
  const [exploreRows, taggedMediaRows] = await Promise.all([
    ExploreContent.find(EXPLORE_CONTENT_VIDEO_QUERY)
      .select('videoFile contentRef contentRefModel videoType type')
      .lean(),
    Media.find({
      type: 'video',
      tags: EXPLORE_VIDEO_MEDIA_TAG,
    })
      .select('_id')
      .lean(),
  ]);

  const ids = collectMediaIdsFromExploreRows(exploreRows);

  for (const media of taggedMediaRows) {
    if (media?._id) {
      ids.add(String(media._id));
    }
  }

  return [...ids];
}

/**
 * Returns true when a Media record belongs to Explore page video content.
 */
async function isExploreVideoMediaId(mediaId) {
  if (!mediaId) return false;

  const [exploreLink, taggedMedia] = await Promise.all([
    ExploreContent.findOne({
      $and: [
        EXPLORE_CONTENT_VIDEO_QUERY,
        {
          $or: [
            { videoFile: mediaId },
            { contentRef: mediaId, contentRefModel: 'Media' },
          ],
        },
      ],
    })
      .select('_id')
      .lean(),
    Media.findOne({
      _id: mediaId,
      type: 'video',
      tags: EXPLORE_VIDEO_MEDIA_TAG,
    })
      .select('_id')
      .lean(),
  ]);

  return Boolean(exploreLink || taggedMedia);
}

module.exports = {
  EXPLORE_CONTENT_VIDEO_QUERY,
  EXPLORE_VIDEO_MEDIA_TAG,
  getExploreVideoMediaIds,
  isExploreVideoMediaId,
};
