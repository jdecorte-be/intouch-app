export function isFreeEventPrice(price: string) {
  const value = price.trim();

  return !value || /^free(?:\s+admission)?$/i.test(value);
}

// Filter tuning: max slider values double as the "no filter applied"
// sentinel, so the slider's top end always reads as "Any ...".
export const PRICE_FILTER_MAX_CAD = 200;
export const PRICE_FILTER_STEP_CAD = 5;
export const DISTANCE_FILTER_MIN_KM = 1;
export const DISTANCE_FILTER_MAX_KM = 25;
export const DISTANCE_FILTER_STEP_KM = 1;
export const GROUP_SIZE_FILTER_MIN = 10;
export const GROUP_SIZE_FILTER_MAX = 300;
export const GROUP_SIZE_FILTER_STEP = 10;

// Downtown Toronto — used as the distance-filter origin and initial map camera.
export const mapCenterCoordinates: [number, number] = [-79.3832, 43.6532];

export function getEventPriceValueCad(price: string) {
  if (isFreeEventPrice(price)) {
    return 0;
  }

  const amounts = price.match(/\d+(?:\.\d{1,2})?/g);

  if (!amounts || amounts.length === 0) {
    return 0;
  }

  return Math.min(...amounts.map(Number));
}

export function getDistanceKm(
  [fromLng, fromLat]: [number, number],
  [toLng, toLat]: [number, number],
) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.asin(Math.sqrt(haversine));
}

export function formatPriceFilterLabel(maxPriceCad: number) {
  if (maxPriceCad >= PRICE_FILTER_MAX_CAD) return 'Any price';
  if (maxPriceCad <= 0) return 'Free';
  return `Up to CA$${maxPriceCad}`;
}

export function formatDistanceFilterLabel(maxDistanceKm: number) {
  return maxDistanceKm >= DISTANCE_FILTER_MAX_KM
    ? 'Any distance'
    : `Within ${maxDistanceKm} km`;
}

export function formatGroupSizeFilterLabel(maxGroupSize: number) {
  return maxGroupSize >= GROUP_SIZE_FILTER_MAX ? 'Any size' : `Up to ${maxGroupSize} people`;
}
