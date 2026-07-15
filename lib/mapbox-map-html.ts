import { eventImageUrl } from './event-data';
import { mapCenterCoordinates } from './filter-utils';
import type { EventItem } from './types';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

type MapEvent = Pick<
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

function toMapEvent(event: MapEvent) {
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    icon: event.icon,
    accent: event.accent,
    coordinates: event.coordinates,
    // Groups stay icon-only; events get a real photo on the pin.
    photoUrl: event.kind === 'group' ? null : eventImageUrl(event),
  };
}

export function createMapboxMapHtml(events: MapEvent[]) {
  const [longitude, latitude] = mapCenterCoordinates;

  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css" />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        width: 100%;
      }

      body {
        background: #dde3ec;
        overflow: hidden;
      }

      .map-error {
        align-items: center;
        background: #dde3ec;
        color: #292f36;
        display: none;
        font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        inset: 0;
        justify-content: center;
        line-height: 20px;
        padding: 32px;
        position: absolute;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div class="map-error" id="map-error"></div>
    <script src="https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js"></script>
    <script>
      const accessToken = ${JSON.stringify(mapboxAccessToken)};
      const mapEvents = ${JSON.stringify(events.map(toMapEvent))};

      function showMapError(message) {
        const errorElement = document.getElementById('map-error');
        errorElement.textContent = message;
        errorElement.style.display = 'flex';
      }

      function selectEvent(eventId) {
        const message = JSON.stringify({ type: 'retalk-map-event-select', eventId });

        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(message);
          return;
        }

        window.parent && window.parent.postMessage(message, '*');
      }

      function createEventCollection(events) {
        return {
          type: 'FeatureCollection',
          features: events.map((event) => ({
            type: 'Feature',
            properties: {
              accent: event.accent,
              eventId: event.id,
              icon: event.icon,
              kind: event.kind,
              photoImageId: event.photoUrl ? 'retalk-photo-' + event.id : null,
              title: event.title,
            },
            geometry: {
              type: 'Point',
              coordinates: event.coordinates,
            },
          })),
        };
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
        map.on('load', () => {
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

          map.addSource('retalk-events', {
            type: 'geojson',
            data: createEventCollection(mapEvents),
            cluster: true,
            clusterMaxZoom: 17,
            clusterRadius: 52,
            generateId: true,
          });

          // "zoom" may only be used as the top-level input to step/interpolate —
          // it can't be nested inside a "case" — so the active-pin pop is baked
          // into each stop's output instead of wrapping the whole expression.
          const isActivePin = ['boolean', ['feature-state', 'active'], false];
          const activeEventPinRadius = [
            'interpolate',
            ['linear'],
            ['zoom'],
            12,
            ['case', isActivePin, 22, 18],
            16,
            ['case', isActivePin, 27, 23],
          ];
          const eventPhotoIconSize = ['interpolate', ['linear'], ['zoom'], 12, 28 / 128, 16, 36 / 128];
          const eventEmojiIconSize = ['interpolate', ['linear'], ['zoom'], 12, 28 / 64, 16, 36 / 64];

          const registeredEmojiImageIds = new Set();

          // Mapbox GL's text-field renders SDF glyphs fetched for the style's
          // font stack, which doesn't cover most emoji code points (they come
          // back blank). Drawing the emoji to a canvas with the platform's own
          // font rendering and registering it as an icon image renders it
          // correctly in full color instead.
          function registerEmojiIcon(emoji, imageId) {
            if (!emoji || registeredEmojiImageIds.has(imageId) || map.hasImage(imageId)) {
              return;
            }

            registeredEmojiImageIds.add(imageId);

            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;

            const context = canvas.getContext('2d');
            context.font = Math.round(size * 0.72) + 'px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(emoji, size / 2, size / 2 + size * 0.05);

            map.addImage(imageId, context.getImageData(0, 0, size, size));
          }

          const requestedPhotoImageIds = new Set();

          // Crops each event photo into a circle so it drops cleanly inside the
          // pin's ring. Falls back to the plain icon pin if the photo can't load
          // (offline, blocked host, or a non-CORS image host).
          function registerCircularEventPhoto(photoUrl, imageId) {
            if (!photoUrl || !imageId || requestedPhotoImageIds.has(imageId)) {
              return;
            }

            requestedPhotoImageIds.add(imageId);

            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
              try {
                const size = 128;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;

                const context = canvas.getContext('2d');
                context.save();
                context.beginPath();
                context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                context.closePath();
                context.clip();
                context.drawImage(image, 0, 0, size, size);
                context.restore();

                if (!map.hasImage(imageId)) {
                  map.addImage(imageId, context.getImageData(0, 0, size, size));
                }
              } catch {
                // Tainted canvas or decode failure — keep the icon fallback.
              }
            };
            image.src = photoUrl;
          }

          mapEvents.forEach((event) => {
            registerEmojiIcon(event.icon, 'retalk-emoji-' + event.icon);

            if (event.photoUrl) {
              registerCircularEventPhoto(event.photoUrl, 'retalk-photo-' + event.id);
            }
          });

          map.addLayer({
            id: 'retalk-cluster-shadow',
            type: 'circle',
            source: 'retalk-events',
            filter: ['has', 'point_count'],
            paint: {
              'circle-blur': 0.2,
              'circle-color': '#0f172a',
              'circle-opacity': 0.18,
              'circle-radius': ['step', ['get', 'point_count'], 25, 10, 30, 25, 35],
              'circle-translate': [0, 4],
            },
          });

          map.addLayer({
            id: 'retalk-clusters',
            type: 'circle',
            source: 'retalk-events',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#ffffff',
              'circle-radius': ['step', ['get', 'point_count'], 23, 10, 28, 25, 33],
              'circle-stroke-color': '#292f36',
              'circle-stroke-opacity': 0.95,
              'circle-stroke-width': 2,
            },
          });

          map.addLayer({
            id: 'retalk-cluster-count',
            type: 'symbol',
            source: 'retalk-events',
            filter: ['has', 'point_count'],
            layout: {
              'text-allow-overlap': true,
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
              'text-ignore-placement': true,
              'text-size': 14,
            },
            paint: {
              'text-color': '#292f36',
            },
          });

          map.addLayer({
            id: 'retalk-event-shadow',
            type: 'circle',
            source: 'retalk-events',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-blur': 0.25,
              'circle-color': '#0f172a',
              'circle-opacity': 0.2,
              'circle-radius': activeEventPinRadius,
              'circle-translate': [0, 4],
            },
          });

          map.addLayer({
            id: 'retalk-event-pins',
            type: 'circle',
            source: 'retalk-events',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': ['match', ['get', 'kind'], 'group', ['get', 'accent'], '#ffffff'],
              'circle-opacity': ['match', ['get', 'kind'], 'group', 0.14, 1],
              'circle-radius': activeEventPinRadius,
              'circle-stroke-color': ['get', 'accent'],
              'circle-stroke-width': ['case', ['boolean', ['feature-state', 'active'], false], 4, 3],
            },
          });

          map.addLayer({
            id: 'retalk-event-icons',
            type: 'symbol',
            source: 'retalk-events',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-image': ['concat', 'retalk-emoji-', ['get', 'icon']],
              'icon-size': eventEmojiIconSize,
            },
          });

          // Draws the event photo over the icon once it's loaded; groups have no
          // photoImageId so they always keep showing their emoji underneath.
          map.addLayer({
            id: 'retalk-event-photos',
            type: 'symbol',
            source: 'retalk-events',
            filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'photoImageId'], null]],
            layout: {
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-image': ['get', 'photoImageId'],
              'icon-size': eventPhotoIconSize,
            },
          });

          // Groups get a soft tinted fill above; events keep a plain white pin.
          // A small corner tag on group pins tells the two kinds apart at a glance.
          map.addLayer({
            id: 'retalk-group-tag',
            type: 'circle',
            source: 'retalk-events',
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'kind'], 'group']],
            paint: {
              'circle-color': ['get', 'accent'],
              'circle-radius': 7,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
              'circle-translate': [15, -15],
            },
          });

          map.addLayer({
            id: 'retalk-event-labels',
            type: 'symbol',
            source: 'retalk-events',
            filter: ['!', ['has', 'point_count']],
            minzoom: 14,
            layout: {
              'text-field': ['get', 'title'],
              'text-size': 12,
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'top',
              'text-offset': [0, 1.4],
              'text-max-width': 9,
              'text-optional': true,
            },
            paint: {
              'text-color': '#292f36',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.4,
            },
          });

          function handleClusterClick(event) {
            const features = map.queryRenderedFeatures(event.point, {
              layers: ['retalk-clusters', 'retalk-cluster-count'],
            });
            const feature = features[0];

            if (!feature) {
              return;
            }

            const source = map.getSource('retalk-events');
            const clusterId = feature.properties && feature.properties.cluster_id;
            const coordinates = feature.geometry.coordinates.slice();

            source.getClusterExpansionZoom(clusterId, (error, zoom) => {
              if (error || typeof zoom !== 'number') {
                return;
              }

              map.easeTo({
                center: coordinates,
                essential: true,
                zoom: Math.min(zoom, 17),
              });
            });
          }

          let activeFeatureId = null;

          function popEventPin(featureId) {
            if (activeFeatureId !== null) {
              map.setFeatureState({ source: 'retalk-events', id: activeFeatureId }, { active: false });
            }

            activeFeatureId = featureId;
            map.setFeatureState({ source: 'retalk-events', id: featureId }, { active: true });

            setTimeout(() => {
              map.setFeatureState({ source: 'retalk-events', id: featureId }, { active: false });

              if (activeFeatureId === featureId) {
                activeFeatureId = null;
              }
            }, 180);
          }

          function handleEventClick(event) {
            const features = map.queryRenderedFeatures(event.point, {
              layers: ['retalk-event-pins', 'retalk-event-icons', 'retalk-event-photos'],
            });
            const feature = features[0];
            const eventId = feature && feature.properties && feature.properties.eventId;

            if (eventId) {
              popEventPin(feature.id);
              selectEvent(String(eventId));
            }
          }

          map.on('click', 'retalk-clusters', handleClusterClick);
          map.on('click', 'retalk-cluster-count', handleClusterClick);
          map.on('click', 'retalk-event-pins', handleEventClick);
          map.on('click', 'retalk-event-icons', handleEventClick);
          map.on('click', 'retalk-event-photos', handleEventClick);

          [
            'retalk-clusters',
            'retalk-cluster-count',
            'retalk-event-pins',
            'retalk-event-icons',
            'retalk-event-photos',
          ].forEach((layerId) => {
            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          });
        });

        window.centerOnUserLocation = (coordinates) => {
          const nextLongitude = Number(coordinates && coordinates.longitude);
          const nextLatitude = Number(coordinates && coordinates.latitude);

          if (!Number.isFinite(nextLongitude) || !Number.isFinite(nextLatitude)) {
            return;
          }

          map.flyTo({
            center: [nextLongitude, nextLatitude],
            essential: true,
            zoom: Math.max(map.getZoom(), 15),
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
