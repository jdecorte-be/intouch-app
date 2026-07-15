import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { View, XStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';

type TabConfig = { label: string; icon: IconlyIconName };

const MENU_CURVE_SIZE = 35;

const tabConfig: Record<string, TabConfig> = {
  index: { label: 'Home', icon: 'Home' },
  explore: { label: 'Explore', icon: 'Compass' },
  chats: { label: 'Messages', icon: 'MessageCircleDots' },
  tickets: { label: 'Tickets', icon: 'Ticket' },
};

function MenuEdgeCurve({ placement, side }: { placement: 'top' | 'bottom'; side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  const path =
    placement === 'top'
      ? isLeft
        ? `M${MENU_CURVE_SIZE} ${MENU_CURVE_SIZE} Q0 ${MENU_CURVE_SIZE} 0 0 L0 ${MENU_CURVE_SIZE}Z`
        : `M0 ${MENU_CURVE_SIZE} Q${MENU_CURVE_SIZE} ${MENU_CURVE_SIZE} ${MENU_CURVE_SIZE} 0 L${MENU_CURVE_SIZE} ${MENU_CURVE_SIZE}Z`
      : isLeft
        ? `M${MENU_CURVE_SIZE} 0 Q0 0 0 ${MENU_CURVE_SIZE} L0 0Z`
        : `M0 0 Q${MENU_CURVE_SIZE} 0 ${MENU_CURVE_SIZE} ${MENU_CURVE_SIZE} L${MENU_CURVE_SIZE} 0Z`;

  return (
    <Svg
      width={MENU_CURVE_SIZE}
      height={MENU_CURVE_SIZE}
      style={[
        styles.edgeCurve,
        side === 'left' ? styles.edgeCurveLeft : styles.edgeCurveRight,
        placement === 'top' ? styles.edgeCurveTop : styles.edgeCurveBottom,
      ]}
      pointerEvents="none"
    >
      <Path fill={palette.white} d={path} />
    </Svg>
  );
}

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
      <Animated.View style={iconStyle}>
        <IconlyIcon
          name={config.icon}
          size={22}
          color={isActive ? palette.accent : palette.muted}
          weight={isActive ? 'fill' : 'regular'}
        />
      </Animated.View>
      <Animated.Text
        style={[styles.label, { color: isActive ? palette.accent : palette.muted }]}
        numberOfLines={1}
      >
        {config.label}
      </Animated.Text>
    </Pressable>
  );
}

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View position="absolute" left={0} right={0} bottom={0} pointerEvents="box-none">
      <XStack
        alignItems="center"
        justifyContent="space-between"
        paddingTop={10}
        paddingHorizontal={8}
        paddingBottom={Math.max(insets.bottom, 10)}
        backgroundColor={palette.white}
        position="relative"
        overflow="visible"
        shadowColor="#111114"
        shadowOpacity={0.1}
        shadowRadius={20}
        shadowOffset={{ width: 0, height: -6 }}
        elevation={12}
      >
        <MenuEdgeCurve placement="top" side="left" />
        <MenuEdgeCurve placement="bottom" side="left" />
        <MenuEdgeCurve placement="top" side="right" />
        <MenuEdgeCurve placement="bottom" side="right" />
        {state.routes.map((route, index) => {
          const config = tabConfig[route.name];

          if (!config) {
            return null;
          }

          const isActive = state.index === index;

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
        })}
      </XStack>
    </View>
  );
}

const styles = StyleSheet.create({
  edgeCurve: {
    position: 'absolute',
  },
  edgeCurveLeft: {
    left: 0,
  },
  edgeCurveRight: {
    right: 0,
  },
  edgeCurveTop: {
    top: -MENU_CURVE_SIZE,
  },
  edgeCurveBottom: {
    bottom: -MENU_CURVE_SIZE,
  },
  item: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
  },
});
