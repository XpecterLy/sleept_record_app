/**
 * Noctua design tokens. The app is intentionally dark-only: it is used at night,
 * next to the bed, and a bright UI would disturb sleep.
 */
import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  bg: '#0A0E1C',
  bgDeep: '#05070F',
  surface: '#141A2E',
  surfaceAlt: '#1C2340',
  border: '#262E4F',
  text: '#F2F4FF',
  textSecondary: '#A9B0D0',
  textMuted: '#6F7799',
  accent: '#8B7BF0',
  accentSoft: 'rgba(139,123,240,0.16)',
  // Chart series (validated for CVD separation on the dark surface)
  sound: '#8B7BF0',
  snore: '#C97A22',
  noise: '#1E9E93',
  grid: 'rgba(169,176,208,0.12)',
  // Status (reserved, always paired with an icon + label)
  good: '#3FB27F',
  warning: '#D9A23A',
  critical: '#E5534B',
} as const;

export const Gradients = {
  screen: ['#121735', '#0A0E1C', '#05070F'] as const,
  accent: ['#9D8BFF', '#6C5CE7'] as const,
  night: ['#1B1F4B', '#0A0E1C'] as const,
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
