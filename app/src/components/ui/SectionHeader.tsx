import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

/** Title above a group of cards, with an optional trailing note or action. */
export function SectionHeader({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.row} accessibilityRole="header">
      <Text style={styles.title}>{title}</Text>
      {typeof trailing === 'string' ? <Text style={styles.note}>{trailing}</Text> : trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    color: colors.textPrimary,
  },
  note: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
});
