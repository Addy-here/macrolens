import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import type { Macros } from '../../types';

/** Calories from protein, carbs, and fat as one stacked capsule, with a 2 pt gap between segments. */
export function MacroBar({ macros, height = 8 }: { macros: Macros; height?: number }) {
  const parts = [
    { color: colors.protein, kcal: macros.proteinG * 4 },
    { color: colors.carbs, kcal: macros.carbsG * 4 },
    { color: colors.fat, kcal: macros.fatG * 9 },
  ].filter((part) => part.kcal > 0);

  if (parts.length === 0) return <View style={[styles.bar, { height, borderRadius: height / 2 }, styles.empty]} />;

  return (
    <View style={[styles.bar, { height }]} accessibilityElementsHidden importantForAccessibility="no">
      {parts.map((part) => (
        <View key={part.color} style={{ flex: part.kcal, backgroundColor: part.color, borderRadius: height / 2 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 2,
    alignSelf: 'stretch',
  },
  empty: {
    backgroundColor: colors.track,
  },
});
