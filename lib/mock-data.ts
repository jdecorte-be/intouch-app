import { addCalendarDays, formatDayLabel, toLocalDateKey } from './date-utils';
import { categoryAccents, neighborhoodLocations } from './event-data';
import type { ChatThread, EventAttendee, EventItem, HostableCategory, SessionUser } from './types';

// Placeholder data shaped exactly like the future PostgreSQL rows so the
// api layer can swap in real queries without touching the UI.

function startsOn(dayOffset: number, time: string) {
  const date = addCalendarDays(new Date(), dayOffset);

  return {
    startsAt: `${formatDayLabel(date, dayOffset)}, ${time}`,
    startsAtKey: toLocalDateKey(date),
  };
}

function nudge([lng, lat]: [number, number], seed: number): [number, number] {
  return [lng + ((seed % 7) - 3) * 0.0021, lat + ((seed % 5) - 2) * 0.0017];
}

const people = {
  maya: { name: 'Maya Chen', role: 'Host & curator', userId: 'user-maya', isHost: true },
  theo: { name: 'Theo Alvarez', role: 'Regular', userId: 'user-theo' },
  priya: { name: 'Priya Patel', role: 'New this month', userId: 'user-priya' },
  jonas: { name: 'Jonas Berg', role: 'Group organizer', userId: 'user-jonas', isHost: true },
  amara: { name: 'Amara Osei', role: 'Community host', userId: 'user-amara', isHost: true },
  liam: { name: 'Liam Doyle', role: 'Regular', userId: 'user-liam' },
  sofia: { name: 'Sofia Ricci', role: 'Photographer', userId: 'user-sofia' },
  noor: { name: 'Noor Haddad', role: 'Book club lead', userId: 'user-noor', isHost: true },
  eli: { name: 'Eli Tremblay', role: 'Trivia captain', userId: 'user-eli', isHost: true },
  dana: { name: 'Dana Kim', role: 'Regular', userId: 'user-dana' },
} satisfies Record<string, EventAttendee>;

function makeEvent(
  input: Omit<EventItem, 'accent' | 'coordinates'> & {
    category: HostableCategory;
    seed: number;
  },
): EventItem {
  const { seed, ...event } = input;

  return {
    ...event,
    accent: categoryAccents[input.category],
    coordinates: nudge(neighborhoodLocations[input.neighborhood] ?? [-79.3832, 43.6532], seed),
  };
}

