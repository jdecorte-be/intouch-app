import { useEffect, useState } from 'react';
import { Modal, Pressable, TextInput } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;

export function PollComposerModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (question: string, options: string[]) => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  useEffect(() => {
    if (!visible) {
      setQuestion('');
      setOptions(['', '']);
    }
  }, [visible]);

  const updateOption = (index: number, value: string) => {
    setOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  };

  const addOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions((current) => [...current, '']);
    }
  };

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  };

  const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);
  const canSubmit = question.trim().length > 0 && trimmedOptions.length >= MIN_OPTIONS;

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit(question.trim(), trimmedOptions);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View flex={1} backgroundColor={palette.white} paddingTop={12}>
        <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16} paddingBottom={12}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text fontSize={14} fontWeight="700" color={palette.gray}>
              Cancel
            </Text>
          </Pressable>
          <Text fontSize={15} fontWeight="700" color={palette.ink}>
            Create a poll
          </Text>
          <Pressable onPress={submit} hitSlop={8} disabled={!canSubmit}>
            <Text fontSize={14} fontWeight="700" color={canSubmit ? palette.primary : palette.muted}>
              Send
            </Text>
          </Pressable>
        </XStack>

        <YStack paddingHorizontal={16} paddingTop={8} gap={16}>
          <YStack gap={6}>
            <Text fontSize={12} fontWeight="700" color={palette.gray}>
              Question
            </Text>
            <View
              borderRadius={12}
              borderWidth={1}
              borderColor={palette.border}
              paddingHorizontal={14}
              paddingVertical={10}
            >
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="Ask something..."
                placeholderTextColor={palette.muted}
                style={[appTextInputStyle, { fontSize: 14, fontWeight: '500', color: palette.ink }]}
                autoFocus
                multiline
              />
            </View>
          </YStack>

          <YStack gap={6}>
            <Text fontSize={12} fontWeight="700" color={palette.gray}>
              Options
            </Text>
            {options.map((option, index) => (
              <XStack key={index} alignItems="center" gap={8}>
                <View
                  flex={1}
                  borderRadius={12}
                  borderWidth={1}
                  borderColor={palette.border}
                  paddingHorizontal={14}
                  paddingVertical={10}
                >
                  <TextInput
                    value={option}
                    onChangeText={(value) => updateOption(index, value)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={palette.muted}
                    style={[appTextInputStyle, { fontSize: 14, fontWeight: '500', color: palette.ink }]}
                  />
                </View>
                {options.length > MIN_OPTIONS ? (
                  <Pressable onPress={() => removeOption(index)} hitSlop={8}>
                    <IconlyIcon name="Minus" size={18} color={palette.gray} />
                  </Pressable>
                ) : null}
              </XStack>
            ))}

            {options.length < MAX_OPTIONS ? (
              <Pressable onPress={addOption} hitSlop={4}>
                <XStack alignItems="center" gap={6} paddingVertical={8}>
                  <IconlyIcon name="Plus" size={16} color={palette.primary} />
                  <Text fontSize={13} fontWeight="700" color={palette.primary}>
                    Add option
                  </Text>
                </XStack>
              </Pressable>
            ) : null}
          </YStack>
        </YStack>
      </View>
    </Modal>
  );
}
