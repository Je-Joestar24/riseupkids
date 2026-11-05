import { useMediaQuery } from '@mui/material';

/**
 * Which kind of screen the video and book players are on, so the phone-only layouts reach phones and
 * nothing else.
 *
 *   'phone-landscape' a touch phone held sideways (short screen)
 *   'phone-portrait'  a touch phone held upright
 *   'desktop'         everything else: computers (whatever the window size), tablets, a phone-sized
 *                     window with a mouse
 *
 * "Touch phone" means the main pointer is a finger and there is no hover (`pointer: coarse` and
 * `hover: none`), so a computer with a mouse never counts, however small its window is. The width and
 * height limits keep tablets out. Without `matchMedia` the answer is 'desktop', which is the layout
 * that existed before this hook.
 */
export const PHONE_TOUCH = '(hover: none) and (pointer: coarse)';
/** Widest screen still treated as an upright phone (the same 600px the video card layout uses). */
export const PHONE_UPRIGHT_MAX_WIDTH = 599.95;
/** Tallest screen still treated as a sideways phone. */
export const PHONE_SIDEWAYS_MAX_HEIGHT = 500;

export const PHONE_LANDSCAPE_QUERY = `${PHONE_TOUCH} and (orientation: landscape) and (max-height: ${PHONE_SIDEWAYS_MAX_HEIGHT}px)`;
export const PHONE_PORTRAIT_QUERY = `${PHONE_TOUCH} and (orientation: portrait) and (max-width: ${PHONE_UPRIGHT_MAX_WIDTH}px)`;

// The app renders only in the browser, where MUI reads the screen on the very first render, so a phone never
// flashes the computer layout (a test covers it).
export function usePlayerViewport() {
  const sideways = useMediaQuery(PHONE_LANDSCAPE_QUERY);
  const upright = useMediaQuery(PHONE_PORTRAIT_QUERY);

  if (sideways) return 'phone-landscape';
  if (upright) return 'phone-portrait';
  return 'desktop';
}

export default usePlayerViewport;
