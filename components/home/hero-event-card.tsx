import { memo } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { AvatarGroup } from '@/components/ui/user-avatar';
import { eventImageUrl } from '@/lib/event-data';
import { getCategoryLabel, getEventInterestState, splitStartsAt } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { EventInterestState, EventItem } from '@/lib/types';

function HeroEventCardComponent({
  event,
  interestState,
  onSelect,
  onToggleInterest,
  onJoin,
}: {
  event: EventItem;
  interestState?: EventInterestState;
  onSelect: () => void;
  onToggleInterest: () => void;
  onJoin: () => void;
}) {
  const interest = getEventInterestState(event, interestState);
  const [datePart, timePart] = splitStartsAt(event.startsAt);
  const isGroup = event.kind === 'group';
  const extraGoing = Math.max(0, interest.going - 3);
  const handleJoinPress = (pressEvent: GestureResponderEvent) => {
    pressEvent.stopPropagation();
    onJoin();
  };
  const handleToggleInterestPress = (pressEvent: GestureResponderEvent) => {
    pressEvent.stopPropagation();
    onToggleInterest();
  };

  return (
    <Pressable onPress={onSelect}>
      <YStack
        borderRadius={28}
        overflow="hidden"
        aspectRatio={1}
        backgroundColor={palette.mist}
        shadowColor="#0f172a"
        shadowOpacity={0.12}
        shadowRadius={20}
        shadowOffset={{ width: 0, height: 12 }}
        elevation={6}
      >
        {isGroup ? (
          <View flex={1} alignItems="center" justifyContent="center" backgroundColor={palette.fog}>
            <Text fontSize={64}>{event.icon}</Text>
          </View>
        ) : (
          <Image
            source={eventImageUrl(event)}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}

        <LinearGradient
          colors={['rgba(9,9,11,0)', 'rgba(9,9,11,0.78)']}
          locations={[0.35, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' }}
        />

        <View
          position="absolute"
          top={14}
          left={14}
          borderRadius={999}
          backgroundColor="rgba(255,255,255,0.94)"
          paddingHorizontal={12}
          paddingVertical={6}
        >
          <Text fontSize={12} fontWeight="700" color={palette.ink}>
            {getCategoryLabel(event.category)}
          </Text>
        </View>

        <YStack position="absolute" left={16} right={16} bottom={16} gap={10}>
          <Text fontSize={20} fontWeight="700" color="white" numberOfLines={1}>
            {event.title}
          </Text>

          <XStack flexWrap="wrap" columnGap={14} rowGap={4}>
            <XStack alignItems="center" gap={5}>
              <IconlyIcon name="Location" size={13} color="rgba(255,255,255,0.85)" />
              <Text fontSize={12} fontWeight="600" color="rgba(255,255,255,0.85)" numberOfLines={1}>
                {event.neighborhood}
              </Text>
            </XStack>
            <XStack alignItems="center" gap={5}>
              <IconlyIcon name="Calendar" size={13} color="rgba(255,255,255,0.85)" />
              <Text fontSize={12} fontWeight="600" color="rgba(255,255,255,0.85)">
                {datePart}
              </Text>
            </XStack>
            {timePart ? (
              <XStack alignItems="center" gap={5}>
                <IconlyIcon name="Clock" size={13} color="rgba(255,255,255,0.85)" />
                <Text fontSize={12} fontWeight="600" color="rgba(255,255,255,0.85)">
                  {timePart}
                </Text>
              </XStack>
            ) : null}
          </XStack>

          <XStack alignItems="center" justifyContent="space-between" marginTop={2}>
            <XStack alignItems="center" gap={8}>
              <XStack alignItems="center">
                <AvatarGroup
                  labels={event.attendees.slice(0, 3).map((attendee) => ({
                    label: attendee.name,
                    image: attendee.image,
                  }))}
                  size={26}
                />
                {extraGoing > 0 ? (
                  <View
                    marginLeft={-8}
                    width={26}
                    height={26}
                    borderRadius={13}
                    borderWidth={2}
                    borderColor="white"
                    backgroundColor={palette.ink}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize={9} fontWeight="700" color="white">
                      +{extraGoing}
                    </Text>
                  </View>
                ) : null}
              </XStack>

              <Pressable onPress={handleJoinPress} hitSlop={6}>
                <View
                  width={34}
                  height={34}
                  borderRadius={17}
                  backgroundColor="rgba(255,255,255,0.22)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <IconlyIcon name="MessageCircleDots" size={16} color="white" />
                </View>
              </Pressable>
              <Pressable onPress={handleToggleInterestPress} hitSlop={6}>
                <View
                  width={34}
                  height={34}
                  borderRadius={17}
                  backgroundColor="rgba(255,255,255,0.22)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <IconlyIcon
                    name="Heart"
                    size={16}
                    color="white"
                    pack={interest.isInterested ? 'filled' : 'basic'}
                  />
                </View>
              </Pressable>
            </XStack>

            <Pressable onPress={handleJoinPress}>
              <LinearGradient
                colors={palette.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 }}
              >
                <Text fontSize={13} fontWeight="700" color="white">
                  Join
                </Text>
              </LinearGradient>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </Pressable>
  );
}

export const HeroEventCard = memo(HeroEventCardComponent);
