import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { View } from 'tamagui';

import { HeroEventCard } from '@/components/home/hero-event-card';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';
import type { EventInterestState, EventItem } from '@/lib/types';

const EXIT_DURATION_MS = 260;
const MAX_VISIBLE_CARDS = 3;
const FRONT_MARGIN = 18;
const RING_PEEK = 0;
const GRAY_PEEK = 0;
const STACK_ROTATIONS = [0, -7, 5];
const STACK_TRANSLATE_Y = [0, 1, 3];
const SWIPE_THRESHOLD = 112;
const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };
const STACK_SPRING = { damping: 24, stiffness: 220, mass: 1 };
const EXIT_EASING = Easing.out(Easing.cubic);

function triggerHaptic(style: 'light' | 'medium') {
  void Haptics.impactAsync(
    style === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
  );
}

function StackedCard({
  event,
  interestState,
  targetOffset,
  isTop,
  frontWidth,
  boxSize,
  boxInset,
  translateX,
  translateY,
  onSelect,
  onToggleInterest,
  onJoin,
  gesture,
}: {
  event: EventItem;
  interestState?: EventInterestState;
  targetOffset: number;
  isTop: boolean;
  frontWidth: number;
  boxSize: number;
  boxInset: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  onSelect: () => void;
  onToggleInterest: () => void;
  onJoin: () => void;
  gesture: ReturnType<typeof Gesture.Pan>;
}) {
  const animatedOffset = useSharedValue(targetOffset);
  const ringWidth = frontWidth + RING_PEEK * 2;

  useEffect(() => {
    animatedOffset.value = withSpring(targetOffset, STACK_SPRING);
  }, [animatedOffset, targetOffset]);

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animatedOffset.value,
      [0, 1, 2],
      [frontWidth / boxSize, ringWidth / boxSize, 1],
      Extrapolation.CLAMP,
    );
    const stackShift = interpolate(animatedOffset.value, [0, 1, 2], STACK_TRANSLATE_Y, Extrapolation.CLAMP);
    const restRotate = interpolate(animatedOffset.value, [0, 1, 2], STACK_ROTATIONS, Extrapolation.CLAMP);
    const dragRotate = interpolate(translateX.value, [-frontWidth, 0, frontWidth], [-12, 0, 12], Extrapolation.CLAMP);
    const exitOpacity = isTop
      ? interpolate(Math.abs(translateX.value), [frontWidth * 0.55, frontWidth * 1.1], [1, 0], Extrapolation.CLAMP)
      : 1;

    return {
      opacity: exitOpacity,
      transform: [
        { translateX: isTop ? translateX.value : 0 },
        { translateY: stackShift + (isTop ? translateY.value : 0) },
        { scale },
        { rotateZ: `${isTop ? dragRotate : restRotate}deg` },
      ],
    };
  });

  const leftHintStyle = useAnimatedStyle(() => ({
    opacity: isTop ? interpolate(translateX.value, [-SWIPE_THRESHOLD, -24], [1, 0], Extrapolation.CLAMP) : 0,
  }));

  const rightHintStyle = useAnimatedStyle(() => ({
    opacity: isTop ? interpolate(translateX.value, [24, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP) : 0,
  }));

  const backingFill = targetOffset === 1 ? (
    <LinearGradient
      colors={palette.primaryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  ) : (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#b3b6ba' }]} />
  );

  const card = (
    <Animated.View
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      pointerEvents={isTop ? 'auto' : 'none'}
      style={[
        styles.card,
        isTop ? styles.movingCard : styles.backingCard,
        { left: boxInset, width: boxSize, height: boxSize },
        cardStyle,
      ]}
    >
      {isTop ? (
        <HeroEventCard
          event={event}
          interestState={interestState}
          onSelect={onSelect}
          onToggleInterest={onToggleInterest}
          onJoin={onJoin}
        />
      ) : (
        backingFill
      )}
      {isTop ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.swipeHint, styles.swipeHintLeft, leftHintStyle]}>
            <IconlyIcon name="ChevronLeft" size={18} color="white" />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.swipeHint, styles.swipeHintRight, rightHintStyle]}>
            <IconlyIcon name="ChevronRight" size={18} color="white" />
          </Animated.View>
        </>
      ) : null}
    </Animated.View>
  );

  if (isTop) {
    return <GestureDetector gesture={gesture}>{card}</GestureDetector>;
  }

  return card;
}

