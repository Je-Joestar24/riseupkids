import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import type { StarCamMissionMapBubble } from '@/services/childStarCamService';

export type StarCamMapMissionItem = StarCamMissionMapBubble;

export type StarCamCategoryPresetKey = 'reading' | 'recipes' | 'nature' | 'sing';

/** @deprecated Use StarCamCategoryPresetKey — kept for route/query compatibility */
export type StarCamCategoryKey = StarCamCategoryPresetKey | 'school' | 'book' | 'home' | 'adventure';

export type StarCamCategoryHeader =
  | {
      kind: 'text';
      /** Primary line(s); use `\n` for a second line */
      title: string;
    }
  | {
      kind: 'image';
      source: ImageSourcePropType;
      accessibilityLabel: string;
      /** width / height of the artwork */
      aspectRatio: number;
      showDecorEmojiStrip?: boolean;
    };

export type StarCamDecorItem = { emoji: string; style: StyleProp<ViewStyle> };

export interface StarCamCategoryPreset {
  key: StarCamCategoryPresetKey;
  gradient: readonly [string, string, string];
  gradientLocations?: readonly [number, number, number];
  borderColor: string;
  overlayTint: string;
  decor: StarCamDecorItem[];
  header: StarCamCategoryHeader;
  footerHint: string;
  sampleMissions: StarCamMissionMapBubble[];
  missionEmojiCycle: readonly string[];
}

export interface StarCamDynamicDisplayProps {
  /** API category key from backend (may be legacy aliases like book/home). */
  categoryKey: string;
  childId: string | null;
  onBack: () => void;
  onMissionPress?: (item: StarCamMapMissionItem) => void;
}
