# InTouch

Welcome! This is the codebase for InTouch, a mobile app for discovering local events and groups, joining their chats, and hosting your own activities.

## What's in the app

- **Discover**: feed-style Home with hero event swiper, trending and nearby sections, and category filtering
- **Explore**: map-first view (Mapbox GL) with a draggable event sheet and category chips
- **Chat**: group and direct messaging with replies, reactions, polls, GIFs (Klipy), photos, and location sharing
- **Tickets**: upcoming, saved, and past events
- **Host**: create events and groups from a guided form
- **Auth and onboarding**: email and Google sign-in via SuperTokens, plus an interest-based onboarding flow

## Development resources

This is a [React Native](https://reactnative.dev/) application built with [Expo](https://expo.dev/) and written in TypeScript. It uses a dark-first design system built on [Tamagui](https://tamagui.dev/).

- **Expo SDK 54** and **expo-router** (file-based, typed routes), React Native 0.81
- **Zustand** stores persisted with **MMKV**, encrypted with a random key kept in the OS keychain (`expo-secure-store`). Where native modules are unavailable it falls back to in-memory storage (`lib/storage.ts`)
- **SuperTokens** session handling (`lib/supertokens.ts`) and an axios API client (`lib/api.ts`)
- **Mapbox GL JS** rendered in `react-native-webview`, with a stylized fallback board when no token is set
- **Reanimated** and **Gesture Handler** for animation and gestures

`AGENT.md` is the source of truth for the product, design system, UX rules, and component guidance. Read it before making design or architecture changes.

### Project structure

```
app/          expo-router routes
  (tabs)/     Home, Explore, Chats, Tickets, Profile
  event/      event and group detail
  chat/       conversation
  user/       public profile
  host.tsx, filters.tsx, onboarding.tsx, auth flows
components/   UI building blocks, grouped by feature (auth, chat, events, home, icons, nav, ui)
stores/       Zustand stores: session, events, chats, notifications
lib/          API client, types, date/event/filter utilities, storage
  map/        stylesheet and client script for the Mapbox WebView
__tests__/    Vitest unit tests for the pure logic in lib/
```

`lib/api.ts` is the single boundary between the app and the backend.

## Getting started

MMKV, Google Sign-In, and the map use native modules, so run a development build rather than Expo Go.

```bash
npm install
cp .env.example .env    # then fill in the values
npx expo run:ios        # or: npx expo run:android
```

### Environment variables

See `.env.example` for the full list. All `EXPO_PUBLIC_*` values are bundled into the client, so only put public keys there.

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Backend and SuperTokens API domain |
| `EXPO_PUBLIC_WEB_BASE_URL` | Web app URL used in share links |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Support address shown in the terms |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox public token for the live map |
| `EXPO_PUBLIC_KLIPY_API_KEY` | GIF picker in chat |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In web client id |

### Scripts

```bash
npm run lint         # ESLint (expo lint)
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests
```

A `Makefile` wraps these commands: run `make help` to list the targets (`make check` runs lint and typecheck).

CI runs typecheck, lint and tests on every push to `master`, then builds the Android app with EAS (`.github/workflows/eas-build.yml`).

## Contributions

> [!NOTE]
> This is a proprietary project. Outside contributions are not accepted unless agreed in writing beforehand.

If you have access and want to change something:

- Check for existing issues before filing a new one.
- Discuss larger changes before opening a PR.
- Reuse existing components and patterns, and follow `AGENT.md`.
- Run `npm run lint` and `npm run typecheck` before submitting.

## Security disclosures

If you discover a security issue, please report it privately to the maintainer rather than opening a public issue.

## License

Proprietary. Copyright (c) 2026 John Decorte. All rights reserved. See [LICENSE](./LICENSE); no use, copying, or distribution without written permission.
