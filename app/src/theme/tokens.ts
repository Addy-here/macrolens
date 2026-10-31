import { Platform } from 'react-native';

/**
 * Spacing, radius, type, and motion — paired with colors.ts.
 * See docs/DESIGN-SYSTEM.md for the rationale behind each value.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  /** Horizontal inset of every screen. */
  gutter: 20,
  /**
   * Bottom padding on tab screens that show the Log a meal bar. The automatic
   * inset clears the tab bar but not the bar's accessory above it.
   */
  tabBottom: 104,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

/** SF Pro Rounded for figures, the way Fitness and Health set numbers. A system face, not a custom font. */
const rounded = Platform.select({ ios: 'ui-rounded', default: undefined });

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.3 },
  callout: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.2 },
  subheadline: { fontSize: 15, fontWeight: '600' as const, letterSpacing: -0.2 },
  footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.1 },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0 },
  /** Section labels inside cards. Sentence case, never all caps. */
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: -0.1 },

  /** One per screen: the number the screen is about. Proportional figures. */
  hero: { fontFamily: rounded, fontSize: 52, fontWeight: '700' as const, letterSpacing: -1.2 },
  statLarge: { fontFamily: rounded, fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6 },
  statMedium: { fontFamily: rounded, fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  statSmall: {
    fontFamily: rounded,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'] as 'tabular-nums'[],
  },
} as const;

/** Soft lift for white cards on the gray page. Barely there. */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
} as const;

/** Spring configs for react-native-reanimated — physical, not linear. */
export const springs = {
  snappy: { damping: 22, stiffness: 320, mass: 0.8 },
  gentle: { damping: 20, stiffness: 110, mass: 1 },
} as const;
