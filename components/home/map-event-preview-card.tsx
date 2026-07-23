import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Linking, Pressable, ScrollView } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { AvatarGroup, UserAvatar } from '@/components/ui/user-avatar';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { eventImageUrl } from '@/lib/event-data';
import {
  getCategoryLabel,
  getEventInterestState,
  getItemNoun,
  splitStartsAt,
} from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { getAttendeeKey, getUniqueTopics } from '@/lib/search-utils';
import type { EventInterestState, EventItem } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';

function Divider() {
  return <View height={1} backgroundColor={palette.line} />;
}

export function MapEventPreviewCard({
  event,
  interestState,
  onClose,
  onContentHeightChange,
}: {
  event: EventItem;
  interestState?: EventInterestState;
  onClose: () => void;
  onContentHeightChange?: (height: number) => void;
}) {
  const router = useRouter();
  const threads = useChatStore((state) => state.threads);
  const joinEventChat = useChatStore((state) => state.joinEventChat);
  const interest = getEventInterestState(event, interestState);
  const [datePart, timePart] = splitStartsAt(event.startsAt);
  const isGroup = event.kind === 'group';
  const itemNoun = getItemNoun(event);
  const categoryLabel = getCategoryLabel(event.category);
  const relatedTopics = getUniqueTopics([categoryLabel, ...event.tags]);
  const isFull = event.capacity > 0 && interest.going >= event.capacity;
  const spotsLeft = Math.max(0, event.capacity - interest.going);
  const capacityFillPct =
    event.capacity > 0 ? Math.min(100, Math.round((interest.going / event.capacity) * 100)) : 0;
  const attendeePreview = event.attendees.slice(0, 4);
  const extraAttendeeCount = Math.max(0, interest.going - attendeePreview.length);
  const existingThread = threads.find((thread) => thread.kind === 'event' && thread.eventId === event.id);

  const openDirections = () => {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${event.coordinates[1]},${event.coordinates[0]}`,
    );
  };

  const openChat = (chatId: string) => {
    onClose();
    router.push(`/chat/${chatId}`);
  };

  const handleJoin = async () => {
    try {
      const chatId = await joinEventChat(event);
      openChat(chatId);
    } catch {
      Alert.alert("Couldn't join", 'Please try again.');
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      onContentSizeChange={(_width, height) => onContentHeightChange?.(height)}
    >
      <YStack paddingHorizontal={14} gap={16}>
        {isGroup ? (
          <XStack alignItems="center" gap={12}>
            <View
              width={80}
              height={80}
              borderRadius={40}
              borderWidth={1}
              borderColor={palette.line}
              backgroundColor={palette.fog}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={36}>{event.icon}</Text>
            </View>
            <YStack flex={1} minWidth={0} gap={3}>
              <Text fontSize={18} fontWeight="800" color={palette.ink} numberOfLines={1}>
                {event.title}
              </Text>
              <Text fontSize={12} fontWeight="700" color={palette.slate}>
                Group · {categoryLabel}
              </Text>
              <XStack alignItems="center" gap={6}>
                <IconlyIcon name="Location" size={12} color={palette.gray} />
                <Text fontSize={11} fontWeight="600" color={palette.gray} numberOfLines={1} flexShrink={1}>
                  {event.venue} · {event.neighborhood}
                </Text>
              </XStack>
            </YStack>
          </XStack>
        ) : (
          <View aspectRatio={16 / 9} borderRadius={20} overflow="hidden" backgroundColor={palette.mist}>
            <Image source={eventImageUrl(event)} style={{ width: '100%', height: '100%' }} contentFit="cover" />

            <View
              position="absolute"
              top={10}
              left={10}
              borderRadius={999}
              backgroundColor="rgba(255,255,255,0.95)"
              paddingHorizontal={10}
              paddingVertical={4}
            >
              <Text fontSize={11} fontWeight="700" color={palette.ink}>
                Event · {categoryLabel}
              </Text>
            </View>
          </View>
        )}

        {!isGroup ? (
          <YStack gap={8}>
            <Text fontSize={20} fontWeight="800" color={palette.ink}>
              {event.title}
            </Text>

            <XStack alignItems="center" gap={6}>
              <IconlyIcon name="Location" size={14} color={palette.gray} />
              <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1} flexShrink={1}>
                {event.venue} · {event.neighborhood}
              </Text>
            </XStack>
          </YStack>
        ) : null}

        {/* Snapshot row: the same price/date/time/going facts that used to
            live in scattered chips and labels, now three even stat tiles
            so they scan as a single glance instead of separate sections. */}
        <XStack gap={8}>
          <YStack flex={1} gap={4} borderRadius={16} backgroundColor={palette.fog} padding={10} alignItems="center">
            <IconlyIcon name="Calendar" size={16} color={palette.slate} />
            <Text fontSize={11} fontWeight="700" color={palette.ink} numberOfLines={1}>
              {datePart}
            </Text>
            {timePart ? (
              <Text fontSize={10} fontWeight="600" color={palette.muted} numberOfLines={1}>
                {timePart}
              </Text>
            ) : null}
          </YStack>
          <YStack flex={1} gap={4} borderRadius={16} backgroundColor={palette.fog} padding={10} alignItems="center">
            <IconlyIcon name="Ticket" size={16} color={palette.slate} />
            <Text fontSize={11} fontWeight="700" color={palette.ink} numberOfLines={1}>
              {event.price}
            </Text>
            <Text fontSize={10} fontWeight="600" color={palette.muted} numberOfLines={1}>
              price
            </Text>
          </YStack>
          <YStack flex={1} gap={4} borderRadius={16} backgroundColor={palette.fog} padding={10} alignItems="center">
            <IconlyIcon name={isGroup ? 'Group' : 'User'} size={16} color={palette.slate} />
            <Text fontSize={11} fontWeight="700" color={palette.ink} numberOfLines={1}>
              {interest.going}+
            </Text>
            <Text fontSize={10} fontWeight="600" color={palette.muted} numberOfLines={1}>
              {isGroup ? 'members' : 'interested'}
            </Text>
          </YStack>
        </XStack>

        <Divider />

        <YStack gap={8}>
          <Text fontSize={14} fontWeight="800" color={palette.ink}>
            About
          </Text>
          <Text fontSize={13} lineHeight={20} color={palette.gray}>
            {event.description}
          </Text>
        </YStack>

        {relatedTopics.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <XStack gap={8}>
              {relatedTopics.map((topic) => (
                <View
                  key={topic}
                  borderRadius={999}
                  borderWidth={1}
                  borderColor={palette.line}
                  backgroundColor={palette.white}
                  paddingHorizontal={10}
                  paddingVertical={6}
                >
                  <Text fontSize={11} fontWeight="700" color={palette.slate}>
                    {topic}
                  </Text>
                </View>
              ))}
            </XStack>
          </ScrollView>
        ) : null}

        <Divider />

        <YStack gap={10}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontSize={14} fontWeight="800" color={palette.ink}>
              {isGroup ? 'Members' : "Who's going"}
            </Text>
            <Text fontSize={12} fontWeight="700" color={isFull ? palette.coral : palette.muted}>
              {isFull ? 'Full' : event.capacity > 0 ? `${spotsLeft} spots left` : `${interest.going} total`}
            </Text>
          </XStack>

          <XStack alignItems="center" gap={10}>
            <AvatarGroup
              labels={attendeePreview.map((attendee) => ({ label: attendee.name, image: attendee.image }))}
            />
            {extraAttendeeCount > 0 ? (
              <Text fontSize={12} fontWeight="700" color={palette.ink}>
                +{extraAttendeeCount} more
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

          <YStack gap={10} marginTop={2}>
            {attendeePreview.map((attendee, index) => (
              <XStack key={getAttendeeKey(attendee, index)} alignItems="center" gap={10}>
                <UserAvatar label={attendee.name} image={attendee.image} size={34} />
                <YStack flex={1} minWidth={0}>
                  <XStack alignItems="center" gap={6}>
                    <Text fontSize={12} fontWeight="700" color={palette.ink} numberOfLines={1} flexShrink={1}>
                      {attendee.name}
                    </Text>
                    {attendee.isHost ? (
                      <View borderRadius={999} backgroundColor={palette.primary} paddingHorizontal={6} paddingVertical={1}>
                        <Text fontSize={8} fontWeight="800" color="white">
                          HOST
                        </Text>
                      </View>
                    ) : null}
                  </XStack>
                  <Text fontSize={11} fontWeight="500" color={palette.muted} numberOfLines={1}>
                    {attendee.role}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>
        </YStack>

        <XStack gap={10} alignItems="center">
          <Pressable onPress={openDirections}>
            <View
              width={52}
              height={52}
              borderRadius={26}
              backgroundColor={palette.fog}
              alignItems="center"
              justifyContent="center"
            >
              <IconlyIcon name="Location" size={18} color={palette.ink} />
            </View>
          </Pressable>
          <View flex={1}>
            {existingThread ? (
              <Pressable onPress={() => openChat(existingThread.id)}>
                <View height={52} borderRadius={26} backgroundColor={palette.primary} alignItems="center" justifyContent="center">
                  <XStack alignItems="center" gap={8}>
                    <IconlyIcon name="MessageCircleDots" size={16} color="white" />
                    <Text fontSize={14} fontWeight="800" color="white">
                      Open {itemNoun} chat
                    </Text>
                  </XStack>
                </View>
              </Pressable>
            ) : (
              <SlideToConfirm
                label={isFull && isGroup ? 'Slide to join waitlist' : `Slide to join ${itemNoun}`}
                confirmingLabel="Joining…"
                onConfirm={handleJoin}
              />
            )}
          </View>
        </XStack>
      </YStack>
    </ScrollView>
  );
}
