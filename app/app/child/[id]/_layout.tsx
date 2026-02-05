/**
 * Child [id] Layout
 * Header + Stack (home, journey, explore, wall) + Footer
 */

import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { FooterNavigation } from '@/components/child/common/footer-navigation';
import { HeaderNav } from '@/components/child/common/header-nav';
import { colors } from '@/config';

export default function ChildLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return (
    <View style={{ flex: 1 }}>
      <HeaderNav childId={id} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.secondary },
        }}
      />
      <FooterNavigation childId={id} />
    </View>
  );
}
