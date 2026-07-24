import * as Haptics from 'expo-haptics';
import { Image, type ImageLoadEventData } from 'expo-image';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text, View, XStack, YStack } from 'tamagui';

import { LocationMessageCard } from '@/components/chat/location-message-card';
import { MessageReactions } from '@/components/chat/message-reactions';
import { PollMessageCard } from '@/components/chat/poll-message-card';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { YouTubeEmbed } from '@/components/ui/youtube-embed';
import { parseLocationFromText } from '@/lib/location-share';
import { palette } from '@/lib/palette';
import { parsePollFromText } from '@/lib/poll';
import { parseReplyFromText } from '@/lib/reply';
import type { ChatMessage } from '@/lib/types';
import { extractYouTubeVideoId } from '@/lib/youtube';

const IMAGE_DEFAULT_SIZE = 200;
const IMAGE_MAX_WIDTH = 240;
const IMAGE_MAX_HEIGHT = 320;
const REPLY_SWIPE_TRIGGER = 56;
const REPLY_SWIPE_MAX = 76;

function resolveMessageContent(text: string) {
  const replyMatch = parseReplyFromText(text);
  const bodyText = replyMatch ? replyMatch.text : text;
  const poll = bodyText ? parsePollFromText(bodyText) : null;
  const location = !poll && bodyText ? parseLocationFromText(bodyText) : null;
  const videoId = !poll && !location && bodyText ? extractYouTubeVideoId(bodyText) : null;

  return { poll, location, videoId, reply: replyMatch?.reply ?? null, bodyText };
}

export type MessageBubbleProps = {
  message: ChatMessage;
  pollVoteState?: { counts: number[]; myVote: number | null };
  onOpenProfile: (personId?: string | null) => void;
  onOpenReactionPicker: (messageId: string, fromSelf: boolean, pageY: number) => void;
  onLikeMessage: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onVotePoll: (messageId: string, optionIndex: number, optionCount: number) => void;
  onReply: (message: ChatMessage) => void;
};

