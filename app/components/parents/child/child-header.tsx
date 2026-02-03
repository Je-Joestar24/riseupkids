/**
 * Child Header
 * Welcome back message and "Pick your profile" subtitle
 * Mobile and tablet responsive
 */

import { useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const TABLET_BREAKPOINT = 600;

export function ChildHeader() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  return (
    <>
      <ThemedText
        style={{
          fontSize: isTablet ? typography.sizes['3xl'] : typography.sizes['2xl'],
          fontFamily: 'Quicksand_700Bold',
          color: colors.primary,
          marginBottom: spacing[1],
        }}>
        Welcome Back!
      </ThemedText>
      <ThemedText
        style={{
          fontSize: isTablet ? typography.sizes.lg : typography.sizes.base,
          fontFamily: 'Quicksand_500Medium',
          color: colors.textSecondary,
        }}>
        Pick your profile:
      </ThemedText>
    </>
  );
}
