import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import type { Macros } from '../../types';

const marks = [
  { key: 'calories', color: colors.calories, unit: 'calories' },
  { key: 'protein', color: colors.protein, unit: 'protein' },
  { key: 'carbs', color: colors.carbs, unit: 'carbs' },
  { key: 'fat', color: colors.fat, unit: 'fat' },
] as const;

function amount(macros: Macros, key: (typeof marks)[number]['key']) {
  if (key === 'calories') return Math.round(macros.calories);
  if (key === 'protein') return Math.round(macros.proteinG);
  if (key === 'carbs') return Math.round(macros.carbsG);
  return Math.round(macros.fatG);
}

/** Colored nutrient marks. The same four colors as the goal rings. */
export function MacroMarks({ macros }: { macros: Macros }) {
  const label = marks.map((mark) => `${amount(macros, mark.key)} ${mark.unit}`).join(', ');
  return (
    <View accessibilityLabel={label} style={styles.row}>
      {marks.map((mark) => (
        <View key={mark.key} style={styles.mark}>
          <View style={[styles.dot, { backgroundColor: mark.color }]} />
          <Text style={styles.value}>{amount(macros, mark.key)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  value: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
