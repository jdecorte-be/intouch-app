import { Linking, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { buildLocationShareUrl, type SharedLocation } from '@/lib/location-share';
import { palette } from '@/lib/palette';

export function LocationMessageCard({ location, fromSelf }: { location: SharedLocation; fromSelf: boolean }) {
  const open = () => {
    Linking.openURL(buildLocationShareUrl(location.latitude, location.longitude)).catch(() => {});
  };

  return (
    <Pressable onPress={open}>
      <XStack alignItems="center" gap={10} minWidth={200}>
        <XStack
          width={38}
          height={38}
          borderRadius={19}
          alignItems="center"
          justifyContent="center"
          backgroundColor={fromSelf ? 'rgba(255,255,255,0.16)' : palette.primarySoft}
        >
          <IconlyIcon name="Location" size={18} color={fromSelf ? palette.white : palette.primary} />
        </XStack>
        <YStack gap={2}>
          <Text fontSize={13} fontWeight="700" color={fromSelf ? palette.white : palette.ink}>
            Shared location
          </Text>
          <Text fontSize={12} fontWeight="600" color={fromSelf ? 'rgba(255,255,255,0.7)' : palette.gray}>
            View on map
          </Text>
        </YStack>
      </XStack>
    </Pressable>
  );
}
