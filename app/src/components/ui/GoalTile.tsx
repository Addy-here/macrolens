import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MacroRing } from '../glass';
import { colors, radius, spacing, typography } from '../../theme';

export function GoalTile({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const delta = Math.round(target - value);
  const past = delta < 0;
  const status = past ? `${Math.abs(delta).toLocaleString()} past` : `${delta.toLocaleString()} left`;
  const progress = target > 0 ? value / target : 0;

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${status}`}
      style={styles.tile}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={styles.status}>{status}</Text>
        <MacroRing
          progress={progress}
          color={color}
          trackColor={color.length === 7 ? `${color}2E` : color}
          size={36}
          strokeWidth={4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  status: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
    flex: 1,
  },
});
