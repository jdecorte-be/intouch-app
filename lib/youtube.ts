const YOUTUBE_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i;

export function extractYouTubeVideoId(text: string): string | null {
  return text.match(YOUTUBE_URL_PATTERN)?.[1] ?? null;
}

export function youTubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;
}
