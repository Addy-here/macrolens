import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import type { Macros } from '../../types';

const marks = [
  { key: 'proteinG', letter: 'P', name: 'protein', color: colors.protein },
  { key: 'carbsG', letter: 'C', name: 'carbs', color: colors.carbs },
  { key: 'fatG', letter: 'F', name: 'fat', color: colors.fat },
] as const;

/**
 * Protein, carbs, and fat for one food. The colored dot carries identity;
 * the letter and number stay in text ink so identity never relies on color alone.
 */
export function MacroMarks({ macros }: { macros: Macros }) {
  const label = marks.map((mark) => `${Math.round(macros[mark.key])} grams ${mark.name}`).join(', ');
  return (
    <View accessible accessibilityLabel={label} style={styles.row}>
      {marks.map((mark) => (
        <View key={mark.key} style={styles.mark}>
          <View style={[styles.dot, { backgroundColor: mark.color }]} />
          <Text style={styles.value}>
            <Text style={styles.letter}>{mark.letter} </Text>
            {Math.round(macros[mark.key])}g
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  letter: {
    color: colors.textTertiary,
  },
  value: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
