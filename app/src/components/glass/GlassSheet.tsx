import React from 'react';
import { Platform, View, StyleSheet, ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { colors, blur } from '../../theme';

interface GlassSheetProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Bottom-sheet/modal glass surface. This is the surface used by the
 * food-review-before-save flow — see docs/PRODUCT.md "mandatory review
 * screen" and docs/DESIGN-SYSTEM.md. Meant to be rendered inside a
 * navigation modal/sheet presentation, not a positioning primitive itself.
 */
export function GlassSheet({ children, style }: GlassSheetProps) {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView style={[styles.sheet, styles.nativeSheet, style]} glassEffectStyle="regular">
        <View style={styles.handle} />
        <View style={styles.content}>{children}</View>
      </GlassView>
    );
  }

  return (
    <BlurView intensity={blur.sheet} tint="dark" style={[styles.sheet, style]}>
      <View style={styles.handle} />
      <View style={styles.content}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    paddingTop: 8,
  },
  nativeSheet: {
    borderColor: 'transparent',
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    alignSelf: 'center',
    marginBottom: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
