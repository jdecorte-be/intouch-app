import { hostBridgeScript } from './host-bridge';
import { mapInitScript } from './map-init';
import { markerBuildersScript } from './marker-builders';

// Client-side script that runs inside the map WebView/iframe. It talks to the
// host app through postMessage (see the host components in components/home).
export function createMapScript({
  accessToken,
  events,
  center,
}: {
  accessToken: string;
  events: unknown[];
  center: [number, number];
}) {
  return `
${hostBridgeScript({ accessToken, events })}

${markerBuildersScript}

${mapInitScript({ center })}
`;
}
