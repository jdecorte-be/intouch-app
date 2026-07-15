import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { AvatarGroup } from '@/components/ui/user-avatar';
import { eventImageUrl } from '@/lib/event-data';
import { getCategoryLabel, getEventInterestState, splitStartsAt } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { EventInterestState, EventItem } from '@/lib/types';

export function TrendingEventCard({
  event,
  interestState,
  onSelect,
}: {
  event: EventItem;
  interestState?: EventInterestState;
  onSelect: () => void;
}) {
  const interest = getEventInterestState(event, interestState);
  const [datePart, timePart] = splitStartsAt(event.startsAt);
  const isGroup = event.kind === 'group';
  const extraGoing = Math.max(0, interest.going - 3);

  return (
    <Pressable onPress={onSelect}>
      <XStack gap={12} paddingVertical={10}>
        <View width={76} height={76} borderRadius={16} overflow="hidden" backgroundColor={palette.mist}>
          {isGroup ? (
            <View flex={1} alignItems="center" justifyContent="center" backgroundColor={palette.fog}>
              <Text fontSize={28}>{event.icon}</Text>
            </View>
          ) : (
            <Image source={eventImageUrl(event)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          )}
          <View
            position="absolute"
            top={6}
            left={6}
            borderRadius={999}
            backgroundColor="rgba(255,255,255,0.94)"
            paddingHorizontal={8}
            paddingVertical={3}
          >
            <Text fontSize={9} fontWeight="700" color={palette.ink}>
              {getCategoryLabel(event.category)}
            </Text>
          </View>
        </View>

        <YStack flex={1} minWidth={0} gap={4}>
          <Text fontSize={14} fontWeight="700" color={palette.ink} numberOfLines={1}>
            {event.title}
          </Text>
          <Text fontSize={12} lineHeight={16} color={palette.gray} numberOfLines={1}>
            {event.description}
          </Text>

          <XStack alignItems="center" justifyContent="space-between" marginTop={2}>
            <XStack alignItems="center" gap={6}>
              <AvatarGroup
                labels={event.attendees.slice(0, 3).map((attendee) => ({
                  label: attendee.name,
                  image: attendee.image,
                }))}
                size={20}
              />
              {extraGoing > 0 ? (
                <Text fontSize={11} fontWeight="700" color={palette.slate}>
                  {extraGoing}+
                </Text>
              ) : null}
            </XStack>
            {event.capacity > 0 ? (
              <XStack alignItems="center" gap={4}>
                <IconlyIcon name="Ticket" size={12} color={palette.muted} />
                <Text fontSize={11} fontWeight="600" color={palette.muted}>
                  {interest.going}/{event.capacity}
                </Text>
              </XStack>
            ) : null}
          </XStack>

          <XStack alignItems="center" gap={4}>
            <IconlyIcon name="Location" size={12} color={palette.muted} />
            <Text fontSize={11} fontWeight="600" color={palette.muted} numberOfLines={1}>
              {event.neighborhood}
            </Text>
          </XStack>

          <XStack alignItems="center" gap={10}>
            <XStack alignItems="center" gap={4}>
              <IconlyIcon name="Calendar" size={12} color={palette.muted} />
              <Text fontSize={11} fontWeight="600" color={palette.muted}>
                {datePart}
              </Text>
            </XStack>
            {timePart ? (
              <XStack alignItems="center" gap={4}>
                <IconlyIcon name="Clock" size={12} color={palette.muted} />
                <Text fontSize={11} fontWeight="600" color={palette.muted}>
                  {timePart}
                </Text>
              </XStack>
            ) : null}
          </XStack>
        </YStack>
      </XStack>
    </Pressable>
  );
}
