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
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { GlobalDialog } from '@/components/ui/global-dialog';
import { GlobalNetworkModal } from '@/components/ui/global-network-modal';
import { LegalAcceptanceGate } from '@/components/legal/LegalAcceptanceGate';
import { useAndroidImmersiveFullscreen } from '@/hooks/useAndroidImmersiveFullscreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/authHook';
import { useLegalAcceptance } from '@/hooks/legalAcceptanceHook';
import { useDeviceTimezoneReport } from '@/hooks/useDeviceTimezoneReport';
import { useNotificationPushBootstrap } from '@/hooks/useNotificationPushBootstrap';
import { useNotificationPushRegistration } from '@/hooks/useNotificationPushRegistration';
import { useNotificationTapRouting } from '@/hooks/useNotificationTapRouting';
import { useStartupPermissions } from '@/hooks/useStartupPermissions';
import { PushDebugPanel } from '@/components/notifications/push-debug-panel';
import { setTokenGetter } from '@/services/tokenBridge';
import { useAuthStore } from '@/store/useAuthStore';
import { restoreAndroidImmersiveDefault } from '@/utils/androidNavigationBar';
import { hideSplashScreen, initSplashScreen } from '@/utils/splashScreen';

// Global scope (do not await) — required so iOS registers splash before first paint.
initSplashScreen();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { hydrate } = useAuth();
  const { isReady: legalReady, hasAccepted, accept } = useLegalAcceptance();

  // Android only: game-like immersive sticky fullscreen for the whole session.
  useAndroidImmersiveFullscreen();

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
  useNotificationPushBootstrap();
  useDeviceTimezoneReport(fontsLoaded && legalReady);
  useNotificationPushRegistration(fontsLoaded && legalReady);
  useNotificationTapRouting(fontsLoaded && legalReady);

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
          if (Platform.OS === 'android') {
            restoreAndroidImmersiveDefault();
            RNStatusBar.setHidden(true, 'fade');
          }
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
        <GlobalNetworkModal />
        <PushDebugPanel />
        <StatusBar style="auto" hidden={Platform.OS === 'android'} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
