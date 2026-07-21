import { Image } from 'expo-image';
import { Text, View } from 'tamagui';

import { lightenAccent } from '@/lib/event-data';

const MARKER_BORDER_OPACITY = 0.5;

function hexToRgba(hex: string, opacity: number) {
  const value = hex.replace('#', '');

  if (value.length !== 6) {
    return hex;
  }

  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function EventMarkerPin({
  icon,
  accent,
  isGroup = false,
  isActive = false,
  photoUrl,
}: {
  icon: string;
  accent: string;
  isGroup?: boolean;
  isActive?: boolean;
  photoUrl?: string | null;
}) {
  // Groups get a lighter, more vibrant take on their category color for the
  // border so they read as a livelier ring than the flat accent.
  const borderColor = hexToRgba(isGroup ? lightenAccent(accent) : accent, MARKER_BORDER_OPACITY);

  return (
    <View
      width={44}
      height={44}
      borderRadius={22}
      borderWidth={isActive ? 3 : 2}
      alignItems="center"
      justifyContent="center"
      shadowColor="#0f172a"
      shadowOpacity={0.18}
      shadowRadius={6}
      shadowOffset={{ width: 0, height: 3 }}
      style={{ backgroundColor: isGroup ? `${accent}24` : 'white', borderColor, elevation: 4 }}
    >
      {!isGroup && photoUrl ? (
        <Image source={photoUrl} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
      ) : (
        <Text fontSize={18}>{icon}</Text>
      )}
      {isGroup ? (
        <View
          position="absolute"
          top={-2}
          right={-2}
          width={14}
          height={14}
          borderRadius={7}
          borderWidth={1.5}
          borderColor="white"
          style={{ backgroundColor: accent }}
        />
      ) : null}
    </View>
  );
}
