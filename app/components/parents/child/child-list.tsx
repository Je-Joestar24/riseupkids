/**
 * Child List
 * Displays list of child profile cards - tap to select
 * Mobile and tablet responsive
 */

import { useWindowDimensions } from 'react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import type { ChildProfile } from '@/services/parentChildService';

const TABLET_BREAKPOINT = 600;

const ROCKET_ICON = require('@/assets/icons/rocket-svgrepo-com.png');
const STAR_ICON = require('@/assets/icons/star-svgrepo-com.png');

interface ChildListProps {
  children: ChildProfile[];
  onSelectChild: (child: ChildProfile) => void;
  onDeleteChild?: (child: ChildProfile) => void;
}

export function ChildList({ children, onSelectChild, onDeleteChild }: ChildListProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const avatarSize = isTablet ? 84 : 70;
  const iconSize = isTablet ? 44 : 36;

  if (!children?.length) return null;

  return (
    <View style={styles.container}>
      {children.map((child, index) => {
        const isEven = index % 2 === 0;
        const bgColor = isEven ? 'rgb(212, 230, 227)' : 'rgb(253, 232, 222)';
        const pressedColor = isEven ? '#c4d6d3' : 'rgba(233, 138, 104, 0.5)';
        const accentColor = isEven ? colors.primary : colors.orange;

        return (
          <Pressable
            key={child._id}
            onPress={() => onSelectChild(child)}
            onLongPress={onDeleteChild ? () => onDeleteChild(child) : undefined}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: pressed ? pressedColor : bgColor },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Select ${child.displayName}`}
            accessibilityHint={
              onDeleteChild ? 'Long press to delete this child profile' : undefined
            }>
            {/* Avatar */}
            <View
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  backgroundColor: accentColor,
                },
              ]}>
              {child.avatar ? (
                <Image
                  source={{ uri: child.avatar }}
                  style={[styles.avatarImage, { width: avatarSize, height: avatarSize }]}
                  resizeMode="cover"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <Image
                  source={isEven ? ROCKET_ICON : STAR_ICON}
                  style={{ width: iconSize, height: iconSize }}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              )}
            </View>

            {/* Child info */}
            <View style={styles.info}>
              <ThemedText
                style={[
                  styles.name,
                  { color: accentColor },
                  isTablet && { fontSize: typography.sizes.xl },
                ]}>
                {child.displayName}
              </ThemedText>
              <ThemedText style={styles.age}>
                Age {child.age ?? '—'}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: 0,
  },
  avatar: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[4],
    overflow: 'hidden',
  },
  avatarImage: {
    borderRadius: 9999,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.lg,
    marginBottom: spacing[1],
  },
  age: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    opacity: 0.8,
  },
});
