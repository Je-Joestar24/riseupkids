import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable } from 'react-native';

import { colors } from '@/config/theme/colors';

import { mapStyles } from './mapStyles';

export interface StarCamMapBackButtonProps {
  borderColor: string;
  onBack: () => void;
}

export const StarCamMapBackButton = memo(function StarCamMapBackButton({
  borderColor,
  onBack,
}: StarCamMapBackButtonProps) {
  return (
    <Pressable
      onPress={onBack}
      style={[mapStyles.backBtn, { backgroundColor: borderColor }]}
      accessibilityRole="button"
      accessibilityLabel="Go back">
      <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textInverse} />
    </Pressable>
  );
});
