import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, YStack } from 'tamagui';

import { EventRow } from '@/components/events/event-row';
import { FeaturedEventCard } from '@/components/events/featured-event-card';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { SectionLabel } from '@/components/ui/section-label';
import { getActivityKindLabel, getEventIdFromChatThread } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';

export default function TicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const events = useEventsStore((state) => state.events);
  const interestById = useEventsStore((state) => state.interestById);
  const threads = useChatStore((state) => state.threads);

  const subscribedEvents = useMemo(() => {
    const subscribedIds = new Set(
      threads.flatMap((thread) => {
        const eventId = thread.kind === 'event' ? getEventIdFromChatThread(thread.id) : null;

        return eventId ? [eventId] : [];
      }),
    );

    return events.filter((event) => subscribedIds.has(event.id));
  }, [events, threads]);

  const [featured, ...rest] = subscribedEvents;

  return (
    <View flex={1} backgroundColor={palette.mist}>
      <YStack paddingHorizontal={16} paddingTop={insets.top + 12} paddingBottom={12}>
        <SectionLabel>Your plans</SectionLabel>
        <Text fontSize={22} fontWeight="700" color={palette.ink} marginTop={2}>
          Tickets
        </Text>
      </YStack>

      {subscribedEvents.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
            <View width={48} height={48} borderRadius={12} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
              <IconlyIcon name="Ticket" size={20} color={palette.slate} />
            </View>
            <Text fontSize={16} fontWeight="700" color={palette.ink} marginTop={8}>
              No plans yet
            </Text>
            <Text fontSize={14} lineHeight={22} color={palette.gray} textAlign="center">
              Join an event or group from the map and it will show up here with its chat.
            </Text>
          </YStack>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 120, gap: 14 }}
          showsVerticalScrollIndicator={false}
        >
          {featured ? (
            <FeaturedEventCard
              event={featured}
              interestState={interestById[featured.id]}
              badgeLabel={getActivityKindLabel(featured)}
              onSelect={() => router.push(`/event/${featured.id}`)}
            />
          ) : null}
          <YStack gap={4} backgroundColor="white" borderRadius={20} padding={6} borderWidth={rest.length ? 1 : 0} borderColor={palette.line}>
            {rest.map((event, index) => (
              <EventRow
                key={event.id}
                event={event}
                interestState={interestById[event.id]}
                isHighlighted={index % 2 === 1}
                showTypeLabel
                onSelect={() => router.push(`/event/${event.id}`)}
              />
            ))}
          </YStack>
        </ScrollView>
      )}
    </View>
  );
}
