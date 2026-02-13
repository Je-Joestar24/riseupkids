/**
 * Kid's Wall – Share Something
 * Placeholder for post creation (title, content, image upload).
 * TODO: Wire form + image picker + createPost from useKidsWall(childId).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function WallShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons
          name="star-four-points-outline"
          size={56}
          color={colors.accent}
          style={styles.icon}
        />
        <ThemedText style={styles.title}>Share Your Amazing Work!</ThemedText>
        <ThemedText style={styles.subtitle}>
          Ask a grown-up to help you add a title, description, and photo. This screen will have the form soon!
        </ThemedText>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back to Kid's Wall">
          <ThemedText style={styles.backBtnText}>Back to Kid's Wall</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EDD8',
    padding: spacing[4],
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.bgCard,
    padding: spacing[8],
    borderRadius: 0,
    borderWidth: 4,
    borderColor: colors.secondary,
    alignItems: 'center',
  },
  icon: {
    marginBottom: spacing[4],
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 24,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontFamily: 'Quicksand_400Regular',
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: 24,
  },
  backBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.orange,
    borderRadius: 0,
  },
  backBtnPressed: {
    opacity: 0.9,
  },
  backBtnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: 16,
    color: colors.textInverse,
  },
});
