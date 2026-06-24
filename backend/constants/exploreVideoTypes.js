/**
 * Explore page video subtypes (admin Video Type dropdown).
 * Course/journey video content must not include any of these.
 */
const EXPLORE_VIDEO_TYPE_VALUES = [
  'replay',
  'arts_crafts',
  'cooking',
  'music',
  'movement_fitness',
  'story_time',
  'manners_etiquette',
];

/** Legacy value from before the 7-type refactor. */
const LEGACY_EXPLORE_VIDEO_TYPE_VALUES = ['activity'];

const ALL_EXPLORE_VIDEO_TYPE_VALUES = [
  ...EXPLORE_VIDEO_TYPE_VALUES,
  ...LEGACY_EXPLORE_VIDEO_TYPE_VALUES,
];

/** Tag applied to Media records owned by Explore page videos. */
const EXPLORE_VIDEO_MEDIA_TAG = 'explore-video';

module.exports = {
  EXPLORE_VIDEO_TYPE_VALUES,
  LEGACY_EXPLORE_VIDEO_TYPE_VALUES,
  ALL_EXPLORE_VIDEO_TYPE_VALUES,
  EXPLORE_VIDEO_MEDIA_TAG,
};
