import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { CategoryChips } from '@/components/events/category-chips';
import { EventListPanel } from '@/components/events/event-list-panel';
import { EventSheet } from '@/components/home/event-sheet';
import { GreetingHeader } from '@/components/home/greeting-header';
import { MapboxEventMap } from '@/components/home/mapbox-event-map';
import { NotificationPopover } from '@/components/home/notification-popover';
import type { UserMapLocation } from '@/components/home/fallback-event-map';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import { selectVisibleCategoryCounts, selectVisibleEvents, useEventsStore } from '@/stores/events-store';

const NAV_CLEARANCE = 80;

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [locateRequestId, setLocateRequestId] = useState(0);
  const [keepZoomOnLocate, setKeepZoomOnLocate] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserMapLocation | null>(null);
  const [visibleEventIds, setVisibleEventIds] = useState<Set<string> | null>(null);

  const handleVisibleEventIdsChange = (eventIds: string[]) => {
    setVisibleEventIds(new Set(eventIds));
  };

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
  const mapCategoryCounts = useMemo(
    () => selectVisibleCategoryCounts(eventsState, visibleEventIds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      eventsState.events,
      eventsState.activityScope,
      eventsState.selectedDayKey,
      eventsState.maxDistanceKm,
      eventsState.maxPriceCad,
      eventsState.maxGroupSize,
      eventsState.happeningNowOnly,
      visibleEventIds,
    ],
  );

  const navBottom = insets.bottom + NAV_CLEARANCE;
  const sheetHeight = Math.min(windowHeight * 0.7, 620);

  const openEvent = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const locateUser = async (keepZoom: boolean) => {
    if (isLocating) {
      return;
    }

    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
        accuracy: position.coords.accuracy,
      });
      setKeepZoomOnLocate(keepZoom);
      setLocateRequestId((current) => current + 1);
    } finally {
      setIsLocating(false);
    }
  };

  const showUserLocation = () => locateUser(false);

  // Show the user's position on the map as soon as the screen mounts,
  // without punching in — a manual tap on the locate button still zooms in.
  useEffect(() => {
    locateUser(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View flex={1} backgroundColor={palette.white}>
      <MapboxEventMap
        events={visibleEvents}
        locateRequestId={locateRequestId}
        keepZoomOnLocate={keepZoomOnLocate}
        userLocation={userLocation}
        onSelectEvent={openEvent}
        onVisibleEventIdsChange={handleVisibleEventIdsChange}
      />

      <YStack
        position="absolute"
        top={insets.top + 8}
        left={0}
        right={0}
        gap={10}
        pointerEvents="box-none"
      >
        <View paddingHorizontal={12}>
          <GreetingHeader
            onAvatarPress={() => router.navigate('/profile')}
            onNotificationPress={() => setShowNotifications(true)}
          />
        </View>
        <CategoryChips
          activeCategory={eventsState.activeCategory}
          onCategoryChange={eventsState.setActiveCategory}
          categoryCounts={mapCategoryCounts}
          onMap
        />
      </YStack>

      {!isSheetOpen ? (
        <View position="absolute" bottom={navBottom - 8} left={16} pointerEvents="box-none">
          <Pressable
            accessibilityLabel="Center map on your location"
            accessibilityRole="button"
            disabled={isLocating}
            onPress={showUserLocation}
          >
            <View
              width={50}
              height={50}
              borderRadius={999}
              borderWidth={1}
              borderColor="rgba(41,47,54,0.1)"
              backgroundColor="rgba(255,255,255,0.96)"
              alignItems="center"
              justifyContent="center"
              shadowColor="#0f172a"
              shadowOpacity={0.1}
              shadowRadius={14}
              shadowOffset={{ width: 0, height: 10 }}
              opacity={isLocating ? 0.7 : 1}
              style={{ elevation: 7 }}
            >
              <View style={{ transform: [{ rotate: '45deg' }] }}>
                <IconlyIcon
                  name="Cursor"
                  size={22}
                  color={userLocation ? palette.primary : palette.ink}
                />
              </View>
            </View>
          </Pressable>
        </View>
      ) : null}

      {!isSheetOpen ? (
        <View
          position="absolute"
          bottom={navBottom - 8}
          left={0}
          right={0}
          height={50}
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
              <IconlyIcon name="ListUl" size={16} />
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

          <View position="absolute" right={16} top={0}>
            <Pressable onPress={() => router.push('/host')}>
              <View
                width={50}
                height={50}
                borderRadius={999}
                backgroundColor={palette.primary}
                alignItems="center"
                justifyContent="center"
                shadowColor="#0f172a"
                shadowOpacity={0.12}
                shadowRadius={14}
                shadowOffset={{ width: 0, height: 10 }}
                style={{ elevation: 7 }}
              >
                <IconlyIcon name="Plus" size={20} color="white" />
              </View>
            </Pressable>
          </View>
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
      <NotificationPopover
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onOpenEvent={(eventId) => router.push(`/event/${eventId}`)}
      />
    </View>
  );
}
