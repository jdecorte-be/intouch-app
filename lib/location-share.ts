const LOCATION_URL_PATTERN = /https:\/\/maps\.google\.com\/\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/;

export type SharedLocation = {
  latitude: number;
  longitude: number;
};

export function buildLocationShareUrl(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

export function buildLocationMessageText(latitude: number, longitude: number): string {
  return `📍 Location shared\n${buildLocationShareUrl(latitude, longitude)}`;
}

export function parseLocationFromText(text: string): SharedLocation | null {
  const match = text.match(LOCATION_URL_PATTERN);

  if (!match) {
    return null;
  }

  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}
