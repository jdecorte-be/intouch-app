import { Pressable, StyleSheet } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

export type CategoryGridOption = { value?: string; id?: string; label: string; emoji: string };

export function CompactCategoryGrid({
  options,
  selectedValues,
  onToggle,
}: {
  options: CategoryGridOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap={10} justifyContent="space-between">
      {options.map((option) => {
        const value = option.value ?? option.id ?? option.label;
        const isSelected = selectedValues.includes(value);

        return (
          <Pressable key={value} onPress={() => onToggle(value)} style={styles.compactCard}>
            <YStack
              aspectRatio={1}
              borderRadius={16}
              alignItems="center"
              justifyContent="center"
              gap={6}
              backgroundColor={isSelected ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)'}
              borderWidth={1}
              borderColor={isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)'}
            >
              <Text fontSize={22}>{option.emoji}</Text>
              <Text fontSize={11} fontWeight="700" color="#FFFFFF" numberOfLines={1}>
                {option.label}
              </Text>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    width: '31%',
  },
});
