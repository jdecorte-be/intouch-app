import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { ChatSearchRow } from '@/components/chat/chat-search-row';
import { SearchBar } from '@/components/events/search-bar';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import type { PersonSearchResult } from '@/lib/search-utils';
import { searchPeople } from '@/lib/search-utils';
import type { ChatFilterTag } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';

type ChatFilterKey = 'all' | 'groups' | ChatFilterTag;

const CHAT_FILTERS: { key: ChatFilterKey; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '💬' },
  { key: 'favorites', label: 'Favorites', emoji: '⭐' },
  { key: 'work', label: 'Work', emoji: '💼' },
  { key: 'groups', label: 'Groups', emoji: '👥' },
  { key: 'community', label: 'Community', emoji: '🌐' },
];

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const threads = useChatStore((state) => state.threads);
  const markThreadRead = useChatStore((state) => state.markThreadRead);
  const startDirectChat = useChatStore((state) => state.startDirectChat);
  const error = useChatStore((state) => state.error);
  const dismissError = useChatStore((state) => state.dismissError);
  const events = useEventsStore((state) => state.events);
  const [selectedFilter, setSelectedFilter] = useState<ChatFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.trim().length > 0;
  const [isComposing, setIsComposing] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');

  const openThread = (chatId: string) => {
    markThreadRead(chatId);
    setSearchQuery('');
    router.push(`/chat/${chatId}`);
  };

  const closeCompose = () => {
    setIsComposing(false);
    setComposeQuery('');
  };

  const threadResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return threads.filter((thread) => {
      const lastMessage = thread.messages[thread.messages.length - 1];
      return (
        thread.title.toLowerCase().includes(normalizedQuery) ||
        thread.subtitle.toLowerCase().includes(normalizedQuery) ||
        (lastMessage?.text.toLowerCase().includes(normalizedQuery) ?? false)
      );
    });
  }, [threads, searchQuery]);

  const userResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const existingTitles = new Set(threadResults.map((thread) => thread.title.toLowerCase()));

    return searchPeople(events, searchQuery).filter(
      (person) => !existingTitles.has(person.name.toLowerCase()),
    );
  }, [events, searchQuery, threadResults]);

  const startConversation = async (person: PersonSearchResult, reset: () => void) => {
    if (!person.userId) {
      reset();
      router.push(`/user/${encodeURIComponent(person.key)}`);
      return;
    }

    try {
      const chatId = await startDirectChat(person.name, person.userId);
      reset();
      router.push(`/chat/${chatId}`);
    } catch {
      Alert.alert("Couldn't start chat", 'Please try again.');
    }
  };

  const composeResults = useMemo(
    () => (composeQuery.trim() ? searchPeople(events, composeQuery) : []),
    [events, composeQuery],
  );

  const shortcutThreads = threads.filter((thread) => thread.kind === 'direct').slice(0, 8);

  const visibleThreads = useMemo(() => {
    const filtered = threads.filter((thread) => {
      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'groups') return thread.kind === 'event';
      return thread.tags?.includes(selectedFilter) ?? false;
    });

    return [...filtered].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [threads, selectedFilter]);

  return (
    <View flex={1} backgroundColor={palette.white}>
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={16}
        paddingTop={insets.top + 8}
        paddingBottom={6}
      >
        <Text fontSize={28} fontWeight="800" color={palette.ink}>
          Chats
        </Text>
        <Pressable
          onPress={() => setIsComposing(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Find someone to message"
        >
          <View
            width={38}
            height={38}
            borderRadius={19}
            alignItems="center"
            justifyContent="center"
            backgroundColor={palette.fog}
          >
            <IconlyIcon name="Edit" size={18} color={palette.ink} />
          </View>
        </Pressable>
      </XStack>

      <View paddingHorizontal={16} paddingVertical={10}>
        <SearchBar
          query={searchQuery}
          placeholder="Search chats and people"
          onQueryChange={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 16 }}
      >
        {shortcutThreads.map((thread) => {
          const firstName = thread.title.split(' ')[0] ?? thread.title;

          return (
            <Pressable key={thread.id} onPress={() => openThread(thread.id)}>
              <YStack alignItems="center" gap={6} width={60}>
                <View width={60} height={60}>
                  <View
                    width={60}
                    height={60}
                    borderRadius={18}
                    style={{
                      backgroundColor: thread.accent,
                      shadowColor: palette.ink,
                      shadowOpacity: 0.1,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {thread.avatarImage ? (
                      <Image
                        source={thread.avatarImage}
                        style={{ width: 60, height: 60, borderRadius: 18 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Text color={palette.white} fontWeight="700" fontSize={16}>
                        {thread.initials}
                      </Text>
                    )}
                  </View>
                  {thread.unreadCount > 0 ? (
                    <View
                      position="absolute"
                      top={-4}
                      right={-4}
                      minWidth={20}
                      height={20}
                      borderRadius={10}
                      paddingHorizontal={4}
                      backgroundColor={palette.primary}
                      alignItems="center"
                      justifyContent="center"
                      borderWidth={2}
                      borderColor={palette.white}
                    >
                      <Text color={palette.white} fontSize={10} fontWeight="800">
                        {thread.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text fontSize={12} fontWeight="600" color={palette.ink} numberOfLines={1}>
                  {firstName}
                </Text>
              </YStack>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {CHAT_FILTERS.map((filter) => {
          const selected = filter.key === selectedFilter;

          return (
            <Pressable key={filter.key} onPress={() => setSelectedFilter(filter.key)}>
              <View
                paddingHorizontal={16}
                paddingVertical={9}
                borderRadius={999}
                backgroundColor={selected ? palette.primary : palette.fog}
              >
                <Text fontSize={14} fontWeight="700" color={selected ? palette.white : palette.slate}>
                  {filter.emoji} {filter.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <XStack
          alignItems="center"
          justifyContent="space-between"
          backgroundColor={palette.dangerSoft}
          paddingHorizontal={16}
          paddingVertical={10}
        >
          <Text fontSize={12} fontWeight="700" color={palette.dangerText}>
            {error}
          </Text>
          <Pressable onPress={dismissError} hitSlop={8}>
            <IconlyIcon name="X" size={14} color={palette.dangerText} />
          </Pressable>
        </XStack>
      ) : null}

      {isSearching ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {threadResults.length === 0 && userResults.length === 0 ? (
            <YStack alignItems="center" paddingTop={40} gap={4}>
              <Text fontSize={14} fontWeight="700" color={palette.ink}>
                No results found
              </Text>
              <Text fontSize={13} color={palette.gray}>
                Try a different name.
              </Text>
            </YStack>
          ) : (
            <YStack gap={16} paddingTop={8}>
              {threadResults.length > 0 ? (
                <YStack gap={2}>
                  <Text fontSize={12} fontWeight="800" color={palette.gray} paddingHorizontal={10}>
                    CHATS
                  </Text>
                  {threadResults.map((thread) => {
                    const lastMessage = thread.messages[thread.messages.length - 1];

                    return (
                      <ChatSearchRow
                        key={thread.id}
                        avatarLabel={thread.title}
                        avatarImage={thread.avatarImage}
                        avatarAccent={thread.accent}
                        avatarInitials={thread.initials}
                        title={thread.title}
                        subtitle={
                          lastMessage
                            ? `${lastMessage.fromSelf ? 'You: ' : ''}${lastMessage.text}`
                            : thread.subtitle
                        }
                        icon="ChevronRight"
                        onPress={() => openThread(thread.id)}
                      />
                    );
                  })}
                </YStack>
              ) : null}

              {userResults.length > 0 ? (
                <YStack gap={2}>
                  <Text fontSize={12} fontWeight="800" color={palette.gray} paddingHorizontal={10}>
                    PEOPLE
                  </Text>
                  {userResults.map((person) => (
                    <ChatSearchRow
                      key={person.key}
                      avatarLabel={person.name}
                      avatarImage={person.image}
                      title={person.name}
                      subtitle={`${person.role} · ${person.event.title}`}
                      icon="MessageCircleDots"
                      onPress={() => startConversation(person, () => setSearchQuery(''))}
                    />
                  ))}
                </YStack>
              ) : null}
            </YStack>
          )}
        </ScrollView>
      ) : (
      <View flex={1}>
        {threads.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 32 }}
            showsVerticalScrollIndicator={false}
          >
            <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
              <View width={48} height={48} borderRadius={12} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
                <IconlyIcon name="MessageCircleDots" size={20} color={palette.slate} />
              </View>
              <Text fontSize={16} fontWeight="700" color={palette.ink} textAlign="center" marginTop={8}>
                No chats yet
              </Text>
              <Text fontSize={14} lineHeight={22} color={palette.gray} textAlign="center">
                Join an event or message a host from an event page to start chatting.
              </Text>
            </YStack>
          </ScrollView>
        ) : visibleThreads.length === 0 ? (
          <YStack alignItems="center" paddingTop={40} gap={4}>
            <Text fontSize={14} fontWeight="700" color={palette.ink}>
              No chats here
            </Text>
            <Text fontSize={13} color={palette.gray}>
              Try a different filter.
            </Text>
          </YStack>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 90 }}
          >
            <YStack
              borderRadius={16}
              backgroundColor={palette.white}
              overflow="hidden"
              shadowColor={palette.ink}
              shadowOpacity={0.08}
              shadowRadius={16}
              shadowOffset={{ width: 0, height: 6 }}
              elevation={3}
            >
              {visibleThreads.map((thread, index) => {
                const lastMessage = thread.messages[thread.messages.length - 1];
                const isLast = index === visibleThreads.length - 1;
                const isUnread = thread.unreadCount > 0;

                return (
                  <Pressable key={thread.id} onPress={() => openThread(thread.id)}>
                    <XStack
                      alignItems="center"
                      gap={12}
                      paddingHorizontal={14}
                      paddingVertical={12}
                      backgroundColor={isUnread ? palette.primarySoft : palette.white}
                      borderBottomWidth={isLast ? 0 : 1}
                      borderBottomColor={palette.line}
                    >
                      <View width={52} height={52}>
                        <View
                          width={52}
                          height={52}
                          borderRadius={26}
                          style={{ backgroundColor: thread.accent }}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {thread.avatarImage ? (
                            <Image
                              source={thread.avatarImage}
                              style={{ width: 52, height: 52, borderRadius: 26 }}
                              contentFit="cover"
                            />
                          ) : (
                            <Text color={palette.white} fontWeight="700" fontSize={14}>
                              {thread.initials}
                            </Text>
                          )}
                        </View>
                        <View
                          position="absolute"
                          bottom={-2}
                          right={-2}
                          width={20}
                          height={20}
                          borderRadius={10}
                          backgroundColor={palette.fog}
                          alignItems="center"
                          justifyContent="center"
                          borderWidth={2}
                          borderColor={palette.white}
                        >
                          <IconlyIcon
                            name={thread.kind === 'event' ? 'Group' : 'User'}
                            size={10}
                            color={palette.slate}
                          />
                        </View>
                      </View>
                      <YStack flex={1} minWidth={0} gap={3}>
                        <XStack alignItems="center" justifyContent="space-between" gap={8}>
                          <Text
                            fontSize={15}
                            fontWeight={isUnread ? '800' : '700'}
                            color={palette.ink}
                            numberOfLines={1}
                            flexShrink={1}
                          >
                            {thread.title}
                          </Text>
                          {lastMessage ? (
                            <Text fontSize={12} fontWeight={isUnread ? '700' : '500'} color={isUnread ? palette.primary : palette.muted}>
                              {lastMessage.sentAt}
                            </Text>
                          ) : null}
                        </XStack>
                        <XStack alignItems="center" justifyContent="space-between" gap={8}>
                          <XStack flex={1} minWidth={0} alignItems="center" gap={4}>
                            {lastMessage?.fromSelf ? (
                              <IconlyIcon name="CheckCircle" size={13} color={palette.muted} />
                            ) : null}
                            <Text
                              fontSize={13}
                              fontWeight={isUnread ? '700' : '500'}
                              color={isUnread ? palette.inkSoft : palette.gray}
                              numberOfLines={1}
                              flexShrink={1}
                            >
                              {lastMessage
                                ? `${lastMessage.fromSelf ? 'You: ' : ''}${lastMessage.text}`
                                : `Say hi to ${thread.title}.`}
                            </Text>
                          </XStack>
                          <XStack alignItems="center" gap={6}>
                            {thread.pinned ? (
                              <IconlyIcon name="Location" size={13} color={palette.silver} />
                            ) : null}
                            {isUnread ? (
                              <View width={20} height={20} borderRadius={10} backgroundColor={palette.primary} alignItems="center" justifyContent="center">
                                <Text color={palette.white} fontSize={11} fontWeight="700">
                                  {thread.unreadCount}
                                </Text>
                              </View>
                            ) : null}
                          </XStack>
                        </XStack>
                      </YStack>
                    </XStack>
                  </Pressable>
                );
              })}
            </YStack>
          </ScrollView>
        )}
      </View>
      )}

      {isComposing ? (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor={palette.white}
        >
          <XStack
            alignItems="center"
            gap={10}
            paddingHorizontal={16}
            paddingTop={insets.top + 8}
            paddingBottom={10}
          >
            <Pressable onPress={closeCompose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
              <View width={36} height={36} borderRadius={18} alignItems="center" justifyContent="center">
                <IconlyIcon name="ArrowLeft" size={18} color={palette.ink} />
              </View>
            </Pressable>
            <View flex={1}>
              <SearchBar
                query={composeQuery}
                placeholder="Search people to message"
                autoFocus
                onQueryChange={setComposeQuery}
              />
            </View>
          </XStack>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {composeQuery.trim() === '' ? (
              <YStack alignItems="center" paddingTop={60} gap={4}>
                <Text fontSize={14} fontWeight="700" color={palette.ink}>
                  Find someone to message
                </Text>
                <Text fontSize={13} color={palette.gray}>
                  Search by name.
                </Text>
              </YStack>
            ) : composeResults.length === 0 ? (
              <YStack alignItems="center" paddingTop={60} gap={4}>
                <Text fontSize={14} fontWeight="700" color={palette.ink}>
                  No people found
                </Text>
                <Text fontSize={13} color={palette.gray}>
                  Try a different name.
                </Text>
              </YStack>
            ) : (
              <YStack gap={2} paddingTop={8}>
                {composeResults.map((person) => (
                  <ChatSearchRow
                    key={person.key}
                    avatarLabel={person.name}
                    avatarImage={person.image}
                    title={person.name}
                    subtitle={`${person.role} · ${person.event.title}`}
                    icon="MessageCircleDots"
                    onPress={() => startConversation(person, closeCompose)}
                  />
                ))}
              </YStack>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
