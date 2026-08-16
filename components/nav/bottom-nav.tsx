import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, XStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';

type TabConfig = { label: string; icon: IconlyIconName };

const PILL_BACKGROUND = '#111114';
const ACTIVE_ICON_COLOR = '#FFFFFF';
const INACTIVE_ICON_COLOR = 'rgba(255,255,255,0.45)';
const ACTIVE_PILL_COLOR = 'rgba(255,255,255,0.12)';
const ADD_BUTTON_SIZE = 56;

const tabConfig: Record<string, TabConfig> = {
  index: { label: 'Home', icon: 'Home' },
  explore: { label: 'Explore', icon: 'Compass' },
  chats: { label: 'Messages', icon: 'MessageCircleDots' },
  profile: { label: 'Profile', icon: 'Cog' },
};

function NavItem({ config, isActive, onPress }: { config: TabConfig; isActive: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ selected: isActive }}
      hitSlop={8}
      onPressIn={() => {
        scale.value = withSpring(0.88, { damping: 14, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      onPress={onPress}
      style={styles.item}
    >
      <Animated.View style={[styles.iconBubble, isActive && styles.iconBubbleActive, iconStyle]}>
        <IconlyIcon
          name={config.icon}
          size={22}
          color={isActive ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR}
          weight={isActive ? 'fill' : 'regular'}
        />
      </Animated.View>
    </Pressable>
  );
}

function AddButton() {
  const router = useRouter();
  const scale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.addButtonWrapper} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create"
        hitSlop={8}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 14, stiffness: 260 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        }}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/host');
        }}
      >
        <Animated.View style={[styles.addButton, buttonStyle]}>
          <IconlyIcon name="Plus" size={26} color="#111114" weight="bold" />
        </Animated.View>
      </Pressable>
    </View>
  );
}

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const routes = state.routes.filter((route) => tabConfig[route.name]);
  const midpoint = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, midpoint);
  const rightRoutes = routes.slice(midpoint);

  const renderItem = (route: (typeof routes)[number]) => {
    const config = tabConfig[route.name];
    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const isActive = state.index === routeIndex;

    const onPress = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isActive && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return <NavItem key={route.key} config={config} isActive={isActive} onPress={onPress} />;
  };

  return (
    <View
      position="absolute"
      left={16}
      right={16}
      bottom={Math.max(insets.bottom, 12) + 8}
      pointerEvents="box-none"
    >
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal={14}
        height={64}
        backgroundColor={PILL_BACKGROUND}
        borderRadius={999}
        position="relative"
        overflow="visible"
        shadowColor="#000000"
        shadowOpacity={0.25}
        shadowRadius={16}
        shadowOffset={{ width: 0, height: 8 }}
        elevation={8}
      >
        <XStack flex={1} justifyContent="space-around">
          {leftRoutes.map(renderItem)}
        </XStack>
        <View style={{ width: ADD_BUTTON_SIZE + 8 }} />
        <XStack flex={1} justifyContent="space-around">
          {rightRoutes.map(renderItem)}
        </XStack>
        <AddButton />
      </XStack>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleActive: {
    backgroundColor: ACTIVE_PILL_COLOR,
  },
  addButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -(ADD_BUTTON_SIZE * 0.6),
    alignItems: 'center',
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: ADD_BUTTON_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
});
