import React from 'react';
import {
  Platform,
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, radius, typography } from '../../theme';

type Variant = 'primary' | 'secondary';

interface GlassButtonProps {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Primary = accent gradient fill (sparingly used — one or two per screen,
 * per docs/DESIGN-SYSTEM.md). Secondary = glass fill, for everything else.
 */
export function GlassButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  style,
}: GlassButtonProps) {
  const handlePress = (e: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(e);
  };

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={[styles.shadowWrap, style]}
      >
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, disabled && styles.disabled]}
        >
          <Text style={[styles.label, { color: colors.background }]}>
            {label}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.shadowWrap, style]}
    >
      {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
        <GlassView style={styles.base} glassEffectStyle="regular" isInteractive>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {label}
          </Text>
        </GlassView>
      ) : (
        <BlurView intensity={40} tint="dark" style={styles.base}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {label}
          </Text>
        </BlurView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  base: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...typography.bodyEmphasized,
  },
});
