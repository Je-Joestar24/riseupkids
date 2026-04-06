import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/config/theme/colors';

export interface StarCamPhoneFrameProps {
  children: ReactNode;
}

/** Accent-bordered frame wrapping header, map, and footer. */
export const StarCamPhoneFrame = memo(function StarCamPhoneFrame({ children }: StarCamPhoneFrameProps) {
  return <View style={styles.phoneFrame}>{children}</View>;
});

const styles = StyleSheet.create({
  phoneFrame: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
