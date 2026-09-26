import { palette } from '../palette';

import { MARKER_BORDER_OPACITY } from './constants';

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

// Stylesheet for the map document. It is a template because marker colors come
// from the shared palette.
export const mapStyles = `
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
          box-shadow 220ms ease,
          opacity 200ms ease;
        will-change: transform;
      }

      /* Groups outside the active category chip stay on the map but fade
         back, unlike events, which are excluded outright when they don't
         match (see eventsToRender). */
      .event-marker-dimmed {
        opacity: 0;
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
        border-width: 3px;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.24);
        display: flex;
        font-size: 26px;
        height: 60px;
        justify-content: center;
        line-height: 1;
        width: 60px;
      }

      .event-pin-badge {
        background: ${palette.primary};
        border: 1.5px solid #ffffff;
        border-radius: 999px;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
        color: #ffffff;
        font: 700 10px/20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        min-width: 20px;
        padding: 0 5px;
        position: absolute;
        right: -7px;
        text-align: center;
        top: -7px;
      }

      /* NOT position: relative here, this class also lands on the marker
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
        animation: intouch-marker-pop 320ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      @keyframes intouch-marker-pop {
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
`;
