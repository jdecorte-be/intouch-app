import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { SearchBar } from '@/components/events/search-bar';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { palette } from '@/lib/palette';
import type { PersonSearchResult } from '@/lib/search-utils';
import { searchPeople } from '@/lib/search-utils';
import type { ChatFilterTag } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useEventsStore } from '@/stores/events-store';

type ChatFilterKey = 'all' | 'groups' | ChatFilterTag;

const CHAT_FILTERS: { key: ChatFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'work', label: 'Work' },
  { key: 'groups', label: 'Groups' },
  { key: 'community', label: 'Community' },
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const openThread = (chatId: string) => {
    markThreadRead(chatId);
    router.push(`/chat/${chatId}`);
  };

  const openSearch = () => setIsSearching(true);

  const closeSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
  };

  const userResults = useMemo(
    () => (searchQuery.trim() ? searchPeople(events, searchQuery) : []),
    [events, searchQuery],
  );

  const messagePerson = async (person: PersonSearchResult) => {
    if (!person.userId) {
      closeSearch();
      router.push(`/user/${encodeURIComponent(person.key)}`);
      return;
    }

    try {
      const chatId = await startDirectChat(person.name, person.userId);
      closeSearch();
      router.push(`/chat/${chatId}`);
    } catch {
      Alert.alert("Couldn't start chat", 'Please try again.');
    }
  };

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
      {isSearching ? (
        <XStack
          alignItems="center"
          gap={10}
          paddingHorizontal={16}
          paddingTop={insets.top + 8}
          paddingBottom={10}
        >
          <Pressable onPress={closeSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close search">
            <View width={36} height={36} borderRadius={18} alignItems="center" justifyContent="center">
              <IconlyIcon name="ArrowLeft" size={18} color={palette.ink} />
            </View>
          </Pressable>
          <View flex={1}>
            <SearchBar
              query={searchQuery}
              placeholder="Search people"
              autoFocus
              onQueryChange={setSearchQuery}
            />
          </View>
        </XStack>
      ) : (
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
          <XStack alignItems="center" gap={20}>
            <Pressable onPress={openSearch} hitSlop={8} accessibilityRole="button" accessibilityLabel="Search people">
              <IconlyIcon name="Search" size={22} color={palette.ink} />
            </Pressable>
          </XStack>
        </XStack>
      )}

      {isSearching ? (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {searchQuery.trim() === '' ? (
            <YStack alignItems="center" paddingTop={60} gap={4}>
              <Text fontSize={14} fontWeight="700" color={palette.ink}>
                Find people to message
              </Text>
              <Text fontSize={13} color={palette.gray}>
                Search by name.
              </Text>
            </YStack>
          ) : userResults.length === 0 ? (
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
              {userResults.map((person) => (
                <Pressable key={person.key} onPress={() => messagePerson(person)}>
                  <XStack alignItems="center" gap={12} borderRadius={18} padding={10}>
                    <UserAvatar label={person.name} image={person.image} size={48} />
                    <YStack flex={1} minWidth={0} gap={3}>
                      <Text fontSize={14} fontWeight="800" color={palette.ink} numberOfLines={1}>
                        {person.name}
                      </Text>
                      <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
                        {person.role} · {person.event.title}
                      </Text>
                    </YStack>
                    <IconlyIcon name="MessageCircleDots" size={18} color={palette.primary} />
                  </XStack>
                </Pressable>
              ))}
            </YStack>
          )}
        </ScrollView>
      ) : (
        <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 16 }}
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
                      shadowColor: '#292f36',
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 3 },
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
                      <Text color="white" fontWeight="700" fontSize={16}>
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
                      borderColor="white"
                    >
                      <Text color="white" fontSize={10} fontWeight="800">
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
                <Text fontSize={14} fontWeight="700" color={selected ? 'white' : palette.slate}>
                  {filter.label}
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
              <Text fontSize={16} fontWeight="700" color={palette.ink} marginTop={8}>
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
              backgroundColor="white"
              overflow="hidden"
              shadowColor="#292f36"
              shadowOpacity={0.06}
              shadowRadius={12}
              shadowOffset={{ width: 0, height: 4 }}
              elevation={2}
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
                      backgroundColor={isUnread ? palette.primarySoft : 'white'}
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
                            <Text color="white" fontWeight="700" fontSize={14}>
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
                          borderColor="white"
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
                                <Text color="white" fontSize={11} fontWeight="700">
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
        </>
      )}
    </View>
  );
}
