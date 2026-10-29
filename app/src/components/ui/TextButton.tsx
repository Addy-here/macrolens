import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography } from '../../theme';

type Tone = 'accent' | 'danger' | 'muted';

const toneColor: Record<Tone, string> = {
  accent: colors.accent,
  danger: colors.danger,
  muted: colors.textSecondary,
};

/** Quiet action. The screen should have one filled button; everything else is this. */
export function TextButton({
  label,
  onPress,
  disabled = false,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: Tone;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={styles.hit}
    >
      <Text style={[styles.label, { color: toneColor[tone], opacity: disabled ? 0.4 : 1 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  label: {
    ...typography.bodyEmphasized,
  },
});
