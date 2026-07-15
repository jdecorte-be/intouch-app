import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { createMapboxMapHtml } from '@/lib/mapbox-map-html';

import { FallbackEventMap, type EventMapItem } from './fallback-event-map';

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
  onSelectEvent,
}: {
  events: EventMapItem[];
  onSelectEvent: (eventId: string) => void;
}) {
  const html = useMemo(() => createMapboxMapHtml(events), [events]);

  if (!mapboxAccessToken) {
    return <FallbackEventMap events={events} onSelectEvent={onSelectEvent} />;
  }

  const handleMessage = (message: WebViewMessageEvent) => {
    const data = parseMapMessage(message.nativeEvent.data);

    if (data?.type === 'retalk-map-event-select' && data.eventId) {
      onSelectEvent(data.eventId);
    }
  };

  return (
    <WebView
      key="retalk-mapbox-map"
      allowsInlineMediaPlayback
      javaScriptEnabled
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
    backgroundColor: '#dde3ec',
    ...StyleSheet.absoluteFillObject,
  },
});
