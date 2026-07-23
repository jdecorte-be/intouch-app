import { Modal, Pressable } from 'react-native';
import { Text, View, XStack } from 'tamagui';

import { palette } from '@/lib/palette';

export const QUICK_REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

export function ReactionPicker({
  target,
  onSelect,
  onClose,
}: {
  target: { top: number; alignRight: boolean } | null;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        {target ? (
          <View
            position="absolute"
            top={target.top}
            left={target.alignRight ? undefined : 20}
            right={target.alignRight ? 20 : undefined}
            backgroundColor={palette.white}
            borderRadius={999}
            paddingHorizontal={10}
            paddingVertical={8}
            style={{
              shadowColor: palette.ink,
              shadowOpacity: 0.12,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }}
          >
            <XStack gap={10}>
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable key={emoji} onPress={() => onSelect(emoji)} hitSlop={4}>
                  <View width={32} height={32} alignItems="center" justifyContent="center">
                    <Text fontSize={22}>{emoji}</Text>
                  </View>
                </Pressable>
              ))}
            </XStack>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}
