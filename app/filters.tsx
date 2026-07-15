import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Slider, Text, View, XStack, YStack } from 'tamagui';

import { CalendarStrip } from '@/components/events/calendar-strip';
import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
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
import { useEventsStore } from '@/stores/events-store';

function FilterSlider({
  icon,
  label,
  valueLabel,
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
      gap={14}
      borderRadius={16}
      borderWidth={1}
      borderColor={palette.line}
      backgroundColor="white"
      padding={16}
    >
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap={8}>
          <IconlyIcon name={icon} size={16} color={palette.gray} />
          <Text fontSize={14} fontWeight="700" color={palette.ink}>
            {label}
          </Text>
        </XStack>
        <Text fontSize={12} fontWeight="700" color={palette.slate}>
          {valueLabel}
        </Text>
      </XStack>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onValueChange(next)}
        size="$2"
      >
        <Slider.Track backgroundColor={palette.fog}>
          <Slider.TrackActive backgroundColor={palette.ink} />
        </Slider.Track>
        <Slider.Thumb index={0} circular size="$1.5" backgroundColor={palette.ink} borderColor="white" borderWidth={2} />
      </Slider>
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={11} fontWeight="600" color={palette.muted}>
          {minLabel}
        </Text>
        <Text fontSize={11} fontWeight="600" color={palette.muted}>
          {maxLabel}
        </Text>
      </XStack>
    </YStack>
  );
}

export default function FiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const state = useEventsStore();

  return (
    <View flex={1} backgroundColor={palette.mist}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        paddingTop={insets.top ? insets.top + 8 : 20}
        paddingBottom={12}
      >
        <YStack>
          <Text fontSize={11} fontWeight="700" letterSpacing={1.4} textTransform="uppercase" color={palette.silver}>
            Explore
          </Text>
          <Text fontSize={20} fontWeight="700" color={palette.ink} marginTop={2}>
            Filters
          </Text>
        </YStack>
        <XStack gap={8}>
          {state.hasActiveFilters() ? (
            <Pressable onPress={state.resetFilters}>
              <View borderRadius={999} backgroundColor={palette.fog} paddingHorizontal={12} height={36} justifyContent="center">
                <Text fontSize={13} fontWeight="700" color={palette.slate}>
                  Reset
                </Text>
              </View>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()}>
            <View width={36} height={36} borderRadius={18} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
              <IconlyIcon name="X" size={16} color={palette.gray} />
            </View>
          </Pressable>
        </XStack>
      </XStack>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}>
        <CalendarStrip selectedDayKey={state.selectedDayKey} onSelectDay={state.setSelectedDayKey} />

        <XStack
          alignItems="center"
          justifyContent="space-between"
          borderRadius={16}
          borderWidth={1}
          borderColor={palette.line}
          backgroundColor="white"
          padding={16}
        >
          <XStack alignItems="center" gap={8}>
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={state.happeningNowOnly ? palette.teal : palette.muted}
            />
            <Text fontSize={14} fontWeight="700" color={palette.ink}>
              Happening now
            </Text>
          </XStack>
          <Switch
            value={state.happeningNowOnly}
            onValueChange={state.toggleHappeningNowOnly}
            trackColor={{ false: palette.line, true: palette.teal }}
            thumbColor="white"
          />
        </XStack>

        <FilterSlider
          icon="Location"
          label="Distance"
          valueLabel={formatDistanceFilterLabel(state.maxDistanceKm)}
          min={DISTANCE_FILTER_MIN_KM}
          max={DISTANCE_FILTER_MAX_KM}
          step={DISTANCE_FILTER_STEP_KM}
          value={state.maxDistanceKm}
          onValueChange={state.setMaxDistanceKm}
          minLabel={`${DISTANCE_FILTER_MIN_KM} km`}
          maxLabel={`${DISTANCE_FILTER_MAX_KM}+ km`}
        />

        <FilterSlider
          icon="Tag"
          label="Price"
          valueLabel={formatPriceFilterLabel(state.maxPriceCad)}
          min={0}
          max={PRICE_FILTER_MAX_CAD}
          step={PRICE_FILTER_STEP_CAD}
          value={state.maxPriceCad}
          onValueChange={state.setMaxPriceCad}
          minLabel="Free"
          maxLabel={`CA$${PRICE_FILTER_MAX_CAD}+`}
        />

        <FilterSlider
          icon="Group"
          label="Group size"
          valueLabel={formatGroupSizeFilterLabel(state.maxGroupSize)}
          min={GROUP_SIZE_FILTER_MIN}
          max={GROUP_SIZE_FILTER_MAX}
          step={GROUP_SIZE_FILTER_STEP}
          value={state.maxGroupSize}
          onValueChange={state.setMaxGroupSize}
          minLabel={`${GROUP_SIZE_FILTER_MIN}`}
          maxLabel={`${GROUP_SIZE_FILTER_MAX}+`}
        />
      </ScrollView>
    </View>
  );
}
