import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export function ScreenHeader({
  eyebrow,
  title,
  detail,
  uppercase = false,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  uppercase?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, uppercase && styles.uppercase]}>{eyebrow}</Text>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textTertiary,
  },
  uppercase: {
    textTransform: 'uppercase',
  },
  title: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  detail: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
