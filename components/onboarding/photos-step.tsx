import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';

import { MAX_GALLERY_PHOTOS } from './onboarding-steps';
import { dark, onboardingStyles } from './onboarding-styles';

export function PhotosStep({
  name,
  profileImage,
  photos,
  onPickProfileImage,
  onAddGalleryPhotos,
  onRemoveGalleryPhoto,
}: {
  name: string;
  profileImage: string | null;
  photos: string[];
  onPickProfileImage: (source: 'camera' | 'library') => void;
  onAddGalleryPhotos: () => void;
  onRemoveGalleryPhoto: (uri: string) => void;
}) {
  return (
    <YStack gap={20}>
      <XStack alignItems="center" gap={16}>
        <UserAvatar label={name} image={profileImage} size={84} borderWidth={2} borderColor="rgba(255,255,255,0.2)" />
        <YStack gap={8} flex={1}>
          <Pressable style={onboardingStyles.photoActionButton} onPress={() => onPickProfileImage('camera')}>
            <IconlyIcon name="Camera" size={16} color={dark.textPrimary} />
            <Text fontSize={13} fontWeight="800" color={dark.textPrimary}>
              Take photo
            </Text>
          </Pressable>
          <Pressable style={onboardingStyles.photoActionButton} onPress={() => onPickProfileImage('library')}>
            <IconlyIcon name="Plus" size={16} color={dark.textPrimary} />
            <Text fontSize={13} fontWeight="800" color={dark.textPrimary}>
              Choose from library
            </Text>
          </Pressable>
        </YStack>
      </XStack>

      <YStack gap={10}>
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={13} fontWeight="800" color={dark.textSecondary}>
            More photos (optional)
          </Text>
          <Text fontSize={12} color={dark.textMuted}>
            {photos.length}/{MAX_GALLERY_PHOTOS}
          </Text>
        </XStack>

        <XStack flexWrap="wrap" gap={10}>
          {photos.map((uri) => (
            <View key={uri} width={76} height={76} borderRadius={14} overflow="hidden">
              <Image source={uri} style={{ width: 76, height: 76 }} contentFit="cover" />
              <Pressable style={onboardingStyles.removePhotoButton} onPress={() => onRemoveGalleryPhoto(uri)}>
                <IconlyIcon name="X" size={12} color={dark.textPrimary} />
              </Pressable>
            </View>
          ))}

          {photos.length < MAX_GALLERY_PHOTOS ? (
            <Pressable style={onboardingStyles.addPhotoTile} onPress={onAddGalleryPhotos}>
              <IconlyIcon name="Plus" size={20} color={dark.textSecondary} />
            </Pressable>
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
}
