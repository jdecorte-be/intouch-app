import { Pressable } from 'react-native';
import { Text, View, XStack } from 'tamagui';

import { activityScopeLabels, activityScopes } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { ActivityScope } from '@/lib/types';

export function ScopeSwitch({
  activeScope,
  onScopeChange,
}: {
  activeScope: ActivityScope;
  onScopeChange: (scope: ActivityScope) => void;
}) {
  const activeIndex = activityScopes.indexOf(activeScope);

  return (
    <XStack
      height={40}
      borderRadius={999}
      borderWidth={1}
      borderColor={palette.line}
      backgroundColor={palette.fog}
      padding={4}
      position="relative"
    >
      <View
        position="absolute"
        top={4}
        bottom={4}
        left={`${(100 / 3) * activeIndex + 1}%`}
        width="31.3%"
        borderRadius={999}
        backgroundColor={palette.ink}
      />
      {activityScopes.map((scope) => (
        <Pressable
          key={scope}
          onPress={() => onScopeChange(scope)}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text
            fontSize={14}
            fontWeight="700"
            color={activeScope === scope ? 'white' : palette.gray}
          >
            {activityScopeLabels[scope]}
          </Text>
        </Pressable>
      ))}
    </XStack>
  );
}
