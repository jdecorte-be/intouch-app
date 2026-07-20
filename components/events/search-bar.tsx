import { Pressable, TextInput } from 'react-native';
import { View, XStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';

export function SearchBar({
  query,
  placeholder = 'Search people or events',
  autoFocus = false,
  onFocus,
  onQueryChange,
}: {
  query: string;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <XStack
      height={44}
      alignItems="center"
      gap={8}
      borderRadius={999}
      borderWidth={1}
      borderColor="rgba(41,47,54,0.16)"
      backgroundColor="white"
      paddingHorizontal={14}
    >
      <IconlyIcon name="Search" size={16} color={palette.gray} />
      <TextInput
        autoFocus={autoFocus}
        value={query}
        onFocus={onFocus}
        onChangeText={onQueryChange}
        placeholder={placeholder}
        placeholderTextColor={palette.gray}
        style={[
          appTextInputStyle,
          {
            flex: 1,
            fontSize: 14,
            fontWeight: '500',
            color: palette.ink,
            paddingVertical: 0,
          },
        ]}
        returnKeyType="search"
      />
      {query.length > 0 ? (
        <Pressable onPress={() => onQueryChange('')} hitSlop={8}>
          <View padding={4}>
            <IconlyIcon name="X" size={14} color={palette.gray} />
          </View>
        </Pressable>
      ) : null}
    </XStack>
  );
}
