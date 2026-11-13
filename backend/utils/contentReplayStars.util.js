/**
 * Replay stars: once a child has done every required read / watch of a book or video (and so earned its whole
 * star total), each further full read / watch earns a small fixed reward, up to a limit.
 *
 *   2 stars per replay, at most 5 replays = at most 10 extra stars per book or video.
 *
 * Pure rules only (no database), so they can be tested on their own.
 */

/** Stars for one replay. */
const REPLAY_STARS = 2;

/** How many replays pay out for one book or video (per child). Replays after this earn nothing. */
const MAX_REPLAYS = 5;

/** Two submissions this close together are one replay (the same guard the first reads / watches have). */
const REPLAY_DUPLICATE_WINDOW_MS = 5000;

const whole = (value) => Math.max(0, Math.floor(Number(value) || 0));

/** Stars for the replay that comes after `replaysAlready` paid replays: 2 while under the limit, then 0. */
function getReplayStars(replaysAlready) {
  return whole(replaysAlready) < MAX_REPLAYS ? REPLAY_STARS : 0;
}

/** How many paid replays are left after `replaysAlready` of them. */
function getReplaysLeft(replaysAlready) {
  return Math.max(0, MAX_REPLAYS - whole(replaysAlready));
}

/** The most replay stars a book or video can ever pay out. */
const MAX_REPLAY_STARS = REPLAY_STARS * MAX_REPLAYS;

module.exports = {
  REPLAY_STARS,
  MAX_REPLAYS,
  MAX_REPLAY_STARS,
  REPLAY_DUPLICATE_WINDOW_MS,
  getReplayStars,
  getReplaysLeft,
};
