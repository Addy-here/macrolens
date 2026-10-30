/**
 * Light log. Orange is the action. Four colors are the nutrients.
 * See docs/DESIGN-SYSTEM.md.
 */

export const colors = {
  background: '#F2F2F7',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceRaised: '#F2F2F7',

  glassLight: 'rgba(255, 255, 255, 0.55)',
  glassMedium: 'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(60, 60, 67, 0.12)',
  glassHighlight: 'rgba(255, 255, 255, 0.9)',
  hairline: 'rgba(60, 60, 67, 0.12)',
  track: 'rgba(60, 60, 67, 0.12)',

  textPrimary: '#1C1C1E',
  textSecondary: 'rgba(60, 60, 67, 0.64)',
  textTertiary: 'rgba(60, 60, 67, 0.36)',

  accent: '#FF5C1A',
  accentSecondary: '#E24E12',
  accentSoft: 'rgba(255, 92, 26, 0.14)',
  onAccent: '#FFFFFF',

  calories: '#FF4B4B',
  protein: '#FF9F0A',
  carbs: '#0A84FF',
  fat: '#34C759',

  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.12)',

  scrim: 'rgba(0, 0, 0, 0.35)',
} as const;

export type ThemeColors = typeof colors;
