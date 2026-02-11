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

/** Header descriptions per video type */
export const VIDEO_TYPE_DESCRIPTIONS: Record<string, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: "Let's watch your favorite videos again!",
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "Let's get creative and make something amazing!",
  [EXPLORE_VIDEO_TYPES.COOKING]: "Let's cook something delicious!",
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Make beautiful music together!',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Get moving and stay healthy!',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: "Let's read wonderful stories!",
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Learn to be kind and polite!',
};

/** Footer titles per video type */
export const VIDEO_TYPE_FOOTER_TITLES: Record<string, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: "You're a Super Star!",
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: "You're a Creative Genius!",
  [EXPLORE_VIDEO_TYPES.COOKING]: "You're a Master Chef!",
  [EXPLORE_VIDEO_TYPES.MUSIC]: "You're a Music Star!",
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: "You're Super Active!",
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: "You're a Story Master!",
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: "You're So Kind!",
};

/** Footer subtitles per video type */
export const VIDEO_TYPE_FOOTER_SUBTITLES: Record<string, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: 'Keep watching and learning!',
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: 'Keep creating amazing art!',
  [EXPLORE_VIDEO_TYPES.COOKING]: 'Keep cooking delicious meals!',
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Keep making beautiful music!',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Keep moving and staying healthy!',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: 'Keep reading wonderful stories!',
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Keep being kind and polite!',
};

/** Share section titles per video type */
export const VIDEO_TYPE_SHARE_TITLES: Record<string, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: 'Share My Favorite!',
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: 'Made Something Amazing?',
  [EXPLORE_VIDEO_TYPES.COOKING]: 'Made Something Tasty?',
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Made Beautiful Music?',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Did Something Active?',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: 'Read a Great Story?',
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Did Something Kind?',
};

/** Share section subtitles per video type */
export const VIDEO_TYPE_SHARE_SUBTITLES: Record<string, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: 'Show everyone what you love!',
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: 'Share your artwork with friends in Show & Tell!',
  [EXPLORE_VIDEO_TYPES.COOKING]: 'Share your cooking creations with friends in Show & Tell!',
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Share your songs and recordings with friends in Show & Tell!',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Share your fitness activities with friends in Show & Tell!',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: 'Record yourself reading and share with friends in Show & Tell!',
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Share your good manners and kind actions with friends in Show & Tell!',
};

/** Share button labels per video type */
export const VIDEO_TYPE_SHARE_BUTTONS: Record<string, string> = {
  [EXPLORE_VIDEO_TYPES.REPLAY]: 'Share My Favorite!',
  [EXPLORE_VIDEO_TYPES.ARTS_CRAFTS]: 'Share My Art!',
  [EXPLORE_VIDEO_TYPES.COOKING]: 'Share My Food!',
  [EXPLORE_VIDEO_TYPES.MUSIC]: 'Share My Music!',
  [EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS]: 'Share My Activity!',
  [EXPLORE_VIDEO_TYPES.STORY_TIME]: 'Share My Story!',
  [EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE]: 'Share My Kindness!',
};
