import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';

type AttachmentAction = {
  key: string;
  label: string;
  icon?: IconlyIconName;
  badgeLabel?: string;
  onPress: () => void;
};

export function AttachmentMenu({
  visible,
  onClose,
  onPickImage,
  onOpenGifPicker,
  onShareLocation,
  onCreatePoll,
}: {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onOpenGifPicker: () => void;
  onShareLocation: () => void;
  onCreatePoll: () => void;
}) {
  const insets = useSafeAreaInsets();

  const actions: AttachmentAction[] = [
    { key: 'gallery', label: 'Photo from library', icon: 'Gallery', onPress: onPickImage },
    { key: 'gif', label: 'Send a GIF', badgeLabel: 'GIF', onPress: onOpenGifPicker },
    { key: 'location', label: 'Share location', icon: 'Location', onPress: onShareLocation },
    { key: 'poll', label: 'Create a poll', icon: 'ListUl', onPress: onCreatePoll },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}}>
          <YStack
            backgroundColor={palette.white}
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            paddingTop={8}
            paddingBottom={insets.bottom + 12}
            paddingHorizontal={16}
            gap={4}
          >
            <View alignSelf="center" width={36} height={4} borderRadius={999} backgroundColor="rgba(41,47,54,0.15)" marginBottom={8} />

            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
              >
                <XStack alignItems="center" gap={14} paddingVertical={12}>
                  <View
                    width={40}
                    height={40}
                    borderRadius={20}
                    backgroundColor={palette.primarySoft}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {action.icon ? (
                      <IconlyIcon name={action.icon} size={19} color={palette.primary} />
                    ) : (
                      <Text fontSize={10} fontWeight="800" color={palette.primary}>
                        {action.badgeLabel}
                      </Text>
                    )}
                  </View>
                  <Text fontSize={15} fontWeight="600" color={palette.ink}>
                    {action.label}
                  </Text>
                </XStack>
              </Pressable>
            ))}
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
