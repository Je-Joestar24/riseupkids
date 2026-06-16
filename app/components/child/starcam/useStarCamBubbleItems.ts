import { useMemo } from 'react';

import {
  getStarCamCategoryDisplayLabel,
  resolveStarCamCategoryPresetKey,
  sortStarCamCategoriesForDisplay,
} from '@/components/child/starcamdynamicdisplay/categoryDisplay';
import type { StarCamCategoryListItem } from '@/services/childStarCamService';

import { FALLBACK_BUBBLES } from './constants';
import type { StarCamBubblePreset } from './types';

export function useStarCamBubbleItems(categories: StarCamCategoryListItem[]): StarCamBubblePreset[] {
  return useMemo(() => {
    if (!categories.length) {
      return FALLBACK_BUBBLES.map((item, index) => ({
        key: item.presetKey,
        title: item.title,
        left: item.left,
        top: item.top,
        color: item.color,
        iconType: item.iconType,
        image: 'image' in item ? item.image : undefined,
        emoji: 'emoji' in item ? item.emoji : undefined,
      }));
    }

    const sorted = sortStarCamCategoriesForDisplay(categories);

    return sorted.slice(0, 4).map((category, index) => {
      const apiKey = String(category.key || '').trim().toLowerCase();
      const presetKey = resolveStarCamCategoryPresetKey(category);
      const layout = FALLBACK_BUBBLES.find((item) => item.presetKey === presetKey);
      const fallbackPos = FALLBACK_BUBBLES[index % FALLBACK_BUBBLES.length];

      if (layout) {
        return {
          key: apiKey || layout.presetKey,
          title: getStarCamCategoryDisplayLabel(category),
          left: layout.left,
          top: layout.top,
          color: layout.color,
          iconType: layout.iconType,
          image: 'image' in layout ? layout.image : undefined,
          emoji: 'emoji' in layout ? layout.emoji : undefined,
        };
      }

      return {
        key: apiKey || presetKey,
        title: getStarCamCategoryDisplayLabel(category),
        left: fallbackPos.left,
        top: fallbackPos.top,
        color: fallbackPos.color,
        iconType: 'emoji' as const,
        emoji: '🌟',
      };
    });
  }, [categories]);
}
