/**
 * Explore Star Cam
 * Star + camera entry card (matches web ExploreStarCam)
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

const STAR_SIZE = 96;
const CAMERA_SIZE = 40;

export function ExploreStarCam() {
  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Star Cam">
        <View style={styles.starWrap}>
          <MaterialCommunityIcons
            name="star"
            size={STAR_SIZE}
            color={colors.accent}
            style={styles.starIcon}
          />
          <MaterialCommunityIcons
            name="video-outline"
            size={CAMERA_SIZE}
            color={colors.textInverse}
            style={styles.cameraIcon}
          />
        </View>
        <ThemedText style={styles.label}>Star Cam</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    paddingStart: spacing[0],
    minHeight: 56,
    gap: spacing[4],
  },
  buttonPressed: {
    opacity: 0.9,
  },
  starWrap: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    position: 'absolute',
  },
  cameraIcon: {
    zIndex: 1,
  },
  label: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: -0.3,
  },
});
