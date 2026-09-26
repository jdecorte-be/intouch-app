import { TextInput } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { genderOptions } from '@/lib/event-data';
import type { Gender } from '@/lib/types';

import { ChoiceChip } from './choice-chip';
import { dark, onboardingStyles } from './onboarding-styles';

export function ProfileStep({
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
    <YStack gap={20}>
      <Text fontSize={13} color={dark.textMuted}>
        {email}
      </Text>

      <YStack gap={12}>
        <YStack gap={8}>
          <Text fontSize={13} fontWeight="800" color={dark.textSecondary}>
            First name
          </Text>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Your first name"
            placeholderTextColor={dark.textMuted}
            style={onboardingStyles.input}
          />
        </YStack>

        <YStack gap={8}>
          <Text fontSize={13} fontWeight="800" color={dark.textSecondary}>
            Age
          </Text>
          <TextInput
            value={ageText}
            onChangeText={(value) => onAgeChange(value.replace(/[^0-9]/g, '').slice(0, 3))}
            placeholder="Your age"
            placeholderTextColor={dark.textMuted}
            keyboardType="number-pad"
            maxLength={3}
            style={onboardingStyles.input}
          />
        </YStack>
      </YStack>

      <YStack gap={10}>
        <Text fontSize={13} fontWeight="800" color={dark.textSecondary}>
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
