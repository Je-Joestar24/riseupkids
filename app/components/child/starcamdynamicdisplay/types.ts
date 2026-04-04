import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';

import type { StarCamMissionMapBubble } from '@/services/childStarCamService';

export type StarCamMapMissionItem = StarCamMissionMapBubble;

export type StarCamCategoryKey = 'reading' | 'recipes' | 'nature' | 'sing' | 'school';

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
  key: StarCamCategoryKey;
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
  categoryKey: StarCamCategoryKey;
  childId: string | null;
  onBack: () => void;
  onMissionPress?: (item: StarCamMapMissionItem) => void;
}
