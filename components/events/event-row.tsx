import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { eventImageUrl } from '@/lib/event-data';
import { getActivityKindLabel, getEventInterestState, splitStartsAt } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { EventInterestState, EventItem } from '@/lib/types';

export function EventRow({
  event,
  interestState,
  isHighlighted = false,
  showTypeLabel = false,
  onSelect,
}: {
  event: EventItem;
  interestState?: EventInterestState;
  isHighlighted?: boolean;
  showTypeLabel?: boolean;
  onSelect: () => void;
}) {
  const interest = getEventInterestState(event, interestState);
  const [datePart, timePart] = splitStartsAt(event.startsAt);
  const isGroup = event.kind === 'group';
  const isFull = event.capacity > 0 && interest.going >= event.capacity;
  const trailingLabel = isFull ? 'Full' : isGroup ? `${interest.going} members` : event.price;

  return (
    <Pressable onPress={onSelect}>
      <XStack
        alignItems="center"
        gap={12}
        borderRadius={18}
        padding={10}
        backgroundColor={isHighlighted ? palette.fog : 'transparent'}
      >
        <View width={48} height={48} borderRadius={24} overflow="hidden" backgroundColor={palette.mist} alignItems="center" justifyContent="center">
          {isGroup ? (
            <Text fontSize={20}>{event.icon}</Text>
          ) : (
            <Image source={eventImageUrl(event)} style={{ width: 48, height: 48 }} contentFit="cover" />
          )}
        </View>
        <YStack flex={1} minWidth={0} gap={4}>
          <XStack alignItems="center" gap={8}>
            <Text fontSize={14} fontWeight="700" color={palette.ink} numberOfLines={1} flexShrink={1}>
              {event.title}
            </Text>
            {showTypeLabel ? (
              <View
                borderRadius={999}
                backgroundColor="white"
                borderWidth={1}
                borderColor={palette.line}
                paddingHorizontal={8}
                paddingVertical={2}
              >
                <Text fontSize={9} fontWeight="700" textTransform="uppercase" color={palette.gray}>
                  {getActivityKindLabel(event)}
                </Text>
              </View>
            ) : null}
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
        <Text fontSize={12} fontWeight="700" color={isFull ? palette.coral : palette.slate}>
          {trailingLabel}
        </Text>
      </XStack>
    </Pressable>
  );
}