export const mockEvents: EventItem[] = [
  makeEvent({
    id: 'evt-sunset-paint',
    kind: 'event',
    title: 'Sunset Paint & Sip on the Boardwalk',
    description:
      'Bring a friend or come solo — easels, paint, and a golden-hour view of the lake. All skill levels welcome; a local artist walks everyone through a beach scene step by step.\n\nAprons and materials included.',
    venue: 'Boardwalk Pavilion',
    neighborhood: 'The Beaches',
    category: 'art',
    icon: '🎨',
    ...startsOn(0, '7:00 PM'),
    price: 'CA$25',
    going: 34,
    capacity: 40,
    hosts: ['Maya Chen'],
    attendees: [people.maya, people.theo, people.sofia, people.dana],
    tags: ['Painting', 'Golden hour', 'Beginner friendly'],
    seed: 1,
  }),
  makeEvent({
    id: 'grp-morning-runners',
    kind: 'group',
    title: 'Riverside Morning Runners',
    description:
      'Easy-pace 5k along the Don River trail every week, then coffee at the corner bakery. We wait for everyone — nobody runs alone.',
    venue: 'Riverside Trailhead',
    neighborhood: 'Riverside',
    category: 'sport',
    icon: '🏃',
    ...startsOn(1, '7:30 AM'),
    price: 'Free',
    going: 58,
    capacity: 80,
    hosts: ['Jonas Berg'],
    attendees: [people.jonas, people.liam, people.priya],
    tags: ['Running', '5k', 'Coffee after'],
    seed: 2,
  }),
  makeEvent({
    id: 'evt-board-game-night',
    kind: 'event',
    title: 'Big Board Game Night',
    description:
      'Forty tables, three hundred games, zero pressure. Hosts float around to teach anything from Catan to Cascadia. Solo players get matched into groups at the door.',
    venue: 'Snakes & Lattes Annex',
    neighborhood: 'Kensington Market',
    category: 'games',
    icon: '🎮',
    ...startsOn(0, '6:30 PM'),
    price: 'CA$12',
    going: 96,
    capacity: 120,
    hosts: ['Eli Tremblay'],
    attendees: [people.eli, people.dana, people.theo, people.priya],
    tags: ['Board games', 'Matchmaking', 'Weeknight'],
    seed: 3,
  }),
  makeEvent({
    id: 'grp-newcomers-social',
    kind: 'group',
    title: 'New in Toronto Social Club',
    description:
      'Moved here recently? So did we. Casual meetups every week — picnics, pub nights, museum wanders — built for making your first friends in the city.',
    venue: 'Rotating venues',
    neighborhood: 'Queen West',
    category: 'social',
    icon: '🫶',
    ...startsOn(2, '6:00 PM'),
    price: 'Free',
    going: 142,
    capacity: 150,
    hosts: ['Amara Osei'],
    attendees: [people.amara, people.priya, people.liam, people.sofia],
    tags: ['Newcomers', 'Friends', 'Weekly'],
    seed: 4,
  }),
  makeEvent({
    id: 'evt-history-walk',
    kind: 'event',
    title: 'Hidden History Walking Tour',
    description:
      'Ninety minutes through the lanes and factories of the old distillery — the strikes, the scandals, and the whisky barons. Ends at a tasting room (first pour included).',
    venue: 'Trinity Square Gates',
    neighborhood: 'Distillery District',
    category: 'educational',
    icon: '🧠',
    ...startsOn(3, '2:00 PM'),
    price: 'CA$18',
    going: 21,
    capacity: 30,
    hosts: ['Amara Osei'],
    attendees: [people.amara, people.dana],
    tags: ['History', 'Walking tour', 'Tasting'],
    seed: 5,
  }),
  makeEvent({
    id: 'grp-page-turners',
    kind: 'group',
    title: 'Parkdale Page Turners',
    description:
      'A low-key book club that actually reads the book (mostly). One novel a month, wine optional, hot takes encouraged.',
    venue: 'Common Ground Café',
    neighborhood: 'Parkdale',
    category: 'books',
    icon: '📚',
    ...startsOn(4, '7:00 PM'),
    price: 'Free',
    going: 24,
    capacity: 25,
    hosts: ['Noor Haddad'],
    attendees: [people.noor, people.sofia, people.theo],
    tags: ['Fiction', 'Monthly', 'Cozy'],
    seed: 6,
  }),
  makeEvent({
    id: 'evt-pottery-workshop',
    kind: 'event',
    title: 'Intro to Wheel Throwing',
    description:
      'Two hours, one lump of clay, and surprisingly high odds you leave with a bowl. Studio glaze-and-fire included — pick up your piece two weeks later.',
    venue: 'Clayworks Studio',
    neighborhood: 'Leslieville',
    category: 'workshops',
    icon: '🛠️',
    ...startsOn(1, '11:00 AM'),
    price: 'CA$65',
    going: 10,
    capacity: 12,
    hosts: ['Maya Chen'],
    attendees: [people.maya, people.priya],
    tags: ['Pottery', 'Hands-on', 'Small group'],
    seed: 7,
  }),
  makeEvent({
    id: 'evt-rooftop-disco',
    kind: 'event',
    title: 'Rooftop Disco: Neon Edition',
    description:
      'Open-air dance floor, funk and disco all night, glow paint at the door. Rain moves us inside — the party happens either way.',
    venue: 'The Broadview Rooftop',
    neighborhood: 'Riverside',
    category: 'party',
    icon: '🪩',
    ...startsOn(2, '9:00 PM'),
    price: 'CA$20',
    going: 178,
    capacity: 200,
    hosts: ['DJ Marlowe'],
    attendees: [people.liam, people.dana, people.sofia],
    tags: ['Dancing', 'Rooftop', 'Late night'],
    seed: 8,
  }),
  makeEvent({
    id: 'evt-open-mic-comedy',
    kind: 'event',
    title: 'Comedy Open Mic Tonight',
    description:
      'Ten brave locals, five minutes each, one very supportive crowd. Sign up at the bar by 7:30 if you want a slot.',
    venue: 'The Corner Comedy Cellar',
    neighborhood: 'Kensington Market',
    category: 'comedy',
    icon: '🎭',
    ...startsOn(0, '8:00 PM'),
    price: 'CA$10',
    going: 61,
    capacity: 70,
    hosts: ['Eli Tremblay'],
    attendees: [people.eli, people.theo],
    tags: ['Stand-up', 'Open mic', 'Tonight'],
    seed: 9,
  }),
  makeEvent({
    id: 'grp-sketch-club',
    kind: 'group',
    title: 'Sunday Sketch Club',
    description:
      'We meet at a different gallery or park each Sunday and draw for an hour, then compare sketchbooks over coffee. Pencils provided for first-timers.',
    venue: 'AGO Steps',
    neighborhood: 'Discovery District',
    category: 'art',
    icon: '✏️',
    ...startsOn(5, '10:30 AM'),
    price: 'Free',
    going: 33,
    capacity: 45,
    hosts: ['Sofia Ricci'],
    attendees: [{ ...people.sofia, role: 'Group organizer', isHost: true }, people.maya, people.dana],
    tags: ['Drawing', 'Galleries', 'Sundays'],
    seed: 10,
  }),
  makeEvent({
    id: 'evt-beach-volleyball',
    kind: 'event',
    title: 'Beach Volleyball Drop-in',
    description:
      'Six nets, rotating teams, all levels. Come alone and get drafted — captains shuffle squads every three games so nobody gets stuck.',
    venue: 'Woodbine Beach Courts',
    neighborhood: 'The Beaches',
    category: 'sport',
    icon: '🏐',
    ...startsOn(1, '5:30 PM'),
    price: 'CA$8',
    going: 44,
    capacity: 60,
    hosts: ['Jonas Berg'],
    attendees: [people.jonas, people.liam],
    tags: ['Volleyball', 'Drop-in', 'Outdoors'],
    seed: 11,
  }),
  makeEvent({
    id: 'grp-language-exchange',
    kind: 'group',
    title: 'Tuesday Language Exchange',
    description:
      'Twenty-minute rounds: half in English, half in the language you are learning. French, Spanish, Mandarin, and Portuguese tables every week.',
    venue: 'The Study Hall Bar',
    neighborhood: 'Discovery District',
    category: 'educational',
    icon: '🗣️',
    ...startsOn(6, '6:30 PM'),
    price: 'Free',
    going: 87,
    capacity: 100,
    hosts: ['Noor Haddad'],
    attendees: [people.noor, people.priya, people.theo],
    tags: ['Languages', 'Conversation', 'Weekly'],
    seed: 12,
  }),
];

