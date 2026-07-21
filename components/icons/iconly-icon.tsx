import * as Iconsax from 'iconsax-react-native';
import type { Icon, IconProps } from 'iconsax-react-native';

import { defaultIconColor, type IconlyIconName, type IconlyIconProps } from '@/components/icons/iconly-types';

const iconMap = {
  ArrowLeft: Iconsax.ArrowLeft,
  ArrowOutRightCircleHalf: Iconsax.ExportCircle,
  Bell: Iconsax.Notification,
  Calendar: Iconsax.Calendar,
  CalendarWeek: Iconsax.Calendar2,
  Camera: Iconsax.Camera,
  Check: Iconsax.TickCircle,
  CheckCircle: Iconsax.TickCircle,
  ChevronDown: Iconsax.ArrowDown2,
  ChevronLeft: Iconsax.ArrowLeft2,
  ChevronRight: Iconsax.ArrowRight2,
  ChevronUp: Iconsax.ArrowUp2,
  Clock: Iconsax.Clock,
  Cog: Iconsax.Setting2,
  Compass: Iconsax.Discover,
  Cursor: Iconsax.DirectUp,
  Edit: Iconsax.Edit,
  ExportSquare: Iconsax.ExportSquare,
  Filter: Iconsax.Filter,
  FingerScan: Iconsax.FingerScan,
  Grid: Iconsax.Grid5,
  Group: Iconsax.People,
  Heart: Iconsax.Heart,
  History: Iconsax.Refresh2,
  Home: Iconsax.Home,
  InfoCircle: Iconsax.InfoCircle,
  Link: Iconsax.Link,
  ListUl: Iconsax.Category,
  Location: Iconsax.Location,
  Menu: Iconsax.HambergerMenu,
  MessageCircleDots: Iconsax.MessageText,
  Minus: Iconsax.MinusCirlce,
  More: Iconsax.More,
  Party: Iconsax.MagicStar,
  Plus: Iconsax.Add,
  Search: Iconsax.SearchNormal1,
  Send: Iconsax.Send2,
  Share: Iconsax.Share,
  Sparkles: Iconsax.MagicStar,
  Star: Iconsax.Star,
  Tag: Iconsax.Tag,
  Ticket: Iconsax.Ticket,
  User: Iconsax.User,
  UserPlus: Iconsax.UserAdd,
  X: Iconsax.CloseCircle,
} as const satisfies Record<IconlyIconName, Icon>;

function iconVariant(pack: IconlyIconProps['pack'], weight: IconlyIconProps['weight']): IconProps['variant'] {
  if (weight === 'fill' || weight === 'bold' || pack === 'filled') {
    return 'Bold';
  }

  if (weight === 'light') {
    return 'Outline';
  }

  return 'Linear';
}

export type { IconlyIconName, IconlyIconProps };

export function IconlyIcon({
  name,
  size = 20,
  color = defaultIconColor,
  pack = 'basic',
  weight,
}: IconlyIconProps) {
  const IconComponent = iconMap[name];

  return <IconComponent size={size} color={color} variant={iconVariant(pack, weight)} />;
}
