# AGENT.MDX

## Product Overview

Build a polished mobile-first event discovery and social attendance app inspired by the provided reference.

The app helps users:

- Discover nearby events
- Browse events by category, location, popularity, and date
- See who is attending
- Join or save events
- View detailed schedules and event information
- Follow friends, hosts, and local communities
- Manage bookings and past events

The product should feel social, modern, lightweight, and visually premium. It should combine event discovery with a sense of community and urgency.

---

## Core Product Idea

The app is an event marketplace and social layer for local experiences.

Users should be able to open the app and immediately answer:

1. What is happening near me?
2. Which events are popular right now?
3. Are any of my friends attending?
4. What should I do tonight or this weekend?
5. How can I quickly join or save an event?

The experience should prioritize visual event cards, nearby recommendations, social proof, and simple one-tap actions.

---

## Main Navigation

Use a bottom navigation bar with four primary sections:

- **Home**
- **Explore**
- **Messages**
- **Profile**

Optional fifth destinations may be introduced only when strongly justified.

### Home

The Home screen should include:

- Current location
- Notification shortcut
- Featured event card
- Friends or creators carousel
- Search field
- Nearby event sections
- Trending events
- Recommended categories

### Explore

The Explore screen should include:

- Search
- Filter button
- Horizontal category chips
- Featured event grid or carousel
- Trending events
- Nearby events
- Date filters
- Location filters
- Personalized recommendations

### Bookings

The Bookings screen should include:

- Upcoming events
- Saved events
- Past events
- Ticket or booking details
- Calendar integration
- Cancellation or transfer options when supported

### Profile

The Profile screen should include:

- Avatar
- Name and short bio
- Following and follower counts
- Interests
- Saved events
- Hosted events
- Reviews or attendance history
- Settings

---

## Event Detail Page

The event detail page should be immersive and visually dominant.

### Structure

1. Large hero image
2. Floating back, favorite, and overflow controls
3. Event category
4. Event title
5. Short description
6. Attendee avatar stack
7. Location, date, and time
8. Sticky tab navigation
9. Event schedule
10. About section
11. Member list
12. Fixed bottom action bar

### Tabs

Use a compact segmented tab row:

- Schedule
- Feed
- About
- Members

### Primary Action

The main action should remain visible near the bottom:

- Join
- Book
- Get Ticket
- RSVP

Use one clear action depending on the event type.

---

## Visual Direction

### General Style

The design should feel:

- Premium
- Minimal
- Social
- Friendly
- Energetic
- Modern
- Mobile-native

Avoid overly corporate layouts, dense information, harsh borders, and excessive color usage.

### Visual Hierarchy

Use:

- Large imagery for emotional impact
- Strong event titles
- Small muted metadata
- Rounded cards
- Soft shadows
- Compact chips
- Avatar stacks for social proof
- Purple as the main accent
- Black and off-white as the primary neutrals

### Color Palette

Use a restrained palette.

```css
:root {
  --background: #F7F7F8;
  --surface: #FFFFFF;
  --surface-dark: #0B0B0D;
  --text-primary: #111114;
  --text-secondary: #6F7178;
  --text-inverse: #FFFFFF;
  --border: #E8E8EC;
  --accent: #7C3AED;
  --accent-light: #A78BFA;
  --accent-soft: #F0E9FF;
  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
}
```

Do not introduce additional brand colors unless required by event categories.

### Dark Event Detail Variant

For immersive event detail pages, allow a dark surface:

```css
--event-detail-background: #09090B;
--event-detail-surface: #151519;
--event-detail-text: #FFFFFF;
--event-detail-muted: #B8B8C0;
```

---

## Typography

Use a modern sans-serif such as:

- Inter
- SF Pro
- Geist
- Manrope

### Type Scale

- Display title: 28–34px, 700
- Screen title: 22–26px, 700
- Card title: 16–20px, 600
- Body: 14–16px, 400
- Metadata: 12–13px, 400–500
- Button text: 14–16px, 600

Use tight line heights for headings and comfortable spacing for body text.

---

## Spacing System

Use an 8-point spacing system.

```txt
4px   micro spacing
8px   compact spacing
12px  small spacing
16px  standard spacing
24px  section spacing
32px  large section spacing
40px  screen separation
```

Screen horizontal padding should usually be 16px or 20px.

---

## Border Radius

Use generous radii throughout.

```txt
8px   small chips and controls
12px  compact cards
16px  standard cards
20px  featured cards
24px  large surfaces
999px pills and avatars
```

