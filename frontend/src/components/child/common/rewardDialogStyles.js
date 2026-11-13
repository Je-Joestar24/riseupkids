/**
 * Sizes for the "you finished / you earned stars" pop-ups a child sees (book, SCORM book, video).
 *
 * They used fixed big sizes (2.5rem titles, 1.8rem star lines, a 1.5rem button), which filled a phone. Now:
 *  - on a phone (under 600px wide) the size grows with the screen between `min` and `max` px (`phoneFluid`),
 *  - on a phone held sideways (short screen) it is the phone `max`,
 *  - from a tablet up the original size is kept, so a computer looks exactly as before.
 */
import { phoneFluid } from '../../../constants/childPhoneLayout';
import { PHONE_LANDSCAPE_QUERY } from '../../../hooks/usePlayerViewport';

const SIDEWAYS = `@media ${PHONE_LANDSCAPE_QUERY}`;

/** `fontSize` for a text: phone min..max px, the original `desktop` size from a tablet up. */
export const rewardFont = (min, max, desktop) => ({
  fontSize: { xs: phoneFluid(min, max), sm: desktop },
  [SIDEWAYS]: { fontSize: `${max}px` },
});

/** `width` and `height` for an icon, the same three ways. */
export const rewardBox = (min, max, desktop) => ({
  width: { xs: phoneFluid(min, max), sm: desktop },
  height: { xs: phoneFluid(min, max), sm: desktop },
  [SIDEWAYS]: { width: `${max}px`, height: `${max}px` },
});

/** The pop-up card: closer to the screen edge on a phone, with less padding. */
export const rewardPaperSx = {
  m: { xs: '12px', sm: '32px' },
  width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 64px)' },
  maxHeight: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 64px)' },
  p: { xs: '4px', sm: '8px' },
};

/** The title's padding. */
export const rewardTitlePadding = {
  p: { xs: '16px 12px 8px', sm: '32px 24px 16px' },
  [SIDEWAYS]: { p: '10px 12px 4px' },
};

/** The body's padding. */
export const rewardContentPadding = {
  p: { xs: '0 14px 16px', sm: '0 24px 24px' },
  [SIDEWAYS]: { p: '0 14px 12px' },
};

/** The big "Continue" / "Close" button's padding. */
export const rewardButtonPadding = (desktop) => ({
  p: { xs: '8px 28px', sm: desktop },
  [SIDEWAYS]: { p: '6px 28px' },
});
