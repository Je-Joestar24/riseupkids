import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { typography } from '@/config/theme/typography';
import { useNotificationInbox } from '@/hooks/useNotificationInbox';

interface NotificationBellButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel?: string;
}

export function NotificationBellButton({
  onPress,
  color = colors.primary,
  size = 28,
  accessibilityLabel = 'Notifications',
}: NotificationBellButtonProps) {
  const { unreadCount, fetchUnreadCount } = useNotificationInbox();

  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount]);

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `${accessibilityLabel}, ${unreadCount} unread` : accessibilityLabel}>
      <MaterialIcons name="notifications-none" size={size} color={color} />
      {unreadCount > 0 ? (
        <View style={styles.badge} accessibilityElementsHidden>
          <ThemedText style={styles.badgeText}>{badgeLabel}</ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
    position: 'relative',
  },
  pressed: {
    opacity: 0.85,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.textInverse,
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.xs,
    lineHeight: 14,
  },
});
