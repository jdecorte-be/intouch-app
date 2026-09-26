import { categoryAccentsLight, eventImageUrl } from './event-data';
import { mapCenterCoordinates } from './filter-utils';
import { createMapScript } from './map/map-script';
import { mapStyles } from './map/map-styles';
import type { EventItem } from './types';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

export type MapEvent = Pick<
  EventItem,
  | 'id'
  | 'kind'
  | 'title'
  | 'startsAt'
  | 'venue'
  | 'neighborhood'
  | 'price'
  | 'going'
  | 'bannerUrl'
  | 'category'
  | 'icon'
  | 'accent'
  | 'coordinates'
>;

// Shared by the initial HTML build below and by the host components, which
// call it again to push live event updates into the already-loaded map (see
// `window.updateMapEvents` in the generated script). Rebuilding the HTML
// instead would reload the WebView and reinitialize Mapbox on every change.
export function toMapEvent(event: MapEvent) {
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    icon: event.icon,
    accent: event.accent,
    // Lighter, more vibrant take on the category accent, used for the
    // group pin border so groups pop against the map instead of reading flat.
    accentLight: categoryAccentsLight[event.category],
    // Kept on the payload (unlike most fields here) so the map can filter
    // pins by the active category chip client-side, see activeCategory /
    // window.setActiveCategory below.
    category: event.category,
    going: event.going,
    coordinates: event.coordinates,
    // Groups stay icon-only; events get a real photo on the pin.
    photoUrl: event.kind === 'group' ? null : eventImageUrl(event),
  };
}

export function createMapboxMapHtml(events: MapEvent[]) {
  const script = createMapScript({
    accessToken: mapboxAccessToken,
    events: events.map(toMapEvent),
    center: mapCenterCoordinates,
  });

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css" />
    <style>${mapStyles}    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="map-error" id="map-error"></div>
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js"></script>
    <script>${script}    </script>
  </body>
</html>
`;
}
