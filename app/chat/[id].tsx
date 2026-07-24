import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { AttachmentMenu } from '@/components/chat/attachment-menu';
import { GifPickerModal } from '@/components/chat/gif-picker-modal';
import { MessageBubble } from '@/components/chat/message-bubble';
import { PollComposerModal } from '@/components/chat/poll-composer-modal';
import { ReactionPicker } from '@/components/chat/reaction-picker';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { buildLocationMessageText } from '@/lib/location-share';
import { palette } from '@/lib/palette';
import { buildPollMessageText } from '@/lib/poll';
import { buildReplyMessageText, summarizeMessageForReply } from '@/lib/reply';
import { appTextInputStyle } from '@/lib/typography';
import type { ChatMessage } from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useSessionStore } from '@/stores/session-store';

type ReactionPickerTarget = { messageId: string; top: number; alignRight: boolean };

function HeaderIconButton({
  icon,
  color,
  onPress,
}: {
  icon: Parameters<typeof IconlyIcon>[0]['name'];
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View width={34} height={34} alignItems="center" justifyContent="center">
        <IconlyIcon name={icon} size={19} color={color ?? palette.gray} />
      </View>
    </Pressable>
  );
}

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState('');
  const [isGifPickerOpen, setIsGifPickerOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isPollComposerOpen, setIsPollComposerOpen] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<ReactionPickerTarget | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const thread = useChatStore((state) => state.threads.find((candidate) => candidate.id === id));
  const sendMessage = useChatStore((state) => state.sendMessage);
  const toggleReaction = useChatStore((state) => state.toggleReaction);
  const pollVotes = useChatStore((state) => state.pollVotes);
  const votePoll = useChatStore((state) => state.votePoll);
  const leaveChat = useChatStore((state) => state.leaveChat);
  const markThreadRead = useChatStore((state) => state.markThreadRead);
  const loadThreadMessages = useChatStore((state) => state.loadThreadMessages);
  const user = useSessionStore((state) => state.user);

  useEffect(() => {
    if (id) {
      markThreadRead(id);
      void loadThreadMessages(id);
    }
  }, [id, markThreadRead, loadThreadMessages]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const openProfile = useCallback(
    (personId?: string | null) => {
      if (personId) {
        router.push(`/user/${encodeURIComponent(personId)}`);
      }
    },
    [router],
  );

  const openReactionPicker = useCallback(
    (messageId: string, fromSelf: boolean, pageY: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const top = Math.max(insets.top + 60, pageY - 70);
      setReactionTarget({ messageId, top, alignRight: fromSelf });
    },
    [insets.top],
  );

  const startReply = useCallback((message: ChatMessage) => {
    setReplyTarget(message);
  }, []);

  const likeMessage = useCallback(
    (messageId: string) => {
      const chatId = thread?.id;

      if (!chatId) {
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      toggleReaction(chatId, messageId, '❤️');
    },
    [thread?.id, toggleReaction],
  );

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      const chatId = thread?.id;

      if (!chatId) {
        return;
      }

      toggleReaction(chatId, messageId, emoji);
    },
    [thread?.id, toggleReaction],
  );

  if (!thread) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} backgroundColor={palette.white}>
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

  const buildOutgoingText = (text: string) => {
    if (!replyTarget) {
      return text;
    }

    return buildReplyMessageText(
      {
        author: replyTarget.author,
        text: summarizeMessageForReply(replyTarget),
        image: replyTarget.image ?? null,
      },
      text,
    );
  };

  const submit = () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    sendMessage(thread.id, buildOutgoingText(text), user?.name || user?.email || 'You');
    setDraft('');
    setReplyTarget(null);
  };

  const sendImageMessage = (imageUri: string) => {
    sendMessage(thread.id, buildOutgoingText(''), user?.name || user?.email || 'You', imageUri);
    setReplyTarget(null);
  };

  const pickImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to send a picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      sendImageMessage(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      sendImageMessage(result.assets[0].uri);
    }
  };

  const shareLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow location access to share where you are.');
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      sendMessage(
        thread.id,
        buildLocationMessageText(position.coords.latitude, position.coords.longitude),
        user?.name || user?.email || 'You',
      );
    } catch {
      Alert.alert("Couldn't get your location", 'Please try again.');
    }
  };

  const createPoll = (question: string, options: string[]) => {
    setIsPollComposerOpen(false);
    sendMessage(thread.id, buildPollMessageText(question, options), user?.name || user?.email || 'You');
  };

  const openHeaderTarget = () => {
    if (thread.kind === 'direct') {
      openProfile(thread.participants.find((participant) => participant.id !== user?.id)?.id);
    } else if (thread.eventId) {
      router.push(`/event/${thread.eventId}`);
    }
  };

  const reportChat = () => {
    Alert.alert('Report this chat?', 'Let us know something is wrong and we’ll take a look.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => Alert.alert('Reported', "Thanks, we'll take a look."),
      },
    ]);
  };

  const showChatInfo = () => {
    const names = thread.participants.map((participant) => participant.name).join(', ') || 'No one yet';
    Alert.alert(`${thread.participantCount} participant${thread.participantCount === 1 ? '' : 's'}`, names);
  };

  const selectReaction = (emoji: string) => {
    if (reactionTarget) {
      toggleReaction(thread.id, reactionTarget.messageId, emoji);
    }
    setReactionTarget(null);
  };

  const confirmLeaveChat = () => {
    Alert.alert('Leave this chat?', `You’ll stop receiving messages from ${thread.title}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          leaveChat(thread.id)
            .then(() => router.back())
            .catch(() => Alert.alert("Couldn't leave", 'Please try again.'));
        },
      },
    ]);
  };

  const previewParticipants = thread.participants.slice(0, 3);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View flex={1} backgroundColor={palette.white}>
        {/* Header */}
        <YStack
          borderBottomWidth={1}
          borderColor={palette.border}
          backgroundColor={palette.white}
          paddingHorizontal={12}
          paddingTop={insets.top + 8}
          paddingBottom={12}
          gap={8}
        >
          <XStack alignItems="center" gap={10}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <View width={36} height={36} borderRadius={18} alignItems="center" justifyContent="center">
                <IconlyIcon name="ArrowLeft" size={18} color={palette.gray} />
              </View>
            </Pressable>
            <Pressable onPress={openHeaderTarget} hitSlop={4} style={{ flex: 1, minWidth: 0 }}>
              <YStack flex={1} minWidth={0} gap={3}>
                <XStack alignItems="center" gap={6}>
                  {thread.icon ? (
                    <Text fontSize={18}>{thread.icon}</Text>
                  ) : (
                    <View
                      width={28}
                      height={28}
                      borderRadius={9}
                      style={{ backgroundColor: thread.accent }}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {thread.avatarImage ? (
                        <Image
                          source={thread.avatarImage}
                          style={{ width: 28, height: 28, borderRadius: 9 }}
                          contentFit="cover"
                        />
                      ) : (
                        <Text color={palette.white} fontWeight="700" fontSize={10}>
                          {thread.initials}
                        </Text>
                      )}
                    </View>
                  )}
                  <Text fontSize={15} fontWeight="700" color={palette.ink} numberOfLines={1} flexShrink={1}>
                    {thread.title}
                  </Text>
                </XStack>
                {thread.kind !== 'direct' && previewParticipants.length ? (
                  <XStack alignItems="center" gap={6}>
                    <XStack>
                      {previewParticipants.map((participant, index) => (
                        <Pressable
                          key={participant.id}
                          onPress={() => openProfile(participant.id)}
                          hitSlop={4}
                          style={{ marginLeft: index === 0 ? 0 : -8 }}
                        >
                          <View borderWidth={1.5} borderColor={palette.white} borderRadius={11}>
                            <UserAvatar label={participant.name} image={participant.image} size={18} />
                          </View>
                        </Pressable>
                      ))}
                    </XStack>
                    <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
                      {thread.participantCount} participant{thread.participantCount === 1 ? '' : 's'}
                    </Text>
                  </XStack>
                ) : (
                  <Text fontSize={12} fontWeight="600" color={palette.gray} numberOfLines={1}>
                    {thread.subtitle}
                  </Text>
                )}
              </YStack>
            </Pressable>
            {thread.kind === 'event' ? (
              <HeaderIconButton icon="ArrowOutRightCircleHalf" color={palette.danger} onPress={confirmLeaveChat} />
            ) : null}
            <HeaderIconButton icon="Danger" onPress={reportChat} />
            <HeaderIconButton icon="InfoCircle" onPress={showChatInfo} />
          </XStack>
        </YStack>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={thread.messages}
          keyExtractor={(message) => message.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => {
            if (isKeyboardVisible) {
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              pollVoteState={pollVotes[item.id]}
              onOpenProfile={openProfile}
              onOpenReactionPicker={openReactionPicker}
              onLikeMessage={likeMessage}
              onToggleReaction={handleToggleReaction}
              onVotePoll={votePoll}
              onReply={startReply}
            />
          )}
          ListEmptyComponent={
            <Text paddingVertical={24} textAlign="center" fontSize={14} lineHeight={22} color={palette.gray}>
              No messages yet. Say hi to {thread.title}!
            </Text>
          }
        />

        {/* Composer */}
        <YStack borderTopWidth={1} borderColor={palette.border} backgroundColor={palette.white}>
          {replyTarget ? (
            <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingTop={10}>
              <View width={3} height={32} borderRadius={2} backgroundColor={palette.primary} />
              <YStack flex={1}>
                <Text fontSize={12} fontWeight="700" color={palette.primary}>
                  Replying to {replyTarget.fromSelf ? 'yourself' : replyTarget.author}
                </Text>
                <Text fontSize={12} color={palette.gray} numberOfLines={1}>
                  {summarizeMessageForReply(replyTarget)}
                </Text>
              </YStack>
              <Pressable onPress={() => setReplyTarget(null)} hitSlop={8}>
                <View width={28} height={28} alignItems="center" justifyContent="center">
                  <IconlyIcon name="X" size={18} color={palette.gray} />
                </View>
              </Pressable>
            </XStack>
          ) : null}
          <XStack alignItems="center" gap={8} padding={12} paddingBottom={isKeyboardVisible ? 12 : insets.bottom + 12}>
            <Pressable onPress={() => void takePicture()} hitSlop={6}>
              <View width={40} height={40} alignItems="center" justifyContent="center">
                <IconlyIcon name="Camera" size={22} color={palette.gray} />
              </View>
            </Pressable>
            <View
              flex={1}
              height={44}
              borderRadius={999}
              borderWidth={1}
              borderColor={palette.border}
              backgroundColor={palette.white}
              paddingHorizontal={16}
              justifyContent="center"
            >
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write a message"
                placeholderTextColor={palette.muted}
                style={[appTextInputStyle, { fontSize: 14, fontWeight: '500', color: palette.ink, paddingVertical: 0 }]}
                onSubmitEditing={submit}
                returnKeyType="send"
              />
            </View>
            <Pressable onPress={() => void pickImageFromLibrary()} hitSlop={6}>
              <View width={40} height={40} alignItems="center" justifyContent="center">
                <IconlyIcon name="Gallery" size={22} color={palette.gray} />
              </View>
            </Pressable>
            <Pressable onPress={() => setIsGifPickerOpen(true)} hitSlop={6}>
              <View width={40} height={40} alignItems="center" justifyContent="center">
                <View
                  paddingHorizontal={5}
                  height={18}
                  borderRadius={4}
                  borderWidth={1.5}
                  borderColor={palette.gray}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={10} fontWeight="800" color={palette.gray}>
                    GIF
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable onPress={() => setIsAttachmentMenuOpen(true)} hitSlop={6}>
              <View width={40} height={40} alignItems="center" justifyContent="center">
                <IconlyIcon name="Plus" size={22} color={palette.gray} />
              </View>
            </Pressable>
            {draft.trim() ? (
              <Pressable onPress={submit}>
                <View
                  width={64}
                  height={44}
                  borderRadius={12}
                  backgroundColor={palette.primary}
                  alignItems="center"
                  justifyContent="center"
                >
                  <IconlyIcon name="Send" size={24} color={palette.white} />
                </View>
              </Pressable>
            ) : null}
          </XStack>
        </YStack>
      </View>

      <GifPickerModal
        visible={isGifPickerOpen}
        onClose={() => setIsGifPickerOpen(false)}
        onSelect={(gifUrl) => {
          setIsGifPickerOpen(false);
          sendImageMessage(gifUrl);
        }}
      />

      <AttachmentMenu
        visible={isAttachmentMenuOpen}
        onClose={() => setIsAttachmentMenuOpen(false)}
        onPickImage={pickImageFromLibrary}
        onOpenGifPicker={() => setIsGifPickerOpen(true)}
        onShareLocation={() => void shareLocation()}
        onCreatePoll={() => setIsPollComposerOpen(true)}
      />

      <PollComposerModal
        visible={isPollComposerOpen}
        onClose={() => setIsPollComposerOpen(false)}
        onSubmit={createPoll}
      />

      <ReactionPicker
        target={reactionTarget}
        onSelect={selectReaction}
        onClose={() => setReactionTarget(null)}
      />
    </KeyboardAvoidingView>
  );
}
