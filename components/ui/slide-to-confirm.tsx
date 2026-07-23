import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text, View } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';

const TRACK_HEIGHT = 52;
const THUMB_SIZE = 44;
const THUMB_INSET = 4;
const THRESHOLD_RATIO = 0.8;
const SPRING = { damping: 22, stiffness: 220, mass: 0.8 };

export function SlideToConfirm({
  label,
  confirmingLabel = 'Joining…',
  onConfirm,
  disabled = false,
}: {
  label: string;
  confirmingLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const translateX = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const maxTranslate = Math.max(trackWidth - THUMB_SIZE - THUMB_INSET * 2, 0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const settle = () => {
    translateX.value = withSpring(0, SPRING);
  };

  const confirm = () => {
    setIsConfirming(true);
    Promise.resolve(onConfirm()).finally(() => {
      setIsConfirming(false);
      settle();
    });
  };

  const pan = Gesture.Pan()
    .enabled(!disabled && !isConfirming && maxTranslate > 0)
    .onStart(() => {
      dragStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(Math.max(dragStartX.value + event.translationX, 0), maxTranslate);
    })
    .onEnd(() => {
      if (translateX.value >= maxTranslate * THRESHOLD_RATIO) {
        translateX.value = withSpring(maxTranslate, SPRING);
        runOnJS(confirm)();
      } else {
        translateX.value = withSpring(0, SPRING);
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + THUMB_INSET * 2,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: maxTranslate > 0 ? 1 - Math.min(translateX.value / (maxTranslate * 0.6), 1) : 1,
  }));

  return (
    <View
      height={TRACK_HEIGHT}
      borderRadius={TRACK_HEIGHT / 2}
      backgroundColor={palette.fog}
      overflow="hidden"
      opacity={disabled ? 0.6 : 1}
      onLayout={handleLayout}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            borderRadius: TRACK_HEIGHT / 2,
            overflow: 'hidden',
          },
          fillStyle,
        ]}
      >
        <LinearGradient
          colors={[palette.primary, '#7b55ff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
          labelStyle,
        ]}
      >
        <Text fontSize={14} fontWeight="800" color={palette.ink}>
          {isConfirming ? confirmingLabel : label}
        </Text>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: THUMB_INSET,
              left: THUMB_INSET,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: 'white',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#0f172a',
              shadowOpacity: 0.2,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
            },
            thumbStyle,
          ]}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color={palette.primary} />
          ) : (
            <IconlyIcon name="ChevronRight" size={18} color={palette.primary} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
