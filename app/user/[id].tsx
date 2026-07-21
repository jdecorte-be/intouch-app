import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { EventRow } from '@/components/events/event-row';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { GlassMenu, type GlassMenuItem } from '@/components/ui/glass-menu';
import { SectionLabel } from '@/components/ui/section-label';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getBannerGradient, palette } from '@/lib/palette';
import { getPersonProfile } from '@/lib/search-utils';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';
import { useSessionStore } from '@/stores/session-store';

const HERO_HEIGHT = 300;

function CircleButton({
  icon,
  onPress,
}: {
  icon: Parameters<typeof IconlyIcon>[0]['name'];
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View
        width={38}
        height={38}
        borderRadius={19}
        backgroundColor="rgba(0,0,0,0.32)"
        alignItems="center"
        justifyContent="center"
      >
        <IconlyIcon name={icon} size={17} color="white" />
      </View>
    </Pressable>
  );
}

// Deterministic gradient + floating blobs for people without a photo, so
// the same person always gets the same banner instead of a plain fill.
function GeneratedBanner({ name }: { name: string }) {
  const [start, end] = getBannerGradient(name);
  const seed = name.split('').reduce((total, char) => total + char.charCodeAt(0), 0);

  return (
    <LinearGradient colors={[start, end]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <View
        position="absolute"
        top={-50 + (seed % 40)}
        right={-40 + (seed % 30)}
        width={190}
        height={190}
        borderRadius={95}
        backgroundColor="rgba(255,255,255,0.14)"
      />
      <View
        position="absolute"
        bottom={-80 - (seed % 30)}
        left={-50 + (seed % 50)}
        width={250}
        height={250}
        borderRadius={125}
        backgroundColor="rgba(0,0,0,0.14)"
      />
      <View
        position="absolute"
        top={70 + (seed % 60)}
        left={30 + (seed % 90)}
        width={100 + (seed % 40)}
        height={100 + (seed % 40)}
        borderRadius={999}
        backgroundColor="rgba(255,255,255,0.09)"
      />
    </LinearGradient>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <YStack alignItems="center" gap={2} flex={1}>
      <Text fontSize={18} fontWeight="800" color={palette.ink}>
        {value}
      </Text>
      <Text fontSize={11} fontWeight="600" color={palette.muted}>
        {label}
      </Text>
    </YStack>
  );
}

function getHandle(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `@${slug || 'member'}`;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const events = useEventsStore((state) => state.events);
  const currentUser = useSessionStore((state) => state.user);
  const startDirectChat = useChatStore((state) => state.startDirectChat);

  const personKey = id ? decodeURIComponent(id) : '';
  const profile = useMemo(() => getPersonProfile(events, personKey), [events, personKey]);

  const openEvent = (eventId: string) => router.push(`/event/${eventId}`);

  if (!profile) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} backgroundColor={palette.white} padding={32}>
        <Text fontSize={16} fontWeight="700" color={palette.ink}>
          We couldn&apos;t find this profile.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text fontSize={14} fontWeight="700" color={palette.gray}>
            Go back
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const isSelf = Boolean(profile.userId && currentUser?.id === profile.userId);
  const canMessage = Boolean(profile.userId) && !isSelf;
  const isHost = profile.hostedEvents.length > 0;
  const isAttendee = profile.attendingEvents.length > 0;
  const totalEvents = profile.hostedEvents.length + profile.attendingEvents.length;

  const statusLabel = isHost ? 'Hosts events' : isAttendee ? 'Attends events' : 'New here';
  const statusColor = isHost ? palette.green : isAttendee ? palette.primary : palette.muted;

  const activitySentence = isHost
    ? `Hosting ${profile.hostedEvents.length} ${profile.hostedEvents.length === 1 ? 'event' : 'events'}${
        isAttendee ? ` and attending ${profile.attendingEvents.length} more` : ''
      } on ReTalk.`
    : isAttendee
      ? `Attending ${profile.attendingEvents.length} ${profile.attendingEvents.length === 1 ? 'event' : 'events'} on ReTalk.`
      : 'New around here — no events yet.';

  const bioText = [profile.roles.length > 0 ? profile.roles.join(' · ') : null, activitySentence]
    .filter(Boolean)
    .join(' — ');

  const profileLink = `https://retalk.app/user/${encodeURIComponent(profile.key)}`;

  const messagePerson = async () => {
    if (!profile.userId) {
      return;
    }

    try {
      const chatId = await startDirectChat(profile.name, profile.userId);
      router.push(`/chat/${chatId}`);
    } catch {
      Alert.alert("Couldn't start chat", 'Please try again.');
    }
  };

  const copyProfileLink = async () => {
    await Clipboard.setStringAsync(profileLink);
    Alert.alert('Link copied', 'The profile link is on your clipboard.');
  };

  const reportProfile = () => {
    Alert.alert('Report this profile?', 'Let us know something is wrong.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => Alert.alert('Reported', "Thanks, we'll take a look."),
      },
    ]);
  };

  const menuItems: GlassMenuItem[] = [
    { key: 'share', label: 'Share profile', icon: 'ExportSquare', onPress: copyProfileLink },
    ...(isSelf
      ? []
      : [
          {
            key: 'report',
            label: 'Report profile',
            icon: 'InfoCircle',
            onPress: reportProfile,
            destructive: true,
          } as GlassMenuItem,
        ]),
  ];

  return (
    <View flex={1} backgroundColor={palette.white}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View height={HERO_HEIGHT} backgroundColor="#111318" overflow="hidden">
          {profile.image && !coverFailed ? (
            <Image
              source={profile.image}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              blurRadius={45}
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <GeneratedBanner name={profile.name} />
          )}

          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.12)', 'rgba(17,19,24,0.96)']}
            locations={[0, 0.42, 1]}
            style={{ position: 'absolute', inset: 0 }}
          />

          <XStack
            position="absolute"
            top={insets.top + 8}
            left={14}
            right={14}
            alignItems="center"
            justifyContent="space-between"
          >
            <CircleButton icon="ArrowLeft" onPress={() => router.back()} />
            <View borderRadius={999} backgroundColor="rgba(0,0,0,0.32)" paddingHorizontal={14} paddingVertical={8}>
              <Text fontSize={13} fontWeight="700" color="white">
                {getHandle(profile.name)}
              </Text>
            </View>
            <CircleButton icon="More" onPress={() => setIsMenuOpen(true)} />
          </XStack>
        </View>

        <YStack alignItems="center" gap={10} marginTop={-52} paddingHorizontal={20}>
          <UserAvatar label={profile.name} image={profile.image} size={104} borderWidth={4} borderColor="white" />

          <XStack alignItems="center" gap={6}>
            <Text fontSize={19} fontWeight="800" color={palette.ink}>
              {profile.name}
            </Text>
            {isHost ? <IconlyIcon name="CheckCircle" size={16} color={palette.primary} pack="filled" /> : null}
          </XStack>

          {isSelf ? (
            <Text fontSize={11} fontWeight="700" color={palette.muted}>
              This is you
            </Text>
          ) : null}

          <XStack alignItems="center" gap={6}>
            <View width={7} height={7} borderRadius={4} backgroundColor={statusColor} />
            <Text fontSize={12} fontWeight="700" color={palette.gray}>
              {statusLabel}
            </Text>
          </XStack>

          <YStack alignItems="center" gap={2} maxWidth={320}>
            <Text
              fontSize={13}
              lineHeight={19}
              color={palette.gray}
              textAlign="center"
              numberOfLines={isBioExpanded ? undefined : 2}
            >
              {bioText}
            </Text>
            {!isBioExpanded ? (
              <Pressable onPress={() => setIsBioExpanded(true)}>
                <Text fontSize={12} fontWeight="700" color={palette.primary}>
                  More
                </Text>
              </Pressable>
            ) : null}
          </YStack>

          <XStack alignItems="center" gap={10} marginTop={6} width="100%" justifyContent="center">
            {canMessage ? (
              <Pressable onPress={messagePerson} style={{ flex: 1, maxWidth: 220 }}>
                <View
                  borderRadius={999}
                  backgroundColor={palette.ink}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  paddingHorizontal={24}
                >
                  <Text color="white" fontWeight="700" fontSize={14}>
                    Message
                  </Text>
                </View>
              </Pressable>
            ) : null}
            <Pressable onPress={copyProfileLink}>
              <View
                width={46}
                height={46}
                borderRadius={23}
                backgroundColor={palette.fog}
                alignItems="center"
                justifyContent="center"
              >
                <IconlyIcon name="ExportSquare" size={17} color={palette.ink} />
              </View>
            </Pressable>
          </XStack>
        </YStack>

        <YStack paddingHorizontal={16} paddingTop={24} gap={16}>
          <XStack
            borderRadius={20}
            backgroundColor="white"
            borderWidth={1}
            borderColor={palette.line}
            padding={16}
          >
            <StatBlock value={profile.hostedEvents.length} label="Hosting" />
            <View width={1} backgroundColor={palette.line} />
            <StatBlock value={profile.attendingEvents.length} label="Attending" />
            <View width={1} backgroundColor={palette.line} />
            <StatBlock value={totalEvents} label="Total" />
          </XStack>

          {profile.hostedEvents.length > 0 ? (
            <YStack gap={8}>
              <SectionLabel>Hosting</SectionLabel>
              <YStack borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} padding={10}>
                {profile.hostedEvents.map((event) => (
                  <EventRow key={event.id} event={event} showTypeLabel onSelect={() => openEvent(event.id)} />
                ))}
              </YStack>
            </YStack>
          ) : null}

          {profile.attendingEvents.length > 0 ? (
            <YStack gap={8}>
              <SectionLabel>Attending</SectionLabel>
              <YStack borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} padding={10}>
                {profile.attendingEvents.map((event) => (
                  <EventRow key={event.id} event={event} showTypeLabel onSelect={() => openEvent(event.id)} />
                ))}
              </YStack>
            </YStack>
          ) : null}

          {totalEvents === 0 ? (
            <YStack alignItems="center" gap={4} paddingVertical={24}>
              <Text fontSize={13} fontWeight="600" color={palette.muted} textAlign="center">
                No activity to show yet.
              </Text>
            </YStack>
          ) : null}
        </YStack>
      </ScrollView>

      <GlassMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={menuItems}
        top={insets.top + 46}
        right={14}
      />
    </View>
  );
}
