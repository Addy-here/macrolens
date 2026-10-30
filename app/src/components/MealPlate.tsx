import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Icon } from './ui/Icon';
import { MacroBar } from './ui/MacroBar';
import { MacroRing } from './ui/MacroRing';
import { Segmented } from './ui/Segmented';
import { colors, radius, spacing, typography } from '../theme';
import { portionLabel } from '../utils/describe';
import { sumMacros } from '../utils/macros';
import type { DescribeMode } from '../services/logFlow';
import type { FoodItem } from '../types';

/**
 * The meal taking shape on Log: each food with its macro ring, a way to say
 * more, and the running total with its macro split. Foods arrive with a
 * spring as they're heard.
 */
export function MealPlate({
  items,
  choice,
  onAddMore,
}: {
  items: FoodItem[];
  /** How Review reads the words, offered only when the instant match is unsure and an AI key is saved. */
  choice?: { value: DescribeMode; onChange: (mode: DescribeMode) => void } | null;
  /** Shown once listening has stopped: speak again to add to the meal. */
  onAddMore?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const known = items.filter((item) => !item.unresolved);
  const totals = sumMacros(known.map((item) => item.macros));
  // With AI chosen, these matches are only a preview of what was heard.
  const preview = choice?.value === 'ai';
  const layout = reduceMotion ? undefined : LinearTransition.springify().damping(22);

  return (
    <Animated.View layout={layout} style={styles.plate}>
      {choice ? (
        <Segmented
          accessibilityLabel="How to read what you said"
          options={[
            { value: 'local', label: 'As heard' },
            { value: 'ai', label: 'With AI' },
          ]}
          value={choice.value}
          onChange={choice.onChange}
        />
      ) : null}

      {items.length > 0 || onAddMore ? (
        <Animated.View layout={layout} style={[styles.tray, preview && styles.preview]}>
          {items.map((item, index) => (
            <Animated.View
              key={`${item.heard ?? item.name}-${index}`}
              entering={reduceMotion ? undefined : FadeInDown.springify().damping(18)}
              exiting={reduceMotion ? undefined : FadeOut.duration(120)}
              layout={layout}
              style={[styles.row, index > 0 && styles.rowDivider]}
              accessible
              accessibilityLabel={
                item.unresolved
                  ? `${item.name}, not found`
                  : `${item.name}, ${portionLabel(item)}, ${Math.round(item.macros.calories)} calories`
              }
            >
              <MacroRing macros={item.macros} unknown={item.unresolved} />
              <View style={styles.rowText}>
                <Text style={[styles.name, item.unresolved && styles.unknown]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.portion} numberOfLines={1}>
                  {item.unresolved ? 'Not found' : portionLabel(item)}
                </Text>
              </View>
              <Text style={[styles.kcal, item.unresolved && styles.unknown]}>
                {item.unresolved ? '–' : Math.round(item.macros.calories)}
              </Text>
            </Animated.View>
          ))}

          {onAddMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add more by voice"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddMore();
              }}
              style={({ pressed }) => [styles.row, items.length > 0 && styles.rowDivider, pressed && styles.pressed]}
            >
              <View style={styles.addIcon}>
                <Icon name="mic.fill" size={14} color={colors.onAccent} />
              </View>
              <Text style={styles.addText}>Add more</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {known.length > 0 ? (
        <Animated.View layout={layout} style={[styles.totals, preview && styles.preview]}>
          <View style={styles.totalLine} accessible accessibilityLabel={`Total ${Math.round(totals.calories)} calories`}>
            <Text style={styles.totalNumber}>{Math.round(totals.calories).toLocaleString()}</Text>
            <Text style={styles.totalUnit}>kcal</Text>
          </View>
          <MacroBar macros={totals} />
          <View style={styles.legend}>
            {LEGEND.map((entry) => (
              <View key={entry.key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: entry.color }]} />
                <Text style={styles.legendLabel}>{entry.label}</Text>
                <Text style={styles.legendValue}>{Math.round(totals[entry.key])} g</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const RING = 30;

const LEGEND = [
  { key: 'proteinG', label: 'Protein', color: colors.protein },
  { key: 'carbsG', label: 'Carbs', color: colors.carbs },
  { key: 'fatG', label: 'Fat', color: colors.fat },
] as const;

const styles = StyleSheet.create({
  plate: {
    gap: spacing.md,
  },
  tray: {
    borderRadius: radius.md + 4,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
  },
  preview: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    minHeight: 56,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  unknown: {
    color: colors.textTertiary,
  },
  portion: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  kcal: {
    ...typography.statSmall,
    fontSize: 17,
    color: colors.textPrimary,
  },
  addIcon: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  addText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
  totals: {
    gap: spacing.sm + 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  legendValue: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  totalLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  totalNumber: {
    ...typography.statLarge,
    color: colors.textPrimary,
  },
  totalUnit: {
    ...typography.callout,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
