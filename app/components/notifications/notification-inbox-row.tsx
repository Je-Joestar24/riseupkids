import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import type { NotificationInboxItem } from '@/services/notificationInboxService';
import { formatInboxDate } from '@/utils/notificationCenter';
import {
  getNotificationInboxImageSource,
  hasCampaignInboxImage,
} from '@/utils/notificationInboxImage';

interface NotificationInboxRowProps {
  item: NotificationInboxItem;
  onPress: (item: NotificationInboxItem) => void;
}

export function NotificationInboxRow({ item, onPress }: NotificationInboxRowProps) {
  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.card, item.isUnread && styles.unreadCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={item.title}>
      <Image
        source={getNotificationInboxImageSource(item.imageUrl)}
        style={styles.image}
        resizeMode={hasCampaignInboxImage(item.imageUrl) ? 'cover' : 'contain'}
        accessibilityLabel={hasCampaignInboxImage(item.imageUrl) ? '' : 'Rise Up Kids logo'}
      />
      <View style={styles.body}>
        <ThemedText style={styles.title}>{item.title}</ThemedText>
        <ThemedText style={styles.message} numberOfLines={3}>
          {item.message}
        </ThemedText>
        <ThemedText style={styles.date}>{formatInboxDate(item.createdAt)}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.textInverse,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3],
  },
  unreadCard: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  pressed: {
    opacity: 0.8,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.bgTertiary,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  message: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  date: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
