import { Pressable, ScrollView } from 'react-native';
import { Text, View, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';
import type { StatusUpdate } from '@/lib/types';

export function StatusRow({
  statuses,
  currentUserImage,
  onPressStatus,
  onPressAddStatus,
}: {
  statuses: StatusUpdate[];
  currentUserImage?: string | null;
  onPressStatus?: (status: StatusUpdate) => void;
  onPressAddStatus?: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 18 }}
    >
      {statuses.map((status) => (
        <Pressable
          key={status.id}
          onPress={() => (status.isSelf ? onPressAddStatus?.() : onPressStatus?.(status))}
        >
          <YStack alignItems="center" gap={6} width={64}>
            <View>
              <UserAvatar
                label={status.name}
                image={status.isSelf ? currentUserImage : status.image}
                size={56}
                borderColor={status.isSelf ? palette.line : palette.primary}
                borderWidth={status.isSelf ? 0 : 2}
              />
              {status.isSelf ? (
                <View
                  position="absolute"
                  bottom={-2}
                  right={-2}
                  width={20}
                  height={20}
                  borderRadius={10}
                  backgroundColor={palette.primary}
                  borderWidth={2}
                  borderColor="white"
                  alignItems="center"
                  justifyContent="center"
                >
                  <IconlyIcon name="Plus" size={10} color="white" />
                </View>
              ) : null}
            </View>
            <YStack alignItems="center" gap={1}>
              <Text fontSize={11} fontWeight="700" color={palette.ink} numberOfLines={1}>
                {status.isSelf ? 'You' : status.name}
              </Text>
              <Text fontSize={10} fontWeight="500" color={palette.muted} numberOfLines={1}>
                {status.postedAt}
              </Text>
            </YStack>
          </YStack>
        </Pressable>
      ))}
    </ScrollView>
  );
}
