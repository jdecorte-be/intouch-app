import { Pressable } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { GuestAvatar, UserAvatar } from '@/components/ui/user-avatar';
import { getTimeGreeting } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import { selectUnreadNotificationCount, useNotificationsStore } from '@/stores/notifications-store';
import { useSessionStore } from '@/stores/session-store';

export function GreetingHeader({
  onAvatarPress,
  onNotificationPress,
}: {
  onAvatarPress: () => void;
  onNotificationPress?: () => void;
}) {
  const user = useSessionStore((state) => state.user);
  const userLabel = user?.name || user?.email || '';
  const firstName = userLabel.split(/[@\s]/)[0] || 'there';
  const unreadCount = useNotificationsStore(selectUnreadNotificationCount);

  return (
    <XStack
      alignItems="center"
      gap={10}
      borderRadius={999}
      borderWidth={1}
      borderColor="rgba(41,47,54,0.1)"
      backgroundColor="rgba(255,255,255,0.96)"
      paddingVertical={6}
      paddingLeft={6}
      paddingRight={8}
      shadowColor="#0f172a"
      shadowOpacity={0.08}
      shadowRadius={11}
      shadowOffset={{ width: 0, height: 6 }}
      elevation={5}
    >
      <Pressable onPress={onAvatarPress}>
        {user ? (
          <UserAvatar label={userLabel} image={user.image} size={36} borderWidth={2} borderColor={palette.primary} />
        ) : (
          <GuestAvatar size={36} borderWidth={2} borderColor={palette.primary} />
        )}
      </Pressable>
      <YStack flex={1} minWidth={0}>
        <Text fontSize={11} fontWeight="600" color={palette.muted} numberOfLines={1}>
          Hello {firstName}
        </Text>
        <Text fontSize={14} fontWeight="700" color={palette.ink} numberOfLines={1}>
          {getTimeGreeting()}
        </Text>
      </YStack>
      <Pressable onPress={onNotificationPress} disabled={!onNotificationPress}>
        <View
          width={42}
          height={38}
          borderRadius={19}
          backgroundColor={palette.fog}
          alignItems="center"
          justifyContent="center"
        >
          <View transform={[{ scaleX: 1.14 }]}>
            <IconlyIcon name="Bell" size={22} />
          </View>
          {unreadCount > 0 ? (
            <View
              position="absolute"
              top={6}
              right={8}
              width={8}
              height={8}
              borderRadius={4}
              borderWidth={1}
              borderColor="white"
              backgroundColor={palette.coral}
            />
          ) : null}
        </View>
      </Pressable>
    </XStack>
  );
}
