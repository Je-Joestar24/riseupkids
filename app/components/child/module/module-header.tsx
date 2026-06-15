/**
 * Module header – cover image, back button, step badge.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

const COVER_HEIGHT = Math.round(256 * 1.1);
const BACK_ICON_SIZE = 24;

export interface ModuleHeaderProps {
  badgeLabel: string;
  childId: string;
  coverImageUrl: string | null;
  courseTitle: string;
}

export function ModuleHeader({
  badgeLabel,
  childId,
  coverImageUrl,
  courseTitle,
}: ModuleHeaderProps) {
  const router = useRouter();

  const onBack = () => {
    router.push(`/child/${childId}/journey` as never);
  };

  const content = (
    <>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go back to journey">
        <MaterialCommunityIcons
          name="arrow-left"
          size={BACK_ICON_SIZE}
          color={colors.secondary}
        />
      </Pressable>
      <View style={styles.stepBadge}>
        <View style={styles.stepBox} />
        <ThemedText style={styles.stepText} numberOfLines={2}>
          {badgeLabel}
        </ThemedText>
      </View>
    </>
  );

  if (coverImageUrl) {
    return (
      <View style={styles.coverWrap}>
        <Image
          source={{ uri: coverImageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={courseTitle ? `${courseTitle} cover` : 'Course cover'}
        />
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.coverWrap, styles.coverPlaceholder]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    position: 'relative',
    width: '100%',
    maxWidth: 848,
    height: COVER_HEIGHT,
    marginTop: spacing[5],
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  coverPlaceholder: {
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    top: spacing[5],
    left: spacing[5],
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  backButtonPressed: {
    opacity: 0.9,
  },
  stepBadge: {
    position: 'absolute',
    bottom: spacing[5],
    left: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.textInverse,
    borderRadius: 20,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  stepBox: {
    width: 16,
    height: 16,
    backgroundColor: colors.textInverse,
    borderRadius: 0,
    marginRight: spacing[2],
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
