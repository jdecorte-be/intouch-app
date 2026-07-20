import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { shareEvent } from '@/components/events/featured-event-card';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { GlassMenu, type GlassMenuItem } from '@/components/ui/glass-menu';
import { AvatarGroup, UserAvatar } from '@/components/ui/user-avatar';
import { eventImageUrl } from '@/lib/event-data';
import {
  getCategoryLabel,
  getEventChatId,
  getEventHostAttendees,
  getEventInterestState,
  getItemNoun,
  splitStartsAt,
} from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { getAttendeeKey, getUniqueTopics } from '@/lib/search-utils';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { useSessionStore } from '@/stores/session-store';

const HERO_HEIGHT = 520;
const PILL_BACKGROUND = 'rgba(255,255,255,0.12)';
const PILL_BORDER = 'rgba(255,255,255,0.18)';

function CircleButton({
  icon,
  onPress,
  active = false,
}: {
  icon: Parameters<typeof IconlyIcon>[0]['name'];
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        width={42}
        height={42}
        borderRadius={21}
        backgroundColor={active ? palette.primary : 'rgba(255,255,255,0.94)'}
        alignItems="center"
        justifyContent="center"
      >
        <IconlyIcon
          name={icon}
          size={18}
          color={active ? 'white' : '#111111'}
          pack={active ? 'filled' : 'basic'}
        />
      </View>
    </Pressable>
  );
}

function TabPill({ label, isActive = false }: { label: string; isActive?: boolean }) {
  return (
    <View
      height={32}
      borderRadius={16}
      backgroundColor={isActive ? 'white' : 'rgba(255,255,255,0.13)'}
      paddingHorizontal={14}
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={11} fontWeight="800" color={isActive ? '#111111' : 'white'}>
        {label}
      </Text>
    </View>
  );
}

