import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, useWindowDimensions } from 'react-native';
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

import { EventRow } from '@/components/events/event-row';
import { SearchBar } from '@/components/events/search-bar';
import { TrendingEventCard } from '@/components/events/trending-event-card';
import { DiscoverEventCard } from '@/components/home/discover-event-card';
import { HeroEventSwiper } from '@/components/home/hero-event-swiper';
import { NotificationPopover } from '@/components/home/notification-popover';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { eventImageUrl } from '@/lib/event-data';
import { getActivityKindLabel, sortByPopularity } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { getFeaturedAttendees, includesSearchValue, normalizeSearchValue } from '@/lib/search-utils';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { selectUnreadNotificationCount, useNotificationsStore } from '@/stores/notifications-store';
import { useSessionStore } from '@/stores/session-store';
import type { EventItem } from '@/lib/types';

const NAV_CLEARANCE = 104;
const HERO_CARD_LIMIT = 5;
const NEARBY_LIMIT = 6;
const SEARCH_ANIMATION_DURATION = 240;
const SEARCH_DISMISS_DRAG_DISTANCE = 96;
const SEARCH_DISMISS_VELOCITY = 650;
const SEARCH_DRAG_SPRING = {
  damping: 24,
  stiffness: 260,
};

type HomeSearchUser = {
  id: string;
  name: string;
  role: string;
  image?: string | null;
  event: EventItem;
};

function eventMatchesHomeSearch(event: EventItem, query: string) {
  return includesSearchValue(
    [
      event.title,
      event.description,
      event.venue,
      event.neighborhood,
      event.category,
      event.kind,
      event.startsAt,
      ...event.hosts,
      ...event.tags,
    ],
    query,
  );
}

function getHomeSearchUsers(events: EventItem[], query: string): HomeSearchUser[] {
  const seenUsers = new Set<string>();
  const users: HomeSearchUser[] = [];

  for (const event of events) {
    for (const attendee of event.attendees) {
      const name = attendee.name.trim();

      if (!name) {
        continue;
      }

      const id = attendee.userId ?? name.toLowerCase();

      if (seenUsers.has(id)) {
        continue;
      }

      if (
        !includesSearchValue(
          [name, attendee.role, event.title, event.venue, event.neighborhood],
          query,
        )
      ) {
        continue;
      }

      seenUsers.add(id);
      users.push({ id, name, role: attendee.role, image: attendee.image, event });
    }
  }

  return users;
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <YStack gap={8}>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="800" color={palette.ink}>
          {title}
        </Text>
        <Text fontSize={12} fontWeight="700" color={palette.muted}>
          {count}
        </Text>
      </XStack>
      {children}
    </YStack>
  );
}

function CompactEventResult({ event, onSelect }: { event: EventItem; onSelect: () => void }) {
  return (
    <Pressable onPress={onSelect}>
      <XStack alignItems="center" gap={12} borderRadius={18} padding={10}>
        <View width={48} height={48} borderRadius={16} overflow="hidden" backgroundColor={palette.fog} alignItems="center" justifyContent="center">
          {event.kind === 'group' ? (
            <Text fontSize={22}>{event.icon}</Text>
          ) : (
            <Image source={eventImageUrl(event)} style={{ width: 48, height: 48 }} contentFit="cover" />
          )}
        </View>
        <YStack flex={1} minWidth={0} gap={3}>
          <XStack alignItems="center" gap={8}>
            <Text fontSize={14} fontWeight="800" color={palette.ink} numberOfLines={1} flexShrink={1}>
              {event.title}
            </Text>
            <View borderRadius={999} backgroundColor={palette.fog} paddingHorizontal={7} paddingVertical={2}>
              <Text fontSize={9} fontWeight="800" color={palette.gray} textTransform="uppercase">
                {getActivityKindLabel(event)}
              </Text>
            </View>
          </XStack>
          <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
            {event.startsAt} · {event.venue}
          </Text>
        </YStack>
        <IconlyIcon name="ChevronRight" size={14} color={palette.muted} />
      </XStack>
    </Pressable>
  );
}

