import { palette } from '../palette';

import { MARKER_BORDER_OPACITY } from './constants';

// Creates the Mapbox map, renders and re-renders markers as the camera moves,
// and exposes the window.* hooks the host app calls into.
export function mapInitScript({ center: [longitude, latitude] }: { center: [number, number] }) {
  return `      if (!accessToken) {
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

          const source = map.getSource('intouch-user-location');

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
        // "in view", avoids pins right at the edge flickering in and out
        // on tiny sub-pixel camera moves.
        const VIEWPORT_EDGE_PADDING = 40;

        function renderMarkers() {
          // Only cluster/render pins currently inside the viewport, the
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

          // Reported for the chip badge counts, so switching categories
          // still shows accurate counts for every category, independent of
          // which category is actually rendered as pins below.
          postVisibleEventsUpdate(eventsInView);

          // Only cluster/render pins matching the active category chip; the
          // rest are excluded entirely rather than dimmed, so switching
          // categories fully swaps which pins are on the map. Groups stay on
          // the map regardless of category, the chip only filters events.
          const eventsToRender =
            activeCategory === 'featured'
              ? eventsInView
              : eventsInView.filter((event) => event.kind === 'group' || event.category === activeCategory);

          const clusters = clusterPoints(
            eventsToRender,
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

          if (map.getLayer('building') && !map.getLayer('intouch-3d-buildings')) {
            map.addLayer(
              {
                id: 'intouch-3d-buildings',
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

          map.addSource('intouch-user-location', {
            type: 'geojson',
            data: createUserLocationCollection(pendingUserLocation),
          });

          map.addLayer({
            id: 'intouch-user-location-halo',
            type: 'circle',
            source: 'intouch-user-location',
            paint: {
              'circle-color': '${palette.primary}',
              'circle-opacity': 0.18,
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 18, 16, 34],
            },
          });

          map.addLayer({
            id: 'intouch-user-location-dot',
            type: 'circle',
            source: 'intouch-user-location',
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
        // list, e.g. after a category filter change, without reloading
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

        // Lets the host screen tell the already-running map which category
        // chip is active, renderMarkers filters eventsToRender down to it
        // without the host having to resend a smaller event list (which
        // would also blow away the chip counts for other categories).
        window.setActiveCategory = (category) => {
          activeCategory = typeof category === 'string' && category ? category : 'featured';

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

          if (data && data.type === 'intouch-map-update-events' && Array.isArray(data.events)) {
            window.updateMapEvents(data.events);
          }

          if (data && data.type === 'intouch-map-set-active-category') {
            window.setActiveCategory(data.category);
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
      }`;
}
