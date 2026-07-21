import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { CalendarStrip } from '@/components/events/calendar-strip';
import { CategoryChips } from '@/components/events/category-chips';
import { EmptyEventsState } from '@/components/events/empty-events-state';
import { EventRow } from '@/components/events/event-row';
import { FeaturedEventCard } from '@/components/events/featured-event-card';
import { ScopeSwitch } from '@/components/events/scope-switch';
import { SearchBar } from '@/components/events/search-bar';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { eventImageUrl } from '@/lib/event-data';
import {
  getActivityKindLabel,
  getActivityScopeHeading,
  getTimeGreeting,
} from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { getSearchSuggestions } from '@/lib/search-utils';
import { selectVisibleEvents, useEventsStore } from '@/stores/events-store';
import { useSessionStore } from '@/stores/session-store';

function SuggestionList({ onSelectEvent }: { onSelectEvent: (eventId: string) => void }) {
  const router = useRouter();
  const events = useEventsStore((state) => state.events);
  const query = useEventsStore((state) => state.query);
  const suggestions = useMemo(() => getSearchSuggestions(events, query), [events, query]);

  if (!suggestions.length) {
    return (
      <Text paddingVertical={24} textAlign="center" fontSize={14} color={palette.muted}>
        No people or events match “{query.trim()}”.
      </Text>
    );
  }

  return (
    <YStack gap={4} paddingTop={12}>
      {suggestions.map((suggestion) =>
        suggestion.type === 'user' ? (
          <Pressable
            key={suggestion.id}
            onPress={() => router.push(`/user/${encodeURIComponent(suggestion.id)}`)}
          >
            <XStack alignItems="center" gap={12} borderRadius={16} padding={10}>
              <UserAvatar label={suggestion.name} image={suggestion.image} size={44} />
              <YStack flex={1} minWidth={0}>
                <Text fontSize={14} fontWeight="700" color={palette.ink} numberOfLines={1}>
                  {suggestion.name}
                </Text>
                <Text fontSize={12} fontWeight="500" color={palette.gray} numberOfLines={1}>
                  {suggestion.role} · {suggestion.event.title}
                </Text>
              </YStack>
              <View borderRadius={999} backgroundColor={palette.fog} paddingHorizontal={8} paddingVertical={4}>
                <Text fontSize={11} fontWeight="700" color={palette.slate}>
                  Person
                </Text>
              </View>
            </XStack>
          </Pressable>
        ) : (
          <Pressable key={suggestion.event.id} onPress={() => onSelectEvent(suggestion.event.id)}>
            <XStack alignItems="center" gap={12} borderRadius={16} padding={10}>
              <View width={44} height={44} borderRadius={14} overflow="hidden" backgroundColor={palette.tealSoft} alignItems="center" justifyContent="center">
                {suggestion.event.kind === 'group' ? (
                  <Text fontSize={20}>{suggestion.event.icon}</Text>
                ) : (
                  <Image
                    source={eventImageUrl(suggestion.event)}
                    style={{ width: 44, height: 44 }}
                    contentFit="cover"
                  />
                )}
              </View>
              <YStack flex={1} minWidth={0}>
                <Text fontSize={14} fontWeight="700" color={palette.ink} numberOfLines={1}>
                  {suggestion.event.title}
                </Text>
                <Text fontSize={12} fontWeight="500" color={palette.gray} numberOfLines={1}>
                  {suggestion.event.startsAt} · {suggestion.event.venue}
                </Text>
              </YStack>
              <View borderRadius={999} backgroundColor={palette.fog} paddingHorizontal={8} paddingVertical={4}>
                <Text fontSize={11} fontWeight="700" color={palette.slate}>
                  {getActivityKindLabel(suggestion.event)}
                </Text>
              </View>
            </XStack>
          </Pressable>
        ),
      )}
    </YStack>
  );
}

