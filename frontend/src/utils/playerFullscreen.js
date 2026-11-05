import { PHONE_TOUCH, PHONE_UPRIGHT_MAX_WIDTH, PHONE_SIDEWAYS_MAX_HEIGHT } from '../hooks/usePlayerViewport';

/**
 * Real full screen (browser bars gone) and a sideways lock for the video and book players, as a bonus on the
 * phones whose browser allows it (Android Chrome). Other places do nothing, and nothing here is needed for the
 * players to work:
 *   - iPhone Safari cannot make a page full screen or lock the rotation, so it never gets a button or a request;
 *   - a computer or a tablet is not a touch phone, so it is never asked for anything.
 *
 * A browser only grants this inside a tap, so `enterPlayerFullscreen` must be called from a tap handler (or right
 * after one). Whatever it asks for, `exitPlayerFullscreen` gives back.
 */

let enteredByUs = false;

const matches = (query) => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

/** A touch phone (a finger, no hover, and a phone-sized screen: not a tablet). */
export const isTouchPhone = () =>
  matches(PHONE_TOUCH) && (matches(`(max-width: ${PHONE_UPRIGHT_MAX_WIDTH}px)`) || matches(`(max-height: ${PHONE_SIDEWAYS_MAX_HEIGHT}px)`));

/** True where full screen is worth offering: a touch phone whose browser can make the page full screen. */
export const playerFullscreenSupported = () =>
  isTouchPhone() && typeof document !== 'undefined' && typeof document.documentElement?.requestFullscreen === 'function';

export const isPlayerFullscreen = () => typeof document !== 'undefined' && Boolean(document.fullscreenElement);

/** Asks for full screen and a sideways lock. Resolves to true when full screen was granted; never throws. */
export async function enterPlayerFullscreen() {
  if (!playerFullscreenSupported() || isPlayerFullscreen()) return isPlayerFullscreen();

  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    return false; // refused (no tap, setting turned off...): the player works as before
  }
  enteredByUs = true;

  try {
    await window.screen?.orientation?.lock?.('landscape');
  } catch {
    // locking is a bonus; the child can still turn the phone by hand
  }
  return true;
}

/** Gives back whatever `enterPlayerFullscreen` took. Does nothing if full screen was not started by us. */
export async function exitPlayerFullscreen() {
  if (!enteredByUs) return;
  enteredByUs = false;

  try {
    window.screen?.orientation?.unlock?.();
  } catch {
    // nothing to give back
  }
  try {
    if (isPlayerFullscreen()) await document.exitFullscreen();
  } catch {
    // already left
  }
}
