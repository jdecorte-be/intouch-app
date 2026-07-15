import type { EventCategory, EventItem, HostableCategory } from './types';

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
  art: '#ff6b6b',
  sport: '#4ecdc4',
  games: '#6f7280',
  social: '#292f36',
  educational: '#5b6b82',
  books: '#7d6f62',
  workshops: '#4d7d6d',
  party: '#6f5f7f',
  comedy: '#d56f5f',
};

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
