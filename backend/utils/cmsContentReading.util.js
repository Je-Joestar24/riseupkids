/** Content-page reading text font size (px) — built-in CMS books only. */

const CONTENT_READING_FONT_SIZE_MIN = 20;
const CONTENT_READING_FONT_SIZE_MAX = 72;

function normalizeReadingFontSizePx(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < CONTENT_READING_FONT_SIZE_MIN || rounded > CONTENT_READING_FONT_SIZE_MAX) {
    return null;
  }
  return rounded;
}

function assertReadingFontSizePx(value) {
  if (value == null || value === '') return;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(
      `content page reading.fontSizePx must be a number between ${CONTENT_READING_FONT_SIZE_MIN} and ${CONTENT_READING_FONT_SIZE_MAX}`
    );
  }
  const rounded = Math.round(parsed);
  if (rounded < CONTENT_READING_FONT_SIZE_MIN || rounded > CONTENT_READING_FONT_SIZE_MAX) {
    throw new Error(
      `content page reading.fontSizePx must be between ${CONTENT_READING_FONT_SIZE_MIN} and ${CONTENT_READING_FONT_SIZE_MAX}`
    );
  }
}

module.exports = {
  CONTENT_READING_FONT_SIZE_MIN,
  CONTENT_READING_FONT_SIZE_MAX,
  normalizeReadingFontSizePx,
  assertReadingFontSizePx,
};
