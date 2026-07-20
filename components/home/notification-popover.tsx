import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';
import type { NotificationItem } from '@/lib/types';
import { useNotificationsStore } from '@/stores/notifications-store';

type NotificationTab = 'all' | 'unread';

type NotificationPopoverProps = {
  visible: boolean;
  onClose: () => void;
  onOpenEvent: (eventId: string) => void;
};

const OPEN_SPRING = { damping: 20, stiffness: 190, mass: 0.8 };
const RELEASE_SPRING = { damping: 22, stiffness: 220, mass: 0.8 };
// Fraction of the panel's travel distance a drag must cross to count as a close,
// so the gesture feels consistent whether the panel is short or tall.
const CLOSE_DRAG_FRACTION = 0.28;
const CLOSE_FLING_VELOCITY = -900;

export function NotificationPopover({ visible, onClose, onOpenEvent }: NotificationPopoverProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const notifications = useNotificationsStore((state) => state.notifications);
  const markRead = useNotificationsStore((state) => state.markRead);
  const markAllRead = useNotificationsStore((state) => state.markAllRead);
  const respondToInvite = useNotificationsStore((state) => state.respondToInvite);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [isMounted, setIsMounted] = useState(visible);
  const translateY = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  const panelWidth = Math.min(width - 24, 420);
  const panelMaxHeight = Math.min(560, height - insets.top - insets.bottom - 36);
  const hiddenTranslateY = -(panelMaxHeight + insets.top + 40);
  const closeDragDistance = Math.abs(hiddenTranslateY) * CLOSE_DRAG_FRACTION;
  const unreadCount = notifications.filter((item) => item.unread).length;
  const visibleNotifications = useMemo(
    () => (activeTab === 'unread' ? notifications.filter((item) => item.unread) : notifications),
    [activeTab, notifications],
  );

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = dragStartY.value + event.translationY;
      // Rubber-band past the resting position so dragging down (which has
      // no effect) still gives tactile feedback instead of a hard stop.
      translateY.value = next > 0 ? next * 0.35 : Math.max(next, hiddenTranslateY);
    })
    .onEnd((event) => {
      const droppedFarEnough = translateY.value <= -closeDragDistance;
      const flungClosed = event.velocityY < CLOSE_FLING_VELOCITY;

      if (droppedFarEnough || flungClosed) {
        // Let the gesture's own momentum carry the panel off-screen instead
        // of snapping into the fixed-duration close animation.
        translateY.value = withTiming(hiddenTranslateY, { duration: 160 }, (finished) => {
          if (finished) {
            runOnJS(onClose)();
          }
        });
        return;
      }

      translateY.value = withSpring(0, { ...RELEASE_SPRING, velocity: event.velocityY });
    });

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.value = hiddenTranslateY;
      translateY.value = withSpring(0, OPEN_SPRING);
      return;
    }

    if (translateY.value <= hiddenTranslateY + 1) {
      // A drag-to-close gesture already animated the panel off-screen — don't replay the close animation.
      setIsMounted(false);
      return;
    }

    translateY.value = withTiming(hiddenTranslateY, { duration: 180 }, (finished) => {
      if (finished) {
        runOnJS(setIsMounted)(false);
      }
    });
  }, [hiddenTranslateY, translateY, visible]);

  const openNotification = (notification: NotificationItem) => {
    markRead(notification.id);

    if (!notification.eventId) {
      return;
    }

    onClose();
    onOpenEvent(notification.eventId);
  };

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={isMounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View flex={1}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.panelFrame,
            {
              top: insets.top + 10,
              right: 12,
              width: panelWidth,
              maxHeight: panelMaxHeight,
            },
            panelAnimatedStyle,
          ]}
        >
          <YStack
            maxHeight={panelMaxHeight}
            borderRadius={20}
            borderWidth={1}
            borderColor="rgba(41,47,54,0.12)"
            overflow="hidden"
            backgroundColor={palette.white}
            position="relative"
          >
            <YStack>
              <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16} paddingTop={16} paddingBottom={12}>
                <Text fontSize={17} fontWeight="800" color={palette.ink}>
                  Notifications
                </Text>
                <XStack alignItems="center">
                  {unreadCount > 0 ? (
                    <Pressable onPress={markAllRead} hitSlop={8}>
                      <Text fontSize={12} fontWeight="700" color={palette.primary}>
                        Mark all read
                      </Text>
                    </Pressable>
                  ) : null}
                </XStack>
              </XStack>
            </YStack>

            <XStack gap={8} paddingHorizontal={16} paddingBottom={14}>
              <TabPill label="All" active={activeTab === 'all'} onPress={() => setActiveTab('all')} />
              <TabPill
                label={`Unread${unreadCount > 0 ? ` · ${unreadCount}` : ''}`}
                active={activeTab === 'unread'}
                onPress={() => setActiveTab('unread')}
              />
            </XStack>

            {visibleNotifications.length ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.notificationListContent}>
                {visibleNotifications.map((notification, index) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    showDivider={index < visibleNotifications.length - 1}
                    onPress={() => openNotification(notification)}
                    onRespondToInvite={(status) => respondToInvite(notification.id, status)}
                  />
                ))}
              </ScrollView>
            ) : (
              <YStack alignItems="center" gap={10} paddingHorizontal={20} paddingTop={40} paddingBottom={84}>
                <View width={48} height={48} borderRadius={24} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
                  <IconlyIcon name="CheckCircle" size={22} color={palette.silver} />
                </View>
                <Text fontSize={14} fontWeight="700" color={palette.ink}>
                  You&rsquo;re all caught up
                </Text>
                <Text fontSize={12} color={palette.gray} textAlign="center">
                  New activity on your events and groups will show up here.
                </Text>
              </YStack>
            )}
            <GestureDetector gesture={dragGesture}>
              <View
                position="absolute"
                left={0}
                right={0}
                bottom={0}
                alignItems="center"
                justifyContent="center"
                backgroundColor={palette.white}
                paddingTop={12}
                paddingBottom={28}
              >
                <View
                  width={38}
                  height={4}
                  borderRadius={2}
                  backgroundColor="rgba(41,47,54,0.18)"
                />
              </View>
            </GestureDetector>
          </YStack>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  notificationListContent: {
    paddingBottom: 56,
  },
  panelFrame: {
    position: 'absolute',
    borderRadius: 20,
    shadowColor: '#111114',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 22,
  },
});

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <View
        borderRadius={999}
        paddingHorizontal={14}
        paddingVertical={8}
        backgroundColor={active ? palette.ink : palette.fog}
      >
        <Text fontSize={12} fontWeight="800" color={active ? palette.white : palette.gray}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function NotificationRow({
  notification,
  showDivider,
  onPress,
  onRespondToInvite,
}: {
  notification: NotificationItem;
  showDivider: boolean;
  onPress: () => void;
  onRespondToInvite: (status: 'accepted' | 'declined') => void;
}) {
  const showInviteActions = notification.kind === 'invite' && (notification.inviteStatus ?? 'pending') === 'pending';
  const inviteStatus = notification.inviteStatus;

  return (
    <Pressable onPress={onPress}>
      <XStack
        gap={12}
        paddingHorizontal={16}
        paddingVertical={14}
        borderBottomWidth={showDivider ? StyleSheet.hairlineWidth : 0}
        borderBottomColor={palette.line}
        backgroundColor={notification.unread ? palette.primarySoft : 'transparent'}
      >
        <View>
          <UserAvatar label={notification.actor} size={46} />
          <View
            position="absolute"
            right={-2}
            bottom={-1}
            width={19}
            height={19}
            borderRadius={10}
            borderWidth={2}
            borderColor={palette.white}
            style={{ backgroundColor: notification.iconBackground }}
            alignItems="center"
            justifyContent="center"
          >
            <IconlyIcon name={notification.icon} size={11} color={notification.iconColor} weight="bold" />
          </View>
        </View>

        <YStack flex={1} minWidth={0} gap={4}>
          <XStack alignItems="baseline" gap={5} paddingRight={notification.unread ? 18 : 0}>
            <Text fontSize={13} fontWeight="800" color={palette.ink} numberOfLines={1}>
              {notification.actor}
            </Text>
            <Text fontSize={12} color={palette.muted} numberOfLines={1}>
              {notification.time}
            </Text>
          </XStack>
          <Text fontSize={13} lineHeight={18} color={palette.ink} numberOfLines={2}>
            {notification.title}
          </Text>
          {notification.detail ? (
            <Text fontSize={12} lineHeight={17} color={palette.gray} numberOfLines={2}>
              {notification.detail}
            </Text>
          ) : null}

          {showInviteActions ? (
            <XStack gap={8} marginTop={6}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onRespondToInvite('declined');
                }}
              >
                <View
                  minWidth={92}
                  alignItems="center"
                  borderRadius={999}
                  backgroundColor={palette.white}
                  borderWidth={1}
                  borderColor="rgba(41,47,54,0.16)"
                  paddingVertical={9}
                >
                  <Text fontSize={13} fontWeight="800" color={palette.ink}>
                    Decline
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onRespondToInvite('accepted');
                }}
              >
                <View minWidth={92} alignItems="center" borderRadius={999} backgroundColor={palette.primary} paddingVertical={9}>
                  <Text fontSize={13} fontWeight="800" color={palette.white}>
                    Accept
                  </Text>
                </View>
              </Pressable>
            </XStack>
          ) : null}

          {notification.kind === 'invite' && inviteStatus && inviteStatus !== 'pending' ? (
            <XStack alignItems="center" gap={5} marginTop={6}>
              <IconlyIcon
                name={inviteStatus === 'accepted' ? 'CheckCircle' : 'X'}
                size={13}
                color={inviteStatus === 'accepted' ? palette.green : palette.muted}
              />
              <Text fontSize={12} fontWeight="700" color={inviteStatus === 'accepted' ? palette.green : palette.muted}>
                {inviteStatus === 'accepted' ? 'You accepted' : 'You declined'}
              </Text>
            </XStack>
          ) : null}
        </YStack>

        {notification.unread ? (
          <View width={8} height={8} borderRadius={4} backgroundColor={palette.primary} marginTop={5} />
        ) : null}
      </XStack>
    </Pressable>
  );
}
