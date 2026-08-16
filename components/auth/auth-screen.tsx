import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Apple, Eye, EyeSlash, Facebook, Google } from 'iconsax-react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { API_BASE_URL, AuthApiError, getGoogleAuthorisationUrl } from '@/lib/api';
import { GoogleSignInCancelledError, signInWithGoogleNatively } from '@/lib/google-signin';
import { hasCompletedOnboarding } from '@/lib/onboarding';
import { canUseNativeModules } from '@/lib/runtime';
import { appTextInputStyle } from '@/lib/typography';
import { useSessionStore } from '@/stores/session-store';

const dark = {
  background: '#0B0B0D',
  surfaceElevated: '#1C1C21',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8C0',
  border: '#232328',
  accent: '#8975fe',
  accentEnd: '#9d8cff',
  dangerSoft: 'rgba(239,68,68,0.12)',
  dangerText: '#FCA5A5',
} as const;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const GOOGLE_AUTH_DEEP_LINK = 'intouchapp://auth-callback';
// Google's OAuth client only accepts https redirect URIs, so we can't ask it
// to land straight on the app's intouchapp:// deep link. This is the backend's
// bridge route (see retalk-api's AuthController#mobileCallback) that Google
// is allowed to redirect to; it forwards the callback query params on to
// GOOGLE_AUTH_DEEP_LINK via a real HTTP redirect, which openAuthSessionAsync
// below is watching for.
const GOOGLE_AUTH_REDIRECT_URL = `${API_BASE_URL}/auth/mobile-callback`;

type AuthMode = 'login' | 'register';

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const authCopy = {
  login: {
    title: 'Login Now To Your Account.',
    description: 'Access your account to manage settings, explore events, and stay in touch.',
    submit: 'Login',
    footerText: "Don't have an account?",
    footerLink: 'Sign Up',
  },
  register: {
    title: 'Create Your Account.',
    description: 'Sign up to start discovering events and staying in touch with your people.',
    submit: 'Create account',
    footerText: 'Already have an account?',
    footerLink: 'Login',
  },
} as const;

function getRequestedAuthMode(mode: string | undefined, fallback: AuthMode) {
  return mode === 'login' || mode === 'register' ? mode : fallback;
}

function getAuthValidationError(mode: AuthMode, values: AuthFormValues) {
  if (mode === 'register' && !values.name.trim()) {
    return 'Enter your name to continue.';
  }

  if (!values.email.trim() || !values.password) {
    return 'Enter your email and password to continue.';
  }

  if (mode === 'register' && values.password.length < 8) {
    return 'Use a password with at least 8 characters.';
  }

  if (mode === 'register' && values.password !== values.confirmPassword) {
    return 'The passwords you entered do not match.';
  }

  return null;
}

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

function AuthHeader({ onBack }: { onBack: () => void }) {
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

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoComplete,
  keyboardType,
  rightAdornment,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: 'email' | 'name' | 'password' | 'current-password' | 'new-password';
  keyboardType?: 'default' | 'email-address';
  rightAdornment?: ReactNode;
}) {
  return (
    <YStack gap={8}>
      <Text fontSize={13} fontWeight="600" color={dark.textSecondary}>
        {label}
      </Text>
      <View justifyContent="center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={dark.textSecondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          style={[styles.input, rightAdornment ? { paddingRight: 48 } : null]}
        />
        {rightAdornment ? (
          <View position="absolute" right={16} top={0} bottom={0} justifyContent="center">
            {rightAdornment}
          </View>
        ) : null}
      </View>
    </YStack>
  );
}

function PasswordInput({
  label,
  value,
  onChangeText,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  autoComplete: 'password' | 'current-password' | 'new-password';
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AuthInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!isVisible}
      autoComplete={autoComplete}
      rightAdornment={
        <Pressable onPress={() => setIsVisible((current) => !current)} hitSlop={10}>
          {isVisible ? (
            <Eye color={dark.textSecondary} size={20} />
          ) : (
            <EyeSlash color={dark.textSecondary} size={20} />
          )}
        </Pressable>
      }
    />
  );
}

function AuthErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View borderRadius={12} backgroundColor={dark.dangerSoft} padding={12}>
      <Text fontSize={13} fontWeight="600" color={dark.dangerText}>
        {message}
      </Text>
    </View>
  );
}

function AuthSubmitButton({
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
        style={[styles.submitButton, animatedStyle]}
      >
        <Text color="white" fontSize={15} fontWeight="800">
          {isSubmitting ? 'Please wait...' : label}
        </Text>
      </AnimatedLinearGradient>
    </Pressable>
  );
}

function RememberAndForgotRow({
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

function AuthDivider() {
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

function SocialAuthButton({
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

function AuthFooterLink({
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

const AUTH_HERO_IMAGE =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=75';

function AuthLandingGate({
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
    <View style={styles.root}>
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
                style={[styles.submitButton, { opacity: isSubmitting ? 0.7 : 1 }]}
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
      // Android gets Google's own native sign-in sheet (no in-app browser)
      // when running in a dev/standalone build; Expo Go can't load the
      // native module, so it falls back to the browser flow below like iOS.
      if (Platform.OS === 'android' && canUseNativeModules) {
        try {
          const idToken = await signInWithGoogleNatively();
          await completeGoogleAuthWithIdToken(idToken);
          navigateAfterAuth();
        } catch (err) {
          if (!(err instanceof GoogleSignInCancelledError)) {
            throw err;
          }
        }

        return;
      }

      // SuperTokens' thirdparty flow: ask the backend for Google's
      // authorisation URL (it owns the client id/secret), send the user
      // through it, then hand the callback's code/state back to the
      // backend's /signinup route to finish the sign-in.
      const { url: authorisationUrl, pkceCodeVerifier } =
        await getGoogleAuthorisationUrl(GOOGLE_AUTH_REDIRECT_URL);
      const result = await WebBrowser.openAuthSessionAsync(authorisationUrl, GOOGLE_AUTH_DEEP_LINK);

      if (result.type !== 'success' || !result.url) {
        return;
      }

      const { searchParams } = new URL(result.url);
      const oauthError = searchParams.get('error');

      if (oauthError) {
        throw new AuthApiError(oauthError);
      }

      const code = searchParams.get('code');

      if (!code) {
        throw new AuthApiError('NoSession');
      }

      await completeGoogleAuth(code, searchParams.get('state'), GOOGLE_AUTH_REDIRECT_URL, pkceCodeVerifier);
      navigateAfterAuth();
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
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 28,
              paddingHorizontal: isWide ? 40 : 20,
            },
          ]}
        >
          <YStack width="100%" maxWidth={420} alignSelf="center" gap={28}>
            <AuthHeader onBack={handleBack} />

            <Animated.View style={[styles.formTransition, formAnimatedStyle]}>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  input: {
    ...appTextInputStyle,
    height: 52,
    borderRadius: 16,
    backgroundColor: dark.surfaceElevated,
    color: dark.textPrimary,
    fontSize: 15,
    paddingHorizontal: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTransition: {
    width: '100%',
  },
});
