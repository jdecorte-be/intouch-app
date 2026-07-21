import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { eventImageUrl } from '@/lib/event-data';
import { splitStartsAt } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { EventItem } from '@/lib/types';
import { selectSubscribedEventIds, useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';

const SCREEN_BACKGROUND = palette.white;

function QrMark() {
  const blocks = [
    [2, 2],
    [3, 2],
    [4, 2],
    [2, 3],
    [4, 3],
    [2, 4],
    [3, 4],
    [4, 4],
    [9, 2],
    [10, 2],
    [11, 2],
    [9, 3],
    [11, 3],
    [9, 4],
    [10, 4],
    [11, 4],
    [2, 9],
    [3, 9],
    [4, 9],
    [2, 10],
    [4, 10],
    [2, 11],
    [3, 11],
    [4, 11],
    [7, 6],
    [10, 6],
    [6, 7],
    [8, 8],
    [11, 8],
    [7, 10],
    [9, 10],
    [11, 11],
  ];

  return (
    <View width={34} height={34} borderRadius={17} backgroundColor="#f4f4f4" alignItems="center" justifyContent="center">
      <Svg width={21} height={21} viewBox="0 0 14 14">
        {blocks.map(([x, y]) => (
          <Rect key={`${x}-${y}`} x={x} y={y} width={1.35} height={1.35} rx={0.18} fill="#16171a" />
        ))}
      </Svg>
    </View>
  );
}

function formatTicketDate(startsAt: string) {
  const [datePart, timePart] = splitStartsAt(startsAt);

  return timePart ? `${datePart} at ${timePart}` : datePart;
}

function TicketCard({ event, onSelect }: { event: EventItem; onSelect: () => void }) {
  const isGroup = event.kind === 'group';

  return (
    <Pressable onPress={onSelect}>
      <View
        borderRadius={24}
        backgroundColor={palette.white}
        shadowColor="#0f172a"
        shadowOpacity={0.08}
        shadowRadius={16}
        shadowOffset={{ width: 0, height: 6 }}
        style={{ elevation: 4 }}
      >
        <View minHeight={104} borderRadius={24} overflow="hidden" position="relative">
          <XStack padding={9} paddingRight={10} gap={10} alignItems="flex-start">
            <View
              width={58}
              height={58}
              borderRadius={16}
              overflow="hidden"
              style={{ backgroundColor: event.accent }}
              alignItems="center"
              justifyContent="center"
            >
              {isGroup ? (
                <Text fontSize={24}>{event.icon}</Text>
              ) : (
                <Image source={eventImageUrl(event)} style={{ width: 58, height: 58 }} contentFit="cover" />
              )}
            </View>

            <YStack flex={1} minWidth={0} paddingTop={2}>
              <Text fontSize={9} lineHeight={12} fontWeight="600" color="#8b8d93" numberOfLines={1}>
                {formatTicketDate(event.startsAt)}
              </Text>
              <Text fontSize={13} lineHeight={15} fontWeight="800" color="#101114" numberOfLines={2}>
                {event.title}
              </Text>
            </YStack>

            <QrMark />
          </XStack>

          <XStack
            height={28}
            borderTopWidth={1}
            borderTopColor="#f0f0f1"
            alignItems="center"
            paddingLeft={59}
            paddingRight={12}
            gap={5}
          >
            <View style={{ transform: [{ rotate: '45deg' }] }}>
              <IconlyIcon name="Cursor" size={10} color="#a4a6ad" weight="fill" />
            </View>
            <Text fontSize={8} lineHeight={10} fontWeight="600" color="#a4a6ad" numberOfLines={1} flex={1}>
              {event.venue} • {event.neighborhood}
            </Text>
          </XStack>

          <View
            position="absolute"
            left={-8}
            top={63}
            width={19}
            height={19}
            borderRadius={10}
            backgroundColor={SCREEN_BACKGROUND}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function TicketsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const events = useEventsStore((state) => state.events);
  const subscribedIds = useChatStore(selectSubscribedEventIds);

  const subscribedEvents = useMemo(
    () => events.filter((event) => subscribedIds.has(event.id)),
    [events, subscribedIds],
  );

  return (
    <View flex={1} backgroundColor={SCREEN_BACKGROUND}>
      {subscribedEvents.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
            <View width={48} height={48} borderRadius={14} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
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
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 118,
            gap: 14,
          }}
          showsVerticalScrollIndicator={false}
        >
          {subscribedEvents.map((event) => (
            <TicketCard key={event.id} event={event} onSelect={() => router.push(`/event/${event.id}`)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
