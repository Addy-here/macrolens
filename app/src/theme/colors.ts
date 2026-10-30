/**
 * Light log. Orange is the brand: actions and the calorie ring.
 * Protein, carbs, and fat each keep one fixed hue everywhere they appear.
 * The four nutrient colors pass the dataviz palette validator on white
 * (lightness band, chroma, colorblind separation, 3:1 contrast).
 * See docs/DESIGN-SYSTEM.md.
 */

export const colors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  /** Inset fields and wells inside a white card. */
  surfaceRaised: '#F2F2F7',

  fill: 'rgba(118, 118, 128, 0.12)',
  fillStrong: 'rgba(118, 118, 128, 0.2)',
  hairline: 'rgba(60, 60, 67, 0.12)',
  track: 'rgba(118, 118, 128, 0.14)',

  textPrimary: '#111114',
  textSecondary: 'rgba(60, 60, 67, 0.7)',
  textTertiary: 'rgba(60, 60, 67, 0.42)',
  /** Text and symbols on a photo or the dark viewfinder. */
  textOnMedia: '#FFFFFF',

  accent: '#FF5C1A',
  accentSoft: 'rgba(255, 92, 26, 0.12)',
  onAccent: '#FFFFFF',

  calories: '#FF5C1A',
  protein: '#C2368F',
  carbs: '#2F7CF6',
  fat: '#1F9D63',

  success: '#1F9D63',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255, 59, 48, 0.12)',

  viewfinder: '#16161A',
  scrim: 'rgba(0, 0, 0, 0.45)',

  /** iOS Settings-style icon tiles. Settings rows only. */
  tile: {
    orange: '#FF5C1A',
    indigo: '#5856D6',
    teal: '#30B0C7',
    pink: '#FF2D55',
    green: '#34C759',
    gray: '#8E8E93',
  },
} as const;

export type ThemeColors = typeof colors;

/** `#RRGGBB` plus an alpha 0–1, for tracks and washes of a nutrient hue. */
export function withAlpha(hex: string, alpha: number) {
  if (hex.length !== 7) return hex;
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
