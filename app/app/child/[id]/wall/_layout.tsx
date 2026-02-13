/**
 * Kid's Wall stack: feed (index) and share screen
 */

import { Stack } from 'expo-router';

import { colors } from '@/config/theme/colors';

export default function WallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F4EDD8' },
        animation: 'fade_from_bottom',
      }}
    />
  );
}
