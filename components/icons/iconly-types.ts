import { palette } from '@/lib/palette';

export const iconlyIconNames = [
  'ArrowLeft',
  'ArrowOutRightCircleHalf',
  'Bell',
  'Calendar',
  'CalendarWeek',
  'Camera',
  'Check',
  'CheckCircle',
  'ChevronDown',
  'ChevronLeft',
  'ChevronRight',
  'ChevronUp',
  'Clock',
  'Cog',
  'Compass',
  'Cursor',
  'Edit',
  'ExportSquare',
  'Filter',
  'FingerScan',
  'Grid',
  'Group',
  'Heart',
  'History',
  'Home',
  'InfoCircle',
  'Link',
  'ListUl',
  'Location',
  'Menu',
  'MessageCircleDots',
  'Minus',
  'More',
  'Party',
  'Plus',
  'Search',
  'Send',
  'Share',
  'Sparkles',
  'Star',
  'Tag',
  'Ticket',
  'User',
  'UserPlus',
  'X',
] as const;

export type IconlyIconName = (typeof iconlyIconNames)[number];
export type IconlyIconPack = 'basic' | 'filled';
export type IconlyIconWeight = 'bold' | 'fill' | 'light' | 'regular';

export type IconlyIconProps = {
  name: IconlyIconName;
  size?: number;
  color?: string;
  pack?: IconlyIconPack;
  weight?: IconlyIconWeight;
};

export const defaultIconColor = palette.ink;
