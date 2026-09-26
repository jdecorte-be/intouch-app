import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { neighborhoodOptions } from '@/lib/event-data';

import { ChoiceChip } from './choice-chip';
import { dark, onboardingStyles } from './onboarding-styles';

export function LocationStep({
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
    <YStack gap={20}>
      <Pressable onPress={onDetectLocation} disabled={isLocating}>
        <LinearGradient
          colors={[dark.accent, dark.accentEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={onboardingStyles.locationButton}
        >
          {isLocating ? (
            <ActivityIndicator color={dark.textPrimary} />
          ) : (
            <IconlyIcon name="Location" size={16} color={dark.textPrimary} />
          )}
          <Text fontSize={14} fontWeight="800" color={dark.textPrimary}>
            {isLocating ? 'Finding you…' : 'Use my current location'}
          </Text>
        </LinearGradient>
      </Pressable>

      {neighborhood ? (
        <XStack alignItems="center" gap={8}>
          <IconlyIcon name="CheckCircle" size={16} color={dark.textPrimary} />
          <Text fontSize={13} fontWeight="700" color={dark.textPrimary}>
            {homeCoordinates ? `Detected: ${neighborhood}` : neighborhood}
          </Text>
        </XStack>
      ) : null}

      {locationError ? (
        <Text fontSize={12} color={dark.dangerText}>
          {locationError}
        </Text>
      ) : null}

      <YStack gap={10}>
        <Text fontSize={13} fontWeight="800" color={dark.textSecondary}>
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