function UserResult({ user, onSelect }: { user: HomeSearchUser; onSelect: () => void }) {
  return (
    <Pressable onPress={onSelect}>
      <XStack alignItems="center" gap={12} borderRadius={18} padding={10}>
        <UserAvatar label={user.name} image={user.image} size={48} />
        <YStack flex={1} minWidth={0} gap={3}>
          <Text fontSize={14} fontWeight="800" color={palette.ink} numberOfLines={1}>
            {user.name}
          </Text>
          <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
            {user.role} · {user.event.title}
          </Text>
        </YStack>
        <View borderRadius={999} backgroundColor={palette.primarySoft} paddingHorizontal={8} paddingVertical={4}>
          <Text fontSize={11} fontWeight="800" color={palette.primary}>
            User
          </Text>
        </View>
      </XStack>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSearchMounted, setIsSearchMounted] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchDragY = useSharedValue(0);
  const searchProgress = useSharedValue(0);

  const user = useSessionStore((state) => state.user);
  const events = useEventsStore((state) => state.events);
  const isLoadingEvents = useEventsStore((state) => state.isLoading);
  const hasLoadedEvents = useEventsStore((state) => state.hasLoaded);
  const loadEvents = useEventsStore((state) => state.loadEvents);
  const interestById = useEventsStore((state) => state.interestById);
  const toggleInterest = useEventsStore((state) => state.toggleInterest);
  const hasActiveFilters = useEventsStore((state) => state.hasActiveFilters());
  const joinEventChat = useChatStore((state) => state.joinEventChat);
  const unreadNotificationCount = useNotificationsStore(selectUnreadNotificationCount);

  const sortedEvents = useMemo(() => [...events].sort(sortByPopularity), [events]);
  const heroEvents = sortedEvents.slice(0, HERO_CARD_LIMIT);
  const restEvents = sortedEvents.slice(HERO_CARD_LIMIT);
  const nearbyEvents = restEvents.slice(0, NEARBY_LIMIT);
  const trendingEvents = restEvents.slice(NEARBY_LIMIT, NEARBY_LIMIT + 3);
  const featuredAttendees = useMemo(() => getFeaturedAttendees(events, 10), [events]);
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const searchEvents = useMemo(
    () =>
      sortedEvents.filter(
        (event) => event.kind === 'event' && eventMatchesHomeSearch(event, normalizedSearchQuery),
      ),
    [normalizedSearchQuery, sortedEvents],
  );
  const searchGroups = useMemo(
    () =>
      sortedEvents.filter(
        (event) => event.kind === 'group' && eventMatchesHomeSearch(event, normalizedSearchQuery),
      ),
    [normalizedSearchQuery, sortedEvents],
  );
  const searchUsers = useMemo(
    () => getHomeSearchUsers(sortedEvents, normalizedSearchQuery),
    [normalizedSearchQuery, sortedEvents],
  );

  const userLabel = user?.name || user?.email || '';
  const locationLabel = user?.homeNeighborhood ?? 'Toronto';
  const showEmptyEvents = heroEvents.length === 0 && hasLoadedEvents && !isLoadingEvents;
  const hasSearchResults = searchEvents.length > 0 || searchGroups.length > 0 || searchUsers.length > 0;
  const searchEntryOffset = Math.max(360, windowHeight - insets.top - 96);

  useEffect(() => {
    searchProgress.value = withTiming(isSearchActive ? 1 : 0, {
      duration: SEARCH_ANIMATION_DURATION,
    });

    if (isSearchActive || !isSearchMounted) {
      return;
    }

    const unmountSearch = setTimeout(() => {
      setIsSearchMounted(false);
      setSearchQuery('');
    }, SEARCH_ANIMATION_DURATION);

    return () => clearTimeout(unmountSearch);
  }, [isSearchActive, isSearchMounted, searchProgress]);

  const searchModeStyle = useAnimatedStyle(() => ({
    opacity: searchProgress.value,
    transform: [
      { translateY: (1 - searchProgress.value) * searchEntryOffset + searchDragY.value },
    ],
  }));

  const openEvent = (eventId: string) => router.push(`/event/${eventId}`);

  const openHomeSearch = () => {
    searchDragY.value = 0;
    setIsSearchMounted(true);
    setIsSearchActive(true);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const closeHomeSearch = () => {
    setIsSearchActive(false);
    Keyboard.dismiss();
  };

  const searchBarPan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((event) => {
      searchDragY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (
        event.translationY > SEARCH_DISMISS_DRAG_DISTANCE ||
        event.velocityY > SEARCH_DISMISS_VELOCITY
      ) {
        runOnJS(closeHomeSearch)();
        return;
      }

      searchDragY.value = withSpring(0, SEARCH_DRAG_SPRING);
    });

  const joinEvent = async (event: EventItem) => {
    const chatId = await joinEventChat(event);
    router.push(`/chat/${chatId}`);
  };

  return (
    <View flex={1} backgroundColor={palette.white}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + NAV_CLEARANCE,
        }}
      >
        {isSearchMounted ? (
          <Animated.View
            pointerEvents={isSearchActive ? 'auto' : 'none'}
            style={[
              searchModeStyle,
              !isSearchActive
                ? {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                  }
                : null,
            ]}
          >
            <YStack gap={18}>
              <GestureDetector gesture={searchBarPan}>
                <XStack alignItems="center" gap={10}>
                  <Pressable
                    onPress={closeHomeSearch}
                    accessibilityRole="button"
                    accessibilityLabel="Close search"
                  >
                    <View
                      width={44}
                      height={44}
                      borderRadius={22}
                      borderWidth={1}
                      borderColor="rgba(41,47,54,0.1)"
                      backgroundColor="white"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <IconlyIcon name="ArrowLeft" size={18} color={palette.ink} />
                    </View>
                  </Pressable>
                  <View flex={1}>
                    <SearchBar
                      query={searchQuery}
                      placeholder="Search events, groups, users"
                      autoFocus
                      onQueryChange={setSearchQuery}
                    />
                  </View>
                  <Pressable
                    onPress={() => router.push('/filters')}
                    accessibilityRole="button"
                    accessibilityLabel={hasActiveFilters ? 'Open active event filters' : 'Open event filters'}
                  >
                    <View
                      width={40}
                      height={40}
                      borderRadius={20}
                      borderWidth={1}
                      borderColor="rgba(41,47,54,0.1)"
                      backgroundColor="white"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <View transform={[{ translateX: -2 }]}>
                        <IconlyIcon name="Filter" size={18} color={palette.primary} />
                      </View>
                      {hasActiveFilters ? (
                        <View
                          position="absolute"
                          top={9}
                          right={9}
                          width={7}
                          height={7}
                          borderRadius={4}
                          borderWidth={1}
                          borderColor="white"
                          backgroundColor={palette.coral}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                </XStack>
              </GestureDetector>

              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={13} fontWeight="700" color={palette.gray}>
                  {normalizedSearchQuery ? 'Search results' : 'All nearby activity'}
                </Text>
                <Text fontSize={12} fontWeight="700" color={palette.muted}>
                  {searchEvents.length + searchGroups.length + searchUsers.length} results
                </Text>
              </XStack>

              {hasSearchResults ? (
                <YStack gap={22}>
                  <SearchSection title="Events" count={searchEvents.length}>
                    {searchEvents.length > 0 ? (
                      <YStack gap={2}>
                        {searchEvents.map((event) => (
                          <EventRow
                            key={event.id}
                            event={event}
                            interestState={interestById[event.id]}
                            showTypeLabel
                            onSelect={() => openEvent(event.id)}
                          />
                        ))}
                      </YStack>
                    ) : (
                      <Text fontSize={13} color={palette.muted}>
                        No events match this search.
                      </Text>
                    )}
                  </SearchSection>

                  <SearchSection title="Groups" count={searchGroups.length}>
                    {searchGroups.length > 0 ? (
                      <YStack gap={2}>
                        {searchGroups.map((event) => (
                          <CompactEventResult
                            key={event.id}
                            event={event}
                            onSelect={() => openEvent(event.id)}
                          />
                        ))}
                      </YStack>
                    ) : (
                      <Text fontSize={13} color={palette.muted}>
                        No groups match this search.
                      </Text>
                    )}
                  </SearchSection>

                  <SearchSection title="Users" count={searchUsers.length}>
                    {searchUsers.length > 0 ? (
                      <YStack gap={2}>
                        {searchUsers.map((searchUser) => (
                          <UserResult
                            key={searchUser.id}
                            user={searchUser}
                            onSelect={() => openEvent(searchUser.event.id)}
                          />
                        ))}
                      </YStack>
                    ) : (
                      <Text fontSize={13} color={palette.muted}>
                        No users match this search.
                      </Text>
                    )}
                  </SearchSection>
                </YStack>
              ) : (
                <YStack alignItems="center" paddingVertical={44} gap={10}>
                  <View width={52} height={52} borderRadius={18} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
                    <IconlyIcon name="Search" size={22} color={palette.slate} />
                  </View>
                  <Text fontSize={16} fontWeight="800" color={palette.ink}>
                    No results found
                  </Text>
                  <Text fontSize={13} lineHeight={20} color={palette.gray} textAlign="center">
                    Try a different event, group, place, or person.
                  </Text>
                </YStack>
              )}
            </YStack>
          </Animated.View>
        ) : null}

        {!isSearchActive ? (
          <>
        <XStack alignItems="center" gap={12} paddingBottom={30}>
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
          <Pressable onPress={() => setShowNotifications(true)}>
            <View width={50} height={46} borderRadius={23} backgroundColor="white" alignItems="center" justifyContent="center">
              <View transform={[{ scaleX: 1.16 }]}>
                <IconlyIcon name="Bell" size={24} color={palette.inkSoft} />
              </View>
              {unreadNotificationCount > 0 ? (
                <View
                  position="absolute"
                  top={9}
                  right={12}
                  width={8}
                  height={8}
                  borderRadius={4}
                  borderWidth={1}
                  borderColor="white"
                  backgroundColor={palette.coral}
                />
              ) : null}
            </View>
          </Pressable>
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

        <XStack
          marginTop={20}
          height={48}
          alignItems="center"
          gap={8}
          borderRadius={999}
          borderWidth={1}
          borderColor="rgba(41,47,54,0.16)"
          backgroundColor="white"
          paddingLeft={16}
          paddingRight={4}
        >
          <Pressable
            onPress={openHomeSearch}
            style={{ flex: 1, height: '100%', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Search events"
          >
            <XStack alignItems="center" gap={10}>
              <IconlyIcon name="Search" size={16} color={palette.gray} />
              <Text fontSize={14} fontWeight="500" color={palette.gray}>
                Find Event...
              </Text>
            </XStack>
          </Pressable>
          <View width={1} height={22} backgroundColor="rgba(41,47,54,0.16)" />
          <Pressable
            onPress={() => router.push('/filters')}
            accessibilityRole="button"
            accessibilityLabel={hasActiveFilters ? 'Open active event filters' : 'Open event filters'}
          >
            <View width={40} height={40} borderRadius={20} alignItems="center" justifyContent="center">
              <View transform={[{ translateX: -2 }]}>
                <IconlyIcon name="Filter" size={18} color={palette.primary} />
              </View>
              {hasActiveFilters ? (
                <View
                  position="absolute"
                  top={9}
                  right={9}
                  width={7}
                  height={7}
                  borderRadius={4}
                  borderWidth={1}
                  borderColor="white"
                  backgroundColor={palette.coral}
                />
              ) : null}
            </View>
          </Pressable>
        </XStack>

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

          </>
        ) : null}
      </ScrollView>
      <NotificationPopover
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
      />
    </View>
  );
}