export function HeroEventSwiper({
  events,
  interestById,
  onSelect,
  onToggleInterest,
  onJoin,
}: {
  events: EventItem[];
  interestById: Record<string, EventInterestState>;
  onSelect: (event: EventItem) => void;
  onToggleInterest: (event: EventItem) => void;
  onJoin: (event: EventItem) => void;
}) {
  const { width } = useWindowDimensions();
  const [topIndex, setTopIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const hasCrossedThreshold = useSharedValue(false);
  const containerWidth = Math.max(260, width - 32);
  const frontWidth = containerWidth - FRONT_MARGIN * 2;
  const boxSize = frontWidth + GRAY_PEEK * 2;
  const boxInset = (containerWidth - boxSize) / 2;
  const exitDistance = frontWidth + 140;

  useEffect(() => {
    if (topIndex >= events.length) {
      setTopIndex(0);
    }
  }, [events.length, topIndex]);

  useLayoutEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    hasCrossedThreshold.value = false;
  }, [topIndex, translateX, translateY, hasCrossedThreshold]);

  const visibleEvents = useMemo(
    () =>
      Array.from({ length: Math.min(MAX_VISIBLE_CARDS, events.length) }, (_, offset) => ({
        event: events[(topIndex + offset) % events.length],
        offset,
      })),
    [events, topIndex],
  );

  const advanceCard = () => {
    triggerHaptic('medium');
    setTopIndex((currentIndex) => (events.length > 0 ? (currentIndex + 1) % events.length : 0));
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onStart(() => {
      hasCrossedThreshold.value = false;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      const crossed = Math.abs(event.translationX) > SWIPE_THRESHOLD;
      if (crossed && !hasCrossedThreshold.value) {
        hasCrossedThreshold.value = true;
        runOnJS(triggerHaptic)('light');
      } else if (!crossed && hasCrossedThreshold.value) {
        hasCrossedThreshold.value = false;
      }
    })
    .onEnd((event) => {
      const shouldAdvance = Math.abs(translateX.value) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > 900;

      if (shouldAdvance) {
        const direction = translateX.value >= 0 ? 1 : -1;

        translateX.value = withTiming(
          direction * exitDistance,
          { duration: EXIT_DURATION_MS, easing: EXIT_EASING },
          (finished) => {
            if (finished) {
              runOnJS(advanceCard)();
            }
          },
        );
        translateY.value = withTiming(translateY.value + event.velocityY * 0.08, {
          duration: EXIT_DURATION_MS,
          easing: EXIT_EASING,
        });
        return;
      }

      translateX.value = withSpring(0, SPRING);
      translateY.value = withSpring(0, SPRING);
    });

  if (events.length === 0) {
    return null;
  }

  return (
    <View marginBottom={2}>
      <View height={boxSize + 16}>
        {visibleEvents
          .slice()
          .reverse()
          .map(({ event, offset }) => (
            <StackedCard
              key={event.id}
              event={event}
              interestState={interestById[event.id]}
              targetOffset={offset}
              isTop={offset === 0}
              frontWidth={frontWidth}
              boxSize={boxSize}
              boxInset={boxInset}
              translateX={translateX}
              translateY={translateY}
              onSelect={() => onSelect(event)}
              onToggleInterest={() => onToggleInterest(event)}
              onJoin={() => onJoin(event)}
              gesture={pan}
            />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    backfaceVisibility: 'hidden',
  },
  movingCard: {
    zIndex: 3,
    borderRadius: 18,
    overflow: 'hidden',
  },
  backingCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  swipeHint: {
    position: 'absolute',
    top: '46%',
    width: 34,
    height: 34,
    borderRadius: 18,
    backgroundColor: 'rgba(9,9,11,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHintLeft: {
    left: 12,
  },
  swipeHintRight: {
    right: 12,
  },
});
