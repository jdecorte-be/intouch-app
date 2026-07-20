import { useRouter } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { SectionLabel } from '@/components/ui/section-label';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { EventRow } from '@/components/events/event-row';
import { goalOptions, hostableCategories, neighborhoodOptions } from '@/lib/event-data';
import { palette } from '@/lib/palette';
import type { EventItem, HostableCategory } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

const MAX_ACTIVITY_ROWS = 4;

function ActivityCard({ title, items, onSelect }: { title: string; items: EventItem[]; onSelect: (id: string) => void }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <YStack gap={4} borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} padding={10}>
      <Text fontSize={15} fontWeight="700" color={palette.ink} paddingHorizontal={6} paddingTop={4}>
        {title}
      </Text>
      <YStack>
        {items.slice(0, MAX_ACTIVITY_ROWS).map((event) => (
          <EventRow key={event.id} event={event} showTypeLabel onSelect={() => onSelect(event.id)} />
        ))}
      </YStack>
    </YStack>
  );
}

function SelectableChip({
  label,
  emoji,
  isSelected,
  onPress,
}: {
  label: string;
  emoji?: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <XStack
        height={36}
        alignItems="center"
        gap={6}
        borderRadius={999}
        paddingHorizontal={13}
        backgroundColor={isSelected ? palette.ink : 'white'}
        borderWidth={1}
        borderColor={isSelected ? palette.ink : palette.line}
      >
        {emoji ? <Text fontSize={13}>{emoji}</Text> : null}
        <Text fontSize={13} fontWeight="700" color={isSelected ? 'white' : palette.inkSoft}>
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const updateProfile = useSessionStore((state) => state.updateProfile);
  const signOut = useSessionStore((state) => state.signOut);
  const hostedEvents = useSessionStore((state) => state.hostedEvents);
  const hostedGroups = useSessionStore((state) => state.hostedGroups);
  const interestedEvents = useSessionStore((state) => state.interestedEvents);
  const interestedGroups = useSessionStore((state) => state.interestedGroups);
  const openEvent = (eventId: string) => router.push(`/event/${eventId}`);

  if (!user) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} backgroundColor={palette.white} padding={32}>
        <GuestAvatar size={56} />
        <Text fontSize={16} fontWeight="700" color={palette.ink}>
          You&apos;re browsing as a guest
        </Text>
        <Text fontSize={14} lineHeight={22} color={palette.gray} textAlign="center">
          Sign in to join event chats, save your interests, and host your own activities.
        </Text>
        <Pressable onPress={() => router.push('/login')}>
          <View borderRadius={999} backgroundColor={palette.ink} paddingHorizontal={20} paddingVertical={12} marginTop={8}>
            <Text color="white" fontWeight="700" fontSize={14}>
              Sign in
            </Text>
          </View>
        </Pressable>
      </YStack>
    );
  }

  const toggleInterest = (category: HostableCategory) => {
    const next = user.eventInterests.includes(category)
      ? user.eventInterests.filter((value) => value !== category)
      : [...user.eventInterests, category];

    updateProfile({ eventInterests: next });
  };

  const toggleGoal = (goal: string) => {
    const next = user.eventGoals.includes(goal)
      ? user.eventGoals.filter((value) => value !== goal)
      : [...user.eventGoals, goal];

    updateProfile({ eventGoals: next });
  };

  return (
    <View flex={1} backgroundColor={palette.white}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 120,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <YStack>
          <SectionLabel>Account</SectionLabel>
          <Text fontSize={22} fontWeight="700" color={palette.ink} marginTop={2}>
            Profile
          </Text>
        </YStack>

        {/* Identity card */}
        <XStack
          alignItems="center"
          gap={14}
          borderRadius={20}
          backgroundColor="white"
          borderWidth={1}
          borderColor={palette.line}
          padding={16}
        >
          <UserAvatar label={user.name || user.email} image={user.image} size={56} />
          <YStack flex={1} minWidth={0}>
            <Text fontSize={16} fontWeight="700" color={palette.ink} numberOfLines={1}>
              {user.name}
            </Text>
            <Text fontSize={13} fontWeight="500" color={palette.gray} numberOfLines={1}>
              {user.email}
            </Text>
            <Text fontSize={12} fontWeight="600" color={palette.muted} marginTop={4}>
              Member since {user.memberSince}
            </Text>
          </YStack>
        </XStack>

        <ActivityCard title="Hosting" items={[...hostedEvents, ...hostedGroups]} onSelect={openEvent} />
        <ActivityCard title="Interested" items={[...interestedEvents, ...interestedGroups]} onSelect={openEvent} />

        {/* Neighborhood */}
        <YStack gap={10} borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} padding={16}>
          <XStack alignItems="center" gap={8}>
            <IconlyIcon name="Location" size={16} color={palette.slate} />
            <Text fontSize={15} fontWeight="700" color={palette.ink}>
              Home neighborhood
            </Text>
          </XStack>
          <XStack flexWrap="wrap" gap={8}>
            {neighborhoodOptions.map((neighborhood) => (
              <SelectableChip
                key={neighborhood}
                label={neighborhood}
                isSelected={user.homeNeighborhood === neighborhood}
                onPress={() =>
                  updateProfile({
                    homeNeighborhood:
                      user.homeNeighborhood === neighborhood ? null : neighborhood,
                  })
                }
              />
            ))}
          </XStack>
        </YStack>

        {/* Interests */}
        <YStack gap={10} borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} padding={16}>
          <XStack alignItems="center" gap={8}>
            <IconlyIcon name="Sparkles" size={16} color={palette.slate} />
            <Text fontSize={15} fontWeight="700" color={palette.ink}>
              Event interests
            </Text>
          </XStack>
          <XStack flexWrap="wrap" gap={8}>
            {hostableCategories.map((category) => (
              <SelectableChip
                key={category.id}
                label={category.label}
                emoji={category.emoji}
                isSelected={user.eventInterests.includes(category.id)}
                onPress={() => toggleInterest(category.id)}
              />
            ))}
          </XStack>
        </YStack>

        {/* Goals */}
        <YStack gap={10} borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} padding={16}>
          <XStack alignItems="center" gap={8}>
            <IconlyIcon name="Compass" size={16} color={palette.slate} />
            <Text fontSize={15} fontWeight="700" color={palette.ink}>
              What brings you here
            </Text>
          </XStack>
          <XStack flexWrap="wrap" gap={8}>
            {goalOptions.map((goal) => (
              <SelectableChip
                key={goal.value}
                label={goal.label}
                emoji={goal.emoji}
                isSelected={user.eventGoals.includes(goal.value)}
                onPress={() => toggleGoal(goal.value)}
              />
            ))}
          </XStack>
        </YStack>

        {/* Links */}
        <YStack borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} overflow="hidden">
          {[
            { icon: 'MessageCircleDots' as const, label: 'Feedback' },
            { icon: 'InfoCircle' as const, label: 'About us' },
            { icon: 'Cog' as const, label: 'Account settings' },
          ].map((row, index) => (
            <XStack
              key={row.label}
              alignItems="center"
              gap={12}
              padding={14}
              borderTopWidth={index === 0 ? 0 : 1}
              borderColor="rgba(41,47,54,0.06)"
            >
              <IconlyIcon name={row.icon} size={16} color={palette.slate} />
              <Text flex={1} fontSize={14} fontWeight="600" color={palette.inkSoft}>
                {row.label}
              </Text>
              <IconlyIcon name="ChevronRight" size={16} color={palette.muted} />
            </XStack>
          ))}
        </YStack>

        {/* Sign out */}
        <Pressable onPress={signOut}>
          <XStack
            alignItems="center"
            justifyContent="center"
            gap={8}
            borderRadius={16}
            backgroundColor={palette.dangerSoft}
            padding={14}
          >
            <IconlyIcon name="ArrowOutRightCircleHalf" size={16} color={palette.dangerText} />
            <Text fontSize={14} fontWeight="700" color={palette.dangerText}>
              Sign out
            </Text>
          </XStack>
        </Pressable>
      </ScrollView>
    </View>
  );
}