export const mockUser: SessionUser = {
  id: 'user-you',
  name: 'Jordan Decorte',
  email: 'jordan@retalk.app',
  image: null,
  homeNeighborhood: 'Riverside',
  eventInterests: ['social', 'games', 'sport'],
  eventGoals: ['meet-new-people', 'stay-local'],
  memberSince: 'March 2026',
};

export const mockChatThreads: ChatThread[] = [
  {
    id: 'event-chat-evt-board-game-night',
    kind: 'event',
    title: 'Big Board Game Night',
    subtitle: '96 members · Kensington Market',
    accent: categoryAccents.games,
    initials: 'BG',
    unreadCount: 2,
    messages: [
      {
        id: 'm1',
        author: 'Eli Tremblay',
        authorImage: null,
        fromSelf: false,
        text: 'Doors open 6:15 tonight — come early if you want a big table!',
        sentAt: '5:42 PM',
      },
      {
        id: 'm2',
        author: 'Dana Kim',
        authorImage: null,
        fromSelf: false,
        text: 'Anyone up for Cascadia? I finally learned the rules 😅',
        sentAt: '5:58 PM',
      },
    ],
  },
  {
    id: 'direct-user-priya',
    kind: 'direct',
    title: 'Priya Patel',
    subtitle: 'Met at New in Toronto Social Club',
    accent: '#5b6b82',
    initials: 'PP',
    unreadCount: 0,
    messages: [
      {
        id: 'm3',
        author: 'Priya Patel',
        authorImage: null,
        fromSelf: false,
        text: 'Hey! Are you going to the picnic on Saturday?',
        sentAt: '1:14 PM',
      },
      {
        id: 'm4',
        author: 'You',
        authorImage: null,
        fromSelf: true,
        text: 'Planning on it! Want to share a streetcar down?',
        sentAt: '1:20 PM',
      },
    ],
  },
];
