import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { CompactCategoryGrid } from '@/components/onboarding/compact-category-grid';
import { LanguagesStep } from '@/components/onboarding/languages-step';
import { LocationStep } from '@/components/onboarding/location-step';
import { isValidAge, steps, type OnboardingStep } from '@/components/onboarding/onboarding-steps';
import { dark, onboardingStyles } from '@/components/onboarding/onboarding-styles';
import { PhotosStep } from '@/components/onboarding/photos-step';
import { ProfileStep } from '@/components/onboarding/profile-step';
import { useHomeLocation } from '@/components/onboarding/use-home-location';
import { useProfilePhotos } from '@/components/onboarding/use-profile-photos';
import { SlideToConfirm } from '@/components/ui/slide-to-confirm';
import { hostableCategories } from '@/lib/event-data';
import type { Gender, HostableCategory } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

// Same ambient photo the pre-auth welcome carousel opens on, so profile
// setup reads as a continuation of that flow rather than a different app.
const BACKDROP_IMAGE =
  'https://images.unsplash.com/photo-1592753054398-9fa298d40e85?auto=format&fit=crop&w=1000&q=75';

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
  const [interests, setInterests] = useState<HostableCategory[]>(user?.eventInterests ?? []);
  const { profileImage, photos, pickProfileImage, addGalleryPhotos, removeGalleryPhoto } = useProfilePhotos({
    image: user?.image ?? null,
    photos: user?.photos ?? [],
  });
  const { neighborhood, homeCoordinates, isLocating, locationError, detectLocation, selectManualNeighborhood } =
    useHomeLocation({ neighborhood: user?.homeNeighborhood ?? '', coordinates: user?.homeCoordinates ?? null });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const displayEmail = user?.email ?? '';
  const displayName = useMemo(
    () => name.trim() || displayEmail.replace(/@.*/, '') || 'InTouch member',
    [displayEmail, name],
  );

  const age = Number.parseInt(ageText, 10);
  const isAgeValid = isValidAge(ageText);

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
    if (!isActiveStepValid || isSubmitting || isLastStep) {
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

  async function finishOnboarding() {
    if (!isActiveStepValid) {
      return;
    }

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
    <View flex={1} backgroundColor="#0B0B0D">
      <Image source={BACKDROP_IMAGE} style={StyleSheet.absoluteFillObject} contentFit="cover" blurRadius={40} />
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(11,11,13,0.75)', 'rgba(11,11,13,0.9)', 'rgba(11,11,13,0.97)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={onboardingStyles.flex}
      >
        <XStack
          position="absolute"
          top={insets.top + 12}
          left={20}
          right={20}
          zIndex={10}
          alignItems="center"
          gap={12}
        >
          <XStack flex={1} gap={6}>
            {steps.map((step, index) => {
              const isLocked = index > maxUnlockedIndex;

              return (
                <Pressable
                  key={step.key}
                  disabled={isLocked}
                  onPress={() => goToStep(index)}
                  style={onboardingStyles.progressSegmentPressable}
                >
                  <View flex={1} height={3} borderRadius={999} backgroundColor="rgba(255,255,255,0.28)" overflow="hidden">
                    <View
                      height="100%"
                      width={index <= stepIndex ? '100%' : '0%'}
                      backgroundColor={dark.textPrimary}
                      borderRadius={999}
                    />
                  </View>
                </Pressable>
              );
            })}
          </XStack>

          <Text fontSize={13} fontWeight="700" color={dark.textPrimary}>
            {stepIndex + 1}/{steps.length}
          </Text>
        </XStack>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 64,
            paddingBottom: insets.bottom + 152,
          }}
        >
          <YStack gap={28}>
            <YStack gap={6}>
              <Text fontSize={12} fontWeight="800" letterSpacing={1} color={dark.textMuted} textTransform="uppercase">
                {isEditing ? 'Edit profile' : activeStep.eyebrow}
              </Text>
              <Text fontSize={26} lineHeight={32} fontWeight="800" color={dark.textPrimary}>
                {activeStep.title}
              </Text>
              <Text fontSize={14} lineHeight={20} color={dark.textSecondary}>
                {activeStep.description}
              </Text>
            </YStack>

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
              <CompactCategoryGrid
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
        </ScrollView>

        <XStack
          position="absolute"
          left={20}
          right={20}
          bottom={insets.bottom + 24}
          alignItems="center"
          gap={12}
        >
          <Pressable
            disabled={isFirstStep && !isEditing}
            onPress={goBack}
            style={[onboardingStyles.backButton, isFirstStep && !isEditing && onboardingStyles.disabledButton]}
          >
            <IconlyIcon name="ChevronLeft" size={20} color={dark.textPrimary} />
          </Pressable>

          {isLastStep ? (
            <View flex={1}>
              <SlideToConfirm
                label={isEditing ? 'Save changes' : 'Finish setup'}
                confirmingLabel="Saving…"
                onConfirm={finishOnboarding}
                disabled={!isActiveStepValid || isSubmitting}
              />
            </View>
          ) : (
            <Pressable
              disabled={!isActiveStepValid}
              onPress={goNext}
              style={[onboardingStyles.nextButton, !isActiveStepValid && onboardingStyles.disabledButton]}
            >
              <Text fontSize={15} fontWeight="800" color="#111114">
                Next
              </Text>
            </Pressable>
          )}
        </XStack>
      </KeyboardAvoidingView>
    </View>
  );
}
