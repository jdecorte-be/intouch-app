import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { SUPPORT_EMAIL } from '@/lib/config';
import { palette } from '@/lib/palette';

const sections: { title: string; body: string }[] = [
  {
    title: '1. Acceptance of terms',
    body: 'By creating a InTouch account or using the app, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please do not use InTouch.',
  },
  {
    title: '2. Your account',
    body: "You're responsible for keeping your login details secure and for all activity that happens under your account. Let us know right away if you think someone else has access to it.",
  },
  {
    title: '3. Events and community conduct',
    body: 'InTouch helps you discover and host events. Be respectful to other members, follow event hosts\' guidelines, and do not use the app to harass, spam, or endanger others.',
  },
  {
    title: '4. Content you share',
    body: 'You keep ownership of the photos, messages, and event details you post, but you grant InTouch a license to display that content within the app so other members can see it.',
  },
  {
    title: '5. Changes to these terms',
    body: 'We may update these terms from time to time. Continued use of InTouch after a change means you accept the updated terms.',
  },
  {
    title: '6. Contact',
    body: `Questions about these terms can be sent to ${SUPPORT_EMAIL}.`,
  },
];

export function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <XStack
        alignItems="center"
        gap={12}
        paddingHorizontal={20}
        paddingBottom={12}
        style={{ paddingTop: insets.top + 16 }}
      >
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
        <Text fontSize={18} fontWeight="800" color={palette.ink}>
          Terms and Conditions
        </Text>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 28,
          gap: 20,
        }}
      >
        <Text fontSize={13} lineHeight={19} color={palette.gray}>
          Last updated July 2026. These terms govern your use of the InTouch app.
        </Text>

        <YStack gap={20}>
          {sections.map((section) => (
            <YStack key={section.title} gap={6}>
              <Text fontSize={15} fontWeight="800" color={palette.ink}>
                {section.title}
              </Text>
              <Text fontSize={14} lineHeight={21} color={palette.gray}>
                {section.body}
              </Text>
            </YStack>
          ))}
        </YStack>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.white,
  },
});
