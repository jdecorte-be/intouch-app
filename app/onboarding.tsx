import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { SectionLabel } from '@/components/ui/section-label';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  genderOptions,
  hostableCategories,
  languageOptions,
  neighborhoodOptions,
} from '@/lib/event-data';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';
import type { Gender, HostableCategory } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

const MAX_GALLERY_PHOTOS = 6;

type OnboardingStep = {
  key: 'profile' | 'languages' | 'photos' | 'interests' | 'location';
  label: string;
  icon: IconlyIconName;
};

const steps: OnboardingStep[] = [
  { key: 'profile', label: 'Profile', icon: 'User' },
  { key: 'languages', label: 'Languages', icon: 'MessageCircleDots' },
  { key: 'photos', label: 'Photos', icon: 'Camera' },
  { key: 'interests', label: 'Interests', icon: 'Sparkles' },
  { key: 'location', label: 'Location', icon: 'Location' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const completedOnboardingUserIds = useSessionStore((state) => state.completedOnboardingUserIds);
  const completeOnboarding = useSessionStore((state) => state.completeOnboarding);
  const isEditing = Boolean(user && completedOnboardingUserIds.includes(user.id));

  const [stepIndex, setStepIndex] = useState(0);
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(isEditing ? steps.length - 1 : 0);

  const [name, setName] = useState(user?.name ?? '');
  const [ageText, setAgeText] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [languages, setLanguages] = useState<string[]>(user?.languagesSpoken ?? []);
  const [profileImage, setProfileImage] = useState<string | null>(user?.image ?? null);
  const [photos, setPhotos] = useState<string[]>(user?.photos ?? []);
  const [interests, setInterests] = useState<HostableCategory[]>(user?.eventInterests ?? []);
  const [neighborhood, setNeighborhood] = useState(user?.homeNeighborhood ?? '');
  const [homeCoordinates, setHomeCoordinates] = useState<[number, number] | null>(
    user?.homeCoordinates ?? null,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const displayEmail = user?.email ?? '';
  const displayName = useMemo(
    () => name.trim() || displayEmail.replace(/@.*/, '') || 'ReTalk member',
    [displayEmail, name],
  );

  const age = Number.parseInt(ageText, 10);
  const isAgeValid = ageText.trim().length > 0 && Number.isFinite(age) && age >= 13 && age <= 110;

  const stepValidity: Record<OnboardingStep['key'], boolean> = {
    profile: name.trim().length > 0 && isAgeValid && gender !== null,
    languages: languages.length > 0,
    photos: profileImage !== null,
    interests: interests.length > 0,
    location: neighborhood.trim().length > 0,
  };

  const isActiveStepValid = stepValidity[activeStep.key];

  if (!user) {
    return null;
  }

  const toggleLanguage = (value: string) => {
    setLanguages((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleInterest = (value: HostableCategory) => {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const goToStep = (index: number) => {
    if (index <= maxUnlockedIndex) {
      setStepIndex(index);
    }
  };

  const goNext = () => {
    if (!isActiveStepValid || isSubmitting) {
      return;
    }

    if (isLastStep) {
      void finishOnboarding();
      return;
    }

    const nextIndex = Math.min(stepIndex + 1, steps.length - 1);
    setMaxUnlockedIndex((current) => Math.max(current, nextIndex));
    setStepIndex(nextIndex);
  };

  const goBack = () => {
    if (isFirstStep && isEditing) {
      router.back();
      return;
    }

    setStepIndex((current) => Math.max(current - 1, 0));
  };

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

  const detectLocation = async () => {
    setLocationError(null);
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocationError('Location permission was denied. Choose a neighborhood below instead.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const detectedLabel = place?.district || place?.city || place?.subregion || place?.region;

      if (!detectedLabel) {
        setLocationError('Could not determine your neighborhood. Choose one below instead.');
        return;
      }

      setNeighborhood(detectedLabel);
      setHomeCoordinates([position.coords.longitude, position.coords.latitude]);
    } catch {
      setLocationError('Something went wrong finding your location. Choose a neighborhood below instead.');
    } finally {
      setIsLocating(false);
    }
  };

  const selectManualNeighborhood = (option: string) => {
    setHomeCoordinates(null);
    setNeighborhood((current) => (current === option ? '' : option));
  };

  async function finishOnboarding() {
    setIsSubmitting(true);

    try {
      await completeOnboarding({
        name: displayName,
        age,
        gender,
        languagesSpoken: languages,
        image: profileImage,
        photos,
        homeNeighborhood: neighborhood.trim() || null,
        homeCoordinates,
        eventInterests: interests,
      });

      if (isEditing) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch {
      Alert.alert('Something went wrong', "We couldn't save your profile. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View flex={1} backgroundColor={palette.white}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <YStack gap={16}>
            <YStack gap={4}>
              <SectionLabel>{isEditing ? 'Edit profile' : 'Welcome'}</SectionLabel>
              <Text fontSize={28} lineHeight={34} fontWeight="800" color={palette.ink}>
                {isEditing ? 'Update your details.' : 'Tell us about you.'}
              </Text>
              <Text fontSize={14} lineHeight={22} color={palette.gray}>
                {isEditing
                  ? 'Change your basics, photos, interests, and location.'
                  : 'Finish each step to unlock the next one and start with better local matches.'}
              </Text>
            </YStack>

            <XStack gap={6}>
              {steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;
                const isLocked = index > maxUnlockedIndex;

                return (
                  <Pressable
                    key={step.key}
                    style={styles.stepPressable}
                    disabled={isLocked}
                    onPress={() => goToStep(index)}
                  >
                    <XStack
                      height={42}
                      alignItems="center"
                      justifyContent="center"
                      gap={6}
                      borderRadius={12}
                      borderWidth={1}
                      borderColor={isActive ? palette.ink : palette.line}
                      backgroundColor={isActive ? palette.ink : palette.white}
                      paddingHorizontal={8}
                      opacity={isLocked ? 0.45 : 1}
                    >
                      <View
                        width={22}
                        height={22}
                        borderRadius={7}
                        alignItems="center"
                        justifyContent="center"
                        backgroundColor={isActive ? 'rgba(255,255,255,0.14)' : palette.fog}
                      >
                        {isDone ? (
                          <IconlyIcon name="Check" size={13} color={isActive ? palette.white : palette.ink} />
                        ) : (
                          <IconlyIcon name={step.icon} size={13} color={isActive ? palette.white : palette.slate} />
                        )}
                      </View>
                      <Text
                        fontSize={11}
                        fontWeight="800"
                        color={isActive ? palette.white : palette.inkSoft}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </XStack>
                  </Pressable>
                );
              })}
            </XStack>

            <YStack
              minHeight={420}
              borderRadius={20}
              backgroundColor={palette.white}
              borderWidth={1}
              borderColor={palette.line}
              padding={16}
            >
              {activeStep.key === 'profile' ? (
                <ProfileStep
                  name={name}
                  email={displayEmail}
                  ageText={ageText}
                  gender={gender}
                  onNameChange={setName}
                  onAgeChange={setAgeText}
                  onGenderChange={setGender}
                />
              ) : null}

              {activeStep.key === 'languages' ? (
                <LanguagesStep languages={languages} onToggle={toggleLanguage} />
              ) : null}

              {activeStep.key === 'photos' ? (
                <PhotosStep
                  name={displayName}
                  profileImage={profileImage}
                  photos={photos}
                  onPickProfileImage={pickProfileImage}
                  onAddGalleryPhotos={addGalleryPhotos}
                  onRemoveGalleryPhoto={removeGalleryPhoto}
                />
              ) : null}

              {activeStep.key === 'interests' ? (
                <ChoiceStep
                  eyebrow="Interests"
                  title="What should your map surface first?"
                  description="Select the event categories that deserve more space in your feed."
                  options={hostableCategories}
                  selectedValues={interests}
                  onToggle={(value) => toggleInterest(value as HostableCategory)}
                />
              ) : null}

              {activeStep.key === 'location' ? (
                <LocationStep
                  neighborhood={neighborhood}
                  homeCoordinates={homeCoordinates}
                  isLocating={isLocating}
                  locationError={locationError}
                  onDetectLocation={detectLocation}
                  onSelectManualNeighborhood={selectManualNeighborhood}
                />
              ) : null}
            </YStack>

            <XStack alignItems="center" justifyContent="space-between" gap={12}>
              <Pressable
                disabled={isFirstStep && !isEditing}
                onPress={goBack}
                style={[styles.navButton, styles.backButton, isFirstStep && !isEditing && styles.disabledButton]}
              >
                <IconlyIcon name="ArrowLeft" size={16} color={isFirstStep && !isEditing ? palette.muted : palette.ink} />
                <Text fontSize={14} fontWeight="800" color={isFirstStep && !isEditing ? palette.muted : palette.ink}>
                  {isFirstStep && isEditing ? 'Cancel' : 'Back'}
                </Text>
              </Pressable>

              <Pressable
                disabled={!isActiveStepValid || isSubmitting}
                onPress={goNext}
                style={[
                  styles.navButton,
                  styles.nextButton,
                  (!isActiveStepValid || isSubmitting) && styles.disabledButton,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={palette.white} />
                ) : (
                  <>
                    <Text fontSize={14} fontWeight="800" color={palette.white}>
                      {isLastStep ? (isEditing ? 'Save changes' : 'Finish setup') : 'Next'}
                    </Text>
                    <IconlyIcon name={isLastStep ? 'Check' : 'ChevronRight'} size={16} color={palette.white} />
                  </>
                )}
              </Pressable>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ProfileStep({
  name,
  email,
  ageText,
  gender,
  onNameChange,
  onAgeChange,
  onGenderChange,
}: {
  name: string;
  email: string;
  ageText: string;
  gender: Gender | null;
  onNameChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onGenderChange: (value: Gender) => void;
}) {
  return (
    <YStack gap={18}>
      <StepHeader eyebrow="Profile" title="Start with the basics." description={email} />

      <YStack gap={12}>
        <YStack gap={8}>
          <Text fontSize={13} fontWeight="800" color={palette.ink}>
            First name
          </Text>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Your first name"
            placeholderTextColor={palette.muted}
            style={styles.input}
          />
        </YStack>

        <YStack gap={8}>
          <Text fontSize={13} fontWeight="800" color={palette.ink}>
            Age
          </Text>
          <TextInput
            value={ageText}
            onChangeText={(value) => onAgeChange(value.replace(/[^0-9]/g, '').slice(0, 3))}
            placeholder="Your age"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            maxLength={3}
            style={styles.input}
          />
        </YStack>
      </YStack>

      <YStack gap={10}>
        <Text fontSize={13} fontWeight="800" color={palette.ink}>
          Gender
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {genderOptions.map((option) => (
            <ChoiceChip
              key={option.value}
              label={option.label}
              isSelected={gender === option.value}
              onPress={() => onGenderChange(option.value)}
            />
          ))}
        </XStack>
      </YStack>
    </YStack>
  );
}

function LanguagesStep({
  languages,
  onToggle,
}: {
  languages: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <YStack gap={18}>
      <StepHeader
        eyebrow="Languages"
        title="Which languages do you speak?"
        description="Pick every language you're comfortable chatting in — this helps us match you with the right people."
      />

      <XStack flexWrap="wrap" gap={8}>
        {languageOptions.map((option) => (
          <ChoiceChip
            key={option}
            label={option}
            isSelected={languages.includes(option)}
            onPress={() => onToggle(option)}
          />
        ))}
      </XStack>
    </YStack>
  );
}

function PhotosStep({
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
    <YStack gap={18}>
      <StepHeader
        eyebrow="Photos"
        title="Add a profile picture."
        description="Choose a clear photo of yourself so people recognize you at events."
      />

      <XStack alignItems="center" gap={16}>
        <UserAvatar label={name} image={profileImage} size={84} borderWidth={2} borderColor={palette.line} />
        <YStack gap={8} flex={1}>
          <Pressable style={styles.photoActionButton} onPress={() => onPickProfileImage('camera')}>
            <IconlyIcon name="Camera" size={16} color={palette.ink} />
            <Text fontSize={13} fontWeight="800" color={palette.ink}>
              Take photo
            </Text>
          </Pressable>
          <Pressable style={styles.photoActionButton} onPress={() => onPickProfileImage('library')}>
            <IconlyIcon name="Plus" size={16} color={palette.ink} />
            <Text fontSize={13} fontWeight="800" color={palette.ink}>
              Choose from library
            </Text>
          </Pressable>
        </YStack>
      </XStack>

      <YStack gap={10}>
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontSize={13} fontWeight="800" color={palette.ink}>
            More photos (optional)
          </Text>
          <Text fontSize={12} color={palette.muted}>
            {photos.length}/{MAX_GALLERY_PHOTOS}
          </Text>
        </XStack>

        <XStack flexWrap="wrap" gap={10}>
          {photos.map((uri) => (
            <View key={uri} width={76} height={76} borderRadius={14} overflow="hidden">
              <Image source={uri} style={{ width: 76, height: 76 }} contentFit="cover" />
              <Pressable style={styles.removePhotoButton} onPress={() => onRemoveGalleryPhoto(uri)}>
                <IconlyIcon name="X" size={12} color={palette.white} />
              </Pressable>
            </View>
          ))}

          {photos.length < MAX_GALLERY_PHOTOS ? (
            <Pressable style={styles.addPhotoTile} onPress={onAddGalleryPhotos}>
              <IconlyIcon name="Plus" size={20} color={palette.slate} />
            </Pressable>
          ) : null}
        </XStack>
      </YStack>
    </YStack>
  );
}

function LocationStep({
  neighborhood,
  homeCoordinates,
  isLocating,
  locationError,
  onDetectLocation,
  onSelectManualNeighborhood,
}: {
  neighborhood: string;
  homeCoordinates: [number, number] | null;
  isLocating: boolean;
  locationError: string | null;
  onDetectLocation: () => void;
  onSelectManualNeighborhood: (option: string) => void;
}) {
  return (
    <YStack gap={18}>
      <StepHeader
        eyebrow="Location"
        title="Where are you based?"
        description="Share your location so we can show you what's happening nearby, or pick a neighborhood manually."
      />

      <Pressable style={styles.locationButton} onPress={onDetectLocation} disabled={isLocating}>
        {isLocating ? (
          <ActivityIndicator color={palette.white} />
        ) : (
          <IconlyIcon name="Location" size={16} color={palette.white} />
        )}
        <Text fontSize={14} fontWeight="800" color={palette.white}>
          {isLocating ? 'Finding you…' : 'Use my current location'}
        </Text>
      </Pressable>

      {neighborhood ? (
        <XStack alignItems="center" gap={8}>
          <IconlyIcon name="CheckCircle" size={16} color={palette.green} />
          <Text fontSize={13} fontWeight="700" color={palette.ink}>
            {homeCoordinates ? `Detected: ${neighborhood}` : neighborhood}
          </Text>
        </XStack>
      ) : null}

      {locationError ? (
        <Text fontSize={12} color={palette.dangerText}>
          {locationError}
        </Text>
      ) : null}

      <YStack gap={10}>
        <Text fontSize={13} fontWeight="800" color={palette.ink}>
          Or choose a neighborhood
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {neighborhoodOptions.map((option) => (
            <ChoiceChip
              key={option}
              label={option}
              isSelected={neighborhood === option}
              onPress={() => onSelectManualNeighborhood(option)}
            />
          ))}
        </XStack>
      </YStack>
    </YStack>
  );
}

function ChoiceStep({
  eyebrow,
  title,
  description,
  options,
  selectedValues,
  onToggle,
}: {
  eyebrow: string;
  title: string;
  description: string;
  options: { value?: string; id?: string; label: string; emoji: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <YStack gap={18}>
      <StepHeader eyebrow={eyebrow} title={title} description={description} />

      <YStack gap={10}>
        {options.map((option) => {
          const value = option.value ?? option.id ?? option.label;
          const isSelected = selectedValues.includes(value);

          return (
            <Pressable key={value} onPress={() => onToggle(value)}>
              <XStack
                minHeight={58}
                alignItems="center"
                justifyContent="space-between"
                gap={12}
                borderRadius={14}
                borderWidth={1}
                borderColor={isSelected ? palette.ink : palette.line}
                backgroundColor={isSelected ? palette.ink : palette.white}
                paddingHorizontal={12}
                paddingVertical={10}
              >
                <XStack flex={1} minWidth={0} alignItems="center" gap={10}>
                  <View
                    width={36}
                    height={36}
                    borderRadius={10}
                    alignItems="center"
                    justifyContent="center"
                    backgroundColor={isSelected ? 'rgba(255,255,255,0.14)' : palette.fog}
                  >
                    <Text fontSize={18}>{option.emoji}</Text>
                  </View>
                  <Text
                    flex={1}
                    minWidth={0}
                    fontSize={14}
                    fontWeight="800"
                    color={isSelected ? palette.white : palette.ink}
                    numberOfLines={1}
                  >
                    {option.label}
                  </Text>
                </XStack>
                {isSelected ? <IconlyIcon name="Check" size={18} color={palette.white} /> : null}
              </XStack>
            </Pressable>
          );
        })}
      </YStack>
    </YStack>
  );
}

function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <YStack gap={6}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <Text fontSize={22} lineHeight={28} fontWeight="800" color={palette.ink}>
        {title}
      </Text>
      <Text fontSize={14} lineHeight={22} color={palette.gray}>
        {description}
      </Text>
    </YStack>
  );
}

function ChoiceChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <XStack
        height={36}
        alignItems="center"
        borderRadius={999}
        paddingHorizontal={13}
        backgroundColor={isSelected ? palette.ink : palette.fog}
        borderWidth={1}
        borderColor={isSelected ? palette.ink : palette.line}
      >
        <Text fontSize={13} fontWeight="800" color={isSelected ? palette.white : palette.inkSoft}>
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stepPressable: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    ...appTextInputStyle,
    minHeight: 46,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    backgroundColor: palette.white,
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navButton: {
    minHeight: 46,
    minWidth: 112,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  backButton: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
  },
  nextButton: {
    backgroundColor: palette.ink,
  },
  disabledButton: {
    opacity: 0.45,
  },
  photoActionButton: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(17,17,20,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoTile: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.line,
    backgroundColor: palette.fog,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: palette.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
