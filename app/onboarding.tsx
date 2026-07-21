import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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
import { goalOptions, hostableCategories, neighborhoodOptions } from '@/lib/event-data';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';
import type { HostableCategory } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

type OnboardingStep = {
  key: 'profile' | 'interests' | 'rhythm';
  label: string;
  icon: IconlyIconName;
};

const steps: OnboardingStep[] = [
  { key: 'profile', label: 'Profile', icon: 'User' },
  { key: 'interests', label: 'Interests', icon: 'Sparkles' },
  { key: 'rhythm', label: 'Rhythm', icon: 'Compass' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSessionStore((state) => state.user);
  const completedOnboardingUserIds = useSessionStore((state) => state.completedOnboardingUserIds);
  const completeOnboarding = useSessionStore((state) => state.completeOnboarding);
  const isEditing = Boolean(user && completedOnboardingUserIds.includes(user.id));
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [neighborhood, setNeighborhood] = useState(user?.homeNeighborhood ?? '');
  const [interests, setInterests] = useState<HostableCategory[]>(user?.eventInterests ?? []);
  const [goals, setGoals] = useState<string[]>(user?.eventGoals ?? []);
  const activeStep = steps[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const displayEmail = user?.email ?? '';
  const displayName = useMemo(
    () => name.trim() || displayEmail.replace(/@.*/, '') || 'ReTalk member',
    [displayEmail, name],
  );

  if (!user) {
    return null;
  }

  const toggleInterest = (value: HostableCategory) => {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleGoal = (value: string) => {
    setGoals((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const finishOnboarding = () => {
    completeOnboarding({
      name: displayName,
      homeNeighborhood: neighborhood.trim() || null,
      eventInterests: interests,
      eventGoals: goals,
    });
    router.replace('/');
  };

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
                {isEditing ? 'Update your details.' : 'Shape your event map.'}
              </Text>
              <Text fontSize={14} lineHeight={22} color={palette.gray}>
                {isEditing
                  ? 'Change your name, neighborhood, categories, and social rhythm.'
                  : 'Pick a neighborhood, categories, and social rhythm so ReTalk can start with better local matches.'}
              </Text>
            </YStack>

            <XStack gap={8}>
              {steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;

                return (
                  <Pressable key={step.key} style={styles.stepPressable} onPress={() => setStepIndex(index)}>
                    <XStack
                      height={42}
                      alignItems="center"
                      justifyContent="center"
                      gap={6}
                      borderRadius={12}
                      borderWidth={1}
                      borderColor={isActive ? palette.ink : palette.line}
                      backgroundColor={isActive ? palette.ink : palette.white}
                      paddingHorizontal={10}
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
                        fontSize={12}
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
                  neighborhood={neighborhood}
                  email={displayEmail}
                  onNameChange={setName}
                  onNeighborhoodChange={setNeighborhood}
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

              {activeStep.key === 'rhythm' ? (
                <ChoiceStep
                  eyebrow="Rhythm"
                  title="What kind of plans fit right now?"
                  description="These preferences help rank event timing and formats."
                  options={goalOptions}
                  selectedValues={goals}
                  onToggle={toggleGoal}
                />
              ) : null}
            </YStack>

            <XStack alignItems="center" justifyContent="space-between" gap={12}>
              <Pressable
                disabled={isFirstStep}
                onPress={() => setStepIndex((current) => Math.max(current - 1, 0))}
                style={[styles.navButton, styles.backButton, isFirstStep && styles.disabledButton]}
              >
                <IconlyIcon name="ArrowLeft" size={16} color={isFirstStep ? palette.muted : palette.ink} />
                <Text fontSize={14} fontWeight="800" color={isFirstStep ? palette.muted : palette.ink}>
                  Back
                </Text>
              </Pressable>

              <Pressable
                onPress={
                  isLastStep
                    ? finishOnboarding
                    : () => setStepIndex((current) => Math.min(current + 1, steps.length - 1))
                }
                style={[styles.navButton, styles.nextButton]}
              >
                <Text fontSize={14} fontWeight="800" color={palette.white}>
                  {isLastStep ? 'Finish setup' : 'Next'}
                </Text>
                <IconlyIcon name={isLastStep ? 'Check' : 'ChevronRight'} size={16} color={palette.white} />
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
  neighborhood,
  email,
  onNameChange,
  onNeighborhoodChange,
}: {
  name: string;
  neighborhood: string;
  email: string;
  onNameChange: (value: string) => void;
  onNeighborhoodChange: (value: string) => void;
}) {
  return (
    <YStack gap={18}>
      <StepHeader eyebrow="Profile" title="Start with the basics." description={email} />

      <YStack gap={12}>
        <YStack gap={8}>
          <Text fontSize={13} fontWeight="800" color={palette.ink}>
            Display name
          </Text>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Your name"
            placeholderTextColor={palette.muted}
            style={styles.input}
          />
        </YStack>

        <YStack gap={8}>
          <Text fontSize={13} fontWeight="800" color={palette.ink}>
            Home neighborhood
          </Text>
          <TextInput
            value={neighborhood}
            onChangeText={onNeighborhoodChange}
            placeholder="Choose a neighborhood"
            placeholderTextColor={palette.muted}
            style={styles.input}
          />
        </YStack>
      </YStack>

      <XStack flexWrap="wrap" gap={8}>
        {neighborhoodOptions.map((option) => (
          <ChoiceChip
            key={option}
            label={option}
            isSelected={neighborhood === option}
            onPress={() => onNeighborhoodChange(neighborhood === option ? '' : option)}
          />
        ))}
      </XStack>
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
    opacity: 0.58,
  },
});