function MessageBubbleComponent({
  message,
  pollVoteState,
  onOpenProfile,
  onOpenReactionPicker,
  onLikeMessage,
  onToggleReaction,
  onVotePoll,
  onReply,
}: MessageBubbleProps) {
  const { poll, location, videoId, reply, bodyText } = useMemo(
    () => resolveMessageContent(message.text),
    [message.text],
  );
  const [imageRatio, setImageRatio] = useState<number | null>(null);

  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
          heartScale.value = withSequence(
            withSpring(1.2, { damping: 9, stiffness: 220 }),
            withSpring(1, { damping: 12, stiffness: 220 }),
          );
          heartOpacity.value = withSequence(
            withTiming(1, { duration: 120 }),
            withDelay(300, withTiming(0, { duration: 250 })),
          );
          runOnJS(onLikeMessage)(message.id);
        }),
    [message.id, onLikeMessage, heartScale, heartOpacity],
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(220)
        .onStart((event) => {
          runOnJS(onOpenReactionPicker)(message.id, message.fromSelf, event.absoluteY);
        }),
    [message.id, message.fromSelf, onOpenReactionPicker],
  );

  const messageGesture = useMemo(
    () => Gesture.Race(doubleTapGesture, longPressGesture),
    [doubleTapGesture, longPressGesture],
  );

  const swipeX = useSharedValue(0);

  const handleReplySwipe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onReply(message);
  }, [message, onReply]);

  const replyGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          const direction = message.fromSelf ? -1 : 1;
          const magnitude = Math.max(0, Math.min(event.translationX * direction, REPLY_SWIPE_MAX));
          swipeX.value = magnitude * direction;
        })
        .onEnd(() => {
          if (Math.abs(swipeX.value) >= REPLY_SWIPE_TRIGGER) {
            runOnJS(handleReplySwipe)();
          }
          swipeX.value = withSpring(0, { damping: 18, stiffness: 260 });
        }),
    [message.fromSelf, swipeX, handleReplySwipe],
  );

  const combinedGesture = useMemo(
    () => Gesture.Simultaneous(replyGesture, messageGesture),
    [replyGesture, messageGesture],
  );

  const bubbleSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(swipeX.value) / REPLY_SWIPE_TRIGGER, 1);

    return {
      opacity: progress,
      transform: [{ scale: 0.6 + progress * 0.4 }],
    };
  });

  if (message.kind === 'system') {
    return (
      <XStack justifyContent="center">
        <Text fontSize={11} fontWeight="600" color={palette.muted} textAlign="center">
          {message.text}
        </Text>
      </XStack>
    );
  }

  let imageWidth = IMAGE_DEFAULT_SIZE;
  let imageHeight = IMAGE_DEFAULT_SIZE;

  if (imageRatio) {
    imageWidth = IMAGE_MAX_WIDTH;
    imageHeight = IMAGE_MAX_WIDTH / imageRatio;

    if (imageHeight > IMAGE_MAX_HEIGHT) {
      imageHeight = IMAGE_MAX_HEIGHT;
      imageWidth = IMAGE_MAX_HEIGHT * imageRatio;
    }
  }

  const handleImageLoad = (event: ImageLoadEventData) => {
    const { width, height } = event.source;

    if (width && height) {
      setImageRatio(width / height);
    }
  };

  return (
    <XStack
      position="relative"
      justifyContent={message.fromSelf ? 'flex-end' : 'flex-start'}
      alignItems="flex-end"
      gap={8}
    >
      {!message.fromSelf ? (
        <Pressable onPress={() => onOpenProfile(message.authorId)} hitSlop={4}>
          <UserAvatar label={message.author} image={message.authorImage} size={26} />
        </Pressable>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.replyIcon,
          message.fromSelf ? styles.replyIconRight : styles.replyIconLeft,
          replyIconStyle,
        ]}
      >
        <IconlyIcon name="Reply" size={18} color={palette.gray} />
      </Animated.View>
      <Animated.View
        style={[{ maxWidth: '72%', alignItems: message.fromSelf ? 'flex-end' : 'flex-start' }, bubbleSwipeStyle]}
      >
        <GestureDetector gesture={combinedGesture}>
          <YStack
            position="relative"
            borderRadius={16}
            borderBottomRightRadius={message.fromSelf ? 6 : 16}
            borderBottomLeftRadius={message.fromSelf ? 16 : 6}
            backgroundColor={message.image ? 'transparent' : message.fromSelf ? palette.ink : palette.white}
            borderWidth={message.image ? 0 : message.fromSelf ? 0 : 1}
            borderColor={palette.border}
            padding={message.image ? 0 : undefined}
            paddingHorizontal={message.image ? 0 : 14}
            paddingVertical={message.image ? 0 : 10}
            overflow="hidden"
          >
            {!message.fromSelf && !message.image ? (
              <Text fontSize={11} fontWeight="700" color={palette.silver} marginBottom={4}>
                {message.author}
              </Text>
            ) : null}
            {message.image ? (
              <Image
                source={message.image}
                style={{ width: imageWidth, height: imageHeight, borderRadius: 16 }}
                contentFit="cover"
                onLoad={handleImageLoad}
              />
            ) : poll ? (
              <PollMessageCard
                poll={poll}
                fromSelf={message.fromSelf}
                votes={pollVoteState?.counts ?? new Array(poll.options.length).fill(0)}
                myVote={pollVoteState?.myVote ?? null}
                onVote={(optionIndex) => onVotePoll(message.id, optionIndex, poll.options.length)}
              />
            ) : location ? (
              <LocationMessageCard location={location} fromSelf={message.fromSelf} />
            ) : (
              <>
                {reply ? (
                  <View
                    marginBottom={6}
                    borderLeftWidth={3}
                    borderLeftColor={message.fromSelf ? 'rgba(255,255,255,0.5)' : palette.primary}
                    backgroundColor={message.fromSelf ? 'rgba(255,255,255,0.12)' : palette.primarySoft}
                    borderRadius={8}
                    paddingVertical={6}
                    paddingHorizontal={8}
                  >
                    <Text
                      fontSize={11}
                      fontWeight="700"
                      color={message.fromSelf ? 'rgba(255,255,255,0.85)' : palette.primary}
                    >
                      {reply.author}
                    </Text>
                    <Text
                      fontSize={12}
                      color={message.fromSelf ? 'rgba(255,255,255,0.75)' : palette.gray}
                      numberOfLines={2}
                    >
                      {reply.text}
                    </Text>
                  </View>
                ) : null}
                <Text fontSize={14} lineHeight={20} color={message.fromSelf ? palette.white : palette.ink}>
                  {bodyText}
                </Text>
                {videoId ? (
                  <View marginTop={8}>
                    <YouTubeEmbed videoId={videoId} width={220} />
                  </View>
                ) : null}
              </>
            )}
            <Text
              fontSize={10}
              fontWeight="600"
              marginTop={4}
              paddingHorizontal={message.image ? 8 : 0}
              paddingBottom={message.image ? 2 : 0}
              color={message.fromSelf && !message.image ? 'rgba(255,255,255,0.6)' : palette.muted}
            >
              {message.sentAt}
            </Text>
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.heartOverlay, heartStyle]}>
              <IconlyIcon name="Heart" size={48} color={palette.coral} weight="bold" />
            </Animated.View>
          </YStack>
        </GestureDetector>
        <MessageReactions
          reactions={message.reactions ?? []}
          align={message.fromSelf ? 'flex-end' : 'flex-start'}
          onToggle={(emoji) => onToggleReaction(message.id, emoji)}
          marginTop={message.image ? -2 : 4}
        />
      </Animated.View>
    </XStack>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  heartOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyIcon: {
    position: 'absolute',
    bottom: 14,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyIconLeft: {
    left: 34,
  },
  replyIconRight: {
    right: -30,
  },
});
