import { useMemo } from 'react';

import type { StarCamCategoryListItem } from '@/services/childStarCamService';

import { FALLBACK_BUBBLES, normalizeStarCamCategoryKey } from './constants';
import type { StarCamBubblePreset } from './types';

export function useStarCamBubbleItems(categories: StarCamCategoryListItem[]): StarCamBubblePreset[] {
  return useMemo(() => {
    if (!categories.length) {
      return [...FALLBACK_BUBBLES];
    }

    return categories.slice(0, 5).map((category, index) => {
      const key = normalizeStarCamCategoryKey(category.key);
      const preset = FALLBACK_BUBBLES.find((item) => item.key === key);
      if (preset) {
        return {
          ...preset,
          key,
          title: category.name || preset.title,
        };
      }

      const fallbackPos = FALLBACK_BUBBLES[index % FALLBACK_BUBBLES.length];
      return {
        ...fallbackPos,
        key,
        title: category.name || category.key,
        iconType: 'emoji' as const,
        emoji: '⭐',
      };
    });
  }, [categories]);
}
