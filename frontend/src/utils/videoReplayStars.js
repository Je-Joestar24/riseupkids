/**
 * Replay stars for course videos: once the last required watch is done, every further full watch pays 2 stars
 * (5 replays at most). The server marks such a watch with `isReplay: true`, but on the child web page `isReplay`
 * already means something else for Explore videos (a video in the "Replays" category, which never pays stars).
 * So a course video's reply is turned into what the completion dialog expects: stars paid -> "You earned N stars!".
 */

/** The stars this watch paid (whole number, 0 when none). */
export const starsPaidByWatch = (result) => Number(result?.starsToAward ?? result?.starsEarnedThisSession ?? 0) || 0;

/** A course video's reply, shaped for the completion dialog. */
export const toCourseVideoDialogResult = (result, wasFullyCompleteBefore) => {
  const starsJustAwarded = starsPaidByWatch(result) > 0;
  return {
    ...result,
    // The Explore "Replays category" flag: never true for a course video
    isReplay: false,
    wasReplay: Boolean(result?.isReplay),
    starsJustAwarded,
    starsWereAlreadyAwarded: Boolean(wasFullyCompleteBefore) && !starsJustAwarded,
    allStarsAwarded: Boolean(result?.videoWatch?.starsAwarded || result?.allStarsAwarded),
  };
};

/** The small pop-up after a course video replay that paid stars; null when the watch was not a paying replay. */
export const replayToastMessage = (data) => {
  if (!data?.isReplay || starsPaidByWatch(data) <= 0) return null;
  const left = Math.max(0, Number(data.replaysLeft) || 0);
  const more = left > 0 ? ` ${left} more replay${left > 1 ? 's' : ''} can still earn stars!` : ' That was the last replay that earns stars!';
  return `⭐ Replay bonus! You earned ${starsPaidByWatch(data)} stars.${more}`;
};
