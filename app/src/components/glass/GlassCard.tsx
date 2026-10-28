import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, blur } from '../../theme';

type Elevation = 'card' | 'sheet' | 'tabBar';
type GlassTint = 'light' | 'medium' | 'strong';

interface GlassCardProps {
  children: React.ReactNode;
  elevation?: Elevation;
  tint?: GlassTint;
  borderRadius?: number;
  style?: ViewStyle;
}

const tintFill: Record<GlassTint, string> = {
  light: colors.glassLight,
  medium: colors.glassMedium,
  strong: colors.glassStrong,
};

/**
 * Base glass surface primitive. Every other glass component (GlassButton,
 * GlassSheet, GlassTabBar, etc.) should compose this rather than calling
 * BlurView directly — keeps the blur/fill/edge-highlight recipe in one
 * place. See docs/DESIGN-SYSTEM.md for the rationale behind each layer.
 */
export function GlassCard({
  children,
  elevation = 'card',
  tint = 'light',
  borderRadius = radius.md,
  style,
}: GlassCardProps) {
  return (
    <View style={[styles.shadowWrap, { borderRadius }, style]}>
      <BlurView
        intensity={blur[elevation]}
        tint="dark"
        style={[styles.blur, { borderRadius }]}
      >
        <View
          style={[
            styles.fill,
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
          <View style={styles.content}>{children}</View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8, // Android fallback
  },
  blur: {
    overflow: 'hidden',
  },
  fill: {
    overflow: 'hidden',
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
