import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';
import { useChatStore } from '@/stores/chat-store';
import { useSessionStore } from '@/stores/session-store';

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');

  const thread = useChatStore((state) => state.threads.find((candidate) => candidate.id === id));
  const sendMessage = useChatStore((state) => state.sendMessage);
  const markThreadRead = useChatStore((state) => state.markThreadRead);
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    if (id) {
      markThreadRead(id);
    }
  }, [id, markThreadRead]);

  useEffect(() => {
    const timeout = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    return () => clearTimeout(timeout);
  }, [thread?.messages.length]);

  if (!thread) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} backgroundColor={palette.mist}>
        <Text fontSize={16} fontWeight="700" color={palette.ink}>
          Chat not found.
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text fontSize={14} fontWeight="700" color={palette.gray}>
            Go back
          </Text>
        </Pressable>
      </YStack>
    );
  }

  const submit = () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    sendMessage(thread.id, text, user?.name || user?.email || 'You');
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View flex={1} backgroundColor={palette.mist}>
        {/* Header */}
        <XStack
          alignItems="center"
          gap={10}
          borderBottomWidth={1}
          borderColor="rgba(41,47,54,0.1)"
          backgroundColor="white"
          paddingHorizontal={12}
          paddingTop={insets.top + 8}
          paddingBottom={12}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <View width={36} height={36} borderRadius={18} alignItems="center" justifyContent="center">
              <IconlyIcon name="ArrowLeft" size={18} color={palette.gray} />
            </View>
          </Pressable>
          <View
            width={40}
            height={40}
            borderRadius={12}
            style={{ backgroundColor: thread.accent }}
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontWeight="700" fontSize={12}>
              {thread.initials}
            </Text>
          </View>
          <YStack flex={1} minWidth={0}>
            <Text fontSize={15} fontWeight="700" color={palette.ink} numberOfLines={1}>
              {thread.title}
            </Text>
            <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
              {thread.subtitle}
            </Text>
          </YStack>
        </XStack>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          {thread.messages.length ? (
            thread.messages.map((message) => (
              <XStack
                key={message.id}
                justifyContent={message.fromSelf ? 'flex-end' : 'flex-start'}
                alignItems="flex-end"
                gap={8}
              >
                {!message.fromSelf ? (
                  <UserAvatar label={message.author} image={message.authorImage} size={26} />
                ) : null}
                <YStack
                  maxWidth="72%"
                  borderRadius={16}
                  borderBottomRightRadius={message.fromSelf ? 6 : 16}
                  borderBottomLeftRadius={message.fromSelf ? 16 : 6}
                  backgroundColor={message.fromSelf ? palette.ink : 'white'}
                  borderWidth={message.fromSelf ? 0 : 1}
                  borderColor="rgba(41,47,54,0.1)"
                  paddingHorizontal={14}
                  paddingVertical={10}
                >
                  {!message.fromSelf ? (
                    <Text fontSize={11} fontWeight="700" color={palette.silver} marginBottom={4}>
                      {message.author}
                    </Text>
                  ) : null}
                  <Text fontSize={14} lineHeight={20} color={message.fromSelf ? 'white' : palette.ink}>
                    {message.text}
                  </Text>
                  <Text
                    fontSize={10}
                    fontWeight="600"
                    marginTop={4}
                    color={message.fromSelf ? 'rgba(255,255,255,0.6)' : palette.muted}
                  >
                    {message.sentAt}
                  </Text>
                </YStack>
              </XStack>
            ))
          ) : (
            <Text paddingVertical={24} textAlign="center" fontSize={14} lineHeight={22} color={palette.gray}>
              No messages yet. Say hi to {thread.title}!
            </Text>
          )}
        </ScrollView>

        {/* Composer */}
        <XStack
          alignItems="center"
          gap={8}
          borderTopWidth={1}
          borderColor="rgba(41,47,54,0.1)"
          backgroundColor="white"
          padding={12}
          paddingBottom={insets.bottom + 12}
        >
          <View
            flex={1}
            height={44}
            borderRadius={999}
            borderWidth={1}
            borderColor="rgba(41,47,54,0.1)"
            backgroundColor="white"
            paddingHorizontal={16}
            justifyContent="center"
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message"
              placeholderTextColor={palette.muted}
              style={{ fontSize: 14, fontWeight: '500', color: palette.ink, paddingVertical: 0 }}
              onSubmitEditing={submit}
              returnKeyType="send"
            />
          </View>
          <Pressable onPress={submit} disabled={!draft.trim()}>
            <View
              width={44}
              height={44}
              borderRadius={22}
              backgroundColor={palette.ink}
              alignItems="center"
              justifyContent="center"
              opacity={draft.trim() ? 1 : 0.4}
            >
              <IconlyIcon name="Send" size={18} color="white" />
            </View>
          </Pressable>
        </XStack>
      </View>
    </KeyboardAvoidingView>
  );
}
