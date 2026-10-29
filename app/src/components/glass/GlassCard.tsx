import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, blur } from '../../theme';

type Elevation = 'card' | 'sheet' | 'tabBar';
type GlassTint = 'light' | 'medium' | 'strong';

interface GlassCardProps {
  children: React.ReactNode;
  elevation?: Elevation;
  tint?: GlassTint;
  borderRadius?: number;
  /**
   * Internal content padding. Defaults to `spacing.md` so every GlassCard
   * is safe-by-default — content never has to remember to pad itself away
   * from the rounded corners (a bug that previously hit PlanScreen and
   * SettingsScreen: cards with no explicit padding rendered text flush
   * against the edges, looking like it was "spilling out"). Pass `0`
   * explicitly to opt out (e.g. when the child is an edge-to-edge Image).
   */
  padding?: number;
  /** Outer layout only (margin, width, flex, etc.) — NOT applied inside
   * the card. Use the `padding` prop for internal spacing, never put
   * `padding` in `style`, it won't reach the content. */
  style?: ViewStyle;
  interactive?: boolean;
}

const tintFill: Record<GlassTint, string> = {
  light: colors.glassLight,
  medium: colors.glassMedium,
  strong: colors.glassStrong,
};

const nativeGlassStyle: Record<GlassTint, 'clear' | 'regular'> = {
  light: 'clear',
  medium: 'regular',
  strong: 'regular',
};

/**
 * Base glass surface primitive. On iOS 26+ this renders Apple's actual
 * native Liquid Glass material via `GlassView` (backed by
 * `UIVisualEffectView`) — real specular refraction, real dynamic light
 * response, not a drawn approximation. On everything else (older iOS,
 * Android, web) it falls back to the hand-rolled BlurView + gradient
 * recipe below, which is a reasonable approximation but not the same
 * material. Every other glass component should compose THIS rather than
 * calling GlassView/BlurView directly. See docs/DESIGN-SYSTEM.md.
 */
export function GlassCard({
  children,
  elevation = 'card',
  tint = 'light',
  borderRadius = radius.md,
  padding = spacing.md,
  style,
  interactive = false,
}: GlassCardProps) {
  const stretch = style?.flex != null ? styles.flexFill : undefined;

  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <View style={[styles.shadowWrap, { borderRadius }, style]}>
        <GlassView
          style={[styles.nativeGlass, { borderRadius }, stretch]}
          glassEffectStyle={nativeGlassStyle[tint]}
          isInteractive={interactive}
        >
          <View style={[styles.content, { padding }, stretch]}>{children}</View>
        </GlassView>
      </View>
    );
  }

  // Fallback recipe for iOS < 26, Android, web.
  return (
    <View style={[styles.shadowWrap, { borderRadius }, style]}>
      <BlurView
        intensity={blur[elevation]}
        tint="dark"
        style={[styles.blur, { borderRadius }, stretch]}
      >
        <View
          style={[
            styles.fill,
            stretch,
            { backgroundColor: tintFill[tint], borderRadius },
          ]}
        >
          {/* Top-edge specular highlight — the detail that sells "glass". */}
          <LinearGradient
            colors={[colors.glassHighlight, 'transparent']}
            style={[styles.highlight, { borderRadius }]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={[styles.border, { borderRadius }]} />
          <View style={[styles.content, { padding }, stretch]}>{children}</View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8, // Android fallback
  },
  nativeGlass: {
    padding: 0,
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  fill: {
    overflow: 'hidden',
  },
  flexFill: {
    flex: 1,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    opacity: 0.5,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  content: {
    position: 'relative',
  },
});
