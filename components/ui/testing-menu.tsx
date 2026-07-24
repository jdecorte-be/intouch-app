import { BlurView } from 'expo-blur';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import type { NotificationKind } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSessionStore } from '@/stores/session-store';

type TestingAction = {
  key: string;
  label: string;
  icon: IconlyIconName;
  onPress: () => void;
  destructive?: boolean;
};

const BUTTON_SIZE = 42;
const MARGIN = 14;
const EDGE_PADDING = 8;
// Below this total drag distance, a release is treated as a tap rather than a drag.
const DRAG_TAP_THRESHOLD = 6;

export function TestingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ id?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const addRandomParticipantToChat = useChatStore((state) => state.addRandomParticipantToChat);
  const firstEventId = useEventsStore((state) => state.events[0]?.id);
  const sendTestNotification = useNotificationsStore((state) => state.sendTestNotification);
  const testSignIn = useSessionStore((state) => state.testSignIn);
  const testSignInForOnboarding = useSessionStore((state) => state.testSignInForOnboarding);
  const signOut = useSessionStore((state) => state.signOut);

  const baseLeft = MARGIN;
  const baseBottom = Math.max(insets.bottom, 10) + MARGIN;
  const baseTop = screenHeight - baseBottom - BUTTON_SIZE;

  const minTranslateX = EDGE_PADDING - baseLeft;
  const maxTranslateX = screenWidth - BUTTON_SIZE - EDGE_PADDING - baseLeft;
  const minTranslateY = insets.top + EDGE_PADDING - baseTop;
  const maxTranslateY = screenHeight - BUTTON_SIZE - Math.max(insets.bottom, 10) - EDGE_PADDING - baseTop;

  const toggleMenu = () => setIsOpen((current) => !current);

  const dragGesture = Gesture.Pan()
    .minDistance(0)
    .onStart(() => {
      dragStartX.value = translateX.value;
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(maxTranslateX, Math.max(minTranslateX, dragStartX.value + event.translationX));
      translateY.value = Math.min(maxTranslateY, Math.max(minTranslateY, dragStartY.value + event.translationY));
    })
    .onFinalize((event) => {
      // A quick tap often never crosses minDistance, so the gesture never activates and
      // onEnd never fires. onFinalize always fires, active or not, so tap detection lives here.
      const moved = Math.abs(event.translationX) + Math.abs(event.translationY);
      if (moved < DRAG_TAP_THRESHOLD) {
        runOnJS(toggleMenu)();
      }
    });

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
      label: 'Test user',
      icon: 'UserPlus',
      onPress: testSignIn,
    },
    {
      key: 'test-onboarding',
      label: 'Test onboarding',
      icon: 'Cog',
      onPress: testSignInForOnboarding,
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
                    <XStack height={42} alignItems="center" gap={10} paddingHorizontal={13}>
                      <IconlyIcon
                        name={action.icon}
                        size={18}
                        color={action.destructive ? palette.coral : palette.white}
                      />
                      <Text
                        color={action.destructive ? palette.coral : palette.white}
                        fontSize={13}
                        fontWeight="700"
                      >
                        {action.label}
                      </Text>
                    </XStack>
                  </Pressable>
                ))}
              </YStack>
            </View>
          ) : null}

          <GestureDetector gesture={dragGesture}>
            <View accessibilityRole="button" accessibilityLabel="Open testing menu" style={styles.trigger}>
              <IconlyIcon name={isOpen ? 'ChevronDown' : 'Cog'} size={18} color={palette.white} />
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
    borderRadius: 8,
    backgroundColor: palette.ink,
    opacity: 0.2,
  },
});
