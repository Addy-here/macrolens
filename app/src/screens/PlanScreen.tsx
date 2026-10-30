import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Panel } from '../components/ui/Panel';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { TextButton } from '../components/ui/TextButton';
import { WeightLine } from '../components/ui/WeightLine';
import { colors, radius, spacing, typography } from '../theme';
import { usePlanStore } from '../store/usePlanStore';
import { createId } from '../utils/id';

export function PlanScreen() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.currentPlan);
  const weightHistory = usePlanStore((s) => s.weightHistory);
  const addWeightEntry = usePlanStore((s) => s.addWeightEntry);
  const trendWeightKg = usePlanStore((s) => s.trendWeightKg());
  const [weightDraft, setWeightDraft] = useState('');

  function saveWeight() {
    const weightKg = parseFloat(weightDraft);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    addWeightEntry({
      id: createId(),
      loggedAt: new Date().toISOString(),
      weightKg,
    });
    setWeightDraft('');
  }

  const canSave = Number.isFinite(parseFloat(weightDraft)) && parseFloat(weightDraft) > 0;

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <ScreenHeader title="This week" />
      {plan ? (
        <Panel>
          <Text style={styles.hero}>{plan.targetCalories.toLocaleString()}</Text>
          <Text style={styles.heroUnit}>kcal a day</Text>
          {plan.changeReason ? <Text style={styles.reason}>{plan.changeReason}</Text> : null}
          <View style={styles.macroList}>
            <MacroLine label="Protein" value={`${plan.targetMacros.proteinG} g`} color={colors.protein} />
            <MacroLine label="Carbs" value={`${plan.targetMacros.carbsG} g`} color={colors.carbs} />
            <MacroLine label="Fat" value={`${plan.targetMacros.fatG} g`} color={colors.fat} />
          </View>
        </Panel>
      ) : (
        <Panel>
          <Text style={styles.unsetTitle}>No target yet</Text>
          <Text style={styles.reason}>Height, weight, and pace in Settings set this number.</Text>
          <TextButton label="Set goals" onPress={() => router.push('/settings')} />
        </Panel>
      )}

      <Text style={styles.section}>Weight</Text>
      <Panel>
        <Text style={styles.trendLabel}>Trend</Text>
        <Text style={styles.trendValue}>
          {trendWeightKg ? `${trendWeightKg.toFixed(1)} kg` : '—'}
        </Text>
        <Text style={styles.trendHint}>
          {weightHistory.length > 1
            ? `Smoothed from ${weightHistory.length} weigh-ins.`
            : 'One reading is a weigh-in. A few of them become a trend.'}
        </Text>
        <WeightLine values={weightHistory.map((entry) => entry.weightKg)} />
        <View style={styles.weightRow}>
          <TextInput
            value={weightDraft}
            onChangeText={setWeightDraft}
            keyboardType="decimal-pad"
            keyboardAppearance="light"
            placeholder="kg"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Today’s weight in kilograms"
            style={styles.weightInput}
          />
          <TextButton label="Save" onPress={saveWeight} disabled={!canSave} />
        </View>
      </Panel>
    </ScrollView>
  );
}

function MacroLine({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroLine}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
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
  hero: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroUnit: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reason: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  macroList: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  macroLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  macroLabel: {
    ...typography.caption,
  },
  macroValue: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
  },
  unsetTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  section: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  trendLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  trendValue: {
    ...typography.statLarge,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  trendHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  weightInput: {
    ...typography.statMedium,
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
