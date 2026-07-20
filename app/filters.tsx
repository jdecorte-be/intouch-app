import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Slider, Text, View, XStack, YStack } from 'tamagui';

import { CalendarStrip } from '@/components/events/calendar-strip';
import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { addCalendarDays, toLocalDateKey } from '@/lib/date-utils';
import {
  DISTANCE_FILTER_MAX_KM,
  DISTANCE_FILTER_MIN_KM,
  DISTANCE_FILTER_STEP_KM,
  GROUP_SIZE_FILTER_MAX,
  GROUP_SIZE_FILTER_MIN,
  GROUP_SIZE_FILTER_STEP,
  PRICE_FILTER_MAX_CAD,
  PRICE_FILTER_STEP_CAD,
  formatDistanceFilterLabel,
  formatGroupSizeFilterLabel,
  formatPriceFilterLabel,
} from '@/lib/filter-utils';
import { palette } from '@/lib/palette';
import { selectVisibleEvents, useEventsStore } from '@/stores/events-store';

const SMALL_GROUP_PRESET = 50;

function FilterSlider({
  icon,
  label,
  valueLabel,
  helper,
  min,
  max,
  step,
  value,
  onValueChange,
  minLabel,
  maxLabel,
}: {
  icon: IconlyIconName;
  label: string;
  valueLabel: string;
  helper: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <YStack
      gap={9}
      paddingVertical={12}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={9} flex={1} minWidth={0}>
          <View width={30} height={30} borderRadius={10} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
            <IconlyIcon name={icon} size={15} color={palette.slate} />
          </View>
          <YStack flex={1} minWidth={0} gap={1}>
            <Text fontSize={13} fontWeight="800" color={palette.ink} numberOfLines={1}>
              {label}
            </Text>
            <Text fontSize={11} fontWeight="600" color={palette.muted} numberOfLines={1}>
              {helper}
            </Text>
          </YStack>
        </XStack>
        <View borderRadius={999} backgroundColor={palette.primarySoft} paddingHorizontal={9} paddingVertical={5}>
          <Text fontSize={11} fontWeight="800" color={palette.primary}>
            {valueLabel}
          </Text>
        </View>
      </XStack>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onValueChange(next)}
        size="$1"
      >
        <Slider.Track backgroundColor={palette.fog}>
          <Slider.TrackActive backgroundColor={palette.ink} />
        </Slider.Track>
        <Slider.Thumb index={0} circular size="$1" backgroundColor={palette.ink} borderColor="white" borderWidth={2} />
      </Slider>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={10} fontWeight="700" color={palette.muted}>
          {minLabel}
        </Text>
        <Text fontSize={10} fontWeight="700" color={palette.muted}>
          {maxLabel}
        </Text>
      </XStack>
    </YStack>
  );
}

function SheetHandle() {
  return (
    <View
      alignSelf="center"
      width={42}
      height={5}
      borderRadius={999}
      backgroundColor={palette.line}
    />
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <YStack
      borderRadius={18}
      borderWidth={1}
      borderColor={palette.line}
      backgroundColor="white"
      paddingHorizontal={14}
      paddingVertical={12}
      gap={10}
    >
      <Text fontSize={11} fontWeight="800" textTransform="uppercase" color={palette.silver}>
        {title}
      </Text>
      {children}
    </YStack>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        height={34}
        borderRadius={999}
        paddingHorizontal={13}
        alignItems="center"
        justifyContent="center"
        backgroundColor={active ? palette.ink : palette.fog}
        borderWidth={1}
        borderColor={active ? palette.ink : palette.line}
      >
        <Text fontSize={12} fontWeight="800" color={active ? 'white' : palette.slate}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text fontSize={11} fontWeight="800" textTransform="uppercase" color={palette.silver} marginTop={2}>
      {children}
    </Text>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: IconlyIconName;
  label: string;
  description: string;
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={12}>
      <XStack alignItems="center" gap={9} flex={1} minWidth={0}>
        <View width={30} height={30} borderRadius={10} backgroundColor={value ? palette.tealSoft : palette.fog} alignItems="center" justifyContent="center">
          <IconlyIcon name={icon} size={15} color={value ? palette.tealText : palette.slate} />
        </View>
        <YStack flex={1} minWidth={0} gap={1}>
          <Text fontSize={13} fontWeight="800" color={palette.ink} numberOfLines={1}>
            {label}
          </Text>
          <Text fontSize={11} fontWeight="600" color={palette.muted} numberOfLines={1}>
            {description}
          </Text>
        </YStack>
      </XStack>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.line, true: palette.teal }}
        thumbColor="white"
        style={{ transform: [{ scale: 0.82 }] }}
      />
    </XStack>
  );
}

