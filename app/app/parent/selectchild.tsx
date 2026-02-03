/**
 * Parent Select Child Screen
 * Child profile selection for parents - pick a profile to continue
 * Mobile and tablet responsive (APK & iOS only)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChildAddModal } from '@/components/parents/child/child-add-modal';
import { ChildHeader } from '@/components/parents/child/child-header';
import { ChildList } from '@/components/parents/child/child-list';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useAuth } from '@/hooks/authHook';
import { useParentChild } from '@/hooks/parentChildHook';
import type { ChildProfile } from '@/services/parentChildService';

const TABLET_BREAKPOINT = 600;
const SELECTED_CHILD_KEY = '@riseupkids_selectedChildId';
const SELECTED_CHILD_DATA_KEY = '@riseupkids_selectedChild';

export default function SelectChildScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const maxContentWidth = isTablet ? 480 : width - spacing[8];

  const { user, isAuthenticated } = useAuth();
  const { children, isLoading, fetchChildren } = useParentChild();

  const [addModalOpen, setAddModalOpen] = useState(false);

  // Redirect if not authenticated or not a parent
  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/');
      return;
    }
    if (user.role !== 'parent') {
      router.replace('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Fetch children when parent is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.role === 'parent') {
      fetchChildren({ isActive: true });
    }
  }, [isAuthenticated, user?.role, fetchChildren]);

  const handleSelectChild = async (child: ChildProfile) => {
    if (!child?._id) return;
    await AsyncStorage.setItem(SELECTED_CHILD_KEY, child._id);
    await AsyncStorage.setItem(SELECTED_CHILD_DATA_KEY, JSON.stringify(child));
    // Navigate to child home (placeholder - add route when ready)
    router.push({ pathname: '/child/[id]/home', params: { id: child._id } } as never);
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    fetchChildren({ isActive: true });
  };

  if (!isAuthenticated || !user || user.role !== 'parent') {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/big-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Rise Up Kids Logo"
          />
        </View>

        {/* Card */}
        <View style={[styles.card, { maxWidth: maxContentWidth }]}>
          <View style={styles.header}>
            <ChildHeader />
          </View>

          {/* List or empty/loading state */}
          <View style={styles.listWrap}>
            {isLoading && children.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText style={styles.emptyText}>Loading children...</ThemedText>
              </View>
            ) : children.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>
                  No children found. Add your first child!
                </ThemedText>
              </View>
            ) : (
              <ChildList children={children} onSelectChild={handleSelectChild} />
            )}
          </View>

          {/* Add New Kid Button */}
          <Pressable
            onPress={() => setAddModalOpen(true)}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add new child">
            <MaterialIcons
              name="add"
              size={isTablet ? 36 : 32}
              color={colors.textSecondary}
            />
            <ThemedText style={styles.addButtonText}>Add New Kid</ThemedText>
          </Pressable>

          {/* Parent Login link - navigates back to main login */}
          <Pressable
            onPress={() => router.replace('/')}
            style={styles.parentLink}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Parent login">
            <MaterialIcons name="lock" size={20} color={colors.accent} />
            <ThemedText style={styles.parentLinkText}>Parent Login</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <ChildAddModal open={addModalOpen} onClose={handleCloseAddModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLogin,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  logoWrap: {
    marginBottom: spacing[6],
  },
  logo: {
    width: 180,
    height: 180,
  },
  card: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: spacing[5],
  },
  listWrap: {
    marginBottom: spacing[5],
    minHeight: 80,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    borderWidth: 4,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.none,
    backgroundColor: '#fff',
  },
  addButtonPressed: {
    backgroundColor: `${colors.primary}08`,
    borderColor: colors.primary,
  },
  addButtonText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  parentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[5],
    opacity: 0.9,
  },
  parentLinkText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
});
