import { Image } from 'expo-image';
import { Pressable, Share } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { AvatarGroup } from '@/components/ui/user-avatar';
import { eventImageUrl } from '@/lib/event-data';
import { getEventInterestState } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { EventInterestState, EventItem } from '@/lib/types';

export function shareEvent(event: EventItem) {
  void Share.share({
    message: `Check out ${event.title} at ${event.venue} in ${event.neighborhood} — found it on InTouch.`,
  });
}

export function FeaturedEventCard({
  event,
  interestState,
  badgeLabel,
  onSelect,
}: {
  event: EventItem;
  interestState?: EventInterestState;
  badgeLabel: string | null;
  onSelect: () => void;
}) {
  const interest = getEventInterestState(event, interestState);
  const isGroup = event.kind === 'group';
  const capacityFillPct =
    event.capacity > 0 ? Math.min(100, Math.round((interest.going / event.capacity) * 100)) : 0;
  const spotsLeft = Math.max(0, event.capacity - interest.going);

  return (
    <Pressable onPress={onSelect}>
      <YStack
        borderRadius={24}
        backgroundColor="white"
        padding={10}
        paddingBottom={16}
        borderWidth={1}
        borderColor={palette.line}
        shadowColor="#0f172a"
        shadowOpacity={0.06}
        shadowRadius={15}
        shadowOffset={{ width: 0, height: 10 }}
        elevation={4}
      >
        <View aspectRatio={16 / 10} borderRadius={18} overflow="hidden" backgroundColor={palette.mist}>
          {isGroup ? (
            <View flex={1} alignItems="center" justifyContent="center" backgroundColor={palette.fog}>
              <View
                width={96}
                height={96}
                borderRadius={24}
                backgroundColor="white"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={44}>{event.icon}</Text>
              </View>
            </View>
          ) : (
            <Image source={eventImageUrl(event)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          )}

          <View position="absolute" bottom={10} left={10} borderRadius={999} backgroundColor="rgba(255,255,255,0.95)" paddingHorizontal={10} paddingVertical={4}>
            <Text fontSize={12} fontWeight="700" color={palette.ink}>
              {event.price}
            </Text>
          </View>
          {badgeLabel ? (
            <View position="absolute" top={10} left={10} borderRadius={999} backgroundColor="rgba(255,255,255,0.95)" paddingHorizontal={10} paddingVertical={4}>
              <Text fontSize={12} fontWeight="700" color={palette.ink}>
                {badgeLabel}
              </Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => shareEvent(event)}
            hitSlop={6}
            style={{ position: 'absolute', top: 10, right: 10 }}
          >
            <View
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="rgba(255,255,255,0.9)"
              alignItems="center"
              justifyContent="center"
            >
              <IconlyIcon name="Share" size={16} />
            </View>
          </Pressable>
        </View>

        <YStack paddingHorizontal={6} gap={6}>
          <Text marginTop={12} fontSize={17} fontWeight="700" color={palette.ink} numberOfLines={1}>
            {event.title}
          </Text>
          <XStack flexWrap="wrap" columnGap={12} rowGap={4}>
            <XStack alignItems="center" gap={6}>
              <IconlyIcon name="Calendar" size={14} color={palette.gray} />
              <Text fontSize={12} fontWeight="600" color={palette.gray}>
                {event.startsAt}
              </Text>
            </XStack>
            <XStack alignItems="center" gap={6}>
              <IconlyIcon name="Location" size={14} color={palette.gray} />
              <Text fontSize={12} fontWeight="600" color={palette.gray}>
                {event.neighborhood}
              </Text>
            </XStack>
          </XStack>
          <Text fontSize={13} lineHeight={20} color={palette.muted} numberOfLines={2}>
            {event.description}
          </Text>
          <XStack alignItems="center" justifyContent="space-between" marginTop={4}>
            <XStack alignItems="center" gap={8}>
              <AvatarGroup
                labels={event.attendees.slice(0, 3).map((attendee) => ({
                  label: attendee.name,
                  image: attendee.image,
                }))}
              />
              <Text fontSize={12} fontWeight="700" color={palette.ink}>
                {interest.going}+ {isGroup ? 'members' : 'interested'}
              </Text>
            </XStack>
            {event.capacity > 0 ? (
              <Text fontSize={12} fontWeight="700" color={spotsLeft === 0 ? palette.coral : palette.muted}>
                {spotsLeft === 0 ? 'Full' : `${spotsLeft} spots left`}
              </Text>
            ) : null}
          </XStack>
          {event.capacity > 0 ? (
            <View height={6} borderRadius={3} backgroundColor={palette.fog} overflow="hidden">
              <View
                height="100%"
                width={`${capacityFillPct}%`}
                borderRadius={3}
                backgroundColor={capacityFillPct >= 85 ? palette.coral : palette.teal}
              />
            </View>
          ) : null}
        </YStack>
      </YStack>
    </Pressable>
  );
}