Do not mix many unrelated radius values.

---

## Shadows

Use soft shadows instead of visible borders.

```css
box-shadow:
  0 8px 30px rgba(17, 17, 20, 0.08),
  0 2px 8px rgba(17, 17, 20, 0.05);
```

Featured cards may use a slightly stronger shadow. Avoid heavy black shadows.

---

## Event Cards

### Featured Event Card

A featured event card should contain:

- Large image
- Small category badge
- Event title
- Location
- Date
- Time
- Attendee avatars
- Favorite action
- Join button

The image should occupy most of the card.

Use a subtle gradient overlay to maintain text contrast.

### Compact Event Card

A compact event card should contain:

- Thumbnail
- Category badge
- Event title
- Short description
- Avatar stack
- Date or attendance count

Use these in vertical lists.

### Horizontal Event Card

Use for carousels and featured recommendations.

Recommended ratio:

```txt
width: 240–280px
image ratio: 4:3
```

### Event Card Behavior

- Entire card is clickable
- Favorite should not trigger navigation
- Join should provide immediate feedback
- Hover is optional for web
- Press state is required for mobile
- Images should lazy-load
- Skeleton loading should match final geometry

---

## Avatar System

Use circular avatars with thin white borders when stacked.

```txt
size small: 24px
size medium: 32px
size large: 44px
overlap: 8px
```

Show a final count bubble such as `+12` when more users are attending.

Avatar stacks should communicate social activity without consuming too much space.

---

## Buttons

### Primary Button

- Purple gradient or solid accent
- White text
- Rounded pill shape
- Minimum height: 48px
- Strong contrast
- Full width when used as a bottom CTA

Example:

```css
background: linear-gradient(135deg, #8B5CF6, #6D28D9);
```

### Secondary Button

- Neutral surface
- Subtle border
- Dark text
- Rounded pill shape

### Icon Button

- Circular
- 40–44px
- Semi-transparent surface on images
- Blur backdrop when used on hero media

---

## Search and Filters

The search field should be rounded, compact, and visually calm.

It should include:

- Search icon
- Placeholder such as `Find events`
- Optional voice or filter action
- Clear button while typing

Filters may include:

- Date
- Distance
- Category
- Price
- Popularity
- Friends attending
- Accessibility
- Indoor or outdoor

Prefer bottom sheets over full filter pages on mobile.

---

## Categories

Use short labels such as:

- Music
- Nightlife
- Art
- Food
- Sports
- Community
- Workshops
- Outdoors
- Tech
- Culture

Categories may use small icons, but icon style must remain consistent.

Do not use more than one accent color per category chip.

---

## Motion

Motion should be subtle and purposeful.

Use:

- 150–220ms transitions
- Slight image scale on card press
- Spring animation for favorite actions
- Smooth bottom sheet transitions
- Shared-element transition from event card to event detail where supported
- Fade and slide for loading content

Avoid decorative animation that delays interaction.

---

## Interaction Principles

1. Users should reach an event detail page in one tap.
2. Joining an event should require no more than two steps.
3. Social proof should be visible but never overpower event content.
4. Primary actions should remain reachable with one hand.
5. Search and filters should be available early.
6. Important event metadata should never depend only on icons.
7. Saved and joined states must be visually obvious.

---

## Mobile Layout Rules

Design for 390px width first.

Support:

- 320px minimum width
- Safe areas
- Dynamic text
- Large tap targets
- Bottom navigation
- Sticky CTA
- Scroll restoration

Recommended tap target size:

```txt
minimum: 44 × 44px
preferred: 48 × 48px
```

---

## Responsive Web Behavior

On tablet and desktop:

- Keep the mobile visual language
- Use a centered content container
- Expand event grids
- Preserve rounded cards
- Move filters into a side panel when useful
- Keep event detail content below a wide hero
- Avoid stretching cards beyond readable widths

Suggested breakpoints:

```txt
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

---

## Suggested Data Model

```ts
type Event = {
  id: string
  title: string
  description: string
  category: EventCategory
  coverImage: string
  gallery?: string[]
  location: {
    name: string
    city: string
    country?: string
    latitude?: number
    longitude?: number
  }
  startsAt: string
  endsAt?: string
  timezone: string
  price?: {
    amount: number
    currency: string
    label?: string
  }
  capacity?: number
  attendeeCount: number
  attendeesPreview: UserPreview[]
  organizer: Organizer
  schedule?: ScheduleItem[]
  tags?: string[]
  isFeatured?: boolean
  isSaved?: boolean
  isJoined?: boolean
}

