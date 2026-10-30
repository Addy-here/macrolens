import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalTile } from '../components/ui/GoalTile';
import { MacroMarks } from '../components/ui/MacroMarks';
import { Panel } from '../components/ui/Panel';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { WeekStrip } from '../components/ui/WeekStrip';
import { colors, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { dateFromKey, entryDateKey, localDateKey } from '../utils/date';
import { sumMacros } from '../utils/macros';
import type { FoodItem, FoodLogEntry } from '../types';

const MEALS: { key: FoodLogEntry['mealType']; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

/**
 * Totals are derived here from `entries`, not inside a Zustand selector.
 * A selector that returns a new object every call loops forever.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedKey, setSelectedKey] = useState(() => localDateKey(new Date()));
  const entries = useFoodLogStore((s) => s.entries);
  const plan = usePlanStore((s) => s.currentPlan);

  const dayEntries = useMemo(
    () => entries.filter((entry) => entryDateKey(entry.loggedAt) === selectedKey),
    [entries, selectedKey],
  );

  const totals = useMemo(
    () => sumMacros(dayEntries.map((entry) => entry.totalMacros)),
    [dayEntries],
  );

  const targetCalories = plan?.targetCalories ?? 2000;
  const targetMacros = plan?.targetMacros ?? {
    calories: targetCalories,
    proteinG: 150,
    carbsG: 200,
    fatG: 65,
  };

  const dateLabel = dateFromKey(selectedKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const groups = MEALS.map((meal) => ({
    ...meal,
    items: dayEntries
      .filter((entry) => entry.mealType === meal.key)
      .flatMap((entry) => entry.items),
  }));

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl + spacing.lg }]}
    >
      <ScreenHeader title="Today" detail={dateLabel} />
      <WeekStrip selectedKey={selectedKey} onSelect={setSelectedKey} />

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          <GoalTile label="Calories" value={totals.calories} target={targetMacros.calories} color={colors.calories} />
          <GoalTile label="Protein" value={totals.proteinG} target={targetMacros.proteinG} color={colors.protein} />
        </View>
        <View style={styles.gridRow}>
          <GoalTile label="Carbs" value={totals.carbsG} target={targetMacros.carbsG} color={colors.carbs} />
          <GoalTile label="Fat" value={totals.fatG} target={targetMacros.fatG} color={colors.fat} />
        </View>
      </View>

      {groups.map((group) => (
        <View key={group.key}>
          <Text style={styles.section}>{group.label}</Text>
          <Panel padded={false}>
            {group.items.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Log ${group.label}`}
                onPress={() => router.push('/log')}
                style={styles.emptyRow}
              >
                <Text style={styles.empty}>Nothing yet</Text>
                <Text style={styles.link}>Log</Text>
              </Pressable>
            ) : (
              group.items.map((item, index) => <FoodRow key={`${item.id}-${index}`} item={item} first={index === 0} />)
            )}
          </Panel>
        </View>
      ))}
    </ScrollView>
  );
}

function FoodRow({ item, first }: { item: FoodItem; first: boolean }) {
  return (
    <View style={[styles.food, !first && styles.foodDivider]}>
      <Text style={styles.foodName}>{item.name}</Text>
      <Text style={styles.portion}>{item.portionGrams} g</Text>
      <MacroMarks macros={item.macros} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  grid: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  link: {
    ...typography.body,
    color: colors.accent,
  },
  food: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  foodDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  foodName: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
  },
  portion: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
