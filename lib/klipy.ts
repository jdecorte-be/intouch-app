import { storage } from '@/lib/storage';
import { useSessionStore } from '@/stores/session-store';

// Klipy's REST shape (verified against KLIPY-com/klipy-android-demo-app's DTOs,
// since docs.klipy.com blocks non-browser fetches): the API key lives in the
// path, GIFs/stickers/clips are otherwise identical endpoints under
// /<gifs|stickers|clips>/..., and paged responses carry data.has_next.
//
// GIF and sticker items nest file variants as file.<hd|md|sm|xs>.<gif|webp|mp4>
// (each a { url, width, height, size }). Clip items are flatter: file.<gif|mp4|webp>
// is a direct URL, with dimensions in the parallel file_meta.<gif|webp|mp4>.
const KLIPY_API_KEY = process.env.EXPO_PUBLIC_KLIPY_API_KEY;
const PER_PAGE = 30;
const CUSTOMER_ID_STORAGE_KEY = 'klipy-customer-id';

export type KlipyMediaType = 'gifs' | 'stickers' | 'clips';

export type KlipyMediaItem = {
  id: string;
  previewUrl: string;
  sendUrl: string;
  // width / height, clamped to keep the masonry grid from producing
  // slivers or towers when a result is unusually wide or tall.
  aspectRatio: number;
};

export type KlipyPage = {
  results: KlipyMediaItem[];
  hasNext: boolean;
};

function klipyBaseUrl(mediaType: KlipyMediaType) {
  return `https://api.klipy.com/api/v1/${KLIPY_API_KEY}/${mediaType}`;
}

function clampAspectRatio(width?: number | null, height?: number | null) {
  if (!width || !height) {
    return 1;
  }

  return Math.min(1.6, Math.max(0.6, width / height));
}

function toGeneralItem(raw: any): KlipyMediaItem | null {
  const files = raw?.file;
  const preview = files?.sm?.gif ?? files?.xs?.gif ?? files?.md?.gif;
  const send = files?.md?.gif ?? files?.hd?.gif ?? preview;

  if (!raw?.slug || !preview?.url || !send?.url) {
    return null;
  }

  return {
    id: raw.slug,
    previewUrl: preview.url,
    sendUrl: send.url,
    aspectRatio: clampAspectRatio(preview.width, preview.height),
  };
}

function toClipItem(raw: any): KlipyMediaItem | null {
  const url: string | undefined = raw?.file?.gif ?? raw?.file?.webp;
  const dims = raw?.file_meta?.gif ?? raw?.file_meta?.webp;

  if (!raw?.slug || !url) {
    return null;
  }

  return {
    id: raw.slug,
    previewUrl: url,
    sendUrl: url,
    aspectRatio: clampAspectRatio(dims?.width, dims?.height),
  };
}

function toKlipyItem(mediaType: KlipyMediaType, raw: any): KlipyMediaItem | null {
  return mediaType === 'clips' ? toClipItem(raw) : toGeneralItem(raw);
}

export function isKlipyConfigured() {
  return Boolean(KLIPY_API_KEY);
}

// Klipy uses this to personalize results and to attribute the share-tracking
// calls below to a single caller. It doesn't need to be a real account id,
// just stable per device, so signed-out sessions get a persisted random one.
export function getKlipyCustomerId() {
  const sessionUserId = useSessionStore.getState().user?.id;

  if (sessionUserId) {
    return sessionUserId;
  }

  const stored = storage.getString(CUSTOMER_ID_STORAGE_KEY);

  if (stored) {
    return stored;
  }

  const generated = `intouch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  storage.set(CUSTOMER_ID_STORAGE_KEY, generated);

  return generated;
}

async function fetchKlipyPage(mediaType: KlipyMediaType, endpoint: string): Promise<KlipyPage> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Klipy request failed: ${response.status}`);
  }

  const body = await response.json();
  const results = (body?.data?.data ?? [])
    .map((raw: any) => toKlipyItem(mediaType, raw))
    .filter(Boolean) as KlipyMediaItem[];
  const hasNext = Boolean(body?.data?.has_next);

  return { results, hasNext };
}

export function fetchTrendingMedia(mediaType: KlipyMediaType, page: number): Promise<KlipyPage> {
  return fetchKlipyPage(mediaType, `${klipyBaseUrl(mediaType)}/trending?page=${page}&per_page=${PER_PAGE}`);
}

export function searchMedia(mediaType: KlipyMediaType, query: string, page: number): Promise<KlipyPage> {
  return fetchKlipyPage(
    mediaType,
    `${klipyBaseUrl(mediaType)}/search?q=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}`,
  );
}

// Klipy's monetization model is pay-per-share: this call is what actually
// attributes usage to our API key, so it needs to fire whenever an item is
// sent. Fire-and-forget, a flaky network here shouldn't block the send.
export function reportMediaShare(mediaType: KlipyMediaType, slug: string) {
  if (!KLIPY_API_KEY) {
    return;
  }

  fetch(`${klipyBaseUrl(mediaType)}/share/${encodeURIComponent(slug)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: getKlipyCustomerId() }),
  }).catch(() => {});
}
