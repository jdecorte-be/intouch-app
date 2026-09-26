import { BlurView } from 'expo-blur';
import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import type { NotificationKind } from '@/lib/types';
import {
  addRandomParticipantToChat,
  sendTestNotification,
  testSignIn,
  testSignInForOnboarding,
  testStartWelcomeOnboarding,
} from '@/stores/dev-actions';
import { useEventsStore } from '@/stores/events-store';
import { useSessionStore } from '@/stores/session-store';

type TestingAction = {
  key: string;
  label: string;
  description?: string;
  icon: IconlyIconName;
  onPress: () => void;
  featured?: boolean;
  destructive?: boolean;
};

const BUTTON_SIZE = 56;
const MARGIN = 14;
const EDGE_PADDING = 8;
// Below this total drag distance, a release is treated as a tap rather than a drag.
const DRAG_TAP_THRESHOLD = 6;

export function TestingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const firstEventId = useEventsStore((state) => state.events[0]?.id);
  const signOut = useSessionStore((state) => state.signOut);

  const baseLeft = MARGIN;
  const baseBottom = Math.max(insets.bottom, 10) + MARGIN;
  const baseTop = screenHeight - baseBottom - BUTTON_SIZE;

  const minTranslateX = EDGE_PADDING - baseLeft;
  const maxTranslateX = screenWidth - BUTTON_SIZE - EDGE_PADDING - baseLeft;
  const minTranslateY = insets.top + EDGE_PADDING - baseTop;
  const maxTranslateY = screenHeight - BUTTON_SIZE - Math.max(insets.bottom, 10) - EDGE_PADDING - baseTop;

  const toggleMenu = () => setIsOpen((current) => !current);

  // Tap and drag are recognized independently and raced against each other, rather than
  // inferred from the pan's finalize distance, that approach was flaky (a stationary touch
  // can resolve as failed/cancelled before translation values are reliably populated).
  const tapGesture = Gesture.Tap()
    .maxDistance(DRAG_TAP_THRESHOLD)
    .onEnd(() => {
      runOnJS(toggleMenu)();
    });

  const dragGesture = Gesture.Pan()
    .minDistance(DRAG_TAP_THRESHOLD)
    .onStart(() => {
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(maxTranslateX, Math.max(minTranslateX, dragStartX.value + event.translationX));
      translateY.value = Math.min(maxTranslateY, Math.max(minTranslateY, dragStartY.value + event.translationY));
    });

  const triggerGesture = Gesture.Race(dragGesture, tapGesture);

  const wrapperAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!__DEV__) {
    return null;
  }

  const currentChatId =
    pathname.startsWith('/chat/') && params.id
      ? Array.isArray(params.id)
        ? params.id[0]
        : params.id
      : null;

  const handleTestWelcomeOnboarding = () => {
    testStartWelcomeOnboarding();
    router.replace('/welcome');
  };

  const handleTestPostLoginOnboarding = () => {
    testSignInForOnboarding();
    router.replace('/onboarding');
  };

  const actions: TestingAction[] = [
    ...(currentChatId
      ? [
          {
            key: 'random-chat-join',
            label: 'Random joins chat',
            icon: 'Group' as const,
            onPress: () => addRandomParticipantToChat(currentChatId),
          },
        ]
      : []),
    {
      key: 'test-user',
      label: 'Login with test account',
      description: 'Use local test profile',
      icon: 'UserPlus',
      onPress: testSignIn,
      featured: true,
    },
    {
      key: 'test-login-onboarding',
      label: 'Login onboarding',
      description: 'Replay profile setup flow',
      icon: 'Play',
      onPress: handleTestPostLoginOnboarding,
      featured: true,
    },
    {
      key: 'test-welcome-onboarding',
      label: 'Welcome onboarding',
      description: 'Replay first-run flow',
      icon: 'Play',
      onPress: handleTestWelcomeOnboarding,
      featured: true,
    },
    {
      key: 'sign-out',
      label: 'Sign out',
      icon: 'ArrowOutRightCircleHalf',
      onPress: signOut,
      destructive: true,
    },
  ];
  const notificationActions: (TestingAction & { kind: NotificationKind })[] = [
    {
      key: 'notify-comment',
      label: 'Comment',
      icon: 'MessageCircleDots',
      kind: 'comment',
      onPress: () => sendTestNotification('comment', firstEventId),
    },
    {
      key: 'notify-generated',
      label: 'Generated',
      icon: 'Sparkles',
      kind: 'generated',
      onPress: () => sendTestNotification('generated', firstEventId),
    },
    {
      key: 'notify-invite',
      label: 'Invite',
      icon: 'UserPlus',
      kind: 'invite',
      onPress: () => sendTestNotification('invite', firstEventId),
    },
    {
      key: 'notify-like',
      label: 'Like',
      icon: 'Heart',
      kind: 'like',
      onPress: () => sendTestNotification('like', firstEventId),
    },
  ];

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {isOpen ? <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOpen(false)} /> : null}

      <Animated.View style={[styles.wrapper, { left: baseLeft, bottom: baseBottom }, wrapperAnimatedStyle]}>
        <YStack alignItems="flex-start" gap={8}>
          {isOpen ? (
            <View borderRadius={8} overflow="hidden" borderWidth={1} borderColor="rgba(255,255,255,0.18)">
              <BlurView intensity={72} tint="dark" style={StyleSheet.absoluteFill} />
              <YStack backgroundColor="rgba(41,47,54,0.76)" paddingVertical={6} minWidth={190}>
                <Pressable onPress={() => setIsNotificationsOpen((current) => !current)}>
                  <XStack height={42} alignItems="center" gap={10} paddingHorizontal={13}>
                    <IconlyIcon name="Bell" size={18} color={palette.white} />
                    <Text color={palette.white} fontSize={13} fontWeight="700" flex={1}>
                      Notifications
                    </Text>
                    <IconlyIcon name={isNotificationsOpen ? 'ChevronUp' : 'ChevronDown'} size={16} color={palette.white} />
                  </XStack>
                </Pressable>

                {isNotificationsOpen
                  ? notificationActions.map((action) => (
                      <Pressable
                        key={action.key}
                        onPress={() => {
                          setIsOpen(false);
                          action.onPress();
                        }}
                      >
                        <XStack height={38} alignItems="center" gap={10} paddingLeft={28} paddingRight={13}>
                          <IconlyIcon name={action.icon} size={17} color={palette.white} />
                          <Text color={palette.white} fontSize={13} fontWeight="700">
                            {action.label}
                          </Text>
                        </XStack>
                      </Pressable>
                    ))
                  : null}

                {actions.map((action) => (
                  <Pressable
                    key={action.key}
                    onPress={() => {
                      setIsOpen(false);
                      action.onPress();
                    }}
                  >
                    <XStack
                      minHeight={action.featured ? 54 : 42}
                      alignItems="center"
                      gap={10}
                      marginHorizontal={action.featured ? 6 : 0}
                      marginVertical={action.featured ? 3 : 0}
                      paddingHorizontal={action.featured ? 9 : 13}
                      borderRadius={action.featured ? 8 : 0}
                      borderWidth={action.featured ? 1 : 0}
                      borderColor={action.featured ? 'rgba(255,255,255,0.24)' : 'transparent'}
                      backgroundColor={action.featured ? 'rgba(0,0,0,0.32)' : 'transparent'}
                    >
                      <View
                        width={action.featured ? 30 : 18}
                        height={action.featured ? 30 : 18}
                        borderRadius={action.featured ? 8 : 0}
                        alignItems="center"
                        justifyContent="center"
                        backgroundColor={action.featured ? 'rgba(255,255,255,0.16)' : 'transparent'}
                      >
                        <IconlyIcon
                          name={action.icon}
                          size={action.featured ? 16 : 18}
                          color={action.destructive ? palette.coral : palette.white}
                          weight={action.featured ? 'bold' : undefined}
                        />
                      </View>
                      <YStack flex={1} gap={1}>
                        <Text
                          color={action.destructive ? palette.coral : palette.white}
                          fontSize={13}
                          lineHeight={17}
                          fontWeight="800"
                          numberOfLines={1}
                        >
                          {action.label}
                        </Text>
                        {action.description ? (
                          <Text
                            color="rgba(255,255,255,0.66)"
                            fontSize={11}
                            lineHeight={14}
                            fontWeight="600"
                            numberOfLines={1}
                          >
                            {action.description}
                          </Text>
                        ) : null}
                      </YStack>
                      {action.featured ? (
                        <IconlyIcon name="ChevronRight" size={15} color="rgba(255,255,255,0.72)" />
                      ) : null}
                    </XStack>
                  </Pressable>
                ))}
              </YStack>
            </View>
          ) : null}

          <GestureDetector gesture={triggerGesture}>
            <View accessibilityRole="button" accessibilityLabel="Open testing menu" style={styles.trigger}>
              <IconlyIcon name={isOpen ? 'ChevronDown' : 'Cog'} size={24} color={palette.white} weight="bold" />
            </View>
          </GestureDetector>
        </YStack>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 1000,
  },
  trigger: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: palette.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    opacity: 0.86,
  },
});
