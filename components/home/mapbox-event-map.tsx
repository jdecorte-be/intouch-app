import { useEffect, useMemo, useRef } from 'react';

import { createMapboxMapHtml } from '@/lib/mapbox-map-html';

import { FallbackEventMap, type EventMapItem } from './fallback-event-map';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

type MapMessage = {
  type?: string;
  eventId?: string;
};

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
  onSelectEvent,
}: {
  events: EventMapItem[];
  onSelectEvent: (eventId: string) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => createMapboxMapHtml(events), [events]);

  useEffect(() => {
    const handleMessage = (message: MessageEvent) => {
      if (message.source !== frameRef.current?.contentWindow) {
        return;
      }

      const data = parseMapMessage(message.data);

      if (data?.type === 'retalk-map-event-select' && data.eventId) {
        onSelectEvent(data.eventId);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSelectEvent]);

  if (!mapboxAccessToken) {
    return <FallbackEventMap events={events} onSelectEvent={onSelectEvent} />;
  }

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      style={{
        backgroundColor: '#dde3ec',
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