type UserPreview = {
  id: string
  name: string
  avatarUrl: string
}

type Organizer = {
  id: string
  name: string
  avatarUrl?: string
  verified?: boolean
}

type ScheduleItem = {
  id: string
  title: string
  description?: string
  startsAt: string
  endsAt?: string
  location?: string
}
```

---

## Recommended Screens

Implement these screens first:

1. Splash or onboarding
2. Location permission
3. Home
4. Explore
5. Search results
6. Event detail
7. Booking or RSVP flow
8. Booking confirmation
9. Bookings
10. Profile
11. Organizer profile
12. Notifications

---

## Empty States

Empty states must be useful.

Examples:

### No Nearby Events

- Friendly illustration or icon
- Clear explanation
- Increase search radius action
- Change date action
- Browse online events action

### No Bookings

- Message: `You have no upcoming events`
- CTA: `Explore events`

### No Search Results

- Preserve the search query
- Suggest removing filters
- Show nearby alternatives
- Avoid dead-end screens

---

## Loading States

Use skeletons that reflect the actual layout.

Do not use a full-screen spinner for normal content loading.

Recommended states:

- Featured card skeleton
- Avatar skeleton
- Event list skeleton
- Detail hero skeleton
- CTA disabled state

---

## Error Handling

Errors should be specific and recoverable.

Examples:

- Location unavailable
- Event sold out
- Booking failed
- Connection lost
- Payment failed
- Event removed
- Session expired

Always provide a next action.

---

## Accessibility

The app must meet WCAG AA where applicable.

Requirements:

- Minimum 4.5:1 text contrast
- Visible focus states
- Semantic headings
- Screen-reader labels for icon buttons
- Do not rely only on color
- Reduced-motion support
- Dynamic type support
- Sufficient touch targets
- Alternative text for event imagery

---

## Copy Style

Use short, conversational interface copy.

Good examples:

- `Find something to do`
- `Trending near you`
- `Friends are going`
- `Join event`
- `Save for later`
- `Only 4 spots left`
- `Happening tonight`

Avoid overly formal language.

---

## Product Tone

The app should feel welcoming, energetic, and socially alive.

The product should not feel like:

- A corporate ticketing dashboard
- A generic marketplace
- A dense calendar application
- A social network feed with events added on top

Events must remain the primary object.

---

## Implementation Guidance

### Frontend

Recommended stack:

- Next.js or React Native with Expo
- TypeScript
- Tailwind CSS or NativeWind
- Framer Motion or Reanimated
- TanStack Query
- Zustand or lightweight context state
- Zod for validation

### Backend

Recommended stack:

- Node.js or NestJS
- PostgreSQL
- Prisma
- Redis for caching and queues
- Object storage for media
- Search service for event discovery
- Maps provider for geolocation

### Component Structure

```txt
components/
  navigation/
  event/
    EventCard
    FeaturedEventCard
    EventAvatarStack
    EventMetadata
    EventSchedule
    EventTabs
  search/
    SearchBar
    FilterSheet
    CategoryChip
  profile/
  booking/
  ui/
    Button
    IconButton
    Badge
    Card
    BottomSheet
    Skeleton
```

---

## Agent Rules

When generating UI:

1. Follow the visual system in this file.
2. Prioritize image-led event discovery.
3. Use purple only as an accent, not as a background everywhere.
4. Keep cards rounded and spacious.
5. Use black or dark detail pages only for immersive event views.
6. Preserve visual consistency across all screens.
7. Prefer reusable components over one-off markup.
8. Do not invent unnecessary dashboard patterns.
9. Keep mobile interactions reachable with one hand.
10. Maintain clear hierarchy between image, title, metadata, and action.
11. Use realistic event data instead of generic placeholders.
12. Avoid excessive gradients, glassmorphism, and neon effects.
13. Do not add decorative elements that compete with event content.
14. Keep bottom navigation persistent on primary screens.
15. Keep the main event CTA sticky on detail pages.

---

## Acceptance Criteria

A successful implementation should:

- Feel visually close to the reference image
- Make event imagery the dominant visual element
- Use a clean white interface with purple accents
- Include social attendee indicators
- Present event metadata clearly
- Provide polished card layouts
- Support a dark immersive event detail screen
- Have consistent spacing and typography
- Work cleanly on mobile
- Be understandable without onboarding
- Allow users to discover and join an event quickly
