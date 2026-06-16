import { colors } from '@/config/theme/colors';

import type { StarCamCategoryPresetKey } from '@/components/child/starcamdynamicdisplay/types';

export const STARCAM_BACKGROUND = require('@/assets/images/starcam_background.png');
export const TEMP_BOOK = require('@/assets/images/temporary_book.png');
export const TEMP_RECIPE = require('@/assets/images/temporary_recipe.png');

export const BUBBLE_SIZE = 135;
export const PING_SIZE = 18;

export const FALLBACK_BUBBLES = [
  {
    presetKey: 'reading' as StarCamCategoryPresetKey,
    title: 'Learning',
    left: 40,
    top: 56,
    color: colors.orange,
    iconType: 'image' as const,
    image: TEMP_BOOK,
  },
  {
    presetKey: 'recipes' as StarCamCategoryPresetKey,
    title: 'Food/Recipes',
    left: 215,
    top: 56,
    color: '#f5c247',
    iconType: 'image' as const,
    image: TEMP_RECIPE,
  },
  {
    presetKey: 'nature' as StarCamCategoryPresetKey,
    title: 'Nature',
    left: 40,
    top: 216,
    color: '#3a9d8f',
    iconType: 'emoji' as const,
    emoji: '🌿',
  },
  {
    presetKey: 'sing' as StarCamCategoryPresetKey,
    title: 'Home',
    left: 215,
    top: 216,
    color: 'rgb(233, 138, 104)',
    iconType: 'emoji' as const,
    emoji: '🏠',
  },
] as const;
