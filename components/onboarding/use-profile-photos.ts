import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';

import { MAX_GALLERY_PHOTOS } from './onboarding-steps';

// Owns the profile picture and gallery, including the permission prompts.
export function useProfilePhotos(initial: { image: string | null; photos: string[] }) {
  const [profileImage, setProfileImage] = useState<string | null>(initial.image);
  const [photos, setPhotos] = useState<string[]>(initial.photos);

  const pickProfileImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access to take a profile picture.'
          : 'Allow photo library access to choose a profile picture.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const addGalleryPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add photos to your profile.');
      return;
    }

    const remainingSlots = MAX_GALLERY_PHOTOS - photos.length;

    if (remainingSlots <= 0) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_GALLERY_PHOTOS));
    }
  };

  const removeGalleryPhoto = (uri: string) => {
    setPhotos((current) => current.filter((item) => item !== uri));
  };

  return { profileImage, photos, pickProfileImage, addGalleryPhotos, removeGalleryPhoto };
}
