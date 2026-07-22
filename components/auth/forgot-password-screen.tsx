import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { AuthApiError, requestPasswordReset } from '@/lib/api';
import { palette } from '@/lib/palette';
import { appTextInputStyle } from '@/lib/typography';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!email.trim()) {
      setError('Enter your email to continue.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email.trim());
      setIsSent(true);
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 },
        ]}
      >
        <YStack width="100%" maxWidth={360} alignSelf="center" gap={26}>
          <Pressable onPress={() => router.back()}>
            <View
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor={palette.fog}
              alignItems="center"
              justifyContent="center"
            >
              <IconlyIcon name="ArrowLeft" size={18} color={palette.ink} />
            </View>
          </Pressable>

          {isSent ? (
            <YStack alignItems="center" gap={16}>
              <View width={64} height={64} borderRadius={32} backgroundColor={palette.tealSoft} alignItems="center" justifyContent="center">
                <IconlyIcon name="CheckCircle" size={30} color={palette.tealText} />
              </View>
              <YStack alignItems="center" gap={6}>
                <Text fontSize={22} lineHeight={28} fontWeight="800" color={palette.ink} textAlign="center">
                  Check your email
                </Text>
                <Text fontSize={14} lineHeight={20} color={palette.gray} textAlign="center">
                  If an account exists for {email.trim()}, we&apos;ve sent a link to reset your password.
                </Text>
              </YStack>
              <Pressable onPress={() => router.replace('/auth?mode=login')}>
                <Text fontSize={14} fontWeight="800" color={palette.tealText}>
                  Back to login
                </Text>
              </Pressable>
            </YStack>
          ) : (
            <YStack gap={20}>
              <YStack gap={6}>
                <Text fontSize={22} lineHeight={28} fontWeight="800" color={palette.ink}>
                  Reset your password
                </Text>
                <Text fontSize={14} lineHeight={20} color={palette.gray}>
                  Enter the email on your account and we&apos;ll send you a link to reset your password.
                </Text>
              </YStack>

              {error ? (
                <View borderRadius={8} borderWidth={1} borderColor="rgba(255,107,107,0.35)" backgroundColor={palette.dangerSoft} padding={12}>
                  <Text fontSize={13} fontWeight="700" color={palette.dangerText}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <YStack gap={8}>
                <Text fontSize={14} fontWeight="700" color={palette.ink}>
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="m@example.com"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </YStack>

              <Pressable onPress={handleSubmit} disabled={isSubmitting}>
                <View
                  height={44}
                  borderRadius={8}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={palette.ink}
                  opacity={isSubmitting ? 0.7 : 1}
                >
                  <Text color="white" fontSize={14} fontWeight="800">
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
                  </Text>
                </View>
              </Pressable>

              <XStack justifyContent="center" gap={4}>
                <Text fontSize={14} color={palette.gray}>
                  Remembered your password?
                </Text>
                <Pressable onPress={() => router.replace('/auth?mode=login')}>
                  <Text fontSize={14} fontWeight="800" color={palette.ink}>
                    Login
                  </Text>
                </Pressable>
              </XStack>
            </YStack>
          )}
        </YStack>
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
});
