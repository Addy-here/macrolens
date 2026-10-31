import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme';

/** Style keys that place the card among its siblings; the rest lay out its content. */
const OUTER_KEYS = new Set([
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'width', 'minWidth', 'maxWidth',
  'position', 'top', 'bottom', 'left', 'right', 'zIndex',
]);

/**
 * White card on the gray page. Pads itself by default so content never
 * touches the rounded corners; pass `padded={false}` for edge-to-edge rows.
 * An unpadded card clips its content to the rounded corners, so a pressed
 * row's highlight follows the curve. The clip sits on an inner view: clipping
 * the card itself would also cut off its shadow.
 */
export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  if (padded) return <View style={[styles.card, styles.padded, style]}>{children}</View>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(StyleSheet.flatten(style) ?? {})) {
    (OUTER_KEYS.has(key) ? outer : inner)[key] = value;
  }
  return (
    <View style={[styles.card, outer as ViewStyle]}>
      <View style={[styles.clip, inner as ViewStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    ...shadow.card,
  },
  clip: {
    flexGrow: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.md,
  },
});
