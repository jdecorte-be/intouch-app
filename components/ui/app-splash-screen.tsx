import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, YStack } from 'tamagui';

import { palette } from '@/lib/palette';

const LOGO_SIZE = 132;
const HOLD_DURATION = 1150;
const EXIT_DURATION = 300;

export function AppSplashScreen({ onFinish }: { onFinish: () => void }) {
  const reducedMotion = useReducedMotion();
  const entryDuration = reducedMotion ? 0 : 480;

  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const logoScale = useSharedValue(reducedMotion ? 1 : 0.86);
  const logoOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const wordmarkY = useSharedValue(reducedMotion ? 0 : 10);
  const wordmarkOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const progress = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withTiming(1, { duration: entryDuration + 200, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(1, { duration: entryDuration, easing: Easing.out(Easing.back(1.1)) });
    logoOpacity.value = withTiming(1, { duration: entryDuration });
    wordmarkY.value = withDelay(entryDuration * 0.4, withTiming(0, { duration: entryDuration }));
    wordmarkOpacity.value = withDelay(entryDuration * 0.4, withTiming(1, { duration: entryDuration }));
    progress.value = withTiming(1, {
      duration: HOLD_DURATION + entryDuration,
      easing: Easing.inOut(Easing.ease),
    });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      });
    }, HOLD_DURATION + entryDuration);

    return () => clearTimeout(timeout);
  }, [
    entryDuration,
    glowOpacity,
    logoOpacity,
    logoScale,
    onFinish,
    opacity,
    progress,
    wordmarkOpacity,
    wordmarkY,
  ]);

  const shellStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value * 0.5 }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const insets = useSafeAreaInsets();

  return (
    <Animated.View pointerEvents="auto" style={[styles.shell, shellStyle]}>
      <Animated.View style={[styles.glow, glowStyle]} />

      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.View style={wordmarkStyle}>
          <YStack alignItems="center" gap={6} marginTop={22}>
            <Text color={palette.ink} fontSize={26} lineHeight={30} fontWeight="800" letterSpacing={-0.3}>
              InTouch
            </Text>
            <Text color={palette.gray} fontSize={14} lineHeight={20} fontWeight="500" textAlign="center">
              Find events tonight and the people to go with.
            </Text>
          </YStack>
        </Animated.View>
      </View>

      <View style={[styles.progressTrack, { marginBottom: Math.max(insets.bottom, 20) + 28 }]}>
        <Animated.View style={[styles.progressFill, progressStyle]}>
          <LinearGradient
            colors={[palette.primary, palette.primaryEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  glow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: palette.primarySoft,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    width: 72,
    height: 4,
    borderRadius: 999,
    backgroundColor: palette.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
});
