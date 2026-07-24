// InTouch brand palette, lifted from the web app's tailwind styles.
export const palette = {
  ink: '#292f36',
  inkSoft: '#3a434d',
  navBar: '#22262b',
  slate: '#565a63',
  gray: '#6e7178',
  silver: '#82868e',
  muted: '#9a9ea6',
  fog: '#f3f3f4',
  line: '#eceef2',
  border: 'rgba(41,47,54,0.1)',
  borderStrong: 'rgba(41,47,54,0.12)',
  mist: '#ffffff',
  mapWater: '#ffffff',
  white: '#ffffff',
  coral: '#ff6b6b',
  coralSoft: '#ffecec',
  coralText: '#b44747',
  teal: '#4ecdc4',
  tealSoft: '#e3f8f6',
  tealText: '#24645f',
  green: '#347d6f',
  warn: '#f2a541',
  warnSoft: '#fff0df',
  warnText: '#9b4e08',
  danger: '#ef4444',
  dangerText: '#b91c1c',
  dangerSoft: '#fef2f2',
  primary: '#8975fe',
  primaryEnd: '#9d8cff',
  primarySoft: '#f2efff',
  primaryGradient: ['#8975fe', '#9d8cff'],
  accent: '#8975fe',
  accentEnd: '#9d8cff',
  accentSoft: '#f2efff',
} as const;

export const avatarAccents = [
  '#ff6b6b',
  '#4ecdc4',
  '#5b6b82',
  '#7d6f62',
  '#4d7d6d',
  '#6f5f7f',
  '#d56f5f',
] as const;

function hashLabel(label: string) {
  let hash = 0;

  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

export function getAvatarAccent(label: string) {
  return avatarAccents[hashLabel(label) % avatarAccents.length];
}

// Diagonal gradient pairs for generated cover banners (profiles without a
// photo), built from the brand palette so a "random" banner still looks
// intentional rather than arbitrary.
export const bannerGradients: readonly [string, string][] = [
  ['#8975fe', '#4ecdc4'],
  ['#ff6b6b', '#f2a541'],
  ['#4ecdc4', '#8975fe'],
  ['#347d6f', '#4ecdc4'],
  ['#8975fe', '#ff6b6b'],
  ['#f2a541', '#8975fe'],
  ['#4ecdc4', '#347d6f'],
  ['#9d8cff', '#ff6b6b'],
] as const;

export function getBannerGradient(label: string) {
  return bannerGradients[hashLabel(label) % bannerGradients.length];
}

export function getUserInitials(label: string) {
  const parts = label
    .replace(/@.*$/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);

  if (!parts.length) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
