# ReTalk App 📍

Native mobile version of the [ReTalk](../ReTalk) web app — discover local events and groups around Toronto, join their chats, and host your own activities. The app uses a feed-style Home screen, a map-first Explore screen with a draggable event sheet, a floating bottom nav, and the ReTalk ink/coral/teal palette.

## Stack

- **Expo SDK 54** + **expo-router v6** (typed routes)
- **Tamagui** for the design system (custom ReTalk theme in `tamagui.config.ts`)
- **Iconsax icons** via `iconsax-react-native` and the typed wrapper in `components/icons/iconly-icon.tsx`
- **Zustand** stores (`stores/`) persisted with **MMKV** (`lib/storage.ts`, falls back to in-memory storage in Expo Go/web)
- **Mapbox GL** inside `react-native-webview` for the Explore map (falls back to a stylized board until a Mapbox public token is set)

## Structure

```
app/                 expo-router routes
  (tabs)/            Home, Explore (map), Chats, Profile
  event/[id].tsx     event / group detail
  chat/[id].tsx      conversation
  host.tsx           host-an-activity modal
  filters.tsx        distance / price / size / date filters modal
components/          UI building blocks (events, home, nav, icons, ui)
stores/              zustand stores: events, chats, session
lib/                 types, utils, palette, MMKV storage, mock data
lib/api.ts           ⬅ single seam for the future PostgreSQL backend
```

## Running it

MMKV and Mapbox are native modules, so use a development build (not Expo Go):

```bash
npm install
npx expo run:android   # or: npx expo run:ios
```

### Mapbox maps

Set a Mapbox public access token before starting the app:

```bash
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-mapbox-public-token
```

Until then the Explore screen renders a fallback event board instead of the live map.

## PostgreSQL later

Live event and auth data come from the configured backend. If events cannot be loaded, Home falls back to `lib/mock-data.ts` so the app remains usable during local development or backend outages.
