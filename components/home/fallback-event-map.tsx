import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Text, View } from 'tamagui';

import { eventImageUrl } from '@/lib/event-data';
import { palette } from '@/lib/palette';
import type { HostableCategory } from '@/lib/types';

import { EventMarkerPin } from './event-marker-pin';

export type EventMapItem = {
  id: string;
  kind: 'event' | 'group';
  title: string;
  startsAt: string;
  venue: string;
  neighborhood: string;
  price: string;
  going: number;
  bannerUrl?: string | null;
  category: HostableCategory;
  icon: string;
  accent: string;
  coordinates: [number, number];
};

export type UserMapLocation = {
  longitude: number;
  latitude: number;
  accuracy?: number | null;
};

// Toronto bounding box used to project event coordinates onto the fallback board.
const FALLBACK_BOUNDS = { west: -79.47, east: -79.28, north: 43.69, south: 43.62 };
const DUPLICATE_COORDINATE_PRECISION = 5;
const JITTER_BASE_RADIUS_METERS = 20;
const JITTER_RADIUS_PER_POINT_METERS = 5;
const METERS_PER_DEGREE_LAT = 111_320;

function spreadCoincidentCoordinates(events: EventMapItem[]) {
  const groups = new Map<string, EventMapItem[]>();
  const displayCoordinates = new Map<string, [number, number]>();

  for (const event of events) {
    const [lng, lat] = event.coordinates;
    const key = `${lng.toFixed(DUPLICATE_COORDINATE_PRECISION)},${lat.toFixed(
      DUPLICATE_COORDINATE_PRECISION,
    )}`;
    const group = groups.get(key);

    if (group) {
      group.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      displayCoordinates.set(group[0].id, group[0].coordinates);
      continue;
    }

    const [lng, lat] = group[0].coordinates;
    const radiusMeters = JITTER_BASE_RADIUS_METERS + JITTER_RADIUS_PER_POINT_METERS * group.length;
    const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);

    group.forEach((event, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      const dLat = (radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE_LAT;
      const dLng = metersPerDegreeLng
        ? (radiusMeters * Math.cos(angle)) / metersPerDegreeLng
        : 0;
      displayCoordinates.set(event.id, [lng + dLng, lat + dLat]);
    });
  }

  return displayCoordinates;
}

export function FallbackEventMap({
  events,
  userLocation,
  onSelectEvent,
}: {
  events: EventMapItem[];
  userLocation?: UserMapLocation | null;
  onSelectEvent: (eventId: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const displayCoordinates = useMemo(() => spreadCoincidentCoordinates(events), [events]);
  const spanX = FALLBACK_BOUNDS.east - FALLBACK_BOUNDS.west;
  const spanY = FALLBACK_BOUNDS.north - FALLBACK_BOUNDS.south;

  return (
    <View style={StyleSheet.absoluteFill} backgroundColor={palette.mapWater}>
      {events.map((event) => {
        const coordinates = displayCoordinates.get(event.id) ?? event.coordinates;
        const x = ((coordinates[0] - FALLBACK_BOUNDS.west) / spanX) * (width - 56) + 8;
        const y =
          ((FALLBACK_BOUNDS.north - coordinates[1]) / spanY) * (height * 0.5) +
          height * 0.22;

        return (
          <Pressable
            key={event.id}
            onPress={() => onSelectEvent(event.id)}
            onPressIn={() => setActiveEventId(event.id)}
            onPressOut={() => setActiveEventId((current) => (current === event.id ? null : current))}
            style={({ pressed }) => ({
              position: 'absolute',
              left: x,
              top: y,
              alignItems: 'center',
              transform: [{ scale: pressed ? 0.92 : 1 }],
            })}
          >
            <EventMarkerPin
              icon={event.icon}
              accent={event.accent}
              isGroup={event.kind === 'group'}
              isActive={activeEventId === event.id}
              photoUrl={event.kind === 'group' ? null : eventImageUrl(event)}
            />
            <View
              marginTop={4}
              maxWidth={104}
              borderRadius={999}
              backgroundColor="rgba(255,255,255,0.92)"
              paddingHorizontal={8}
              paddingVertical={2}
            >
              <Text fontSize={10} fontWeight="600" color={palette.ink} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {userLocation ? (
        <View
          pointerEvents="none"
          position="absolute"
          left={((userLocation.longitude - FALLBACK_BOUNDS.west) / spanX) * (width - 56) + 8}
          top={((FALLBACK_BOUNDS.north - userLocation.latitude) / spanY) * (height * 0.5) + height * 0.22}
          alignItems="center"
          justifyContent="center"
        >
          <View
            width={28}
            height={28}
            borderRadius={999}
            backgroundColor="rgba(137,117,254,0.18)"
            alignItems="center"
            justifyContent="center"
          >
            <View
              width={14}
              height={14}
              borderRadius={999}
              borderWidth={3}
              borderColor="white"
              backgroundColor={palette.primary}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
