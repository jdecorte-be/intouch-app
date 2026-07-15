import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';

const ENTRY_DURATION = 420;
const HOLD_DURATION = 1150;
const EXIT_DURATION = 320;

export function AppSplashScreen({ onFinish }: { onFinish: () => void }) {
  const opacity = useSharedValue(1);
  const logoScale = useSharedValue(0.94);
  const contentY = useSharedValue(12);
  const progress = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withTiming(1, { duration: ENTRY_DURATION });
    contentY.value = withTiming(0, { duration: ENTRY_DURATION });
    progress.value = withTiming(1, { duration: HOLD_DURATION + 120 });

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      });
    }, HOLD_DURATION);

    return () => clearTimeout(timeout);
  }, [contentY, logoScale, onFinish, opacity, progress]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentY.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <Animated.View pointerEvents="auto" style={[styles.shell, shellStyle]}>
      <Animated.View style={[styles.content, contentStyle]}>
        <YStack alignItems="center" gap={24}>
          <Animated.View style={logoStyle}>
            <View
              width={116}
              height={116}
              borderRadius={34}
              backgroundColor={palette.white}
              alignItems="center"
              justifyContent="center"
              borderWidth={1}
              borderColor="rgba(41,47,54,0.08)"
              shadowColor="#0f172a"
              shadowOpacity={0.06}
              shadowRadius={30}
              shadowOffset={{ width: 0, height: 10 }}
            >
              <View
                width={70}
                height={70}
                borderRadius={22}
                backgroundColor={palette.ink}
                alignItems="center"
                justifyContent="center"
              >
                <Text color={palette.white} fontSize={32} fontWeight="800" letterSpacing={0}>
                  R
                </Text>
              </View>
              <View
                position="absolute"
                top={18}
                right={18}
                width={22}
                height={22}
                borderRadius={11}
                backgroundColor={palette.coral}
                borderWidth={3}
                borderColor={palette.white}
              />
              <View
                position="absolute"
                bottom={18}
                left={18}
                width={22}
                height={22}
                borderRadius={11}
                backgroundColor={palette.teal}
                borderWidth={3}
                borderColor={palette.white}
              />
            </View>
          </Animated.View>

          <YStack alignItems="center" gap={8}>
            <Text color={palette.ink} fontSize={30} lineHeight={34} fontWeight="800" letterSpacing={0}>
              ReTalk
            </Text>
            <Text color={palette.gray} fontSize={13} lineHeight={19} fontWeight="600" textAlign="center">
              Find events tonight and the people to go with.
            </Text>
          </YStack>

          <XStack
            alignItems="center"
            gap={8}
            borderRadius={999}
            backgroundColor={palette.white}
            paddingHorizontal={10}
            paddingVertical={8}
            borderWidth={1}
            borderColor="rgba(41,47,54,0.08)"
            shadowColor="#0f172a"
            shadowOpacity={0.05}
            shadowRadius={16}
            shadowOffset={{ width: 0, height: 4 }}
          >
            <View
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor={palette.coralSoft}
              alignItems="center"
              justifyContent="center"
            >
              <IconlyIcon name="Calendar" size={15} color={palette.ink} />
            </View>
            <Text color={palette.ink} fontSize={12} fontWeight="800">
              Today
            </Text>
            <View width={1} height={18} backgroundColor={palette.line} />
            <View
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor={palette.tealSoft}
              alignItems="center"
              justifyContent="center"
            >
              <IconlyIcon name="Group" size={16} color={palette.ink} />
            </View>
            <Text color={palette.ink} fontSize={12} fontWeight="800">
              Groups nearby
            </Text>
          </XStack>

          <View width={104} height={4} borderRadius={999} backgroundColor="rgba(41,47,54,0.1)" overflow="hidden">
            <Animated.View style={[styles.progress, progressStyle]} />
          </View>
        </YStack>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mist,
    paddingHorizontal: 32,
  },
  content: {
    width: '100%',
    maxWidth: 360,
  },
  progress: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.ink,
  },
});
