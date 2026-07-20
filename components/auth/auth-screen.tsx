import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { UserAvatar } from '@/components/ui/user-avatar';
import { AuthApiError, GOOGLE_SIGN_IN_URL } from '@/lib/api';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';
import { useSessionStore } from '@/stores/session-store';

const GOOGLE_AUTH_REDIRECT_URL = 'retalkapp://auth-callback';

type AuthMode = 'login' | 'register';

const authCopy = {
  login: {
    title: 'Login to your account',
    description: 'Enter your email below to login to your account',
    submit: 'Login',
    footerText: "Don't have an account?",
    footerHref: '/register',
    footerLink: 'Sign up',
  },
  register: {
    title: 'Create your account',
    description: 'Enter your details below to start discovering events',
    submit: 'Create account',
    footerText: 'Already have an account?',
    footerHref: '/login',
    footerLink: 'Login',
  },
} as const;

function GoogleIcon() {
  return (
    <Svg viewBox="0 0 24 24" width={20} height={20}>
      <Path
        d="M21.8 12.2c0-.8-.1-1.5-.2-2.2H12v4.1h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z"
        fill="#4285F4"
      />
      <Path
        d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2 .9-3.4.9a6 6 0 0 1-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <Path
        d="M6.4 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.3-1.9V7.4H3A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.5l3.4-2.6Z"
        fill="#FBBC05"
      />
      <Path
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.6A6 6 0 0 1 12 6Z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function EventPreviewArt() {
  return (
    <Svg viewBox="0 0 420 280" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
      <Rect width="420" height="280" fill="#dfe7ef" />
      <Path d="M0 210 C70 160 120 230 185 180 C250 130 315 170 420 120 L420 280 L0 280 Z" fill="#b8d9d4" />
      <Path d="M0 230 C95 188 160 246 235 200 C310 154 360 190 420 162 L420 280 L0 280 Z" fill="#f5d2c8" />
      <Circle cx="332" cy="62" r="32" fill="#ffb7a0" />
      <Rect x="44" y="70" width="48" height="82" rx="8" fill="#ffffff" opacity="0.86" />
      <Rect x="112" y="42" width="64" height="112" rx="10" fill="#ffffff" opacity="0.92" />
      <Rect x="196" y="78" width="54" height="78" rx="8" fill="#ffffff" opacity="0.8" />
      <Rect x="262" y="38" width="70" height="120" rx="12" fill="#ffffff" opacity="0.9" />
      <Rect x="64" y="98" width="12" height="12" rx="2" fill="#9fb7c3" />
      <Rect x="134" y="70" width="14" height="14" rx="3" fill="#9fb7c3" />
      <Rect x="156" y="70" width="14" height="14" rx="3" fill="#9fb7c3" />
      <Rect x="282" y="68" width="14" height="14" rx="3" fill="#9fb7c3" />
      <Rect x="306" y="68" width="14" height="14" rx="3" fill="#9fb7c3" />
      <Circle cx="120" cy="184" r="18" fill="#ff6b6b" />
      <Circle cx="120" cy="184" r="8" fill="#ffffff" />
      <Circle cx="236" cy="148" r="18" fill="#4ecdc4" />
      <Circle cx="236" cy="148" r="8" fill="#ffffff" />
      <Circle cx="314" cy="190" r="18" fill="#292f36" />
      <Circle cx="314" cy="190" r="8" fill="#ffffff" />
      <Path d="M120 184 C158 164 190 160 236 148 C260 155 286 170 314 190" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.82" />
    </Svg>
  );
}

function AuthPreviewCard() {
  return (
    <YStack
      width="100%"
      maxWidth={430}
      borderRadius={32}
      backgroundColor="rgba(255,255,255,0.7)"
      padding={14}
      shadowColor="#0f172a"
      shadowOpacity={0.06}
      shadowRadius={30}
      shadowOffset={{ width: 0, height: 10 }}
    >
      <YStack borderRadius={30} backgroundColor="white" padding={14} gap={16} overflow="hidden">
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          <XStack alignItems="center" gap={10} minWidth={0} flex={1}>
            <UserAvatar label="ReTalk" size={44} />
            <YStack minWidth={0} flex={1}>
              <Text fontSize={11} color={palette.muted}>
                Toronto today
              </Text>
              <Text fontSize={16} fontWeight="700" color={palette.ink} numberOfLines={1}>
                Good evening, Alex
              </Text>
            </YStack>
          </XStack>
          <View width={40} height={40} borderRadius={20} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
            <IconlyIcon name="Bell" size={20} color={palette.ink} />
            <View
              position="absolute"
              top={10}
              right={10}
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={palette.coral}
            />
          </View>
        </XStack>

        <XStack backgroundColor={palette.fog} borderRadius={24} padding={8} gap={8}>
          {[
            ['Today', '11'],
            ['Fri', '12'],
            ['Sat', '13'],
            ['Sun', '14'],
          ].map(([day, date], index) => (
            <YStack
              key={day}
              flex={1}
              height={64}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor="white"
              gap={4}
            >
              <Text fontSize={12} color={palette.gray}>
                {day}
              </Text>
              <View
                width={30}
                height={30}
                borderRadius={15}
                alignItems="center"
                justifyContent="center"
                backgroundColor={index === 0 ? palette.ink : 'transparent'}
              >
                <Text fontSize={13} fontWeight="800" color={index === 0 ? 'white' : palette.ink}>
                  {date}
                </Text>
              </View>
            </YStack>
          ))}
        </XStack>

        <YStack borderRadius={24} backgroundColor="white" padding={12} gap={12} shadowColor="#0f172a" shadowOpacity={0.06} shadowRadius={30} shadowOffset={{ width: 0, height: 10 }}>
          <View height={190} borderRadius={20} overflow="hidden" backgroundColor={palette.mist}>
            <EventPreviewArt />
            <View position="absolute" top={12} right={12} width={34} height={34} borderRadius={17} backgroundColor="rgba(255,255,255,0.95)" alignItems="center" justifyContent="center">
              <IconlyIcon name="Share" size={17} color={palette.ink} />
            </View>
          </View>
          <XStack gap={8}>
            <View borderRadius={999} backgroundColor={palette.coralSoft} paddingHorizontal={10} paddingVertical={5}>
              <Text fontSize={11} fontWeight="800" color={palette.ink}>
                Pick of the day
              </Text>
            </View>
            <View borderRadius={999} backgroundColor={palette.tealSoft} paddingHorizontal={10} paddingVertical={5}>
              <Text fontSize={11} fontWeight="800" color={palette.ink}>
                30+ going
              </Text>
            </View>
          </XStack>
          <Text fontSize={18} fontWeight="800" color={palette.ink} numberOfLines={1}>
            Rooftop Vinyl Social
          </Text>
          <XStack gap={14}>
            <XStack alignItems="center" gap={5}>
              <IconlyIcon name="Calendar" size={14} color={palette.gray} />
              <Text fontSize={12} fontWeight="600" color={palette.gray}>
                Tonight
              </Text>
            </XStack>
            <XStack alignItems="center" gap={5}>
              <IconlyIcon name="Location" size={14} color={palette.gray} />
              <Text fontSize={12} fontWeight="600" color={palette.gray}>
                Queen West
              </Text>
            </XStack>
          </XStack>
          <Text fontSize={13} lineHeight={19} color={palette.gray} numberOfLines={2}>
            A warm evening set with local selectors, skyline views, and room to bring friends.
          </Text>
        </YStack>
      </YStack>
    </YStack>
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
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: 'email' | 'name' | 'password' | 'current-password' | 'new-password';
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="700" color={palette.ink}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </YStack>
  );
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const signIn = useSessionStore((state) => state.signIn);
  const testSignIn = useSessionStore((state) => state.testSignIn);
  const register = useSessionStore((state) => state.register);
  const completeGoogleAuth = useSessionStore((state) => state.completeGoogleAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = authCopy[mode];
  const isWide = width >= 840;
  const isRegister = mode === 'register';

  const footerHref = copy.footerHref;

  function describeError(err: unknown, fallback: string) {
    return err instanceof AuthApiError ? err.message : fallback;
  }

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (isRegister && !name.trim()) {
      setError('Enter your name to continue.');
      return;
    }

    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    if (isRegister && password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('The passwords you entered do not match.');
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

      router.replace(isRegister ? '/profile' : '/explore');
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
      const result = await WebBrowser.openAuthSessionAsync(GOOGLE_SIGN_IN_URL, GOOGLE_AUTH_REDIRECT_URL);

      if (result.type !== 'success' || !result.url) {
        return;
      }

      const { searchParams } = new URL(result.url);
      const oauthError = searchParams.get('error');

      if (oauthError) {
        throw new AuthApiError(oauthError);
      }

      const token = searchParams.get('token');

      if (!token) {
        throw new AuthApiError('NoSession');
      }

      await completeGoogleAuth(token);
      router.replace('/explore');
    } catch (err) {
      setError(describeError(err, 'Google sign-in failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSignIn = () => {
    if (isSubmitting) {
      return;
    }

    setError(null);
    testSignIn();
    router.replace('/explore');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: isWide ? 40 : 20,
          },
        ]}
      >
        <XStack
          width="100%"
          maxWidth={1120}
          alignSelf="center"
          alignItems={isWide ? 'center' : 'stretch'}
          justifyContent="center"
          gap={isWide ? 42 : 22}
          flexDirection={isWide ? 'row' : 'column'}
        >
          <YStack flex={isWide ? 1 : undefined} minHeight={isWide ? 680 : undefined} justifyContent="space-between" gap={26}>
            <Pressable onPress={() => router.replace('/')}>
              <XStack alignItems="center" gap={10} alignSelf="flex-start">
                <View
                  width={56}
                  height={56}
                  borderRadius={16}
                  backgroundColor="white"
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={1}
                  borderColor={palette.line}
                >
                  <Text fontSize={24} fontWeight="900" color={palette.ink}>
                    R
                  </Text>
                </View>
                <Text fontSize={18} fontWeight="800" color={palette.ink}>
                  ReTalk
                </Text>
              </XStack>
            </Pressable>

            <YStack width="100%" maxWidth={360} alignSelf={isWide ? 'center' : 'stretch'} gap={24}>
              <XStack backgroundColor={palette.fog} borderRadius={999} padding={4}>
                {(['login', 'register'] as const).map((item) => {
                  const isActive = item === mode;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => router.replace(item === 'login' ? '/login' : '/register')}
                      style={styles.segmentButton}
                    >
                      <View
                        height={38}
                        alignItems="center"
                        justifyContent="center"
                        borderRadius={999}
                        backgroundColor={isActive ? 'white' : 'transparent'}
                        shadowColor="#0f172a"
                        shadowOpacity={isActive ? 0.05 : 0}
                        shadowRadius={12}
                        shadowOffset={{ width: 0, height: 4 }}
                      >
                        <Text fontSize={13} fontWeight="800" color={isActive ? palette.ink : palette.gray}>
                          {item === 'login' ? 'Login' : 'Register'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </XStack>

              <YStack gap={20}>
                <YStack alignItems="center" gap={6}>
                  <Text fontSize={24} lineHeight={30} fontWeight="800" color={palette.ink} textAlign="center">
                    {copy.title}
                  </Text>
                  <Text fontSize={14} lineHeight={20} color={palette.gray} textAlign="center">
                    {copy.description}
                  </Text>
                </YStack>

                {error ? (
                  <View borderRadius={8} borderWidth={1} borderColor="rgba(255,107,107,0.35)" backgroundColor={palette.dangerSoft} padding={12}>
                    <Text fontSize={13} fontWeight="700" color={palette.dangerText}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {isRegister ? (
                  <AuthInput
                    label="Name"
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                ) : null}
                <AuthInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="m@example.com"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                <YStack gap={8}>
                  <XStack alignItems="center">
                    <Text flex={1} fontSize={14} fontWeight="700" color={palette.ink}>
                      Password
                    </Text>
                    {!isRegister ? (
                      <Pressable onPress={() => setError('Password reset is not wired in this prototype yet.')}>
                        <Text fontSize={13} fontWeight="700" color={palette.tealText}>
                          Forgot your password?
                        </Text>
                      </Pressable>
                    ) : null}
                  </XStack>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    style={styles.input}
                  />
                </YStack>
                {isRegister ? (
                  <AuthInput
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoComplete="new-password"
                  />
                ) : null}

                <YStack gap={10}>
                  <Pressable onPress={handleSubmit} disabled={isSubmitting}>
                    <LinearGradient
                      colors={palette.primaryGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.submitButton, { opacity: isSubmitting ? 0.7 : 1 }]}
                    >
                      <Text color="white" fontSize={14} fontWeight="800">
                        {isSubmitting ? 'Please wait…' : copy.submit}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                  <Text fontSize={12} lineHeight={18} color={palette.gray} textAlign="center">
                    By continuing, you agree to ReTalk&apos;s Terms and Conditions.
                  </Text>
                </YStack>

                <XStack alignItems="center" gap={10}>
                  <View flex={1} height={1} backgroundColor="#dce5e2" />
                  <Text fontSize={13} color={palette.gray}>
                    Or continue with
                  </Text>
                  <View flex={1} height={1} backgroundColor="#dce5e2" />
                </XStack>

                <YStack gap={14}>
                  <Pressable onPress={handleGoogleSignIn} disabled={isSubmitting}>
                    <XStack
                      height={44}
                      alignItems="center"
                      justifyContent="center"
                      gap={10}
                      borderRadius={999}
                      borderWidth={1}
                      borderColor="#e6e8ec"
                      backgroundColor="white"
                      opacity={isSubmitting ? 0.7 : 1}
                      shadowColor="#0f172a"
                      shadowOpacity={0.05}
                      shadowRadius={16}
                      shadowOffset={{ width: 0, height: 4 }}
                    >
                      <GoogleIcon />
                      <Text fontSize={14} fontWeight="800" color={palette.ink}>
                        Continue with Google
                      </Text>
                    </XStack>
                  </Pressable>

                  {!isRegister ? (
                    <Pressable onPress={handleTestSignIn} disabled={isSubmitting}>
                      <XStack
                        height={44}
                        alignItems="center"
                        justifyContent="center"
                        gap={10}
                        borderRadius={999}
                        borderWidth={1}
                        borderColor="rgba(41,47,54,0.12)"
                        backgroundColor={palette.fog}
                        opacity={isSubmitting ? 0.7 : 1}
                      >
                        <IconlyIcon name="UserPlus" size={18} color={palette.ink} />
                        <Text fontSize={14} fontWeight="800" color={palette.ink}>
                          Continue as test user
                        </Text>
                      </XStack>
                    </Pressable>
                  ) : null}

                  <XStack justifyContent="center" gap={4}>
                    <Text fontSize={14} color={palette.gray}>
                      {copy.footerText}
                    </Text>
                    <Pressable onPress={() => router.replace(footerHref)}>
                      <Text fontSize={14} fontWeight="800" color={palette.ink}>
                        {copy.footerLink}
                      </Text>
                    </Pressable>
                  </XStack>
                </YStack>
              </YStack>
            </YStack>

            <Text fontSize={12} lineHeight={18} color={palette.gray} maxWidth={320} display={isWide ? 'flex' : 'none'}>
              Find curated events, communities, and plans nearby.
            </Text>
          </YStack>

          <View flex={isWide ? 1 : undefined} alignItems="center" display={isWide ? 'flex' : 'none'}>
            <AuthPreviewCard />
          </View>
        </XStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.white,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  input: {
    ...appTextInputStyle,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cfd8d5',
    backgroundColor: palette.white,
    color: palette.ink,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submitButton: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButton: {
    flex: 1,
  },
});
