import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { EventRow } from '@/components/events/event-row';
import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';
import type { EventItem } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

const ROW_BORDER = 'rgba(41,47,54,0.06)';

function SettingsRow({
  icon,
  label,
  badge,
  toggle,
  onToggle,
  onPress,
  rightIcon,
  destructive,
  showBorder,
}: {
  icon: IconlyIconName;
  label: string;
  badge?: number;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  rightIcon?: IconlyIconName;
  destructive?: boolean;
  showBorder: boolean;
}) {
  const content = (
    <XStack
      alignItems="center"
      gap={12}
      paddingHorizontal={14}
      paddingVertical={14}
      borderTopWidth={showBorder ? 1 : 0}
      borderColor={ROW_BORDER}
    >
      <View
        width={32}
        height={32}
        borderRadius={10}
        backgroundColor={destructive ? palette.dangerSoft : palette.fog}
        alignItems="center"
        justifyContent="center"
      >
        <IconlyIcon name={icon} size={16} color={destructive ? palette.dangerText : palette.slate} />
      </View>
      <Text flex={1} fontSize={14} fontWeight="700" color={destructive ? palette.dangerText : palette.inkSoft}>
        {label}
      </Text>
      {typeof badge === 'number' && badge > 0 ? (
        <View
          minWidth={22}
          height={22}
          borderRadius={11}
          paddingHorizontal={6}
          backgroundColor={palette.primary}
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={11} fontWeight="800" color="white">
            {badge}
          </Text>
        </View>
      ) : null}
      {toggle !== undefined ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: palette.line, true: palette.primary }}
          thumbColor="white"
          style={{ transform: [{ scale: 0.85 }] }}
        />
      ) : onPress ? (
        <IconlyIcon name={rightIcon ?? 'ChevronRight'} size={16} color={palette.muted} />
      ) : null}
    </XStack>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

function EventAccordion({
  icon,
  label,
  events,
  isExpanded,
  onToggle,
  onSelectEvent,
  showBorder,
}: {
  icon: IconlyIconName;
  label: string;
  events: EventItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelectEvent: (id: string) => void;
  showBorder: boolean;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <>
      <SettingsRow
        icon={icon}
        label={label}
        badge={events.length}
        onPress={onToggle}
        rightIcon={isExpanded ? 'ChevronUp' : 'ChevronDown'}
        showBorder={showBorder}
      />
      {isExpanded ? (
        <YStack borderTopWidth={1} borderColor={ROW_BORDER} padding={10}>
          {events.map((event) => (
            <EventRow key={event.id} event={event} showTypeLabel onSelect={() => onSelectEvent(event.id)} />
          ))}
        </YStack>
      ) : null}
    </>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const hostedEvents = useSessionStore((state) => state.hostedEvents);
  const hostedGroups = useSessionStore((state) => state.hostedGroups);
  const interestedEvents = useSessionStore((state) => state.interestedEvents);
  const interestedGroups = useSessionStore((state) => state.interestedGroups);

  const [expandedSection, setExpandedSection] = useState<'hosting' | 'interested' | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);

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
        <Pressable onPress={() => router.push('/auth?mode=login')}>
          <View borderRadius={999} backgroundColor={palette.ink} paddingHorizontal={20} paddingVertical={12} marginTop={8}>
            <Text color="white" fontWeight="700" fontSize={14}>
              Sign in
            </Text>
          </View>
        </Pressable>
      </YStack>
    );
  }

  const hosting = [...hostedEvents, ...hostedGroups];
  const interested = [...interestedEvents, ...interestedGroups];
  const hasActivity = hosting.length > 0 || interested.length > 0;

  const toggleSection = (section: 'hosting' | 'interested') =>
    setExpandedSection((current) => (current === section ? null : section));

  return (
    <View flex={1} backgroundColor={palette.white}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 120,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <YStack alignItems="center" gap={6}>
          <UserAvatar label={user.name || user.email} image={user.image} size={96} borderWidth={3} borderColor={palette.primarySoft} />
          <Text fontSize={22} fontWeight="800" color={palette.ink} marginTop={8}>
            {user.name}
          </Text>
          <Text fontSize={13} fontWeight="500" color={palette.gray}>
            {user.email}
          </Text>

          <Pressable onPress={() => router.push('/onboarding')} style={{ marginTop: 12 }}>
            <View borderRadius={999} backgroundColor={palette.ink} paddingHorizontal={24} paddingVertical={12}>
              <Text color="white" fontWeight="700" fontSize={14}>
                Edit profile
              </Text>
            </View>
          </Pressable>
        </YStack>

        {hasActivity ? (
          <YStack gap={10}>
            <Text fontSize={13} fontWeight="700" color={palette.muted} paddingHorizontal={4}>
              My events
            </Text>
            <YStack borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} overflow="hidden">
              <EventAccordion
                icon="Ticket"
                label="Hosting"
                events={hosting}
                isExpanded={expandedSection === 'hosting'}
                onToggle={() => toggleSection('hosting')}
                onSelectEvent={openEvent}
                showBorder={false}
              />
              <EventAccordion
                icon="Heart"
                label="Interested"
                events={interested}
                isExpanded={expandedSection === 'interested'}
                onToggle={() => toggleSection('interested')}
                onSelectEvent={openEvent}
                showBorder={hosting.length > 0}
              />
            </YStack>
          </YStack>
        ) : null}

        {/* Settings */}
        <YStack gap={10}>
          <Text fontSize={13} fontWeight="700" color={palette.muted} paddingHorizontal={4}>
            Settings
          </Text>
          <YStack borderRadius={20} backgroundColor="white" borderWidth={1} borderColor={palette.line} overflow="hidden">
            <SettingsRow icon="Bell" label="Push notifications" toggle={pushEnabled} onToggle={setPushEnabled} showBorder={false} />
            <SettingsRow icon="MessageCircleDots" label="Feedback" onPress={() => {}} showBorder />
            <SettingsRow icon="InfoCircle" label="About us" onPress={() => {}} showBorder />
            <SettingsRow icon="Cog" label="Account settings" onPress={() => {}} showBorder />
            <SettingsRow icon="ArrowOutRightCircleHalf" label="Logout" onPress={signOut} destructive showBorder />
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
}