export default function FiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = useEventsStore();
  const visibleEventCount = selectVisibleEvents(state).length;
  const todayKey = toLocalDateKey(new Date());
  const tomorrowKey = toLocalDateKey(addCalendarDays(new Date(), 1));
  const isFreeOnly = state.maxPriceCad === 0;
  const isSmallGroup = state.maxGroupSize <= SMALL_GROUP_PRESET;
  const hasActiveFilters = state.hasActiveFilters();

  return (
    <View flex={1} backgroundColor={palette.fog}>
      <YStack paddingTop={insets.top ? insets.top + 8 : 16} paddingBottom={4}>
        <SheetHandle />
      </YStack>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        paddingTop={6}
        paddingBottom={10}
      >
        <YStack gap={2}>
          <Text fontSize={11} fontWeight="700" letterSpacing={1.4} textTransform="uppercase" color={palette.silver}>
            Explore
          </Text>
          <Text fontSize={18} fontWeight="700" color={palette.ink} marginTop={2}>
            Filters
          </Text>
        </YStack>
        <XStack gap={8}>
          {hasActiveFilters ? (
            <Pressable onPress={state.resetFilters}>
              <View borderRadius={999} backgroundColor="white" paddingHorizontal={10} height={32} justifyContent="center">
                <Text fontSize={12} fontWeight="700" color={palette.slate}>
                  Reset
                </Text>
              </View>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()}>
            <View width={32} height={32} borderRadius={16} backgroundColor="white" alignItems="center" justifyContent="center">
              <IconlyIcon name="X" size={15} color={palette.gray} />
            </View>
          </Pressable>
        </XStack>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 92, gap: 10 }}>
        <XStack
          alignItems="center"
          justifyContent="space-between"
          backgroundColor="white"
          borderRadius={18}
          padding={12}
          borderWidth={1}
          borderColor={palette.line}
        >
          <YStack gap={2}>
            <Text fontSize={13} fontWeight="800" color={palette.ink}>
              {visibleEventCount} {visibleEventCount === 1 ? 'match' : 'matches'}
            </Text>
            <Text fontSize={11} fontWeight="600" color={palette.muted}>
              Updates as you adjust filters
            </Text>
          </YStack>
          <View width={34} height={34} borderRadius={12} backgroundColor={palette.primarySoft} alignItems="center" justifyContent="center">
            <View transform={[{ translateX: -2 }]}>
              <IconlyIcon name="Filter" size={18} color={palette.primary} />
            </View>
          </View>
        </XStack>

        <FilterSection title="Quick filters">
          <XStack flexWrap="wrap" gap={8}>
            <FilterPill label="Any date" active={state.selectedDayKey === null} onPress={() => state.setSelectedDayKey(null)} />
            <FilterPill label="Today" active={state.selectedDayKey === todayKey} onPress={() => state.setSelectedDayKey(todayKey)} />
            <FilterPill label="Tomorrow" active={state.selectedDayKey === tomorrowKey} onPress={() => state.setSelectedDayKey(tomorrowKey)} />
            <FilterPill
              label="Free"
              active={isFreeOnly}
              onPress={() => state.setMaxPriceCad(isFreeOnly ? PRICE_FILTER_MAX_CAD : 0)}
            />
            <FilterPill
              label="Small group"
              active={isSmallGroup}
              onPress={() => state.setMaxGroupSize(isSmallGroup ? GROUP_SIZE_FILTER_MAX : SMALL_GROUP_PRESET)}
            />
          </XStack>
          <ToggleRow
            icon="Clock"
            label="Happening now"
            description="Only show events currently in progress"
            value={state.happeningNowOnly}
            onValueChange={state.toggleHappeningNowOnly}
          />
        </FilterSection>

        <SectionLabel>Date</SectionLabel>
        <CalendarStrip selectedDayKey={state.selectedDayKey} onSelectDay={state.setSelectedDayKey} />

        <FilterSection title="Range">
          <FilterSlider
            icon="Location"
            label="Distance"
            helper="From downtown Toronto"
            valueLabel={formatDistanceFilterLabel(state.maxDistanceKm)}
            min={DISTANCE_FILTER_MIN_KM}
            max={DISTANCE_FILTER_MAX_KM}
            step={DISTANCE_FILTER_STEP_KM}
            value={state.maxDistanceKm}
            onValueChange={state.setMaxDistanceKm}
            minLabel={`${DISTANCE_FILTER_MIN_KM} km`}
            maxLabel={`${DISTANCE_FILTER_MAX_KM}+ km`}
          />

          <View height={1} backgroundColor={palette.line} />

          <FilterSlider
            icon="Tag"
            label="Price"
            helper="Maximum ticket cost"
            valueLabel={formatPriceFilterLabel(state.maxPriceCad)}
            min={0}
            max={PRICE_FILTER_MAX_CAD}
            step={PRICE_FILTER_STEP_CAD}
            value={state.maxPriceCad}
            onValueChange={state.setMaxPriceCad}
            minLabel="Free"
            maxLabel={`CA$${PRICE_FILTER_MAX_CAD}+`}
          />

          <View height={1} backgroundColor={palette.line} />

          <FilterSlider
            icon="Group"
            label="Group size"
            helper="Maximum capacity"
            valueLabel={formatGroupSizeFilterLabel(state.maxGroupSize)}
            min={GROUP_SIZE_FILTER_MIN}
            max={GROUP_SIZE_FILTER_MAX}
            step={GROUP_SIZE_FILTER_STEP}
            value={state.maxGroupSize}
            onValueChange={state.setMaxGroupSize}
            minLabel={`${GROUP_SIZE_FILTER_MIN}`}
            maxLabel={`${GROUP_SIZE_FILTER_MAX}+`}
          />
        </FilterSection>
      </ScrollView>

      <XStack
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        paddingHorizontal={16}
        paddingTop={10}
        paddingBottom={insets.bottom + 12}
        backgroundColor="white"
        borderTopWidth={1}
        borderTopColor={palette.line}
        gap={10}
      >
        <Pressable onPress={state.resetFilters} disabled={!hasActiveFilters} style={{ flex: 1 }}>
          <View height={44} borderRadius={999} alignItems="center" justifyContent="center" backgroundColor={hasActiveFilters ? palette.fog : palette.white}>
            <Text fontSize={13} fontWeight="800" color={hasActiveFilters ? palette.slate : palette.muted}>
              Clear
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ flex: 2 }}>
          <View height={44} borderRadius={999} alignItems="center" justifyContent="center" backgroundColor={palette.ink}>
            <Text fontSize={13} fontWeight="800" color="white">
              Show {visibleEventCount} {visibleEventCount === 1 ? 'result' : 'results'}
            </Text>
          </View>
        </Pressable>
      </XStack>
    </View>
  );
}
