import type { ImageSource } from 'expo-image';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { getAvatarAccent, getUserInitials, palette } from '@/lib/palette';

export function UserAvatar({
  label,
  image,
  size = 36,
  borderColor,
  borderWidth = 0,
  accentColor,
  initialsOverride,
}: {
  label: string;
  image?: ImageSource | string | number | null;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  accentColor?: string;
  initialsOverride?: string;
}) {
  const [failedImage, setFailedImage] = useState<ImageSource | string | number | null>(null);

  if (image && image !== failedImage) {
    return (
      <Image
        source={image}
        style={{ width: size, height: size, borderRadius: size / 2, borderColor, borderWidth }}
        contentFit="cover"
        onError={() => setFailedImage(image)}
      />
    );
  }

  return (
    <View
      width={size}
      height={size}
      borderRadius={size / 2}
      alignItems="center"
      justifyContent="center"
      style={{ backgroundColor: accentColor ?? getAvatarAccent(label), borderColor, borderWidth }}
    >
      <Text color={palette.white} fontWeight="700" fontSize={size * 0.32}>
        {initialsOverride ?? getUserInitials(label)}
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
