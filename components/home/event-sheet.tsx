import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { View } from 'tamagui';

import { palette } from '@/lib/palette';

const CLOSE_DRAG_DISTANCE = 144;
const SPRING = { damping: 22, stiffness: 220, mass: 0.8 };

export function EventSheet({
  isOpen,
  height,
  bottomOffset,
  onClose,
  children,
}: {
  isOpen: boolean;
  height: number;
  bottomOffset: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const hiddenOffset = height + bottomOffset + 60;
  const translateY = useSharedValue(hiddenOffset);
  const dragStartY = useSharedValue(0);

  useEffect(() => {
    translateY.value = isOpen
      ? withSpring(0, SPRING)
      : withTiming(hiddenOffset, { duration: 240 });
  }, [isOpen, hiddenOffset, translateY]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(0, dragStartY.value + event.translationY);
    })
    .onEnd(() => {
      if (translateY.value >= CLOSE_DRAG_DISTANCE) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sheet,
        { height, bottom: bottomOffset },
        animatedStyle,
      ]}
      pointerEvents={isOpen ? 'auto' : 'none'}
    >
      <GestureDetector gesture={pan}>
        <View paddingTop={8} paddingBottom={10} alignItems="center" backgroundColor="transparent">
          <View width={40} height={4} borderRadius={2} backgroundColor="rgba(41,47,54,0.2)" />
        </View>
      </GestureDetector>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: 'rgba(41,47,54,0.1)',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -18 },
    elevation: 16,
  },
});
