import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { CategoryChips } from '@/components/events/category-chips';
import { EventListPanel } from '@/components/events/event-list-panel';
import { EventSheet } from '@/components/home/event-sheet';
import { GreetingHeader } from '@/components/home/greeting-header';
import { MapboxEventMap } from '@/components/home/mapbox-event-map';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import { selectVisibleEvents, useEventsStore } from '@/stores/events-store';

const NAV_CLEARANCE = 80;

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const eventsState = useEventsStore();
  const visibleEvents = useMemo(
    () => selectVisibleEvents(eventsState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      eventsState.events,
      eventsState.activityScope,
      eventsState.activeCategory,
      eventsState.selectedDayKey,
      eventsState.maxDistanceKm,
      eventsState.maxPriceCad,
      eventsState.maxGroupSize,
      eventsState.happeningNowOnly,
    ],
  );

  const navBottom = insets.bottom + NAV_CLEARANCE;
  const sheetHeight = Math.min(windowHeight * 0.7, 620);

  const openEvent = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  return (
    <View flex={1} backgroundColor={palette.mapWater}>
      <MapboxEventMap events={visibleEvents} onSelectEvent={openEvent} />

      <YStack
        position="absolute"
        top={insets.top + 8}
        left={0}
        right={0}
        gap={10}
        pointerEvents="box-none"
      >
        <View paddingHorizontal={12}>
          <GreetingHeader onAvatarPress={() => router.navigate('/profile')} />
        </View>
        <CategoryChips
          activeCategory={eventsState.activeCategory}
          onCategoryChange={eventsState.setActiveCategory}
          onMap
        />
      </YStack>

      {!isSheetOpen ? (
        <View
          position="absolute"
          bottom={navBottom - 8}
          left={0}
          right={0}
          alignItems="center"
          pointerEvents="box-none"
        >
          <Pressable onPress={() => setIsSheetOpen(true)}>
            <XStack
              height={44}
              alignItems="center"
              gap={8}
              borderRadius={999}
              borderWidth={1}
              borderColor="rgba(41,47,54,0.1)"
              backgroundColor="rgba(255,255,255,0.96)"
              paddingHorizontal={16}
              shadowColor="#0f172a"
              shadowOpacity={0.09}
              shadowRadius={14}
              shadowOffset={{ width: 0, height: 10 }}
              elevation={6}
            >
              <IconlyIcon name="Menu" size={16} />
              <Text fontSize={14} fontWeight="700" color={palette.ink}>
                List
              </Text>
              <View borderRadius={999} backgroundColor={palette.fog} paddingHorizontal={6} paddingVertical={2}>
                <Text fontSize={10} color={palette.slate} fontWeight="700">
                  {visibleEvents.length}
                </Text>
              </View>
            </XStack>
          </Pressable>
        </View>
      ) : null}

      {!isSheetOpen ? (
        <View position="absolute" bottom={navBottom + 16} right={16} pointerEvents="box-none">
          <Pressable onPress={() => router.push('/host')}>
            <View
              width={60}
              height={60}
              borderRadius={30}
              backgroundColor={palette.ink}
              alignItems="center"
              justifyContent="center"
              shadowColor="#0f172a"
              shadowOpacity={0.12}
              shadowRadius={15}
              shadowOffset={{ width: 0, height: 12 }}
              style={{ elevation: 8 }}
            >
              <IconlyIcon name="Plus" size={26} color="white" />
            </View>
          </Pressable>
        </View>
      ) : null}

      <EventSheet
        isOpen={isSheetOpen}
        height={sheetHeight}
        bottomOffset={navBottom}
        onClose={() => setIsSheetOpen(false)}
      >
        <EventListPanel
          onSelectEvent={openEvent}
          onOpenFilters={() => router.push('/filters')}
          onAvatarPress={() => router.navigate('/profile')}
        />
      </EventSheet>
    </View>
  );
}