function MetaPill({
  icon,
  label,
}: {
  icon: Parameters<typeof IconlyIcon>[0]['name'];
  label: string;
}) {
  return (
    <XStack alignItems="center" gap={6} minWidth={0}>
      <View
        width={18}
        height={18}
        borderRadius={9}
        backgroundColor="rgba(255,255,255,0.1)"
        alignItems="center"
        justifyContent="center"
      >
        <IconlyIcon name={icon} size={11} color="white" />
      </View>
      <Text fontSize={10} fontWeight="700" color="white" numberOfLines={1}>
        {label}
      </Text>
    </XStack>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const event = useEventsStore((state) => state.events.find((candidate) => candidate.id === id));
  const interestById = useEventsStore((state) => state.interestById);
  const toggleInterest = useEventsStore((state) => state.toggleInterest);
  const user = useSessionStore((state) => state.user);
  const threads = useChatStore((state) => state.threads);
  const joinEventChat = useChatStore((state) => state.joinEventChat);
  const startDirectChat = useChatStore((state) => state.startDirectChat);

  if (!event) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} backgroundColor={palette.white}>
        <Text fontSize={16} fontWeight="700" color={palette.ink}>
          This activity is gone.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text fontSize={14} fontWeight="700" color={palette.gray}>
            Go back
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const interest = getEventInterestState(event, interestById[event.id]);
  const isGroup = event.kind === 'group';
  const itemNoun = getItemNoun(event);
  const categoryLabel = getCategoryLabel(event.category);
  const relatedTopics = getUniqueTopics([categoryLabel, ...event.tags]);
  const hostAttendee = getEventHostAttendees(event)[0];
  const isViewerHost = Boolean(user?.id && hostAttendee?.userId === user.id);
  const isJoined = threads.some((thread) => thread.id === getEventChatId(event.id));
  const [datePart, timePart] = splitStartsAt(event.startsAt);
  const displayTime = timePart ?? event.startsAt;
  const spotsLeft = Math.max(event.capacity - interest.going, 0);
  const attendeePreview = event.attendees.slice(0, 6).map((attendee) => ({
    label: attendee.name,
    image: attendee.image,
  }));

  const openChat = async () => {
    const chatId = await joinEventChat(event);
    router.push(`/chat/${chatId}`);
  };

  const messageMember = async (memberName: string, memberUserId: string) => {
    const chatId = await startDirectChat(memberName, memberUserId);
    router.push(`/chat/${chatId}`);
  };

  const copyEventLink = async () => {
    await Clipboard.setStringAsync(`https://retalk.app/event/${event.id}`);
    Alert.alert('Link copied', 'The event link is on your clipboard.');
  };

  const reportEvent = () => {
    Alert.alert('Report this event?', 'Let us know something is wrong with this listing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => Alert.alert('Reported', "Thanks, we'll take a look."),
      },
    ]);
  };

  const menuItems: GlassMenuItem[] = [
    { key: 'share', label: 'Share event', icon: 'Share', onPress: () => shareEvent(event) },
    { key: 'copy-link', label: 'Copy link', icon: 'Link', onPress: copyEventLink },
    ...(isViewerHost
      ? []
      : [
          {
            key: 'report',
            label: 'Report event',
            icon: 'InfoCircle',
            onPress: reportEvent,
            destructive: true,
          } as GlassMenuItem,
        ]),
  ];

  return (
    <View flex={1} backgroundColor={palette.white}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 116 }}
      >
        <View height={HERO_HEIGHT} backgroundColor="#111111" overflow="hidden">
          {isGroup ? (
            <View flex={1} alignItems="center" justifyContent="center" backgroundColor="#151515">
              <Text fontSize={118}>{event.icon}</Text>
            </View>
          ) : (
            <Image source={eventImageUrl(event)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          )}

          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.48)', 'rgba(0,0,0,0.78)']}
            locations={[0, 0.48, 1]}
            style={{ position: 'absolute', inset: 0 }}
          />

          <XStack
            position="absolute"
            top={insets.top + 8}
            left={16}
            right={16}
            alignItems="center"
            justifyContent="space-between"
          >
            <CircleButton icon="ArrowLeft" onPress={() => router.back()} />
            <XStack gap={10}>
              {!isViewerHost ? (
                <CircleButton
                  icon="Heart"
                  active={interest.isInterested}
                  onPress={() => toggleInterest(event)}
                />
              ) : null}
              <CircleButton icon="Menu" onPress={() => setIsMenuOpen(true)} />
            </XStack>
          </XStack>

          <YStack
            position="absolute"
            left={18}
            right={18}
            bottom={18}
            alignItems="center"
            gap={12}
          >
            <View
              width={96}
              height={96}
              borderRadius={48}
              borderWidth={3}
              borderColor={palette.primary}
              alignItems="center"
              justifyContent="center"
              backgroundColor="rgba(0,0,0,0.26)"
            >
              <View width={82} height={82} borderRadius={41} overflow="hidden" backgroundColor="#222222">
                {isGroup ? (
                  <View flex={1} alignItems="center" justifyContent="center">
                    <Text fontSize={38}>{event.icon}</Text>
                  </View>
                ) : (
                  <Image source={eventImageUrl(event)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                )}
              </View>
            </View>

            <YStack alignItems="center" gap={8}>
              <Text fontSize={24} lineHeight={29} fontWeight="800" color="white" textAlign="center">
                {event.title}
              </Text>
              <Text
                maxWidth={330}
                fontSize={12}
                lineHeight={17}
                fontWeight="500"
                color="rgba(255,255,255,0.76)"
                textAlign="center"
                numberOfLines={3}
              >
                {event.description}
              </Text>
            </YStack>

            <XStack alignItems="center" gap={8}>
              <AvatarGroup labels={attendeePreview} size={26} />
              <View borderRadius={999} backgroundColor={palette.primary} paddingHorizontal={7} paddingVertical={4}>
                <Text fontSize={10} fontWeight="900" color="white">
                  +{Math.max(interest.going - attendeePreview.length, 0)}
                </Text>
              </View>
            </XStack>

            <XStack
              width="100%"
              minHeight={38}
              borderRadius={18}
              borderWidth={1}
              borderColor={PILL_BORDER}
              backgroundColor={PILL_BACKGROUND}
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={12}
              gap={10}
            >
              <MetaPill icon="Location" label={event.neighborhood} />
              <View width={1} height={16} backgroundColor="rgba(255,255,255,0.18)" />
              <MetaPill icon="Calendar" label={datePart} />
              <View width={1} height={16} backgroundColor="rgba(255,255,255,0.18)" />
              <MetaPill icon="Clock" label={displayTime} />
            </XStack>

            <XStack width="100%" justifyContent="space-between" gap={8}>
              <TabPill label="Schedule" isActive />
              <TabPill label="Feed" />
              <TabPill label="About" />
              <TabPill label={isGroup ? 'Member' : 'Guest'} />
              <TabPill label="Join" />
            </XStack>
          </YStack>
        </View>

        <YStack paddingHorizontal={18} gap={20} paddingTop={2}>
          <XStack alignItems="center" gap={8}>
            <View flex={1} height={1} backgroundColor={palette.line} />
            <Text fontSize={10} color={palette.muted} fontWeight="700">
              {displayTime}
            </Text>
            <View flex={1} height={1} backgroundColor={palette.line} />
          </XStack>

          <YStack borderRadius={8} backgroundColor="white" padding={14} gap={10}>
            <XStack alignItems="center" justifyContent="space-between" gap={12}>
              <YStack flex={1} minWidth={0}>
                <Text color="#111111" fontSize={14} fontWeight="900" numberOfLines={1}>
                  Welcome & Registration
                </Text>
                <Text color="rgba(17,17,17,0.58)" fontSize={11} fontWeight="700" marginTop={3} numberOfLines={1}>
                  {event.venue} - {categoryLabel} {itemNoun}
                </Text>
              </YStack>
              <View width={34} height={34} borderRadius={17} backgroundColor="#111111" alignItems="center" justifyContent="center">
                <IconlyIcon name="Calendar" size={15} color="white" />
              </View>
            </XStack>
          </YStack>

          <YStack gap={12}>
            <Text color={palette.ink} fontSize={14} fontWeight="900">
              About
            </Text>
            <Text color={palette.gray} fontSize={13} lineHeight={21}>
              {event.description}
            </Text>
          </YStack>

          <YStack gap={10}>
            <Text color={palette.ink} fontSize={14} fontWeight="900">
              Details
            </Text>
            <XStack flexWrap="wrap" gap={8}>
              {[event.price, `${interest.going} ${isGroup ? 'members' : 'interested'}`, ...relatedTopics].map((topic) => (
                <View
                  key={topic}
                  borderRadius={999}
                  borderWidth={1}
                  borderColor={palette.line}
                  backgroundColor={palette.white}
                  paddingHorizontal={10}
                  paddingVertical={6}
                >
                  <Text color={palette.inkSoft} fontSize={11} fontWeight="800">
                    {topic}
                  </Text>
                </View>
              ))}
            </XStack>
          </YStack>

          <YStack gap={12}>
            <XStack alignItems="center" justifyContent="space-between">
              <Text color={palette.ink} fontSize={14} fontWeight="900">
                {isGroup ? 'Members' : "Who's going"}
              </Text>
              <Text color={palette.muted} fontSize={11} fontWeight="800">
                {interest.going} total
              </Text>
            </XStack>
            <YStack gap={10}>
              {event.attendees.map((attendee, index) => (
                <XStack key={getAttendeeKey(attendee, index)} alignItems="center" gap={12}>
                  <UserAvatar
                    label={attendee.name}
                    image={attendee.image}
                    size={40}
                    borderColor={palette.line}
                    borderWidth={1}
                  />
                  <YStack flex={1} minWidth={0}>
                    <XStack alignItems="center" gap={6}>
                      <Text fontSize={13} fontWeight="800" color={palette.ink} numberOfLines={1}>
                        {attendee.name}
                      </Text>
                      {attendee.isHost ? (
                        <View borderRadius={999} backgroundColor={palette.primary} paddingHorizontal={6} paddingVertical={2}>
                          <Text fontSize={9} fontWeight="900" color="white">
                            HOST
                          </Text>
                        </View>
                      ) : null}
                    </XStack>
                    <Text fontSize={11} fontWeight="600" color={palette.muted} numberOfLines={1}>
                      {attendee.role}
                    </Text>
                  </YStack>
                  {attendee.userId && attendee.userId !== user?.id ? (
                    <Pressable onPress={() => messageMember(attendee.name, attendee.userId!)}>
                      <View
                        width={36}
                        height={36}
                        borderRadius={18}
                        backgroundColor={palette.fog}
                        alignItems="center"
                        justifyContent="center"
                      >
                        <IconlyIcon name="MessageCircleDots" size={15} color={palette.ink} />
                      </View>
                    </Pressable>
                  ) : null}
                </XStack>
              ))}
            </YStack>
          </YStack>
        </YStack>
      </ScrollView>

      <XStack
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        alignItems="center"
        gap={12}
        backgroundColor={palette.white}
        paddingHorizontal={18}
        paddingTop={12}
        paddingBottom={insets.bottom + 12}
      >
        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${event.coordinates[1]},${event.coordinates[0]}`,
            )
          }
        >
          <View
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor={palette.fog}
            alignItems="center"
            justifyContent="center"
          >
            <IconlyIcon name="Calendar" size={18} color={palette.ink} />
          </View>
        </Pressable>
        <Pressable onPress={openChat} style={{ flex: 1 }}>
          <LinearGradient
            colors={[palette.primary, '#7b55ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 18,
            }}
          >
            <XStack alignItems="center" gap={8}>
              {isJoined ? <IconlyIcon name="MessageCircleDots" size={16} color="white" /> : null}
              <Text color="white" fontWeight="900" fontSize={14}>
                {isJoined ? `Open ${itemNoun} chat` : spotsLeft === 0 && isGroup ? 'Join waitlist' : 'Join'}
              </Text>
            </XStack>
          </LinearGradient>
        </Pressable>
      </XStack>

      <GlassMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={menuItems}
        top={insets.top + 58}
        right={16}
      />
    </View>
  );
}
