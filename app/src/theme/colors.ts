/**
 * Macrolens design tokens — "iOS Liquid Glass" inspired palette.
 * Dark-first. Glass surfaces rely on BlurView + translucent fills layered
 * on top of blur, NOT flat colors — see docs/DESIGN-SYSTEM.md.
 */

export const colors = {
  // Base canvas
  background: '#0A0A0C',
  backgroundElevated: '#111114',

  // Glass surface tints (used as backgroundColor on top of a BlurView)
  glassLight: 'rgba(255,255,255,0.08)',
  glassMedium: 'rgba(255,255,255,0.12)',
  glassStrong: 'rgba(255,255,255,0.18)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassHighlight: 'rgba(255,255,255,0.35)', // top-edge specular highlight

  // Text
  textPrimary: '#F5F5F7',
  textSecondary: 'rgba(245,245,247,0.6)',
  textTertiary: 'rgba(245,245,247,0.38)',

  // Brand / accent — coral-to-amber, used sparingly (see design system doc)
  accent: '#FF6B4A',
  accentSecondary: '#FFB648',

  // Macro ring colors — fixed, never reassigned (muscle-memory convention)
  protein: '#FF6B4A',
  carbs: '#4AC0FF',
  fat: '#FFD24A',
  calories: '#F5F5F7',

  // Status
  success: '#3DDC84',
  warning: '#FFC247',
  danger: '#FF4D4D',

  // Overlays
  scrim: 'rgba(0,0,0,0.45)',
} as const;

export type ThemeColors = typeof colors;
