import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { createMapboxMapHtml, toMapEvent } from '@/lib/mapbox-map-html';

import { FallbackEventMap, type EventMapItem, type UserMapLocation } from './fallback-event-map';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

type MapMessage = {
  type?: string;
  eventId?: string;
};

function parseMapMessage(data: string): MapMessage | null {
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
}: {
  events: EventMapItem[];
  locateRequestId?: number;
  keepZoomOnLocate?: boolean;
  userLocation?: UserMapLocation | null;
  onSelectEvent: (eventId: string) => void;
}) {
  const webViewRef = useRef<WebView>(null);
  // Captured once on mount: the map's HTML must stay referentially stable
  // across re-renders, or the WebView fully reloads (Mapbox reinitializes,
  // tiles refetch, camera resets) every time `events` changes — e.g. on
  // every category filter tap. Later event-list updates go through
  // sendEventsUpdate below instead, into the already-running map.
  const initialEventsRef = useRef(events);
  const html = useMemo(() => createMapboxMapHtml(initialEventsRef.current), []);

  const centerOnUserLocation = useCallback(
    (location: UserMapLocation, options?: { keepZoom?: boolean }) => {
      webViewRef.current?.injectJavaScript(`
        (function () {
          if (window.centerOnUserLocation) {
            window.centerOnUserLocation(${JSON.stringify(location)}, ${JSON.stringify(options ?? {})});
          }
        })();
        true;
      `);
    },
    [],
  );

  const sendEventsUpdate = useCallback((nextEvents: EventMapItem[]) => {
    webViewRef.current?.injectJavaScript(`
      (function () {
        if (window.updateMapEvents) {
          window.updateMapEvents(${JSON.stringify(nextEvents.map(toMapEvent))});
        }
      })();
      true;
    `);
  }, []);

  useEffect(() => {
    sendEventsUpdate(events);
  }, [events, sendEventsUpdate]);

  useEffect(() => {
    if (!locateRequestId || !mapboxAccessToken || !userLocation) {
      return;
    }

    centerOnUserLocation(userLocation, { keepZoom: keepZoomOnLocate });
  }, [centerOnUserLocation, keepZoomOnLocate, locateRequestId, userLocation]);

  if (!mapboxAccessToken) {
    return (
      <FallbackEventMap
        events={events}
        userLocation={userLocation}
        onSelectEvent={onSelectEvent}
      />
    );
  }

  const handleMessage = (message: WebViewMessageEvent) => {
    const data = parseMapMessage(message.nativeEvent.data);

    if (data?.type === 'retalk-map-event-select' && data.eventId) {
      onSelectEvent(data.eventId);
    }
  };

  return (
    <WebView
      ref={webViewRef}
      key="retalk-mapbox-map"
      allowsInlineMediaPlayback
      javaScriptEnabled
      onLoadEnd={() => {
        sendEventsUpdate(events);

        if (userLocation) {
          centerOnUserLocation(userLocation, { keepZoom: true });
        }
      }}
      onMessage={handleMessage}
      originWhitelist={['*']}
      scalesPageToFit={false}
      source={{ html }}
      style={styles.map}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: '#ffffff',
    ...StyleSheet.absoluteFillObject,
  },
});
