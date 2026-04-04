import { colors } from '@/config/theme/colors';

export const STARCAM_BACKGROUND = require('@/assets/images/starcam_background.png');
export const TEMP_BOOK = require('@/assets/images/temporary_book.png');
export const TEMP_RECIPE = require('@/assets/images/temporary_recipe.png');

export const BUBBLE_SIZE = 135;
export const PING_SIZE = 18;

/** Legacy API may still send `adventure`; canonical key is `nature`. */
export function normalizeStarCamCategoryKey(key: string): string {
  return key === 'adventure' ? 'nature' : key;
}

export const FALLBACK_BUBBLES = [
  {
    key: 'reading',
    title: 'Reading Time',
    left: 40,
    top: 56,
    color: colors.orange,
    iconType: 'image' as const,
    image: TEMP_BOOK,
  },
  {
    key: 'recipes',
    title: 'Yummy Recipes',
    left: 215,
    top: 56,
    color: '#f5c247',
    iconType: 'image' as const,
    image: TEMP_RECIPE,
  },
  {
    key: 'nature',
    title: 'Nature Walk',
    left: 40,
    top: 216,
    color: '#3a9d8f',
    iconType: 'emoji' as const,
    emoji: '🌿',
  },
  {
    key: 'sing',
    title: 'Sing Along',
    left: 215,
    top: 216,
    color: 'rgb(233, 138, 104)',
    iconType: 'emoji' as const,
    emoji: '🏠',
  },
  {
    key: 'school',
    title: 'School Time',
    left: 127,
    top: 376,
    color: '#2563eb',
    iconType: 'emoji' as const,
    emoji: '🎒',
  },
] as const;
