import { Pressable } from 'react-native';
import { Text, XStack } from 'tamagui';

import { dark } from './onboarding-styles';

export function ChoiceChip({
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
        backgroundColor={isSelected ? dark.surfaceStrong : dark.surface}
        borderWidth={1}
        borderColor={isSelected ? dark.borderStrong : dark.border}
      >
        <Text fontSize={13} fontWeight="800" color={isSelected ? dark.textPrimary : dark.textSecondary}>
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}
