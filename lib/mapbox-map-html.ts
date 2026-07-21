import { categoryAccentsLight, eventImageUrl } from './event-data';
import { mapCenterCoordinates } from './filter-utils';
import { palette } from './palette';
import type { EventItem } from './types';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const MARKER_BORDER_OPACITY = 0.5;

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
// `window.updateMapEvents` in the generated script) instead of rebuilding
// the whole document — regenerating the HTML string forces the WebView/
// iframe to fully reload and reinitialize Mapbox on every events change.
export function toMapEvent(event: MapEvent) {
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    icon: event.icon,
    accent: event.accent,
    // Lighter, more vibrant take on the category accent — used for the
    // group pin border so groups pop against the map instead of reading flat.
    accentLight: categoryAccentsLight[event.category],
    going: event.going,
    coordinates: event.coordinates,
    // Groups stay icon-only; events get a real photo on the pin.
    photoUrl: event.kind === 'group' ? null : eventImageUrl(event),
  };
}

function hexToRgba(hex: string, opacity: number) {
  const value = hex.replace('#', '');

  if (value.length !== 6) {
    return hex;
  }

  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function createMapboxMapHtml(events: MapEvent[]) {
  const [longitude, latitude] = mapCenterCoordinates;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css" />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        width: 100%;
      }

      body {
        background: #ffffff;
        overflow: hidden;
      }

      .map-error {
        align-items: center;
        background: #ffffff;
        color: ${palette.ink};
        display: none;
        font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        inset: 0;
        justify-content: center;
        line-height: 20px;
        padding: 32px;
        position: absolute;
        text-align: center;
      }

      /* Event/group markers ------------------------------------------------ */

      .event-map-marker {
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;
        display: block;
        padding: 0;
        transition:
          transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1),
          box-shadow 220ms ease;
        will-change: transform;
      }

      .event-pin {
        background-color: #ffffff;
        background-position: center;
        background-size: cover;
        border-color: ${hexToRgba(palette.primaryEnd, MARKER_BORDER_OPACITY)};
        border-radius: 16px;
        border-style: solid;
        border-width: 2.5px;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24);
        height: 46px;
        width: 46px;
      }

      .event-pin-group {
        -webkit-backdrop-filter: blur(10px);
        align-items: center;
        backdrop-filter: blur(10px);
        border-radius: 999px;
        border-style: solid;
        border-width: 2.5px;
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24);
        display: flex;
        font-size: 22px;
        height: 50px;
        justify-content: center;
        line-height: 1;
        width: 50px;
      }

      .event-pin-badge {
        background: ${palette.primary};
        border: 1.5px solid #ffffff;
        border-radius: 999px;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
        color: #ffffff;
        font: 700 9px/17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        min-width: 17px;
        padding: 0 4px;
        position: absolute;
        right: -6px;
        text-align: center;
        top: -6px;
      }

      /* NOT position: relative here — this class also lands on the marker
         root that Mapbox itself sets position: absolute on (via its
         .mapboxgl-marker class in mapbox-gl.css, loaded above) to place the
         marker at its map coordinate. Overriding that at equal selector
         specificity would pull the whole marker into normal document flow
         instead, making clusters drift as the marker count changes (e.g.
         collapsing toward the top-left on zoom-out). The inner wrapper
         below owns position: relative instead. */
      .event-cluster-inner {
        position: relative;
      }

      .event-cluster-shadow {
        border: 2px solid #ffffff;
        position: absolute;
      }

      .event-cluster-shadow-back {
        background: #e3e6ec;
        inset: 0;
        transform: translate(8px, 8px);
      }

      .event-cluster-shadow-mid {
        background: #f3f3f4;
        inset: 0;
        transform: translate(4px, 4px);
      }

      .event-cluster .event-pin {
        background-color: #ffffff;
        border-color: ${hexToRgba(palette.primary, MARKER_BORDER_OPACITY)};
      }

      .event-cluster .event-pin-group {
        background-color: rgba(255, 255, 255, 0.55);
        border-color: ${hexToRgba(palette.primary, MARKER_BORDER_OPACITY)};
      }

      .event-map-marker:active {
        transform: scale(0.9);
      }

      @media (hover: hover) {
        .event-map-marker:hover {
          transform: scale(1.06);
        }
      }

      .event-marker-pop {
        animation: retalk-marker-pop 320ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes retalk-marker-pop {
        from {
          opacity: 0;
          transform: scale(0.4);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .event-marker-pop {
          animation: none;
        }
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="map-error" id="map-error"></div>
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js"></script>
    <script>
      const accessToken = ${JSON.stringify(mapboxAccessToken)};
      // Mutable: window.updateMapEvents (below) reassigns this so the host
      // app can push a new event list — e.g. after a category filter change
      // — into the already-running map instead of rebuilding this whole
      // document, which would force a full WebView/iframe reload.
      let mapEvents = ${JSON.stringify(events.map(toMapEvent))};

      function showMapError(message) {
        const errorElement = document.getElementById('map-error');
        errorElement.textContent = message;
        errorElement.style.display = 'flex';
      }

      function postHostMessage(message) {
        const payload = JSON.stringify(message);

        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(payload);
          return;
        }

        window.parent && window.parent.postMessage(payload, '*');
      }

      function selectEvent(eventId) {
        postHostMessage({ type: 'retalk-map-event-select', eventId });
      }

      // Lets the host know exactly which events are currently on screen, so
      // it can limit the category chip row (and its counts) to what's
      // actually visible instead of every category anywhere in the dataset.
      // Sent from renderMarkers() itself — using the very same on-screen
      // event list it just drew markers for — rather than recomputed from
      // map.getBounds(): with the camera pitched, getBounds() returns a
      // lng/lat box stretched out to the horizon that includes far more
      // than what's actually on screen, which is why the chip row wasn't
      // shrinking as pins scrolled out of view.
      function postVisibleEventsUpdate(eventsInView) {
        postHostMessage({
          type: 'retalk-map-visible-events',
          eventIds: eventsInView.map((event) => event.id),
        });
      }

      function createUserLocationCollection(location) {
        if (
          !location ||
          !Number.isFinite(Number(location.longitude)) ||
          !Number.isFinite(Number(location.latitude))
        ) {
          return {
            type: 'FeatureCollection',
            features: [],
          };
        }

        return {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {
                accuracy: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : 0,
              },
              geometry: {
                type: 'Point',
                coordinates: [Number(location.longitude), Number(location.latitude)],
              },
            },
          ],
        };
      }

      // Marker building -----------------------------------------------------
      //
      // Event/group pins are plain DOM elements (a Mapbox Marker with a
      // custom HTML element) rather than GL circle/symbol layers. That keeps
      // emoji rendering crisp (GL's SDF glyphs don't cover most emoji code
      // points) and lets pins carry real CSS transitions for press/pop
      // feedback and cluster "stacking" instead of feature-state hacks.

      function formatCount(value) {
        return value > 99 ? '99+' : String(value);
      }

      function hexToRgba(hex, opacity) {
        const value = hex.replace('#', '');

        if (value.length !== 6) {
          return hex;
        }

        const red = parseInt(value.slice(0, 2), 16);
        const green = parseInt(value.slice(2, 4), 16);
        const blue = parseInt(value.slice(4, 6), 16);

        return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + opacity + ')';
      }

      function getMapPinZIndex(event) {
        return event.kind === 'group' ? 20 : 10;
      }

      // Greedy proximity clustering: each point joins the first existing
      // cluster within range of its running centroid, else starts a new one.
      function clusterPoints(items, getPoint, isNear, canJoinCluster) {
        const clusters = [];

        for (const item of items) {
          const point = getPoint(item);
          const target = clusters.find(
            (cluster) => canJoinCluster(item, cluster.items) && isNear(cluster.anchor, point)
          );

          if (target) {
            target.items.push(item);
            target.sumX += point.x;
            target.sumY += point.y;
            target.anchor = {
              x: target.sumX / target.items.length,
              y: target.sumY / target.items.length,
            };
          } else {
            clusters.push({ items: [item], anchor: point, sumX: point.x, sumY: point.y });
          }
        }

        return clusters.map((cluster) => cluster.items);
      }

      function clusterCenter(cluster, displayCoordinates) {
        const points = cluster.map((event) => displayCoordinates.get(event.id) || event.coordinates);
        const lng = points.reduce((sum, point) => sum + point[0], 0) / points.length;
        const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;

        return [lng, lat];
      }

      // Buckets events by (near-)identical coordinates and, for any bucket
      // with more than one member, fans them out evenly around the shared
      // point by a few meters so duplicate pins (same venue) separate once
      // you zoom in, the same way any two distinct-but-close pins would.
      const DUPLICATE_COORDINATE_PRECISION = 5;
      const JITTER_BASE_RADIUS_METERS = 20;
      const JITTER_RADIUS_PER_POINT_METERS = 5;
      const METERS_PER_DEGREE_LAT = 111320;

      function spreadCoincidentCoordinates(events) {
        const groups = new Map();

        for (const event of events) {
          const lng = event.coordinates[0];
          const lat = event.coordinates[1];
          const key = lng.toFixed(DUPLICATE_COORDINATE_PRECISION) + ',' + lat.toFixed(DUPLICATE_COORDINATE_PRECISION);
          const group = groups.get(key);

          if (group) {
            group.push(event);
          } else {
            groups.set(key, [event]);
          }
        }

        const displayCoordinates = new Map();

        for (const group of groups.values()) {
          if (group.length === 1) {
            displayCoordinates.set(group[0].id, group[0].coordinates);
            continue;
          }

          const lng = group[0].coordinates[0];
          const lat = group[0].coordinates[1];
          const radiusMeters = JITTER_BASE_RADIUS_METERS + JITTER_RADIUS_PER_POINT_METERS * group.length;
          const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);

          group.forEach((event, index) => {
            const angle = (2 * Math.PI * index) / group.length;
            const dLat = (radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE_LAT;
            const dLng = metersPerDegreeLng ? (radiusMeters * Math.cos(angle)) / metersPerDegreeLng : 0;
            displayCoordinates.set(event.id, [lng + dLng, lat + dLat]);
          });
        }

        return displayCoordinates;
      }

      // Starts a pin at \`offset\` pixels away from its real (already-set)
      // position and animates it inward to translate(0, 0) — the "fly apart
      // from the old cluster point" effect for a marker that just split out
      // on its own.
      function animateMarkerSplit(element, offset) {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }

        element.style.transition = 'none';
        element.style.transform = 'translate(' + offset.dx + 'px, ' + offset.dy + 'px)';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            element.style.transition = 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';
            element.style.transform = 'translate(0, 0)';
          });
        });

        element.addEventListener(
          'transitionend',
          () => {
            element.style.transition = '';
            element.style.transform = '';
          },
          { once: true }
        );
      }

      function buildMemberBadge(event) {
        const badge = document.createElement('span');
        badge.setAttribute('aria-hidden', 'true');
        badge.className = 'event-pin-badge';
        badge.textContent = formatCount(event.going);

        return badge;
      }

      function buildEventMarkerElement(event, isNew, splitOffset) {
        const isGroup = event.kind === 'group';
        // Mapbox writes its own inline \`transform\` (for lng/lat
        // positioning) directly onto the element handed to it, which would
        // clobber the CSS transform our press/pop states rely on. Give
        // Mapbox a plain wrapper and keep the animated styles on the button.
        const markerRoot = document.createElement('div');
        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.setAttribute('aria-label', (isGroup ? 'Group: ' : 'Event: ') + event.title);
        // A pin freshly split out of a cluster gets the fly-apart animation
        // instead of the plain pop, so the two don't fight each other.
        const usePop = isNew && !splitOffset;
        markerElement.className =
          'event-map-marker ' + (isGroup ? 'event-pin-group' : 'event-pin') + (usePop ? ' event-marker-pop' : '');

        if (splitOffset) {
          animateMarkerSplit(markerElement, splitOffset);
        }

        if (isGroup) {
          // Groups carry a lighter, more vibrant take on their category
          // color on the border; events stay on the uniform theme-purple
          // border set by .event-pin in CSS.
          markerElement.style.borderColor = hexToRgba(event.accentLight, ${MARKER_BORDER_OPACITY});
          markerElement.style.backgroundColor = event.accent + '26';
          markerElement.textContent = event.icon;
          markerElement.append(buildMemberBadge(event));
        } else {
          markerElement.style.backgroundImage = 'url("' + event.photoUrl + '")';
        }

        markerElement.addEventListener('click', () => selectEvent(event.id));
        markerRoot.append(markerElement);

        return markerRoot;
      }

      function buildClusterMarkerElement(cluster, onClusterClick, isNew) {
        const primary = cluster.find((event) => event.kind === 'event') || cluster[0];
        const isGroup = primary.kind === 'group';
        const clusterLabel = isGroup ? 'groups' : 'events';

        // Mapbox writes its own inline \`transform\` directly onto
        // markerRoot, which would clobber a CSS transform animation applied
        // to that same element. Keep the pop-in animation on an inner
        // wrapper instead.
        const markerRoot = document.createElement('div');
        markerRoot.className = 'event-cluster';

        const innerWrap = document.createElement('div');
        innerWrap.className = 'event-cluster-inner' + (isNew ? ' event-marker-pop' : '');
        markerRoot.append(innerWrap);

        // Two offset "ghost" cards behind the primary pin sell the stacked
        // look.
        const shadowBack = document.createElement('div');
        shadowBack.className =
          'event-cluster-shadow event-cluster-shadow-back ' + (isGroup ? 'event-pin-group' : 'event-pin');
        innerWrap.append(shadowBack);

        const shadowMid = document.createElement('div');
        shadowMid.className =
          'event-cluster-shadow event-cluster-shadow-mid ' + (isGroup ? 'event-pin-group' : 'event-pin');
        innerWrap.append(shadowMid);

        const markerElement = document.createElement('button');
        markerElement.type = 'button';
        markerElement.setAttribute('aria-label', cluster.length + ' ' + clusterLabel + ' nearby, tap to zoom in');
        markerElement.className = 'event-map-marker ' + (isGroup ? 'event-pin-group' : 'event-pin');

        if (isGroup) {
          markerElement.style.borderColor = hexToRgba(primary.accentLight, ${MARKER_BORDER_OPACITY});
          markerElement.style.backgroundColor = primary.accent + '26';
          markerElement.textContent = primary.icon;
        } else {
          markerElement.style.backgroundImage = 'url("' + primary.photoUrl + '")';
        }

        markerElement.addEventListener('click', onClusterClick);
        innerWrap.append(markerElement);

        return markerRoot;
      }

      if (!accessToken) {
        showMapError('Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to load the Mapbox map.');
      } else if (typeof mapboxgl === 'undefined') {
        showMapError('The map could not load. Check your connection and try again.');
      } else {
        mapboxgl.accessToken = accessToken;

        const map = new mapboxgl.Map({
          attributionControl: false,
          bearing: -18,
          center: [${longitude}, ${latitude}],
          container: 'map',
          interactive: true,
          maxZoom: 19,
          pitch: 58,
          style: 'mapbox://styles/mapbox/streets-v12',
          zoom: 12,
        });
        let pendingUserLocation = null;

        function showUserLocation(location) {
          pendingUserLocation = location;

          const source = map.getSource('retalk-user-location');

          if (source) {
            source.setData(createUserLocationCollection(location));
          }
        }

        // Screen-space radius (in px) within which pins are stacked into a
        // cluster. Recomputed on every 'moveend' since clustering depends on
        // projected pixel distance, not raw lng/lat distance.
        const CLUSTER_PIXEL_RADIUS = 44;
        let displayCoordinates = spreadCoincidentCoordinates(mapEvents);
        let isMapLoaded = false;
        let markers = [];
        // Tracks which cluster groupings (by member id set) were on screen
        // last render, so only newly formed groupings play the pop-in
        // animation instead of every pin replaying it on every pan.
        let prevClusterKeys = new Set();
        // Tracks the last on-screen pixel position each event rendered at,
        // so that when a cluster splits apart we can animate each
        // freshly-individual pin flying out from the old shared point.
        let prevMemberPixel = new Map();

        // Buffer (px) added around the canvas edges before a pin counts as
        // "in view" — avoids pins right at the edge flickering in and out
        // on tiny sub-pixel camera moves.
        const VIEWPORT_EDGE_PADDING = 40;

        function renderMarkers() {
          // Only cluster/render pins currently inside the viewport — the
          // rest sit outside the field of view, so there's no reason to
          // keep their marker elements mounted (or let them factor into
          // clustering) until a pan/zoom brings them back on screen.
          //
          // This checks projected screen-space position rather than
          // map.getBounds(): the camera is pitched, so getBounds() returns a
          // lng/lat box stretched out toward the horizon that's much bigger
          // than what's actually on screen.
          const canvas = map.getCanvas();
          const viewportWidth = canvas.clientWidth;
          const viewportHeight = canvas.clientHeight;
          const pixelPositions = new Map();
          const eventsInView = mapEvents.filter((event) => {
            const pixel = map.project(displayCoordinates.get(event.id) || event.coordinates);
            pixelPositions.set(event.id, pixel);

            return (
              pixel.x >= -VIEWPORT_EDGE_PADDING &&
              pixel.x <= viewportWidth + VIEWPORT_EDGE_PADDING &&
              pixel.y >= -VIEWPORT_EDGE_PADDING &&
              pixel.y <= viewportHeight + VIEWPORT_EDGE_PADDING
            );
          });

          postVisibleEventsUpdate(eventsInView);

          const clusters = clusterPoints(
            eventsInView,
            (event) => pixelPositions.get(event.id),
            (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= CLUSTER_PIXEL_RADIUS,
            (event, cluster) => event.kind === cluster[0].kind
          );

          const clusterKeys = clusters.map((cluster) =>
            cluster
              .map((event) => event.id)
              .sort()
              .join(',')
          );
          const isNewGrouping = clusterKeys.map((key) => !prevClusterKeys.has(key));
          prevClusterKeys = new Set(clusterKeys);

          const clusterPixelCenters = clusters.map((cluster) => map.project(clusterCenter(cluster, displayCoordinates)));

          markers.forEach((marker) => marker.remove());
          markers = clusters.map((cluster, index) => {
            const coordinates = clusterCenter(cluster, displayCoordinates);
            const isNew = isNewGrouping[index];

            // A single event freshly split out of a bigger cluster: animate
            // it flying from the cluster's old shared point to its own spot,
            // instead of just popping into place.
            let splitOffset = null;
            if (isNew && cluster.length === 1) {
              const prevPixel = prevMemberPixel.get(cluster[0].id);
              const newPixel = clusterPixelCenters[index];
              if (prevPixel && (Math.abs(prevPixel.x - newPixel.x) > 4 || Math.abs(prevPixel.y - newPixel.y) > 4)) {
                splitOffset = { dx: prevPixel.x - newPixel.x, dy: prevPixel.y - newPixel.y };
              }
            }

            const markerRoot =
              cluster.length > 1
                ? buildClusterMarkerElement(
                    cluster,
                    () => {
                      map.flyTo({
                        center: coordinates,
                        essential: true,
                        zoom: Math.min(map.getZoom() + 2, 17),
                      });
                    },
                    isNew
                  )
                : buildEventMarkerElement(cluster[0], isNew, splitOffset);
            markerRoot.style.zIndex = String(getMapPinZIndex(cluster[0]));

            return new mapboxgl.Marker({ element: markerRoot, anchor: 'bottom' }).setLngLat(coordinates).addTo(map);
          });

          const nextMemberPixel = new Map();
          clusters.forEach((cluster, index) => {
            cluster.forEach((event) => {
              nextMemberPixel.set(event.id, clusterPixelCenters[index]);
            });
          });
          prevMemberPixel = nextMemberPixel;
        }

        map.on('load', () => {
          isMapLoaded = true;

          const labelLayer = map.getStyle().layers.find((layer) => {
            return layer.type === 'symbol' && layer.layout && layer.layout['text-field'];
          });

          if (map.getLayer('building') && !map.getLayer('retalk-3d-buildings')) {
            map.addLayer(
              {
                id: 'retalk-3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 12,
                paint: {
                  'fill-extrusion-color': '#d4d8df',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12,
                    0,
                    15,
                    ['get', 'height'],
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    12,
                    0,
                    15,
                    ['get', 'min_height'],
                  ],
                  'fill-extrusion-opacity': 0.72,
                },
              },
              labelLayer && labelLayer.id
            );
          }

          map.addSource('retalk-user-location', {
            type: 'geojson',
            data: createUserLocationCollection(pendingUserLocation),
          });

          map.addLayer({
            id: 'retalk-user-location-halo',
            type: 'circle',
            source: 'retalk-user-location',
            paint: {
              'circle-color': '${palette.primary}',
              'circle-opacity': 0.18,
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 18, 16, 34],
            },
          });

          map.addLayer({
            id: 'retalk-user-location-dot',
            type: 'circle',
            source: 'retalk-user-location',
            paint: {
              'circle-color': '${palette.primary}',
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 7, 16, 9],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 3,
            },
          });

          renderMarkers();
        });

        map.on('moveend', renderMarkers);

        // Lets the host app (native: WebView#injectJavaScript, web: iframe
        // postMessage below) hand this already-running map a fresh event
        // list — e.g. after a category filter change — without reloading
        // the page. mapEvents/displayCoordinates are the same variables
        // renderMarkers already reads via closure, so re-running it here
        // just diffs pins onto the map instead of reinitializing anything.
        window.updateMapEvents = (nextEvents) => {
          mapEvents = Array.isArray(nextEvents) ? nextEvents : [];
          displayCoordinates = spreadCoincidentCoordinates(mapEvents);

          if (isMapLoaded) {
            renderMarkers();
          }
        };

        // Native delivers updates via injectJavaScript calling
        // window.updateMapEvents directly; the web iframe can't be reached
        // that way, so it listens for a postMessage from the parent page
        // instead and forwards it to the same function.
        window.addEventListener('message', (messageEvent) => {
          let data;

          try {
            data = JSON.parse(messageEvent.data);
          } catch {
            return;
          }

          if (data && data.type === 'retalk-map-update-events' && Array.isArray(data.events)) {
            window.updateMapEvents(data.events);
          }
        });

        window.centerOnUserLocation = (coordinates, options) => {
          const nextLongitude = Number(coordinates && coordinates.longitude);
          const nextLatitude = Number(coordinates && coordinates.latitude);
          const nextAccuracy = Number(coordinates && coordinates.accuracy);

          if (!Number.isFinite(nextLongitude) || !Number.isFinite(nextLatitude)) {
            return;
          }

          showUserLocation({
            longitude: nextLongitude,
            latitude: nextLatitude,
            accuracy: Number.isFinite(nextAccuracy) ? nextAccuracy : 0,
          });

          // Auto-locating on load shows the pin without punching in on it,
          // so the initial view still reads as a map rather than a close-up.
          const keepZoom = Boolean(options && options.keepZoom);

          map.flyTo({
            center: [nextLongitude, nextLatitude],
            essential: true,
            zoom: keepZoom ? map.getZoom() : Math.max(map.getZoom(), 15),
          });
        };

        map.on('error', (event) => {
          const message = event && event.error && event.error.message
            ? event.error.message
            : 'Mapbox failed to load.';

          if (/access token|unauthorized|forbidden/i.test(message)) {
            showMapError('Mapbox could not load. Check EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.');
          }
        });

        setTimeout(() => {
          map.resize();
        }, 0);
      }
    </script>
  </body>
</html>
`;
}
