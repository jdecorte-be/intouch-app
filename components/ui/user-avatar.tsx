import { Image } from 'expo-image';
import { Text, View } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { getAvatarAccent, getUserInitials, palette } from '@/lib/palette';

export function UserAvatar({
  label,
  image,
  size = 36,
  borderColor,
  borderWidth = 0,
}: {
  label: string;
  image?: string | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
}) {
  if (image) {
    return (
      <Image
        source={image}
        style={{ width: size, height: size, borderRadius: size / 2, borderColor, borderWidth }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor={getAvatarAccent(label)}
      alignItems="center"
      justifyContent="center"
      style={{ borderColor, borderWidth }}
    >
      <Text color="white" fontWeight="700" fontSize={size * 0.32}>
        {getUserInitials(label)}
      </Text>
    </View>
  );
}

export function GuestAvatar({
  size = 36,
  borderColor,
  borderWidth = 0,
}: {
  size?: number;
  borderColor?: string;
  borderWidth?: number;
}) {
  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor={palette.ink}
      alignItems="center"
      justifyContent="center"
      style={{ borderColor, borderWidth }}
    >
      <IconlyIcon name="User" size={size * 0.45} color="white" />
    </View>
  );
}

export function AvatarGroup({
  labels,
  size = 24,
}: {
  labels: { label: string; image?: string | null }[];
  size?: number;
}) {
  return (
    <View flexDirection="row">
      {labels.map(({ label, image }, index) => (
        <View
          key={`${label}-${index}`}
          marginLeft={index === 0 ? 0 : -size * 0.3}
          borderWidth={2}
          borderColor="white"
          borderRadius={(size + 4) / 2}
        >
          <UserAvatar label={label} image={image} size={size} />
        </View>
      ))}
    </View>
  );
}
