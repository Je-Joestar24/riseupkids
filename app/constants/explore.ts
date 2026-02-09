/**
 * Explore video types and labels
 * Matches backend ExploreContent.videoType enum and web frontend constants.
 */

export const EXPLORE_VIDEO_TYPES = {
  REPLAY: 'replay',
  ARTS_CRAFTS: 'arts_crafts',
  COOKING: 'cooking',
  MUSIC: 'music',
  MOVEMENT_FITNESS: 'movement_fitness',
  STORY_TIME: 'story_time',
  MANNERS_ETIQUETTE: 'manners_etiquette',
} as const;

export type ExploreVideoType = (typeof EXPLORE_VIDEO_TYPES)[keyof typeof EXPLORE_VIDEO_TYPES];

export const VIDEO_TYPE_VALUES: readonly ExploreVideoType[] = Object.values(
  EXPLORE_VIDEO_TYPES
);

export const VIDEO_TYPE_LABELS: Record<ExploreVideoType, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: 'Replay',
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: 'Arts & Crafts',
  [EXPLORE_VIDEO_TYPES.COOKING]: 'Cooking',
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Music',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Movement & Fitness',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: 'Story Time',
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Manners & Etiquette',
};

export function getVideoTypeLabel(videoType: string): string {
  return VIDEO_TYPE_LABELS[videoType as ExploreVideoType] ?? videoType;
}

/** Video types used for "collections" (excluding replay) */
export const COLLECTION_VIDEO_TYPES: ExploreVideoType[] = [
  EXPLORE_VIDEO_TYPES.ARTS_CRAFTS,
  EXPLORE_VIDEO_TYPES.COOKING,
  EXPLORE_VIDEO_TYPES.MUSIC,
  EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS,
  EXPLORE_VIDEO_TYPES.STORY_TIME,
  EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE,
];
