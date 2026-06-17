/**
 * Star Cam category display rules (parity with admin `starCamCategoryDisplay.js`).
 * Backend keys/ids stay unchanged; UI maps aliases to canonical presets.
 */

import { STAR_CAM_CATEGORY_PRESETS } from './categoryPresets';
import type { StarCamCategoryPreset, StarCamCategoryPresetKey } from './types';

export type { StarCamCategoryPresetKey };

const DISPLAY_LABEL_BY_PRESET_KEY: Record<StarCamCategoryPresetKey, string> = {
  nature: 'Nature',
  recipes: 'Food/Recipes',
  sing: 'Home',
  reading: 'Learning',
};

const ICON_EMOJI_BY_PRESET_KEY: Record<StarCamCategoryPresetKey, string> = {
  nature: '🌿',
  recipes: '🥣',
  sing: '🏠',
  reading: '📚',
};

const ADMIN_DISPLAY_ORDER: StarCamCategoryPresetKey[] = ['nature', 'recipes', 'sing', 'reading'];

function normalize(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export interface StarCamCategoryLike {
  key?: string | null;
  name?: string | null;
}

/** Map API/legacy keys to a canonical preset key used for theming. */
export function resolveStarCamCategoryPresetKey(
  raw: string | StarCamCategoryLike | null | undefined
): StarCamCategoryPresetKey {
  const key = typeof raw === 'string' ? normalize(raw) : normalize(raw?.key);
  const name = typeof raw === 'string' ? '' : normalize(raw?.name);

  if (key === 'nature' || key === 'adventure' || name === 'nature' || name === 'adventure') {
    return 'nature';
  }
  if (
    key === 'recipes' ||
    key === 'recipe' ||
    name === 'recipes' ||
    name === 'recipe' ||
    name.includes('recipe')
  ) {
    return 'recipes';
  }
  if (key === 'sing' || key === 'home' || name === 'sing' || name === 'home') {
    return 'sing';
  }
  if (
    key === 'reading' ||
    key === 'book' ||
    key === 'school' ||
    name === 'reading' ||
    name === 'book' ||
    name === 'learning'
  ) {
    return 'reading';
  }

  if (key && key in STAR_CAM_CATEGORY_PRESETS) {
    return key as StarCamCategoryPresetKey;
  }

  return 'reading';
}

/** Child-facing label aligned with admin category chips. */
export function getStarCamCategoryDisplayLabel(
  category: string | StarCamCategoryLike | null | undefined
): string {
  if (typeof category === 'string') {
    const presetKey = resolveStarCamCategoryPresetKey(category);
    return DISPLAY_LABEL_BY_PRESET_KEY[presetKey];
  }

  const presetKey = resolveStarCamCategoryPresetKey(category);
  const mapped = DISPLAY_LABEL_BY_PRESET_KEY[presetKey];
  const fallbackName = String(category?.name || '').trim();
  if (fallbackName && resolveStarCamCategoryPresetKey(fallbackName) !== presetKey) {
    return fallbackName;
  }
  return fallbackName || mapped;
}

export function getStarCamCategoryIconEmoji(
  category: string | StarCamCategoryLike | null | undefined
): string {
  const presetKey = resolveStarCamCategoryPresetKey(category);
  return ICON_EMOJI_BY_PRESET_KEY[presetKey];
}

export function getStarCamCategoryPreset(
  category: string | StarCamCategoryLike | null | undefined
): StarCamCategoryPreset {
  const presetKey = resolveStarCamCategoryPresetKey(category);
  return STAR_CAM_CATEGORY_PRESETS[presetKey];
}

export function sortStarCamCategoriesForDisplay<T extends StarCamCategoryLike>(
  categories: T[]
): T[] {
  return [...categories].sort((a, b) => {
    const aIdx = ADMIN_DISPLAY_ORDER.indexOf(resolveStarCamCategoryPresetKey(a));
    const bIdx = ADMIN_DISPLAY_ORDER.indexOf(resolveStarCamCategoryPresetKey(b));
    const safeA = aIdx === -1 ? 999 : aIdx;
    const safeB = bIdx === -1 ? 999 : bIdx;
    return safeA - safeB;
  });
}

export function isStarCamMapCategory(raw: string | null | undefined): boolean {
  const key = normalize(raw);
  if (!key) return false;
  return (
    key === 'reading' ||
    key === 'book' ||
    key === 'recipes' ||
    key === 'recipe' ||
    key === 'nature' ||
    key === 'adventure' ||
    key === 'sing' ||
    key === 'home' ||
    key === 'school'
  );
}
