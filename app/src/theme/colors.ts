/**
 * Warm, dark, paper-and-candle palette.
 * One accent. Macro colors stay distinct so a glance still means the same thing.
 */

export const colors = {
  background: '#0E0D0B',
  backgroundElevated: '#161411',
  surface: '#1C1916',
  surfaceRaised: '#26221D',

  glassLight: 'rgba(243, 238, 230, 0.06)',
  glassMedium: 'rgba(243, 238, 230, 0.10)',
  glassStrong: 'rgba(243, 238, 230, 0.16)',
  glassBorder: 'rgba(243, 238, 230, 0.12)',
  glassHighlight: 'rgba(255, 236, 210, 0.28)',
  hairline: 'rgba(243, 238, 230, 0.12)',
  track: 'rgba(243, 238, 230, 0.16)',

  textPrimary: '#F3EEE6',
  textSecondary: 'rgba(243, 238, 230, 0.64)',
  textTertiary: 'rgba(243, 238, 230, 0.40)',

  accent: '#E7A15A',
  accentSecondary: '#C9843E',
  accentSoft: 'rgba(231, 161, 90, 0.18)',
  dangerSoft: 'rgba(211, 107, 95, 0.18)',
  onAccent: '#1C140C',

  protein: '#D9896A',
  carbs: '#6AA8C4',
  fat: '#C9B458',
  calories: '#F3EEE6',

  success: '#8FB596',
  warning: '#C9B458',
  danger: '#D36B5F',

  scrim: 'rgba(14, 13, 11, 0.55)',
} as const;

export type ThemeColors = typeof colors;
