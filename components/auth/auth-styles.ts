import { StyleSheet } from 'react-native';

import { appTextInputStyle } from '@/lib/typography';

export const dark = {
  background: '#0B0B0D',
  surfaceElevated: '#1C1C21',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8B8C0',
  border: '#232328',
  accent: '#8975fe',
  accentEnd: '#9d8cff',
  dangerSoft: 'rgba(239,68,68,0.12)',
  dangerText: '#FCA5A5',
} as const;

export const authStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  input: {
    ...appTextInputStyle,
    height: 52,
    borderRadius: 16,
    backgroundColor: dark.surfaceElevated,
    color: dark.textPrimary,
    fontSize: 15,
    paddingHorizontal: 16,
  },
  submitButton: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTransition: {
    width: '100%',
  },
});
