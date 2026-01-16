/**
 * Explore Video Types Constants
 * 
 * Defines the available video types for Explore content
 */

export const EXPLORE_VIDEO_TYPES = {
  REPLAY: 'replay',
  ARTS_CRAFTS: 'arts_crafts',
  COOKING: 'cooking',
  MUSIC: 'music',
  MOVEMENT_FITNESS: 'movement_fitness',
  STORY_TIME: 'story_time',
  MANNERS_ETIQUETTE: 'manners_etiquette',
};

/**
 * Array of all video type values
 */
export const VIDEO_TYPE_VALUES = Object.values(EXPLORE_VIDEO_TYPES);

/**
 * Video type display labels
 */
export const VIDEO_TYPE_LABELS = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: 'Replay',
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: 'Arts & Crafts',
  [EXPLORE_VIDEO_TYPES.COOKING]: 'Cooking',
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Music',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Movement & Fitness',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: 'Story Time',
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Manners & Etiquette',
};

/**
 * Get display label for a video type
 * @param {String} videoType - Video type value
 * @returns {String} Display label
 */
export const getVideoTypeLabel = (videoType) => {
  return VIDEO_TYPE_LABELS[videoType] || videoType;
};

/**
 * Get all video types as options for dropdowns
 * @returns {Array} Array of { value, label } objects
 */
export const getVideoTypeOptions = () => {
  return VIDEO_TYPE_VALUES.map((value) => ({
    value,
    label: VIDEO_TYPE_LABELS[value],
  }));
};
