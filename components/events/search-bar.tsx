import { TextInput } from 'react-native';
import { View, XStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';

export function SearchBar({
  query,
  placeholder = 'Search people or events',
  onQueryChange,
}: {
  query: string;
  placeholder?: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <XStack
      height={44}
      alignItems="center"
      gap={8}
      borderRadius={999}
      borderWidth={1}
      borderColor="rgba(41,47,54,0.1)"
      backgroundColor="white"
      paddingHorizontal={14}
    >
      <IconlyIcon name="Search" size={16} color={palette.muted} />
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '500',
          color: palette.ink,
          paddingVertical: 0,
        }}
        returnKeyType="search"
      />
      {query.length > 0 ? (
        <View onPress={() => onQueryChange('')} padding={4} cursor="pointer">
          <IconlyIcon name="X" size={14} color={palette.muted} />
        </View>
      ) : null}
    </XStack>
  );
}
