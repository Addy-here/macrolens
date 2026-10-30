/**
 * Spacing, radius, and typography scale — paired with colors.ts.
 * See docs/DESIGN-SYSTEM.md for the rationale behind each value.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
  body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.2 },
  bodyEmphasized: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  caption: { fontSize: 13, fontWeight: '500' as const, letterSpacing: -0.1 },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
  hero: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  statLarge: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  statMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
} as const;

/** Spring configs for react-native-reanimated — "physical, not linear" motion. */
export const springs = {
  default: { damping: 18, stiffness: 180, mass: 1 },
  snappy: { damping: 20, stiffness: 260, mass: 0.9 },
  gentle: { damping: 16, stiffness: 120, mass: 1 },
} as const;

/** Blur intensities per elevation level, used with expo-blur's BlurView. */
export const blur = {
  card: 40,
  sheet: 55,
  tabBar: 60,
} as const;
