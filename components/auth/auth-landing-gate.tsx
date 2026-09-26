import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Apple, Facebook, Google } from 'iconsax-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { Text, View, YStack } from 'tamagui';

import { AuthErrorMessage } from './auth-fields';
import { SocialAuthButton } from './auth-buttons';
import { authStyles, dark } from './auth-styles';

const AUTH_HERO_IMAGE =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=75';

export function AuthLandingGate({
  error,
  isSubmitting,
  onContinueWithEmail,
  onGoogle,
  onFacebook,
  onApple,
  onOpenTerms,
  insetsBottom,
}: {
  error: string | null;
  isSubmitting: boolean;
  onContinueWithEmail: () => void;
  onGoogle: () => void;
  onFacebook: () => void;
  onApple: () => void;
  onOpenTerms: () => void;
  insetsBottom: number;
}) {
  return (
    <View style={authStyles.root}>
      <StatusBar style="light" />
      <Image source={AUTH_HERO_IMAGE} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient
        colors={['rgba(11,11,13,0.1)', 'rgba(11,11,13,0.72)', 'rgba(11,11,13,0.98)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <YStack position="absolute" left={24} right={24} top={0} bottom={insetsBottom + 28}>
        <YStack flex={1} justifyContent="center" gap={20}>
          <YStack gap={6} alignItems="center">
            <Text fontSize={19} fontWeight="800" color={dark.textPrimary} textAlign="center">
              Let&apos;s get started
            </Text>
            <Text fontSize={13} lineHeight={19} color="rgba(255,255,255,0.7)" textAlign="center">
              Sign up or log in to see what&apos;s happening near you
            </Text>
          </YStack>

          <AuthErrorMessage message={error} />

          <YStack gap={12}>
            <Pressable onPress={onContinueWithEmail} disabled={isSubmitting}>
              <LinearGradient
                colors={[dark.accent, dark.accentEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[authStyles.submitButton, { opacity: isSubmitting ? 0.7 : 1 }]}
              >
                <Text color="white" fontSize={15} fontWeight="800">
                  Continue With Email
                </Text>
              </LinearGradient>
            </Pressable>
            <SocialAuthButton
              icon={<Apple color={dark.textPrimary} size={20} variant="Bold" />}
              label="Continue With Apple"
              disabled={isSubmitting}
              onPress={onApple}
              translucent
            />
            <SocialAuthButton
              icon={<Facebook color={dark.textPrimary} size={20} variant="Bold" />}
              label="Continue With Facebook"
              disabled={isSubmitting}
              onPress={onFacebook}
              translucent
            />
            <SocialAuthButton
              icon={<Google color={dark.textPrimary} size={20} variant="Bold" />}
              label="Continue With Google"
              disabled={isSubmitting}
              onPress={onGoogle}
              translucent
            />
          </YStack>
        </YStack>

        <Text fontSize={11} lineHeight={16} color="rgba(255,255,255,0.5)" textAlign="center">
          By signing up or logging in, I accept the InTouch{' '}
          <Text fontSize={11} fontWeight="700" color={dark.accentEnd} onPress={onOpenTerms}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text fontSize={11} fontWeight="700" color={dark.accentEnd} onPress={onOpenTerms}>
            Privacy Policy
          </Text>
        </Text>
      </YStack>
    </View>
  );
}
