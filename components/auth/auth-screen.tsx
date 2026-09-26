import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Apple, Google } from 'iconsax-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, YStack } from 'tamagui';

import { AuthApiError } from '@/lib/api';
import { hasCompletedOnboarding } from '@/lib/onboarding';
import { useSessionStore } from '@/stores/session-store';

import {
  AuthDivider,
  AuthFooterLink,
  AuthHeader,
  AuthSubmitButton,
  RememberAndForgotRow,
  SocialAuthButton,
} from './auth-buttons';
import { AuthErrorMessage, AuthInput, PasswordInput } from './auth-fields';
import { type AuthMode, authCopy, getAuthValidationError, getRequestedAuthMode } from './auth-form';
import { AuthLandingGate } from './auth-landing-gate';
import { authStyles, dark } from './auth-styles';
import { runGoogleSignIn } from './google-auth-flow';

export function AuthScreen({ initialMode = 'register' }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const requestedMode = getRequestedAuthMode(params.mode, initialMode);
  const cameWithExplicitMode = params.mode === 'login' || params.mode === 'register';
  const signIn = useSessionStore((state) => state.signIn);
  const register = useSessionStore((state) => state.register);
  const completeGoogleAuth = useSessionStore((state) => state.completeGoogleAuth);
  const completeGoogleAuthWithIdToken = useSessionStore((state) => state.completeGoogleAuthWithIdToken);
  const [stage, setStage] = useState<'landing' | 'form'>(cameWithExplicitMode ? 'form' : 'landing');
  const [mode, setMode] = useState<AuthMode>(requestedMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastRequestedMode = useRef<AuthMode>(requestedMode);

  const copy = authCopy[mode];
  const isWide = width >= 840;
  const isRegister = mode === 'register';

  const submitOpacity = useSharedValue(1);
  const formOpacity = useSharedValue(1);
  const formOffset = useSharedValue(0);

  useEffect(() => {
    submitOpacity.value = withTiming(isSubmitting ? 0.7 : 1, { duration: 200 });
  }, [isSubmitting, submitOpacity]);

  useEffect(() => {
    if (requestedMode !== lastRequestedMode.current && !isSubmitting) {
      lastRequestedMode.current = requestedMode;
      setMode(requestedMode);
    }
  }, [isSubmitting, requestedMode]);

  const submitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: submitOpacity.value,
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateX: formOffset.value }, { scale: 0.985 + formOpacity.value * 0.015 }],
  }));

  function describeError(err: unknown, fallback: string) {
    return err instanceof AuthApiError ? err.message : fallback;
  }

  // Every sign-in path (email/password, Google native, Google browser)
  // funnels through here so onboarding is never skippable regardless of
  // how the user authenticated.
  function navigateAfterAuth() {
    const { user, completedOnboardingUserIds } = useSessionStore.getState();
    router.replace(hasCompletedOnboarding(user, completedOnboardingUserIds) ? '/explore' : '/onboarding');
  }

  const handleModeChange = (nextMode: AuthMode) => {
    if (nextMode === mode || isSubmitting) {
      return;
    }

    setError(null);
    formOpacity.value = 0;
    formOffset.value = nextMode === 'register' ? 24 : -24;
    setMode(nextMode);

    requestAnimationFrame(() => {
      formOpacity.value = withTiming(1, { duration: 220 });
      formOffset.value = withTiming(0, { duration: 260 });
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const validationError = getAuthValidationError(mode, {
      name,
      email,
      password,
      confirmPassword,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }

      navigateAfterAuth();
    } catch (err) {
      setError(describeError(err, 'Something went wrong. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (await runGoogleSignIn({ completeGoogleAuth, completeGoogleAuthWithIdToken })) {
        navigateAfterAuth();
      }
    } catch (err) {
      setError(describeError(err, 'Google sign-in failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = () => {
    if (isSubmitting) {
      return;
    }

    setError('Apple sign-in is coming soon.');
  };

  const handleFacebookSignIn = () => {
    if (isSubmitting) {
      return;
    }

    setError('Facebook sign-in is coming soon.');
  };

  const handleContinueWithEmail = () => {
    setError(null);
    setStage('form');
  };

  const handleBack = () => {
    if (stage === 'form' && !cameWithExplicitMode) {
      setError(null);
      setStage('landing');
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/welcome');
  };

  if (stage === 'landing') {
    return (
      <AuthLandingGate
        error={error}
        isSubmitting={isSubmitting}
        onContinueWithEmail={handleContinueWithEmail}
        onGoogle={handleGoogleSignIn}
        onFacebook={handleFacebookSignIn}
        onApple={handleAppleSignIn}
        onOpenTerms={() => router.push('/terms')}
        insetsBottom={insets.bottom}
      />
    );
  }

  return (
    <View style={authStyles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={authStyles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            authStyles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 28,
              paddingHorizontal: isWide ? 40 : 20,
            },
          ]}
        >
          <YStack width="100%" maxWidth={420} alignSelf="center" gap={28}>
            <AuthHeader onBack={handleBack} />

            <Animated.View style={[authStyles.formTransition, formAnimatedStyle]}>
              <YStack gap={22}>
                <YStack gap={6}>
                  <Text fontSize={26} lineHeight={32} fontWeight="800" color={dark.textPrimary}>
                    {copy.title}
                  </Text>
                  <Text fontSize={14} lineHeight={20} color={dark.textSecondary}>
                    {copy.description}
                  </Text>
                </YStack>

                <AuthErrorMessage message={error} />

                {isRegister ? (
                  <AuthInput label="Name" value={name} onChangeText={setName} autoComplete="name" />
                ) : null}
                <AuthInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="jamesschleifer@gmail.com"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                <PasswordInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                {isRegister ? (
                  <PasswordInput
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoComplete="new-password"
                  />
                ) : null}

                <YStack gap={16}>
                  <AuthSubmitButton
                    label={copy.submit}
                    isSubmitting={isSubmitting}
                    animatedStyle={submitAnimatedStyle}
                    onPress={handleSubmit}
                    onPressIn={() => {
                      submitOpacity.value = withTiming(0.6, { duration: 120 });
                    }}
                    onPressOut={() => {
                      submitOpacity.value = withTiming(isSubmitting ? 0.7 : 1, { duration: 150 });
                    }}
                  />

                  {!isRegister ? (
                    <RememberAndForgotRow
                      rememberMe={rememberMe}
                      onToggleRemember={() => setRememberMe((current) => !current)}
                      onForgotPassword={() => router.push('/forgot-password')}
                    />
                  ) : null}
                </YStack>

                <AuthDivider />

                <YStack gap={12}>
                  <SocialAuthButton
                    icon={<Google color={dark.textPrimary} size={20} variant="Bold" />}
                    label="Sign in with Google"
                    disabled={isSubmitting}
                    onPress={handleGoogleSignIn}
                  />
                  <SocialAuthButton
                    icon={<Apple color={dark.textPrimary} size={20} variant="Bold" />}
                    label="Continue with Apple"
                    disabled={isSubmitting}
                    onPress={handleAppleSignIn}
                  />
                </YStack>

                <AuthFooterLink copy={copy} isRegister={isRegister} onModeChange={handleModeChange} />
              </YStack>
            </Animated.View>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
