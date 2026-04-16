import type { ImageSourcePropType } from 'react-native';

export interface ChildStarCamProps {
  childId?: string | null;
  onSelectCategory?: (categoryKey: string) => void;
  onGoHome?: () => void;
}

export interface StarCamBubblePreset {
  key: string;
  title: string;
  left: number;
  top: number;
  color: string;
  iconType: 'image' | 'emoji';
  image?: ImageSourcePropType;
  emoji?: string;
}
