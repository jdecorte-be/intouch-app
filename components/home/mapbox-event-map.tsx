import { useCallback, useEffect, useMemo, useRef } from 'react';

import { createMapboxMapHtml, toMapEvent } from '@/lib/mapbox-map-html';

import { FallbackEventMap, type EventMapItem, type UserMapLocation } from './fallback-event-map';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

type MapMessage = {
  type?: string;
  eventId?: string;
  eventIds?: string[];
};

type MapWindow = Window & {
  centerOnUserLocation?: (coordinates: UserMapLocation, options?: { keepZoom?: boolean }) => void;
};

function postMapMessage(frameWindow: Window | null | undefined, message: unknown) {
  frameWindow?.postMessage(JSON.stringify(message), '*');
}

function parseMapMessage(data: unknown): MapMessage | null {
  if (typeof data !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(data);

    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function MapboxEventMap({
  events,
  locateRequestId,
  keepZoomOnLocate,
  userLocation,
  onSelectEvent,
  onVisibleEventIdsChange,
}: {
  events: EventMapItem[];
  locateRequestId?: number;
  keepZoomOnLocate?: boolean;
  userLocation?: UserMapLocation | null;
  onSelectEvent: (eventId: string) => void;
  onVisibleEventIdsChange?: (eventIds: string[]) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Captured once on mount: the map's HTML/srcDoc must stay referentially
  // stable across re-renders, or the iframe fully reloads (Mapbox
  // reinitializes, tiles refetch, camera resets) every time `events`
  // changes — e.g. on every category filter tap. Later event-list updates
  // go through sendEventsUpdate below instead, into the already-running map.
  const initialEventsRef = useRef(events);
  const html = useMemo(() => createMapboxMapHtml(initialEventsRef.current), []);

  const centerMap = useCallback(
    (coordinates: UserMapLocation, options?: { keepZoom?: boolean }) => {
      const mapWindow = frameRef.current?.contentWindow as MapWindow | null;

      mapWindow?.centerOnUserLocation?.(coordinates, options);
    },
    [],
  );

  const sendEventsUpdate = useCallback((nextEvents: EventMapItem[]) => {
    postMapMessage(frameRef.current?.contentWindow, {
      type: 'retalk-map-update-events',
      events: nextEvents.map(toMapEvent),
    });
  }, []);

  useEffect(() => {
    sendEventsUpdate(events);
  }, [events, sendEventsUpdate]);

  useEffect(() => {
    const handleMessage = (message: MessageEvent) => {
      if (message.source !== frameRef.current?.contentWindow) {
        return;
      }

      const data = parseMapMessage(message.data);

      if (data?.type === 'retalk-map-event-select' && data.eventId) {
        onSelectEvent(data.eventId);
      }

      if (data?.type === 'retalk-map-visible-events' && data.eventIds) {
        onVisibleEventIdsChange?.(data.eventIds);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSelectEvent, onVisibleEventIdsChange]);

  useEffect(() => {
    if (!locateRequestId || !mapboxAccessToken || !userLocation) {
      return;
    }

    centerMap(userLocation, { keepZoom: keepZoomOnLocate });
  }, [centerMap, keepZoomOnLocate, locateRequestId, userLocation]);

  if (!mapboxAccessToken) {
    return (
      <FallbackEventMap
        events={events}
        userLocation={userLocation}
        onSelectEvent={onSelectEvent}
      />
    );
  }

  return (
    <iframe
      ref={frameRef}
      onLoad={() => {
        sendEventsUpdate(events);

        if (userLocation) {
          centerMap(userLocation, { keepZoom: true });
        }
      }}
      srcDoc={html}
      style={{
        backgroundColor: '#ffffff',
        border: 'none',
        height: '100%',
        inset: 0,
        position: 'absolute',
        width: '100%',
      }}
      title="ReTalk live events map"
    />
  );
}
