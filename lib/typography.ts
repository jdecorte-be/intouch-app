import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

export const appFontFamily = Platform.select({
  web: '"SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, Inter, sans-serif',
  default: 'System',
})!;

export const appTextInputStyle = {
  fontFamily: appFontFamily,
} satisfies Pick<TextStyle, 'fontFamily'>;
