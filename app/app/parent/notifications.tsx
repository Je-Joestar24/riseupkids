import { useCallback, useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { NotificationInboxRow } from '@/components/notifications/notification-inbox-row';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useNotificationInbox } from '@/hooks/useNotificationInbox';
import type { NotificationInboxItem } from '@/services/notificationInboxService';
import { inboxItemPath } from '@/utils/notificationCenter';

export default function ParentNotificationsScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const { items, unreadCount, loading, loadingMore, error, refresh, loadMore, markRead, markAllRead } =
    useNotificationInbox();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/parent/selectchild' as never);
  };

  const handleOpen = useCallback(
    async (item: NotificationInboxItem) => {
      if (item.isUnread) {
        await markRead(item._id);
      }
      const path = inboxItemPath(item, childId || null);
      if (path) {
        router.push(path as never);
        return;
      }
      if (childId) {
        router.push(`/child/${childId}/home` as never);
      }
    },
    [childId, markRead, router]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ThemedText style={styles.headerButtonText}>Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.title} accessibilityRole="header">
          Notifications
        </ThemedText>
        <Pressable
          onPress={() => void markAllRead()}
          disabled={unreadCount === 0}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed, unreadCount === 0 && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read">
          <ThemedText style={styles.headerButtonText}>Read all</ThemedText>
        </Pressable>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null
          }
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              {error || 'No notifications yet. New updates will show up here even if a banner is dismissed.'}
            </ThemedText>
          }
          renderItem={({ item }) => <NotificationInboxRow item={item} onPress={(row) => void handleOpen(row)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.textInverse,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  headerButton: {
    paddingVertical: spacing[2],
    minWidth: 72,
  },
  headerButtonText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.primary,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  list: {
    padding: spacing[4],
    gap: spacing[3],
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    marginVertical: spacing[4],
  },
});
