import {
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { GlobalDialog } from '@/components/ui/global-dialog';
import { LegalAcceptanceGate } from '@/components/legal/LegalAcceptanceGate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/authHook';
import { useLegalAcceptance } from '@/hooks/legalAcceptanceHook';
import { useStartupPermissions } from '@/hooks/useStartupPermissions';
import { setTokenGetter } from '@/services/tokenBridge';
import { useAuthStore } from '@/store/useAuthStore';
import { hideSplashScreen, initSplashScreen } from '@/utils/splashScreen';

void initSplashScreen();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hydrate } = useAuth();
  const { isReady: legalReady, hasAccepted, accept } = useLegalAcceptance();

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
    if (!fontsLoaded || !legalReady) {
      return;
    }

    let cancelled = false;

    void hydrate()
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        void hideSplashScreen().finally(() => {
          void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
            () => {}
          );
        });
      });

    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, legalReady, hydrate]);

  if (!fontsLoaded || !legalReady) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
        <LegalAcceptanceGate visible={!hasAccepted} onAccept={accept} />
        <GlobalDialog />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
