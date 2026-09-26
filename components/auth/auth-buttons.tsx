import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text, View, XStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';

import { type AuthMode, authCopy } from './auth-form';
import { authStyles, dark } from './auth-styles';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <View
        width={40}
        height={40}
        borderRadius={20}
        alignItems="center"
        justifyContent="center"
        backgroundColor={dark.surfaceElevated}
      >
        <IconlyIcon name="ChevronLeft" size={20} color={dark.textPrimary} />
      </View>
    </Pressable>
  );
}

export function AuthHeader({ onBack }: { onBack: () => void }) {
  return (
    <XStack alignItems="center" justifyContent="space-between">
      <BackButton onPress={onBack} />
      <Text fontSize={17} fontWeight="800" color={dark.textPrimary}>
        InTouch
      </Text>
      <View width={40} height={40} />
    </XStack>
  );
}
export function AuthSubmitButton({
  label,
  isSubmitting,
  animatedStyle,
  onPress,
  onPressIn,
  onPressOut,
}: {
  label: string;
  isSubmitting: boolean;
  animatedStyle: object;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={isSubmitting}>
      <AnimatedLinearGradient
        colors={[dark.accent, dark.accentEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[authStyles.submitButton, animatedStyle]}
      >
        <Text color="white" fontSize={15} fontWeight="800">
          {isSubmitting ? 'Please wait...' : label}
        </Text>
      </AnimatedLinearGradient>
    </Pressable>
  );
}

export function RememberAndForgotRow({
  rememberMe,
  onToggleRemember,
  onForgotPassword,
}: {
  rememberMe: boolean;
  onToggleRemember: () => void;
  onForgotPassword: () => void;
}) {
  return (
    <XStack alignItems="center" justifyContent="space-between">
      <Pressable onPress={onToggleRemember} hitSlop={8}>
        <XStack alignItems="center" gap={8}>
          <View
            width={18}
            height={18}
            borderRadius={9}
            borderWidth={1.5}
            borderColor={rememberMe ? dark.accent : dark.border}
            backgroundColor={rememberMe ? dark.accent : 'transparent'}
            alignItems="center"
            justifyContent="center"
          >
            {rememberMe ? <View width={7} height={7} borderRadius={4} backgroundColor="white" /> : null}
          </View>
          <Text fontSize={13} fontWeight="600" color={dark.textSecondary}>
            Remember me
          </Text>
        </XStack>
      </Pressable>
      <Pressable onPress={onForgotPassword} hitSlop={8}>
        <Text fontSize={13} fontWeight="700" color={dark.accentEnd}>
          Forgot password?
        </Text>
      </Pressable>
    </XStack>
  );
}

export function AuthDivider() {
  return (
    <XStack alignItems="center" gap={12}>
      <View flex={1} height={1} backgroundColor={dark.border} />
      <Text fontSize={12} fontWeight="700" color={dark.textSecondary}>
        OR
      </Text>
      <View flex={1} height={1} backgroundColor={dark.border} />
    </XStack>
  );
}

export function SocialAuthButton({
  icon,
  label,
  disabled,
  onPress,
  translucent,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onPress: () => void;
  translucent?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <XStack
        height={52}
        alignItems="center"
        justifyContent="center"
        gap={10}
        borderRadius={999}
        overflow="hidden"
        backgroundColor={translucent ? 'rgba(255,255,255,0.14)' : dark.surfaceElevated}
        opacity={disabled ? 0.6 : 1}
      >
        {translucent ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        ) : null}
        {icon}
        <Text fontSize={14} fontWeight="700" color={dark.textPrimary}>
          {label}
        </Text>
      </XStack>
    </Pressable>
  );
}

export function AuthFooterLink({
  copy,
  isRegister,
  onModeChange,
}: {
  copy: (typeof authCopy)[AuthMode];
  isRegister: boolean;
  onModeChange: (mode: AuthMode) => void;
}) {
  return (
    <XStack justifyContent="center" gap={4}>
      <Text fontSize={14} color={dark.textSecondary}>
        {copy.footerText}
      </Text>
      <Pressable onPress={() => onModeChange(isRegister ? 'login' : 'register')} hitSlop={6}>
        <Text fontSize={14} fontWeight="800" color={dark.accentEnd}>
          {copy.footerLink}
        </Text>
      </Pressable>
    </XStack>
  );
}
