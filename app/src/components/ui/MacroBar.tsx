import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export function MacroBar({
  label,
  value,
  target,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const progress = target > 0 ? Math.min(Math.max(value / target, 0), 1) : 0;

  return (
    <View
      accessibilityLabel={`${label}, ${Math.round(value)} of ${Math.round(target)} ${unit}`}
      style={styles.row}
    >
      <View style={styles.meta}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(value)}
          <Text style={styles.target}>
            {' '}
            / {Math.round(target)}
            {unit}
          </Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  target: {
    color: colors.textTertiary,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
