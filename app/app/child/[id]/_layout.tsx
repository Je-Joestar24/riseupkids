/**
 * Child [id] Layout
 * Header + Stack (home, journey, explore, wall) + Footer
 */

import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { View } from 'react-native';

import { FooterNavigation } from '@/components/child/common/footer-navigation';
import { HeaderNav } from '@/components/child/common/header-nav';
import { colors } from '@/config';

export default function ChildLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();

  if (!id) return null;
  const isStarCamRoute = pathname?.includes('/star-cam');

  return (
    <View style={{ flex: 1 }}>
      {!isStarCamRoute ? <HeaderNav childId={id} /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: colors.secondary },
        }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="journey" />
        <Stack.Screen name="module" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="explore-content" />
        <Stack.Screen name="replays" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="star-cam" />
        <Stack.Screen name="star-cam-reading" />
        <Stack.Screen name="star-cam-category" />
        <Stack.Screen name="wall" />
      </Stack>
      {!isStarCamRoute ? <FooterNavigation childId={id} /> : null}
    </View>
  );
}
