import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { addCalendarDays, formatDayLabel, toLocalDateKey } from '@/lib/date-utils';
import {
  categoryAccents,
  formatCanadianPrice,
  hostableCategories,
  neighborhoodLocations,
  neighborhoodOptions,
} from '@/lib/event-data';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';
import type { EventItem, HostableCategory } from '@/lib/types';
import { useEventsStore } from '@/stores/events-store';
import { useSessionStore } from '@/stores/session-store';

const fieldStyle = {
  ...appTextInputStyle,
  fontSize: 14,
  fontWeight: '500' as const,
  color: palette.ink,
  paddingVertical: 0,
};

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  multiline = false,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <YStack gap={6}>
      <Text fontSize={13} fontWeight="700" color={palette.inkSoft}>
        {label}
      </Text>
      <View
        borderRadius={14}
        borderWidth={1}
        borderColor={palette.line}
        backgroundColor="white"
        paddingHorizontal={14}
        paddingVertical={multiline ? 12 : 0}
        height={multiline ? 110 : 46}
        justifyContent={multiline ? 'flex-start' : 'center'}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          style={[fieldStyle, multiline ? { height: '100%', textAlignVertical: 'top' } : null]}
        />
      </View>
    </YStack>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string; emoji?: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap={8}>
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <Pressable key={option.value} onPress={() => onSelect(option.value)}>
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
              {option.emoji ? <Text fontSize={13}>{option.emoji}</Text> : null}
              <Text fontSize={13} fontWeight="700" color={isSelected ? 'white' : palette.inkSoft}>
                {option.label}
              </Text>
            </XStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}

export default function HostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addEvent = useEventsStore((state) => state.addEvent);
  const user = useSessionStore((state) => state.user);

  const [kind, setKind] = useState<'event' | 'group'>('event');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<HostableCategory>('social');
  const [venue, setVenue] = useState('');
  const [neighborhood, setNeighborhood] = useState(neighborhoodOptions[0]);
  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState('7:00 PM');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('20');
  const [description, setDescription] = useState('');

  const dayChoices = Array.from({ length: 7 }, (_, offset) => {
    const date = addCalendarDays(new Date(), offset);

    return {
      value: String(offset),
      label:
        offset <= 1
          ? formatDayLabel(date, offset)
          : date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
    };
  });

  const canSubmit = title.trim().length > 2 && venue.trim().length > 1;

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    const date = addCalendarDays(new Date(), dayOffset);
    const hostName = user?.name ?? 'You';
    const categoryMeta = hostableCategories.find((option) => option.id === category)!;
    const newEvent: EventItem = {
      id: `hosted-${Date.now()}`,
      kind,
      title: title.trim(),
      description:
        description.trim() ||
        `Hosted by ${hostName}. Details coming soon — join the chat to ask anything.`,
      venue: venue.trim(),
      neighborhood,
      category,
      icon: categoryMeta.emoji,
      startsAt: `${formatDayLabel(date, dayOffset)}, ${time.trim() || '7:00 PM'}`,
      startsAtKey: toLocalDateKey(date),
      price: formatCanadianPrice(price),
      going: 1,
      capacity: Math.max(2, Number(capacity) || 20),
      hosts: [hostName],
      attendees: [
        {
          name: hostName,
          role: kind === 'group' ? 'Group organizer' : 'Host',
          image: user?.image,
          isHost: true,
          userId: user?.id,
        },
      ],
      tags: [categoryMeta.label],
      coordinates: neighborhoodLocations[neighborhood] ?? [-79.3832, 43.6532],
      accent: categoryAccents[category],
    };

    addEvent(newEvent);
    router.dismiss();
    router.push(`/event/${newEvent.id}`);
  };

  return (
    <View flex={1} backgroundColor={palette.white}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        paddingTop={insets.top ? insets.top + 8 : 20}
        paddingBottom={12}
      >
        <YStack>
          <Text fontSize={11} fontWeight="700" letterSpacing={1.4} textTransform="uppercase" color={palette.silver}>
            Host
          </Text>
          <Text fontSize={20} fontWeight="700" color={palette.ink} marginTop={2}>
            New activity
          </Text>
        </YStack>
        <Pressable onPress={() => router.dismiss()}>
          <View width={36} height={36} borderRadius={18} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
            <IconlyIcon name="X" size={16} color={palette.gray} />
          </View>
        </Pressable>
      </XStack>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <YStack gap={6}>
          <Text fontSize={13} fontWeight="700" color={palette.inkSoft}>
            Type
          </Text>
          <ChipRow
            options={[
              { value: 'event', label: 'One-off event', emoji: '🎟️' },
              { value: 'group', label: 'Recurring group', emoji: '👥' },
            ]}
            selected={kind}
            onSelect={setKind}
          />
        </YStack>

        <Field label="Title" value={title} placeholder="Sunset run + tacos after" onChangeText={setTitle} />

        <YStack gap={6}>
          <Text fontSize={13} fontWeight="700" color={palette.inkSoft}>
            Category
          </Text>
          <ChipRow
            options={hostableCategories.map((option) => ({
              value: option.id,
              label: option.label,
              emoji: option.emoji,
            }))}
            selected={category}
            onSelect={setCategory}
          />
        </YStack>

        <Field label="Venue" value={venue} placeholder="Trinity Bellwoods Park gates" onChangeText={setVenue} />

        <YStack gap={6}>
          <Text fontSize={13} fontWeight="700" color={palette.inkSoft}>
            Neighborhood
          </Text>
          <ChipRow
            options={neighborhoodOptions.map((option) => ({ value: option, label: option }))}
            selected={neighborhood}
            onSelect={setNeighborhood}
          />
        </YStack>

        <YStack gap={6}>
          <Text fontSize={13} fontWeight="700" color={palette.inkSoft}>
            Day
          </Text>
          <ChipRow
            options={dayChoices}
            selected={String(dayOffset)}
            onSelect={(value) => setDayOffset(Number(value))}
          />
        </YStack>

        <XStack gap={12}>
          <View flex={1}>
            <Field label="Start time" value={time} placeholder="7:00 PM" onChangeText={setTime} />
          </View>
          <View flex={1}>
            <Field label="Price (CA$)" value={price} placeholder="Free" onChangeText={setPrice} />
          </View>
        </XStack>

        <Field
          label="Capacity"
          value={capacity}
          placeholder="20"
          onChangeText={setCapacity}
          keyboardType="numeric"
        />

        <Field
          label="Details"
          value={description}
          placeholder="What should people expect? What should they bring?"
          onChangeText={setDescription}
          multiline
        />

        <Pressable onPress={submit} disabled={!canSubmit}>
          <XStack
            height={50}
            alignItems="center"
            justifyContent="center"
            gap={8}
            borderRadius={999}
            backgroundColor={palette.ink}
            opacity={canSubmit ? 1 : 0.4}
          >
            <IconlyIcon name="Plus" size={18} color="white" />
            <Text color="white" fontWeight="700" fontSize={15}>
              Publish {kind === 'group' ? 'group' : 'event'}
            </Text>
          </XStack>
        </Pressable>
      </ScrollView>
    </View>
  );
}
