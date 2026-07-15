import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { TrendingEventCard } from '@/components/events/trending-event-card';
import { DiscoverEventCard } from '@/components/home/discover-event-card';
import { HeroEventSwiper } from '@/components/home/hero-event-swiper';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { sortByPopularity } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { getFeaturedAttendees } from '@/lib/search-utils';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { useSessionStore } from '@/stores/session-store';
import type { EventItem } from '@/lib/types';

const NAV_CLEARANCE = 104;
const HERO_CARD_LIMIT = 5;
const NEARBY_LIMIT = 6;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useSessionStore((state) => state.user);
  const events = useEventsStore((state) => state.events);
  const isLoadingEvents = useEventsStore((state) => state.isLoading);
  const hasLoadedEvents = useEventsStore((state) => state.hasLoaded);
  const loadEvents = useEventsStore((state) => state.loadEvents);
  const interestById = useEventsStore((state) => state.interestById);
  const toggleInterest = useEventsStore((state) => state.toggleInterest);
  const joinEventChat = useChatStore((state) => state.joinEventChat);

  const sortedEvents = useMemo(() => [...events].sort(sortByPopularity), [events]);
  const heroEvents = sortedEvents.slice(0, HERO_CARD_LIMIT);
  const restEvents = sortedEvents.slice(HERO_CARD_LIMIT);
  const nearbyEvents = restEvents.slice(0, NEARBY_LIMIT);
  const trendingEvents = restEvents.slice(NEARBY_LIMIT, NEARBY_LIMIT + 3);
  const featuredAttendees = useMemo(() => getFeaturedAttendees(events, 10), [events]);

  const userLabel = user?.name || user?.email || '';
  const locationLabel = user?.homeNeighborhood ?? 'Toronto';
  const showEmptyEvents = heroEvents.length === 0 && hasLoadedEvents && !isLoadingEvents;

  const openEvent = (eventId: string) => router.push(`/event/${eventId}`);

  const joinEvent = async (event: EventItem) => {
    const chatId = await joinEventChat(event);
    router.push(`/chat/${chatId}`);
  };

  return (
    <View flex={1} backgroundColor="#f2f1f7">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + NAV_CLEARANCE,
        }}
      >
        <XStack alignItems="center" gap={12} paddingBottom={18}>
          <Pressable onPress={() => router.navigate('/profile')}>
            {user ? (
              <UserAvatar label={userLabel} image={user.image} size={44} borderWidth={2} borderColor={palette.primary} />
            ) : (
              <GuestAvatar size={44} borderWidth={2} borderColor={palette.primary} />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/filters')} style={{ flex: 1 }}>
            <YStack minWidth={0}>
              <Text fontSize={11} fontWeight="600" color={palette.muted} numberOfLines={1}>
                Your Location
              </Text>
              <XStack alignItems="center" gap={4}>
                <Text fontSize={16} fontWeight="700" color={palette.ink} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <IconlyIcon name="ChevronDown" size={14} color={palette.ink} />
              </XStack>
            </YStack>
          </Pressable>
          <View width={44} height={44} borderRadius={22} backgroundColor="white" alignItems="center" justifyContent="center">
            <IconlyIcon name="Bell" size={18} color={palette.inkSoft} />
            <View
              position="absolute"
              top={10}
              right={11}
              width={8}
              height={8}
              borderRadius={4}
              borderWidth={1}
              borderColor="white"
              backgroundColor={palette.coral}
            />
          </View>
        </XStack>

        {heroEvents.length > 0 ? (
          <HeroEventSwiper
            events={heroEvents}
            interestById={interestById}
            onSelect={(event) => openEvent(event.id)}
            onToggleInterest={toggleInterest}
            onJoin={joinEvent}
          />
        ) : null}

        {showEmptyEvents ? (
          <YStack
            minHeight={260}
            alignItems="center"
            justifyContent="center"
            borderRadius={28}
            borderWidth={1}
            borderStyle="dashed"
            borderColor="rgba(41,47,54,0.15)"
            backgroundColor="rgba(255,255,255,0.72)"
            padding={24}
            gap={8}
          >
            <View width={52} height={52} borderRadius={18} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
              <IconlyIcon name="Calendar" size={22} color={palette.slate} />
            </View>
            <Text fontSize={17} fontWeight="800" color={palette.ink} marginTop={8}>
              No events found
            </Text>
            <Text fontSize={13} lineHeight={20} color={palette.gray} textAlign="center">
              Events could not be loaded for your area.
            </Text>
            <Pressable onPress={() => void loadEvents()}>
              <View borderRadius={999} backgroundColor={palette.ink} paddingHorizontal={16} paddingVertical={10} marginTop={8}>
                <Text color="white" fontWeight="800" fontSize={12}>
                  Try again
                </Text>
              </View>
            </Pressable>
          </YStack>
        ) : null}

        {featuredAttendees.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }}
            contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 20 }}
          >
            {featuredAttendees.map((attendee) => (
              <Pressable key={attendee.key} onPress={() => openEvent(attendee.eventId)}>
                <YStack alignItems="center" gap={6} width={60}>
                  <UserAvatar
                    label={attendee.name}
                    image={attendee.image}
                    size={52}
                    borderWidth={2}
                    borderColor={palette.primary}
                  />
                  <Text fontSize={11} fontWeight="600" color={palette.slate} numberOfLines={1}>
                    {attendee.name}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <Pressable onPress={() => router.navigate('/explore')}>
          <XStack
            marginTop={20}
            height={48}
            alignItems="center"
            gap={10}
            borderRadius={999}
            borderWidth={1}
            borderColor="rgba(41,47,54,0.1)"
            backgroundColor="white"
            paddingHorizontal={16}
          >
            <IconlyIcon name="Search" size={16} color={palette.muted} />
            <Text fontSize={14} fontWeight="500" color={palette.muted}>
              Find Event...
            </Text>
          </XStack>
        </Pressable>

        {nearbyEvents.length > 0 ? (
          <>
            <Text fontSize={16} fontWeight="700" color={palette.ink} marginTop={24} marginBottom={10}>
              Discover Events You&apos;ll Love
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -16 }}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
            >
              {nearbyEvents.map((event) => (
                <DiscoverEventCard key={event.id} event={event} onSelect={() => openEvent(event.id)} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {trendingEvents.length > 0 ? (
          <>
            <XStack alignItems="center" justifyContent="space-between" marginTop={24} marginBottom={4}>
              <Text fontSize={16} fontWeight="700" color={palette.ink}>
                Catch the Trending Events
              </Text>
              <Pressable onPress={() => router.navigate('/explore')}>
                <Text fontSize={12} fontWeight="700" color={palette.accent}>
                  Explore More
                </Text>
              </Pressable>
            </XStack>
            <YStack>
              {trendingEvents.map((event) => (
                <TrendingEventCard
                  key={event.id}
                  event={event}
                  interestState={interestById[event.id]}
                  onSelect={() => openEvent(event.id)}
                />
              ))}
            </YStack>
          </>
        ) : null}

      </ScrollView>
    </View>
  );
}
