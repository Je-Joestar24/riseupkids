/**
 * Phone-only sizing for the child pages.
 *
 * `phoneFluid(min, max)` gives a size that grows with the screen width up to `max` (reached on a large phone,
 * about 412px wide) and shrinks smoothly down to `min` on the smallest phones (about 280px), so one value fits an
 * iPhone SE (375), a 360px Android and a 320px screen alike. It is meant only for the phone side of a responsive
 * `sx` value, e.g. `fontSize: { xs: phoneFluid(22, 28), sm: '30px' }`: tablets and computers (600px and wider)
 * keep their own fixed value, so their layout never changes.
 */

/** Width (px) at which a phone size reaches its full value. */
export const PHONE_FULL_SIZE_WIDTH = 412;

const trim = (n) => String(Math.round(n * 1000) / 1000);

/**
 * @param {number} min smallest size in px
 * @param {number} max largest size in px (reached at `atWidth`)
 * @param {number} [atWidth] screen width in px where `max` is reached
 * @returns {string} a CSS `clamp()` length
 */
export const phoneFluid = (min, max, atWidth = PHONE_FULL_SIZE_WIDTH) => {
  if (!(min > 0) || !(max >= min) || !(atWidth > 0)) {
    throw new Error(`phoneFluid needs 0 < min <= max and a positive width (got ${min}, ${max}, ${atWidth})`);
  }
  if (min === max) return `${trim(max)}px`;
  return `clamp(${trim(min)}px, ${trim((max / atWidth) * 100)}vw, ${trim(max)}px)`;
};

/** Space between a phone's edge and the page content. */
export const PHONE_PAGE_SIDE_PADDING = phoneFluid(12, 20);
