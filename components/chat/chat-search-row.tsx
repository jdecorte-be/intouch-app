import type { ImageSource } from 'expo-image';
import { Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';

export function ChatSearchRow({
  avatarLabel,
  avatarImage,
  avatarAccent,
  avatarInitials,
  title,
  subtitle,
  icon,
  onPress,
}: {
  avatarLabel: string;
  avatarImage?: ImageSource | string | number | null;
  avatarAccent?: string;
  avatarInitials?: string;
  title: string;
  subtitle: string;
  icon: IconlyIconName;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <XStack alignItems="center" gap={12} borderRadius={18} padding={10}>
        <UserAvatar
          label={avatarLabel}
          image={avatarImage}
          accentColor={avatarAccent}
          initialsOverride={avatarInitials}
          size={48}
        />
        <YStack flex={1} minWidth={0} gap={3}>
          <Text fontSize={14} fontWeight="800" color={palette.ink} numberOfLines={1}>
            {title}
          </Text>
          <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
            {subtitle}
          </Text>
        </YStack>
        <IconlyIcon name={icon} size={18} color={palette.primary} />
      </XStack>
    </Pressable>
  );
}
