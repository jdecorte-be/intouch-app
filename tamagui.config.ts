import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';

import { palette } from './lib/palette';
import { appFontFamily } from './lib/typography';

const brandColors = {
  ink: palette.ink,
  inkSoft: palette.inkSoft,
  navBar: palette.navBar,
  slate: palette.slate,
  gray: palette.gray,
  silver: palette.silver,
  muted: palette.muted,
  fog: palette.fog,
  line: palette.line,
  mist: palette.mist,
  coral: palette.coral,
  coralSoft: palette.coralSoft,
  coralText: palette.coralText,
  teal: palette.teal,
  tealSoft: palette.tealSoft,
  tealText: palette.tealText,
  green: palette.green,
  warn: palette.warn,
  warnSoft: palette.warnSoft,
  danger: palette.danger,
  primary: palette.primary,
  primaryEnd: palette.primaryEnd,
  primarySoft: palette.primarySoft,
  accent: palette.accent,
  accentEnd: palette.accentEnd,
  accentSoft: palette.accentSoft,
} as const;

const appFonts = {
  body: {
    ...defaultConfig.fonts.body,
    family: appFontFamily,
  },
  heading: {
    ...defaultConfig.fonts.heading,
    family: appFontFamily,
  },
};

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    // The v5 preset only exposes shorthand style props ($bg, $ai, …);
    // we prefer the full React Native names across the app.
    onlyAllowShorthands: false,
  },
  tokens: {
    ...defaultConfig.tokens,
    color: brandColors,
  },
  fonts: appFonts,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: palette.white,
      color: palette.ink,
      colorHover: palette.inkSoft,
      borderColor: palette.line,
      placeholderColor: palette.muted,
      ...brandColors,
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...brandColors,
    },
  },
});

export type TamaguiConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