export function EventListPanel({
  onSelectEvent,
  onOpenFilters,
  onAvatarPress,
  bottomPadding = 24,
}: {
  onSelectEvent: (eventId: string) => void;
  onOpenFilters: () => void;
  onAvatarPress?: () => void;
  bottomPadding?: number;
}) {
  const eventsState = useEventsStore();
  const user = useSessionStore((state) => state.user);
  const visibleEvents = useMemo(
    () => selectVisibleEvents(eventsState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      eventsState.events,
      eventsState.activityScope,
      eventsState.activeCategory,
      eventsState.selectedDayKey,
      eventsState.maxDistanceKm,
      eventsState.maxPriceCad,
      eventsState.maxGroupSize,
      eventsState.happeningNowOnly,
    ],
  );

  const hasQuery = eventsState.query.trim().length > 0;
  const [featuredEvent, ...listEvents] = visibleEvents;
  const userLabel = user?.name || user?.email || '';
  const firstName = userLabel.split(/[@\s]/)[0] || 'there';
  const areaEventCount = eventsState.events.length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomPadding }}
      keyboardShouldPersistTaps="handled"
    >
      <XStack alignItems="center" gap={12} paddingTop={4} paddingBottom={12}>
        {onAvatarPress ? (
          <Pressable onPress={onAvatarPress}>
            {user ? <UserAvatar label={userLabel} image={user.image} size={44} /> : <GuestAvatar size={44} />}
          </Pressable>
        ) : user ? (
          <UserAvatar label={userLabel} image={user.image} size={44} />
        ) : (
          <GuestAvatar size={44} />
        )}
        <YStack flex={1} minWidth={0}>
          <Text fontSize={12} fontWeight="600" color={palette.muted} numberOfLines={1}>
            Hello {firstName}
          </Text>
          <Text fontSize={16} fontWeight="700" color={palette.ink} numberOfLines={1}>
            {getTimeGreeting()}
          </Text>
        </YStack>
        <View borderRadius={999} backgroundColor={palette.fog} paddingHorizontal={12} paddingVertical={6}>
          <Text fontSize={12} fontWeight="700" color={palette.slate}>
            {areaEventCount} {areaEventCount === 1 ? 'activity' : 'activities'}
          </Text>
        </View>
      </XStack>

      <YStack gap={12}>
        <XStack gap={8} alignItems="center">
          <View flex={1}>
            <SearchBar query={eventsState.query} onQueryChange={eventsState.setQuery} />
          </View>
          <Pressable onPress={onOpenFilters}>
            <View
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor="white"
              borderWidth={1}
              borderColor="rgba(41,47,54,0.1)"
              alignItems="center"
              justifyContent="center"
            >
              <View transform={[{ translateX: -2 }]}>
                <IconlyIcon name="Filter" size={18} color={palette.primary} />
              </View>
            </View>
          </Pressable>
        </XStack>

        {hasQuery ? (
          <SuggestionList onSelectEvent={onSelectEvent} />
        ) : (
          <>
            <ScopeSwitch
              activeScope={eventsState.activityScope}
              onScopeChange={eventsState.setActivityScope}
            />

            <CategoryChips
              activeCategory={eventsState.activeCategory}
              onCategoryChange={eventsState.setActiveCategory}
            />

            <CalendarStrip
              selectedDayKey={eventsState.selectedDayKey}
              onSelectDay={eventsState.setSelectedDayKey}
            />

            <XStack alignItems="center" justifyContent="space-between" marginTop={4}>
              <Text fontSize={16} fontWeight="700" color={palette.ink}>
                {getActivityScopeHeading(eventsState.activityScope)}
              </Text>
              {eventsState.hasActiveFilters() ? (
                <Pressable onPress={eventsState.resetFilters}>
                  <Text fontSize={12} fontWeight="700" color={palette.gray}>
                    Reset filters
                  </Text>
                </Pressable>
              ) : (
                <Text fontSize={12} fontWeight="600" color={palette.muted}>
                  {visibleEvents.length} {visibleEvents.length === 1 ? 'item' : 'items'}
                </Text>
              )}
            </XStack>

            {featuredEvent ? (
              <YStack gap={14}>
                <FeaturedEventCard
                  event={featuredEvent}
                  interestState={eventsState.interestById[featuredEvent.id]}
                  badgeLabel={
                    eventsState.activityScope === 'popular'
                      ? getActivityKindLabel(featuredEvent)
                      : null
                  }
                  onSelect={() => onSelectEvent(featuredEvent.id)}
                />
                <YStack gap={4}>
                  {listEvents.map((event, index) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      interestState={eventsState.interestById[event.id]}
                      isHighlighted={index % 2 === 1}
                      showTypeLabel={eventsState.activityScope === 'popular'}
                      onSelect={() => onSelectEvent(event.id)}
                    />
                  ))}
                </YStack>
              </YStack>
            ) : (
              <EmptyEventsState
                activityScope={eventsState.activityScope}
                activeCategory={eventsState.activeCategory}
                onClear={eventsState.resetFilters}
              />
            )}
          </>
        )}
      </YStack>
    </ScrollView>
  );
}
