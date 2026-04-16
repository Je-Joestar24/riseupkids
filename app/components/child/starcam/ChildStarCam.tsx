import React, { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useStarCam } from '@/hooks/starCamHook';

import { StarCamExplorerMap } from './StarCamExplorerMap';
import { StarCamFooter } from './StarCamFooter';
import { StarCamHeader } from './StarCamHeader';
import { StarCamPhoneFrame } from './StarCamPhoneFrame';
import type { ChildStarCamProps } from './types';
import { useStarCamBubbleItems } from './useStarCamBubbleItems';
import { useStarCamExplorerAnimations } from './useStarCamExplorerAnimations';

export function ChildStarCam({ childId, onSelectCategory, onGoHome }: ChildStarCamProps) {
  const {
    categories,
    isLoadingCategories,
    error,
    loadCategories,
    chooseCategory,
    clearError,
  } = useStarCam();

  const { pulse, ping } = useStarCamExplorerAnimations();
  const bubbleItems = useStarCamBubbleItems(categories);

  useEffect(() => {
    if (!childId) return;
    void loadCategories(childId);
  }, [childId, loadCategories]);

  const handleBubblePress = useCallback(
    (categoryKey: string) => {
      chooseCategory(categoryKey);
      onSelectCategory?.(categoryKey);
    },
    [chooseCategory, onSelectCategory]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'right', 'bottom', 'left']}>
      <StarCamPhoneFrame>
        <StarCamHeader />
        <StarCamExplorerMap
          bubbleItems={bubbleItems}
          pulse={pulse}
          ping={ping}
          onBubblePress={handleBubblePress}
          onGoHome={onGoHome}
          isLoadingCategories={isLoadingCategories}
          error={error}
          onDismissError={clearError}
        />
        <StarCamFooter />
      </StarCamPhoneFrame>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    padding: 0,
  },
});

export default ChildStarCam;
