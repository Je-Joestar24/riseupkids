import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { GlobalDialog } from '@/components/ui/global-dialog';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/authHook';
import { useStartupPermissions } from '@/hooks/useStartupPermissions';
import { setTokenGetter } from '@/services/tokenBridge';
import { useAuthStore } from '@/store/useAuthStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hydrate } = useAuth();

  useEffect(() => {
    setTokenGetter(() => useAuthStore.getState().token);
  }, []);

  const [fontsLoaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });
  useStartupPermissions(fontsLoaded);

  useEffect(() => {
    if (fontsLoaded) {
      hydrate().finally(() => SplashScreen.hideAsync());
    }
  }, [fontsLoaded, hydrate]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
        <GlobalDialog />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
