import { useState } from 'react';
import { Pressable } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import {
  addCalendarDays,
  getCalendarMonthGrid,
  parseLocalDateKey,
  startOfCalendarWeek,
  toLocalDateKey,
} from '@/lib/date-utils';
import { palette } from '@/lib/palette';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RoundIconButton({ name, onPress }: { name: 'ChevronLeft' | 'ChevronRight'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View
        width={32}
        height={32}
        borderRadius={16}
        alignItems="center"
        justifyContent="center"
      >
        <IconlyIcon name={name} size={18} color={palette.gray} />
      </View>
    </Pressable>
  );
}

export function CalendarStrip({
  selectedDayKey,
  onSelectDay,
}: {
  selectedDayKey: string | null;
  onSelectDay: (dayKey: string | null) => void;
}) {
  const selectedDate = selectedDayKey ? parseLocalDateKey(selectedDayKey) : null;
  const [isExpanded, setIsExpanded] = useState(false);
  const [anchor, setAnchor] = useState<Date | null>(selectedDate);

  const today = new Date();
  const todayKey = toLocalDateKey(today);
  const visibleAnchor = anchor ?? today;
  const weekStart = startOfCalendarWeek(visibleAnchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
  const monthDays = getCalendarMonthGrid(visibleAnchor);

  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Any date';

  const selectDay = (day: Date) => {
    const key = toLocalDateKey(day);

    onSelectDay(key === selectedDayKey ? null : key);
    setAnchor(day);
  };

  const shiftWeek = (direction: number) =>
    setAnchor((current) => addCalendarDays(current ?? today, direction * 7));

  const shiftMonth = (direction: number) =>
    setAnchor((current) => {
      const base = current ?? today;

      return new Date(base.getFullYear(), base.getMonth() + direction, 1);
    });

  return (
    <YStack
      borderRadius={20}
      borderWidth={1}
      borderColor={palette.line}
      backgroundColor="white"
      padding={8}
      gap={8}
    >
      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={4}>
        <XStack alignItems="center" gap={8}>
          <IconlyIcon name="Calendar" size={16} />
          <Text fontSize={14} fontWeight="700" color={palette.ink}>
            Date
          </Text>
        </XStack>
        <XStack alignItems="center" gap={4}>
          <Text fontSize={12} fontWeight="700" color={palette.gray}>
            {selectedLabel}
          </Text>
          {selectedDayKey ? (
            <Pressable onPress={() => onSelectDay(null)} hitSlop={8}>
              <View width={26} height={26} alignItems="center" justifyContent="center">
                <IconlyIcon name="X" size={14} color={palette.muted} />
              </View>
            </Pressable>
          ) : null}
        </XStack>
      </XStack>

      {isExpanded ? (
        <YStack gap={8}>
          <XStack alignItems="center" justifyContent="space-between">
            <RoundIconButton name="ChevronLeft" onPress={() => shiftMonth(-1)} />
            <Text fontSize={14} fontWeight="700" color={palette.ink}>
              {visibleAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <RoundIconButton name="ChevronRight" onPress={() => shiftMonth(1)} />
          </XStack>

          <XStack flexWrap="wrap">
            {weekdayLabels.map((weekday) => (
              <View key={weekday} width="14.28%" alignItems="center" paddingBottom={2}>
                <Text fontSize={10} fontWeight="700" color={palette.muted}>
                  {weekday[0]}
                </Text>
              </View>
            ))}
            {monthDays.map((day) => {
              const key = toLocalDateKey(day);
              const isSelected = key === selectedDayKey;
              const isToday = key === todayKey;
              const isOutsideMonth = day.getMonth() !== visibleAnchor.getMonth();

              return (
                <Pressable
                  key={key}
                  onPress={() => selectDay(day)}
                  style={{ width: '14.28%', alignItems: 'center', paddingVertical: 2 }}
                >
                  <View
                    width={32}
                    height={32}
                    borderRadius={16}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={isSelected ? palette.ink : 'transparent'}
                    borderWidth={isToday && !isSelected ? 1 : 0}
                    borderColor="rgba(41,47,54,0.35)"
                  >
                    <Text
                      fontSize={13}
                      fontWeight={isSelected ? '700' : '500'}
                      color={
                        isSelected
                          ? 'white'
                          : isOutsideMonth
                            ? 'rgba(154,158,166,0.5)'
                            : palette.ink
                      }
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </XStack>
        </YStack>
      ) : (
        <XStack alignItems="center" gap={2}>
          <RoundIconButton name="ChevronLeft" onPress={() => shiftWeek(-1)} />
          <XStack flex={1}>
            {weekDays.map((day) => {
              const key = toLocalDateKey(day);
              const isSelected = key === selectedDayKey;
              const isToday = key === todayKey;

              return (
                <Pressable
                  key={key}
                  onPress={() => selectDay(day)}
                  style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 }}
                >
                  <Text
                    fontSize={10}
                    fontWeight="600"
                    color={isSelected ? palette.ink : palette.muted}
                  >
                    {weekdayLabels[day.getDay()]}
                  </Text>
                  <View
                    width={32}
                    height={32}
                    borderRadius={16}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={isSelected ? palette.ink : 'transparent'}
                    borderWidth={isToday && !isSelected ? 1 : 0}
                    borderColor="rgba(41,47,54,0.35)"
                  >
                    <Text
                      fontSize={13}
                      fontWeight={isSelected ? '700' : '500'}
                      color={isSelected ? 'white' : palette.ink}
                    >
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </XStack>
          <RoundIconButton name="ChevronRight" onPress={() => shiftWeek(1)} />
        </XStack>
      )}

      <Pressable onPress={() => setIsExpanded((current) => !current)}>
        <XStack
          height={32}
          alignItems="center"
          justifyContent="center"
          gap={6}
          borderRadius={999}
          borderWidth={1}
          borderColor={palette.line}
          backgroundColor="white"
        >
          <IconlyIcon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={14} color={palette.slate} />
          <Text fontSize={12} fontWeight="700" color={palette.slate}>
            {isExpanded ? 'Show one week' : 'Expand to full month'}
          </Text>
        </XStack>
      </Pressable>
    </YStack>
  );
}
