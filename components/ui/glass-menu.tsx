import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, View, XStack } from 'tamagui';

import { IconlyIcon, type IconlyIconName } from '@/components/icons/iconly-icon';
import { palette } from '@/lib/palette';

const WIDTH = 210;
const RADIUS = 18;
const POINTER_WIDTH = 20;
const POINTER_HEIGHT = 10;
const ROW_HEIGHT = 46;
const VERTICAL_PADDING = 8;

export type GlassMenuItem = {
  key: string;
  label: string;
  icon: IconlyIconName;
  onPress: () => void;
  destructive?: boolean;
};

type GlassMenuProps = {
  visible: boolean;
  onClose: () => void;
  items: GlassMenuItem[];
  /** Distance from the menu's right edge to the tip of the pointer, i.e. the trigger button's center. */
  pointerOffsetFromRight?: number;
  top: number;
  right: number;
};

export function GlassMenu({ visible, onClose, items, pointerOffsetFromRight = 20, top, right }: GlassMenuProps) {
  if (!visible) {
    return null;
  }

  const cardHeight = items.length * ROW_HEIGHT + VERTICAL_PADDING * 2;
  const totalHeight = cardHeight + POINTER_HEIGHT;
  const pointerTipX = WIDTH - pointerOffsetFromRight;
  const pointerHalf = POINTER_WIDTH / 2;

  const maskPath = `
    M ${RADIUS} ${POINTER_HEIGHT}
    H ${pointerTipX - pointerHalf}
    L ${pointerTipX} 0
    L ${pointerTipX + pointerHalf} ${POINTER_HEIGHT}
    H ${WIDTH - RADIUS}
    Q ${WIDTH} ${POINTER_HEIGHT} ${WIDTH} ${POINTER_HEIGHT + RADIUS}
    V ${totalHeight - RADIUS}
    Q ${WIDTH} ${totalHeight} ${WIDTH - RADIUS} ${totalHeight}
    H ${RADIUS}
    Q 0 ${totalHeight} 0 ${totalHeight - RADIUS}
    V ${POINTER_HEIGHT + RADIUS}
    Q 0 ${POINTER_HEIGHT} ${RADIUS} ${POINTER_HEIGHT}
    Z
  `;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <MaskedView
        style={{ position: 'absolute', top, right, width: WIDTH, height: totalHeight }}
        maskElement={
          <Svg width={WIDTH} height={totalHeight} viewBox={`0 0 ${WIDTH} ${totalHeight}`}>
            <Path fill="black" d={maskPath} />
          </Svg>
        }
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={StyleSheet.absoluteFill} backgroundColor="rgba(255,255,255,0.12)" />

        <View paddingTop={POINTER_HEIGHT + VERTICAL_PADDING} paddingBottom={VERTICAL_PADDING}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <XStack height={ROW_HEIGHT} alignItems="center" gap={10} paddingHorizontal={16}>
                <IconlyIcon
                  name={item.icon}
                  size={18}
                  color={item.destructive ? palette.coral : palette.white}
                />
                <Text
                  fontSize={14}
                  fontWeight="600"
                  color={item.destructive ? palette.coral : palette.white}
                >
                  {item.label}
                </Text>
              </XStack>
            </Pressable>
          ))}
        </View>
      </MaskedView>
    </View>
  );
}
