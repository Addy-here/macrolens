import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, MacroRing } from '../components/glass';
import { colors, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import type { Macros } from '../types';

const emptyMacros: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/**
 * Home / Today screen — daily macro rings + recent log entries.
 * See docs/PRODUCT.md "Macro & micro tracking" and docs/DESIGN-SYSTEM.md
 * for the ring layout rationale.
 *
 * NOTE: totals are computed here with useMemo from the raw `entries`
 * array, NOT via a store selector that calls `.reduce()` inline — a
 * selector returning a freshly-allocated object every render causes
 * Zustand's useSyncExternalStore to see a "changed" snapshot every time,
 * which is an infinite render loop ("getSnapshot should be cached"). Keep
 * derived/aggregated values out of store selectors; compute them in the
 * component (or with a memoized selector) instead.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const todayIso = new Date().toISOString().slice(0, 10);
  const entries = useFoodLogStore((s) => s.entries);
  const plan = usePlanStore((s) => s.currentPlan);

  const totals = useMemo(() => {
    return entries
      .filter((e) => e.loggedAt.startsWith(todayIso))
      .reduce<Macros>(
        (acc, entry) => ({
          calories: acc.calories + entry.totalMacros.calories,
          proteinG: acc.proteinG + entry.totalMacros.proteinG,
          carbsG: acc.carbsG + entry.totalMacros.carbsG,
          fatG: acc.fatG + entry.totalMacros.fatG,
        }),
        { ...emptyMacros },
      );
  }, [entries, todayIso]);

  const targetCalories = plan?.targetCalories ?? 2000;
  const targetMacros = plan?.targetMacros ?? {
    calories: 2000,
    proteinG: 150,
    carbsG: 200,
    fatG: 65,
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
    >
      <Text style={[typography.largeTitle, { color: colors.textPrimary }]}>
        Today
      </Text>

      <GlassCard style={styles.ringsCard} elevation="card" tint="light">
        <View style={styles.ringsRow}>
          <MacroRing
            progress={totals.calories / targetCalories}
            color={colors.calories}
            size={140}
            strokeWidth={14}
            label="Calories"
            valueText={`${Math.round(totals.calories)}`}
          />
        </View>
        <View style={styles.macroRow}>
          <MacroRing
            progress={totals.proteinG / targetMacros.proteinG}
            color={colors.protein}
            size={84}
            strokeWidth={8}
            label="Protein"
            valueText={`${Math.round(totals.proteinG)}g`}
          />
          <MacroRing
            progress={totals.carbsG / targetMacros.carbsG}
            color={colors.carbs}
            size={84}
            strokeWidth={8}
            label="Carbs"
            valueText={`${Math.round(totals.carbsG)}g`}
          />
          <MacroRing
            progress={totals.fatG / targetMacros.fatG}
            color={colors.fat}
            size={84}
            strokeWidth={8}
            label="Fat"
            valueText={`${Math.round(totals.fatG)}g`}
          />
        </View>
      </GlassCard>

      <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.xl }]}>
        Recent
      </Text>
      {/* Food log list — wired up once FoodLogScreen/review flow exists. */}
      <GlassCard style={{ marginTop: spacing.md }} elevation="card" tint="light">
        <Text style={[typography.body, { color: colors.textSecondary, padding: spacing.md }]}>
          No meals logged yet. Tap the camera tab to add your first one.
        </Text>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  ringsCard: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  ringsRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
