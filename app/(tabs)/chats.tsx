import { useRouter } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { SectionLabel } from '@/components/ui/section-label';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';
import { useChatStore } from '@/stores/chat-store';
import { useSessionStore } from '@/stores/session-store';

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const threads = useChatStore((state) => state.threads);
  const markThreadRead = useChatStore((state) => state.markThreadRead);
  const error = useChatStore((state) => state.error);
  const dismissError = useChatStore((state) => state.dismissError);
  const user = useSessionStore((state) => state.user);
  const userLabel = user?.name || user?.email || '';

  const openThread = (chatId: string) => {
    markThreadRead(chatId);
    router.push(`/chat/${chatId}`);
  };

  return (
    <View flex={1} backgroundColor={palette.mist}>
      <YStack paddingHorizontal={16} paddingTop={insets.top + 12} paddingBottom={12}>
        <XStack alignItems="center" gap={12}>
          <Pressable onPress={() => router.navigate('/profile')}>
            {user ? <UserAvatar label={userLabel} image={user.image} size={44} /> : <GuestAvatar size={44} />}
          </Pressable>
          <YStack flex={1} minWidth={0}>
            <SectionLabel>Messages</SectionLabel>
            <Text fontSize={22} fontWeight="700" color={palette.ink} marginTop={2}>
              Messages
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {error ? (
        <XStack
          alignItems="center"
          justifyContent="space-between"
          backgroundColor={palette.coralSoft}
          paddingHorizontal={16}
          paddingVertical={10}
        >
          <Text fontSize={12} fontWeight="700" color="#c0392b">
            {error}
          </Text>
          <Pressable onPress={dismissError} hitSlop={8}>
            <IconlyIcon name="X" size={14} color="#c0392b" />
          </Pressable>
        </XStack>
      ) : null}

      {threads.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
            <View width={48} height={48} borderRadius={12} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
              <IconlyIcon name="MessageCircleDots" size={20} color={palette.slate} />
            </View>
            <Text fontSize={16} fontWeight="700" color={palette.ink} marginTop={8}>
              No chats yet
            </Text>
            <Text fontSize={14} lineHeight={22} color={palette.gray} textAlign="center">
              Join an event or message a host from an event page to start chatting.
            </Text>
          </YStack>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 120, gap: 10 }}
        >
          {threads.map((thread) => {
            const lastMessage = thread.messages[thread.messages.length - 1];

            return (
              <Pressable key={thread.id} onPress={() => openThread(thread.id)}>
                <XStack
                  alignItems="flex-start"
                  gap={12}
                  borderRadius={16}
                  borderWidth={1}
                  borderColor="rgba(41,47,54,0.1)"
                  backgroundColor="white"
                  padding={12}
                >
                  <View
                    width={44}
                    height={44}
                    borderRadius={12}
                    style={{ backgroundColor: thread.accent }}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color="white" fontWeight="700" fontSize={12}>
                      {thread.initials}
                    </Text>
                  </View>
                  <YStack flex={1} minWidth={0} gap={2}>
                    <XStack alignItems="baseline" justifyContent="space-between" gap={8}>
                      <Text fontSize={14} fontWeight="700" color={palette.ink} numberOfLines={1} flexShrink={1}>
                        {thread.title}
                      </Text>
                      {lastMessage ? (
                        <Text fontSize={11} fontWeight="600" color={palette.muted}>
                          {lastMessage.sentAt}
                        </Text>
                      ) : null}
                    </XStack>
                    <Text fontSize={12} fontWeight="500" color={palette.gray} numberOfLines={1}>
                      {lastMessage
                        ? `${lastMessage.fromSelf ? 'You: ' : ''}${lastMessage.text}`
                        : `Say hi to ${thread.title}.`}
                    </Text>
                    <XStack marginTop={4} alignItems="center" gap={8}>
                      <View borderRadius={6} backgroundColor={palette.fog} paddingHorizontal={6} paddingVertical={3}>
                        <Text fontSize={9} fontWeight="700" textTransform="uppercase" color={palette.slate}>
                          {thread.kind === 'event' ? 'Event chat' : 'Direct message'}
                        </Text>
                      </View>
                      {thread.unreadCount > 0 ? (
                        <View width={18} height={18} borderRadius={9} backgroundColor={palette.danger} alignItems="center" justifyContent="center">
                          <Text color="white" fontSize={10} fontWeight="800">
                            {thread.unreadCount}
                          </Text>
                        </View>
                      ) : null}
                    </XStack>
                  </YStack>
                </XStack>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
