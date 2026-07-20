import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';

import { AppSplashScreen } from '@/components/ui/app-splash-screen';
import { shouldShowOnboarding } from '@/lib/onboarding';
import { palette } from '@/lib/palette';
import { canUseNativeModules } from '@/lib/runtime';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSessionStore } from '@/stores/session-store';
import { tamaguiConfig } from '@/tamagui.config';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();

if (canUseNativeModules) {
  SplashScreen.setOptions({
    duration: 500,
    fade: true,
  });
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.white,
    card: palette.white,
    text: palette.ink,
    primary: palette.primary,
    border: palette.line,
  },
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [showEntrySplash, setShowEntrySplash] = useState(true);
  const user = useSessionStore((state) => state.user);
  const completedOnboardingUserIds = useSessionStore((state) => state.completedOnboardingUserIds);
  const loadEvents = useEventsStore((state) => state.loadEvents);
  const loadSession = useSessionStore((state) => state.loadSession);
  const loadThreads = useChatStore((state) => state.loadThreads);
  const loadNotifications = useNotificationsStore((state) => state.loadNotifications);
  const needsOnboarding = shouldShowOnboarding(user, completedOnboardingUserIds);

  useEffect(() => {
    let isMounted = true;

    async function loadAppData() {
      try {
        await Promise.all([loadSession(), loadEvents(), loadThreads(), loadNotifications()]);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    void loadAppData();

    return () => {
      isMounted = false;
    };
  }, [loadEvents, loadNotifications, loadSession, loadThreads]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  const finishEntrySplash = useCallback(() => {
    setShowEntrySplash(false);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ReTalk ships light-only, mirroring the web app. */}
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: palette.white },
            }}
          >
            <Stack.Protected guard={!!user && needsOnboarding}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={!!user && !needsOnboarding}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="event/[id]" />
              <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="host" options={{ presentation: 'modal' }} />
              <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
            </Stack.Protected>
            <Stack.Protected guard={!user}>
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
            </Stack.Protected>
          </Stack>
          <StatusBar style="dark" />
          {showEntrySplash ? <AppSplashScreen onFinish={finishEntrySplash} /> : null}
        </ThemeProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
