import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Panel } from '../components/ui/Panel';
import { TextButton } from '../components/ui/TextButton';
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
      <Text style={styles.eyebrow}>This week</Text>
      {plan ? (
        <>
          <View style={styles.heroRow}>
            <Text style={styles.hero}>{plan.targetCalories.toLocaleString()}</Text>
            <Text style={styles.heroUnit}>kcal{'\n'}a day</Text>
          </View>
          {plan.changeReason ? <Text style={styles.reason}>{plan.changeReason}</Text> : null}
          <View style={styles.split}>
            <Split label="Protein" value={`${plan.targetMacros.proteinG}g`} color={colors.protein} />
            <Split label="Carbs" value={`${plan.targetMacros.carbsG}g`} color={colors.carbs} />
            <Split label="Fat" value={`${plan.targetMacros.fatG}g`} color={colors.fat} />
          </View>
        </>
      ) : (
        <View style={styles.unset}>
          <Text style={styles.unsetTitle}>No target yet</Text>
          <Text style={styles.reason}>
            Save your height, weight, and pace. This week’s calories are calculated from that.
          </Text>
          <TextButton label="Set your goals" onPress={() => router.push('/settings')} />
        </View>
      )}

      <Text style={styles.section}>Weight</Text>
      <Panel>
        <Text style={styles.trendLabel}>Trend</Text>
        <Text style={styles.trendValue}>
          {trendWeightKg ? `${trendWeightKg.toFixed(1)} kg` : '—'}
        </Text>
        <Text style={styles.trendHint}>
          {weightHistory.length > 0
            ? `Smoothed from ${weightHistory.length} weigh-in${weightHistory.length === 1 ? '' : 's'}.`
            : 'One reading is a weigh-in. A few of them become a trend.'}
        </Text>
        <View style={styles.weightRow}>
          <TextInput
            value={weightDraft}
            onChangeText={setWeightDraft}
            keyboardType="decimal-pad"
            keyboardAppearance="dark"
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

function Split({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.splitItem}>
      <Text style={[styles.splitValue, { color }]}>{value}</Text>
      <Text style={styles.splitLabel}>{label}</Text>
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
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  hero: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroUnit: {
    ...typography.bodyEmphasized,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  reason: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  split: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  splitItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  splitValue: {
    ...typography.statMedium,
  },
  splitLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  unset: {
    gap: spacing.xs,
  },
  unsetTitle: {
    ...typography.largeTitle,
    color: colors.textPrimary,
  },
  section: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
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
