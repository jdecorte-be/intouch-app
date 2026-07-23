import type { EventCategory, EventItem, Gender, HostableCategory } from './types';

export const categories: { id: EventCategory; label: string; emoji: string }[] = [
  { id: 'featured', label: 'Featured', emoji: '✨' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'sport', label: 'Sport', emoji: '🏃' },
  { id: 'games', label: 'Games', emoji: '🎮' },
  { id: 'social', label: 'Social', emoji: '🫶' },
  { id: 'educational', label: 'Educational', emoji: '🧠' },
  { id: 'books', label: 'Books', emoji: '📚' },
  { id: 'workshops', label: 'Workshops', emoji: '🛠️' },
  { id: 'party', label: 'Party', emoji: '🪩' },
  { id: 'comedy', label: 'Comedy', emoji: '🎭' },
];

export const hostableCategories = categories.filter(
  (category): category is { id: HostableCategory; label: string; emoji: string } =>
    category.id !== 'featured',
);

export const categoryAccents: Record<HostableCategory, string> = {
  art: '#ff6b9d',
  sport: '#2ee6c9',
  games: '#7c83fd',
  social: '#ff9de2',
  educational: '#5eb1ff',
  books: '#ffb84d',
  workshops: '#3ddc84',
  party: '#c084fc',
  comedy: '#ff9457',
};

function hexToHsl(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }

  return { h: h / 6, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = t;

    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;

    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toHex = (channel: number) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(hueToRgb(p, q, h + 1 / 3))}${toHex(hueToRgb(p, q, h))}${toHex(hueToRgb(p, q, h - 1 / 3))}`;
}

// Brighter, lighter take on a category accent — used for the border of
// group map pins so groups read as a livelier ring than the flat accent.
export function lightenAccent(hex: string) {
  const { h, s, l } = hexToHsl(hex);

  return hslToHex(h, Math.min(1, s + 0.12), Math.min(0.92, l + 0.16));
}

export const categoryAccentsLight: Record<HostableCategory, string> = Object.fromEntries(
  Object.entries(categoryAccents).map(([category, hex]) => [category, lightenAccent(hex)]),
) as Record<HostableCategory, string>;

export const neighborhoodLocations: Record<string, [number, number]> = {
  Riverside: [-79.3532, 43.6591],
  'Kensington Market': [-79.4023, 43.6542],
  'Discovery District': [-79.3887, 43.6596],
  'The Beaches': [-79.3068, 43.6635],
  Parkdale: [-79.4387, 43.6394],
  'Distillery District': [-79.3597, 43.6503],
  'Queen West': [-79.4177, 43.6467],
  Leslieville: [-79.3316, 43.6629],
};

export const neighborhoodOptions = Object.keys(neighborhoodLocations);

export const goalOptions = [
  { value: 'meet-new-people', label: 'Meet people', emoji: '🤝' },
  { value: 'go-out-tonight', label: 'Go out tonight', emoji: '🪩' },
  { value: 'learn-skills', label: 'Learn skills', emoji: '🧠' },
  { value: 'stay-local', label: 'Stay local', emoji: '📍' },
];

export const genderOptions: { value: Gender; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const languageOptions = [
  'English',
  'French',
  'Spanish',
  'Mandarin',
  'Cantonese',
  'Portuguese',
  'Arabic',
  'Hindi',
  'Punjabi',
  'Tagalog',
  'Italian',
  'German',
  'Korean',
  'Japanese',
  'Vietnamese',
  'Russian',
];

export function formatCanadianPrice(price: string) {
  const value = price.trim();

  if (!value) {
    return 'Free';
  }

  if (/^free(?:\s+admission)?$/i.test(value) || /(?:CA\$|CAD)/i.test(value)) {
    return value;
  }

  const currencyPrefixed = value.replace(/\$\s*(?=\d)/g, () => 'CA$');

  if (currencyPrefixed !== value) {
    return currencyPrefixed;
  }

  if (!/\d/.test(value)) {
    return value;
  }

  return value.replace(/\d+(?:\.\d{1,2})?/g, (amount) => `CA$${amount}`);
}

// Curated Unsplash crops per category so every event gets a warm, social
// photo that fits its vibe — same pools as the web app.
const unsplashPhoto = (photoId: string, width = 900) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=70`;

const categoryImagePools: Record<HostableCategory, string[]> = {
  art: [
    unsplashPhoto('photo-1547891654-e66ed7ebb968'),
    unsplashPhoto('photo-1513364776144-60967b0f800f'),
    unsplashPhoto('photo-1460661419201-fd4cecdf8a8b'),
  ],
  sport: [
    unsplashPhoto('photo-1571019613454-1cb2f99b2d8b'),
    unsplashPhoto('photo-1461896836934-ffe607ba8211'),
    unsplashPhoto('photo-1552674605-db6ffd4facb5'),
  ],
  games: [
    unsplashPhoto('photo-1606167668584-78701c57f13d'),
    unsplashPhoto('photo-1611996575749-79a3a250f948'),
    unsplashPhoto('photo-1556438064-2d7646166914'),
  ],
  social: [
    unsplashPhoto('photo-1529156069898-49953e39b3ac'),
    unsplashPhoto('photo-1517457373958-b7bdd4587205'),
    unsplashPhoto('photo-1529333166437-7750a6dd5a70'),
  ],
  educational: [
    unsplashPhoto('photo-1522202176988-66273c2fd55f'),
    unsplashPhoto('photo-1516321318423-f06f85e504b3'),
    unsplashPhoto('photo-1519389950473-47ba0277781c'),
  ],
  books: [
    unsplashPhoto('photo-1512820790803-83ca734da794'),
    unsplashPhoto('photo-1521587760476-6c12a4b040da'),
    unsplashPhoto('photo-1519682337058-a94d519337bc'),
  ],
  workshops: [
    unsplashPhoto('photo-1522202176988-66273c2fd55f'),
    unsplashPhoto('photo-1556761175-b413da4baf72'),
    unsplashPhoto('photo-1531482615713-2afd69097998'),
  ],
  party: [
    unsplashPhoto('photo-1492684223066-81342ee5ff30'),
    unsplashPhoto('photo-1514525253161-7a46d19cd819'),
    unsplashPhoto('photo-1566737236500-c8ac43014a67'),
  ],
  comedy: [
    unsplashPhoto('photo-1527224857830-43a7acc85260'),
    unsplashPhoto('photo-1560439514-4e9645039924'),
    unsplashPhoto('photo-1551818255-e6e10975bc17'),
  ],
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function eventImageUrl(event: Pick<EventItem, 'id' | 'category' | 'bannerUrl'>) {
  if (event.bannerUrl) {
    return event.bannerUrl;
  }

  const pool = categoryImagePools[event.category];

  return pool[hashString(event.id) % pool.length];
}
