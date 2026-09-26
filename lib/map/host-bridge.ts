import { toScriptJson } from './script-json';

// State shared by the rest of the script, plus the helpers that talk to the
// host app (React Native WebView or a web iframe) through postMessage.
export function hostBridgeScript({ accessToken, events }: { accessToken: string; events: unknown[] }) {
  return `      const accessToken = ${toScriptJson(accessToken)};
      // Reassigned by window.updateMapEvents so the host can push new events
      // without reloading the whole WebView.
      let mapEvents = ${toScriptJson(events)};
      // Active category chip on the host screen, used to filter pins.
      let activeCategory = 'featured';

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
        postHostMessage({ type: 'intouch-map-event-select', eventId });
      }

      // Tells the host which events are on screen so it can trim the chip row.
      // Uses the list renderMarkers just drew instead of map.getBounds(),
      // which is stretched to the horizon when the camera is pitched.
      function postVisibleEventsUpdate(eventsInView) {
        postHostMessage({
          type: 'intouch-map-visible-events',
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
      }`;
}
