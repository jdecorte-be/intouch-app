import { XStack } from 'tamagui';

import { languageOptions } from '@/lib/event-data';

import { ChoiceChip } from './choice-chip';

export function LanguagesStep({
  languages,
  onToggle,
}: {
  languages: string[];
  onToggle: (value: string) => void;
}) {
  return (
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
  );
}
