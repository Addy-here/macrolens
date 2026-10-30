import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { Icon } from '../ui/Icon';
import { colors, radius, shadow, typography } from '../../theme';

type Variant = 'primary' | 'secondary';

interface GlassButtonProps {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: Variant;
  icon?: SFSymbol;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/**
 * Capsule button. Primary is the one filled action on a screen: accent-tinted
 * Liquid Glass on iOS 26, solid accent elsewhere. Secondary is a white capsule.
 */
export function GlassButton({
  label,
  onPress,
  variant = 'secondary',
  icon,
  disabled = false,
  style,
  accessibilityHint,
}: GlassButtonProps) {
  const primary = variant === 'primary';
  // Clear glass over a flat gray page has nothing to refract and reads as missing,
  // so only the tinted primary uses the material; secondary is a white capsule.
  const glass = primary && !disabled && Platform.OS === 'ios' && isLiquidGlassAvailable();
  const ink = disabled ? colors.textTertiary : primary ? colors.onAccent : colors.textPrimary;

  const content = (
    <View style={styles.inner}>
      {icon ? <Icon name={icon} size={17} color={ink} /> : null}
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={(e) => {
        void Haptics.impactAsync(primary ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        onPress(e);
      }}
      style={({ pressed }) => [
        styles.wrap,
        primary && !disabled && styles.lift,
        !primary && !disabled && shadow.card,
        pressed && !glass && styles.pressed,
        style,
      ]}
    >
      {glass ? (
        <GlassView
          style={styles.base}
          glassEffectStyle="regular"
          tintColor={colors.accent}
          isInteractive
          colorScheme="light"
        >
          {content}
        </GlassView>
      ) : (
        <View
          style={[
            styles.base,
            disabled ? styles.off : primary ? styles.primary : styles.secondary,
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.pill,
  },
  lift: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  base: {
    minHeight: 54,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  off: {
    backgroundColor: colors.fill,
  },
  label: {
    ...typography.headline,
  },
});
