import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';

import { palette } from '@/lib/palette';
import { canUseNativeModules } from '@/lib/runtime';
import { initSuperTokens } from '@/lib/supertokens';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSessionStore } from '@/stores/session-store';
import { tamaguiConfig } from '@/tamagui.config';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync();
initSuperTokens();

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

// The testing menu and its helpers are development-only. Requiring them behind
// __DEV__ lets Metro drop them from release bundles.
let TestingMenu: (typeof import('@/components/ui/testing-menu'))['TestingMenu'] | null = null;

if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TestingMenu = require('@/components/ui/testing-menu').TestingMenu;
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const user = useSessionStore((state) => state.user);
  const hasSeenWelcome = useSessionStore((state) => state.hasSeenWelcome);
  const loadEvents = useEventsStore((state) => state.loadEvents);
  const loadSession = useSessionStore((state) => state.loadSession);
  const loadThreads = useChatStore((state) => state.loadThreads);
  const loadNotifications = useNotificationsStore((state) => state.loadNotifications);

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

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* InTouch ships light-only, mirroring the web app. */}
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: palette.white },
            }}
          >
            <Stack.Protected guard={!!user}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="event/[id]" />
              <Stack.Screen name="user/[id]" />
              <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="host" options={{ presentation: 'modal' }} />
              <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
            <Stack.Protected guard={!user && !hasSeenWelcome}>
              <Stack.Screen name="welcome" />
            </Stack.Protected>
            <Stack.Protected guard={!user}>
              <Stack.Screen
                name="auth"
                options={{
                  animation: 'fade_from_bottom',
                  animationDuration: 260,
                  animationTypeForReplace: 'push',
                }}
              />
              <Stack.Screen name="login" options={{ animation: 'none' }} />
              <Stack.Screen name="register" options={{ animation: 'none' }} />
            </Stack.Protected>
          </Stack>
          <StatusBar style="dark" />
          {TestingMenu ? <TestingMenu /> : null}
        </ThemeProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
