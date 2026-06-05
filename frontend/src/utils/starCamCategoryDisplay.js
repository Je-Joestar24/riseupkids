/**
 * Admin-only Star Cam category labels and sort order.
 * Backend keys/ids stay unchanged (e.g. reading, sing, book).
 */

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

/** Display labels by canonical category key */
const DISPLAY_LABEL_BY_KEY = {
  nature: 'Nature',
  recipes: 'Food/Recipes',
  sing: 'Home',
  home: 'Home',
  reading: 'Learning',
  book: 'Learning',
};

/** Icon slot for admin category selects */
export const STAR_CAM_CATEGORY_ICON_SLOT = {
  nature: 'nature',
  recipes: 'food',
  sing: 'home',
  home: 'home',
  reading: 'learning',
  book: 'learning',
};

const ADMIN_DISPLAY_ORDER = ['nature', 'recipes', 'sing', 'home', 'reading', 'book'];

export function resolveStarCamCategoryKey(category) {
  const key = normalizeKey(category?.key);
  if (key && DISPLAY_LABEL_BY_KEY[key]) return key;

  const name = normalizeKey(category?.name);
  if (name === 'reading' || name === 'book') return 'reading';
  if (name === 'sing') return 'sing';
  if (name === 'home') return 'home';
  if (name === 'recipes' || name === 'recipe' || name.includes('recipe')) return 'recipes';
  if (name === 'nature' || name === 'adventure') return 'nature';

  return key || name;
}

export function getStarCamCategoryDisplayLabel(category) {
  const resolved = resolveStarCamCategoryKey(category);
  if (DISPLAY_LABEL_BY_KEY[resolved]) return DISPLAY_LABEL_BY_KEY[resolved];
  const fallback = String(category?.name || '').trim();
  return fallback || 'Category';
}

export function getStarCamCategoryIconSlot(category) {
  const resolved = resolveStarCamCategoryKey(category);
  return STAR_CAM_CATEGORY_ICON_SLOT[resolved] || null;
}

export function getStarCamCategoryId(category) {
  const raw = category?._id ?? category?.id;
  if (raw == null || raw === '') return '';
  return String(raw);
}

export function sortStarCamCategoriesForAdminDisplay(categories = []) {
  const orderIndex = (cat) => {
    const key = resolveStarCamCategoryKey(cat);
    const idx = ADMIN_DISPLAY_ORDER.indexOf(key);
    return idx === -1 ? 999 : idx;
  };

  return [...categories].sort((a, b) => {
    const orderDiff = orderIndex(a) - orderIndex(b);
    if (orderDiff !== 0) return orderDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}
