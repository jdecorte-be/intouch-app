import { Pressable } from 'react-native';
import { Text, XStack } from 'tamagui';

import { palette } from '@/lib/palette';
import type { ChatMessageReaction } from '@/lib/types';

export function MessageReactions({
  reactions,
  align,
  onToggle,
  marginTop = 4,
}: {
  reactions: ChatMessageReaction[];
  align: 'flex-end' | 'flex-start';
  onToggle: (emoji: string) => void;
  marginTop?: number;
}) {
  if (!reactions.length) {
    return null;
  }

  return (
    <XStack flexWrap="wrap" gap={6} justifyContent={align} marginTop={marginTop}>
      {reactions.map((reaction) => (
        <Pressable key={reaction.emoji} onPress={() => onToggle(reaction.emoji)} hitSlop={4}>
          <XStack
            alignItems="center"
            gap={4}
            paddingHorizontal={8}
            paddingVertical={3}
            borderRadius={999}
            borderWidth={1}
            borderColor={reaction.reactedByMe ? palette.primary : palette.border}
            backgroundColor={reaction.reactedByMe ? palette.primarySoft : palette.white}
          >
            <Text fontSize={12}>{reaction.emoji}</Text>
            <Text fontSize={11} fontWeight="700" color={reaction.reactedByMe ? palette.primary : palette.gray}>
              {reaction.count}
            </Text>
          </XStack>
        </Pressable>
      ))}
    </XStack>
  );
}
