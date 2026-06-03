/** Content-page reading text font size (px) — built-in CMS books only. */

export const CONTENT_READING_FONT_SIZE_MIN = 20;
export const CONTENT_READING_FONT_SIZE_MAX = 72;

export const CONTENT_READING_FONT_SIZE_PRESETS = [
  { value: '', label: 'Default (player standard)' },
  { value: '28', label: 'Small (28px)' },
  { value: '34', label: 'Medium (34px)' },
  { value: '40', label: 'Large (40px)' },
  { value: '48', label: 'XL (48px)' },
  { value: '56', label: '2XL (56px)' },
  { value: '72', label: '3XL (72px)' },
];

export const normalizeReadingFontSizePx = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  if (rounded < CONTENT_READING_FONT_SIZE_MIN || rounded > CONTENT_READING_FONT_SIZE_MAX) {
    return null;
  }
  return rounded;
};

/** Resolves px for content reading display; null = use responsive player defaults. */
export const resolveContentReadingFontSizePx = (page) => {
  const fromReading = normalizeReadingFontSizePx(page?.reading?.fontSizePx);
  if (fromReading != null) return fromReading;
  return normalizeReadingFontSizePx(page?.readingFontSizePx);
};
