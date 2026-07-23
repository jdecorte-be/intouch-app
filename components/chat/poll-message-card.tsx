import { Pressable } from 'react-native';
import { Text, View, YStack } from 'tamagui';

import { palette } from '@/lib/palette';
import type { PollPayload } from '@/lib/poll';

export function PollMessageCard({
  poll,
  fromSelf,
  votes,
  myVote,
  onVote,
}: {
  poll: PollPayload;
  fromSelf: boolean;
  votes: number[];
  myVote: number | null;
  onVote: (optionIndex: number) => void;
}) {
  const totalVotes = votes.reduce((sum, count) => sum + count, 0);

  return (
    <YStack gap={10} minWidth={220}>
      <Text fontSize={14} fontWeight="700" color={fromSelf ? palette.white : palette.ink}>
        {poll.question}
      </Text>

      <YStack gap={6}>
        {poll.options.map((option, index) => {
          const count = votes[index] ?? 0;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = myVote === index;

          return (
            <Pressable key={index} onPress={() => onVote(index)}>
              <View
                borderRadius={10}
                overflow="hidden"
                borderWidth={1}
                borderColor={fromSelf ? 'rgba(255,255,255,0.3)' : palette.borderStrong}
                backgroundColor={fromSelf ? 'rgba(255,255,255,0.08)' : palette.white}
              >
                {myVote !== null ? (
                  <View
                    position="absolute"
                    top={0}
                    left={0}
                    bottom={0}
                    width={`${percent}%`}
                    backgroundColor={fromSelf ? 'rgba(255,255,255,0.22)' : palette.primarySoft}
                  />
                ) : null}
                <View flexDirection="row" alignItems="center" justifyContent="space-between" paddingHorizontal={12} paddingVertical={9}>
                  <Text
                    fontSize={13}
                    fontWeight={isSelected ? '800' : '600'}
                    color={fromSelf ? palette.white : palette.ink}
                    flexShrink={1}
                  >
                    {option}
                  </Text>
                  {myVote !== null ? (
                    <Text fontSize={12} fontWeight="700" color={fromSelf ? 'rgba(255,255,255,0.8)' : palette.gray}>
                      {percent}%
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </YStack>

      <Text fontSize={11} fontWeight="600" color={fromSelf ? 'rgba(255,255,255,0.6)' : palette.muted}>
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}
      </Text>
    </YStack>
  );
}
