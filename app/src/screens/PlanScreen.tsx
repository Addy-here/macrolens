import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Segmented } from '../components/ui/Segmented';
import { TrendChart } from '../components/ui/TrendChart';
import { colors, radius, spacing, typography } from '../theme';
import { usePlanStore } from '../store/usePlanStore';
import { useUserStore } from '../store/useUserStore';
import { useDevAutoScroll } from '../dev/devScroll';
import { createId } from '../utils/id';
import {
  formatKg,
  pointsInRange,
  projectedGoalDate,
  signedKg,
  trendSeries,
  WEIGHT_RANGES,
  type WeightRange,
} from '../utils/weight';
import type { AdaptivePlan } from '../types';

export function PlanScreen() {
  const plan = usePlanStore((s) => s.currentPlan);
  const weightHistory = usePlanStore((s) => s.weightHistory);
  const addWeightEntry = usePlanStore((s) => s.addWeightEntry);
  const profile = useUserStore((s) => s.profile);
  const scrollRef = useDevAutoScroll('plan');
  const [range, setRange] = useState<WeightRange>('1M');
  const [weightDraft, setWeightDraft] = useState('');

  const series = useMemo(() => trendSeries(weightHistory), [weightHistory]);
  const visible = useMemo(() => pointsInRange(series, range), [series, range]);
  const latest = series[series.length - 1];
  const trendKg = latest?.trend ?? null;

  const parsedDraft = parseFloat(weightDraft.replace(',', '.'));
  const canSave = Number.isFinite(parsedDraft) && parsedDraft > 20 && parsedDraft < 400;

  function saveWeight() {
    if (!canSave) return;
    addWeightEntry({ id: createId(), loggedAt: new Date().toISOString(), weightKg: parsedDraft });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWeightDraft('');
  }

  const rangeChange = visible.length > 1 ? visible[visible.length - 1].trend - visible[0].trend : null;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {plan ? <TargetCard plan={plan} /> : <NoPlanCard />}

      <SectionHeader title="Weight" trailing={series.length ? `${series.length} weigh-ins` : undefined} />
      <Card style={styles.weightCard}>
        <Segmented
          accessibilityLabel="Chart range"
          options={WEIGHT_RANGES.map((value) => ({ value, label: value }))}
          value={range}
          onChange={setRange}
        />
        <View style={styles.stats}>
          <Stat label="Trend" value={trendKg != null ? formatKg(trendKg) : '—'} />
          <Stat label={`Change, ${range}`} value={rangeChange != null ? signedKg(rangeChange) : '—'} />
          <Stat
            label="To goal"
            value={trendKg != null && profile ? formatKg(Math.abs(trendKg - profile.goalWeightKg)) : '—'}
          />
        </View>
        {visible.length > 1 ? (
          <TrendChart points={visible} goalKg={profile?.goalWeightKg} />
        ) : (
          <View style={styles.chartEmpty}>
            <Icon name="chart.xyaxis.line" size={22} color={colors.textTertiary} weight="regular" />
            <Text style={styles.chartEmptyText}>
              {series.length === 0
                ? 'Your trend line starts with two weigh-ins.'
                : 'One more weigh-in in this range draws the line.'}
            </Text>
          </View>
        )}
      </Card>

      {profile && trendKg != null ? <GoalCard trendKg={trendKg} /> : null}

      <SectionHeader title="Weigh in" />
      <Card>
        <View style={styles.weighRow}>
          <View style={styles.weighField}>
            <TextInput
              value={weightDraft}
              onChangeText={setWeightDraft}
              keyboardType="decimal-pad"
              keyboardAppearance="light"
              placeholder={latest ? latest.scale.toFixed(1) : '0.0'}
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Today’s weight in kilograms"
              returnKeyType="done"
              onSubmitEditing={saveWeight}
              style={styles.weighInput}
            />
            <Text style={styles.weighUnit}>kg</Text>
          </View>
          <GlassButton label="Save" variant="primary" onPress={saveWeight} disabled={!canSave} style={styles.weighSave} />
        </View>
        {latest ? (
          <Text style={styles.weighHint}>
            Last {latest.scale.toFixed(1)} kg ·{' '}
            {new Date(latest.time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}

function TargetCard({ plan }: { plan: AdaptivePlan }) {
  const { proteinG, carbsG, fatG } = plan.targetMacros;
  const split = [
    { label: 'Protein', grams: proteinG, kcal: proteinG * 4, color: colors.protein },
    { label: 'Carbs', grams: carbsG, kcal: carbsG * 4, color: colors.carbs },
    { label: 'Fat', grams: fatG, kcal: fatG * 9, color: colors.fat },
  ];
  const totalKcal = split.reduce((sum, part) => sum + part.kcal, 0) || 1;
  const delta =
    plan.previousTargetCalories != null ? plan.targetCalories - plan.previousTargetCalories : null;

  return (
    <Card style={styles.target}>
      <View style={styles.targetTop}>
        <Text style={styles.cardLabel}>Daily target</Text>
        {delta ? (
          <View style={styles.deltaChip}>
            <Icon name={delta < 0 ? 'arrow.down' : 'arrow.up'} size={10} color={colors.textSecondary} weight="bold" />
            <Text style={styles.deltaText}>{Math.abs(delta)} kcal</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.heroRow} accessible accessibilityLabel={`${plan.targetCalories} calories a day`}>
        <Text style={styles.hero}>{plan.targetCalories.toLocaleString()}</Text>
        <Text style={styles.heroUnit}>kcal a day</Text>
      </View>

      {plan.changeReason ? (
        <View style={styles.reason}>
          <Icon name="arrow.triangle.2.circlepath" size={14} color={colors.accent} />
          <Text style={styles.reasonText}>{plan.changeReason}</Text>
        </View>
      ) : null}

      <View
        style={styles.splitBar}
        accessible
        accessibilityLabel={split
          .map((part) => `${part.label} ${part.grams} grams, ${Math.round((part.kcal / totalKcal) * 100)} percent`)
          .join(', ')}
      >
        {split.map((part) => (
          <View key={part.label} style={[styles.splitSegment, { flex: part.kcal, backgroundColor: part.color }]} />
        ))}
      </View>
      <View style={styles.legend}>
        {split.map((part) => (
          <View key={part.label} style={styles.legendItem}>
            <View style={styles.legendHead}>
              <View style={[styles.dot, { backgroundColor: part.color }]} />
              <Text style={styles.legendLabel}>{part.label}</Text>
            </View>
            <Text style={styles.legendValue}>
              {part.grams} g <Text style={styles.legendPct}>{Math.round((part.kcal / totalKcal) * 100)}%</Text>
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function NoPlanCard() {
  return (
    <Card style={styles.target}>
      <Text style={styles.cardLabel}>Daily target</Text>
      <Text style={styles.noPlanTitle}>Set your goal to get a number</Text>
      <Text style={styles.reasonText}>
        Height, weight, goal, and pace give a starting target. Each week it adjusts to how your trend actually moved.
      </Text>
      <GlassButton label="Set Goals" icon="target" variant="primary" onPress={() => router.navigate('/settings')} />
    </Card>
  );
}

function GoalCard({ trendKg }: { trendKg: number }) {
  const profile = useUserStore((s) => s.profile);
  if (!profile) return null;
  const { startingWeightKg: start, goalWeightKg: goal, targetRateKgPerWeek: rate } = profile;
  const span = goal - start;
  const progress = span !== 0 ? (trendKg - start) / span : 1;
  const eta = projectedGoalDate(trendKg, goal, rate);
  const etaText = eta
    ? `At ${Math.abs(rate)} kg a week, the trend reaches ${goal.toFixed(1)} kg around ${eta.toLocaleDateString(
        undefined,
        { month: 'long', day: 'numeric' },
      )}.`
    : rate === 0
      ? 'Your pace is set to maintain. Change it in Settings to set a date.'
      : 'Your trend is moving away from the goal right now. Give it a week of logging.';

  return (
    <>
      <SectionHeader title="Goal" trailing={`${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}% there`} />
      <Card style={styles.goalCard}>
        <ProgressBar progress={progress} color={colors.accent} height={10} />
        <View style={styles.goalEnds}>
          <View>
            <Text style={styles.goalValue}>{start.toFixed(1)}</Text>
            <Text style={styles.goalLabel}>Start</Text>
          </View>
          <View style={styles.goalMid}>
            <Text style={styles.goalValue}>{trendKg.toFixed(1)}</Text>
            <Text style={styles.goalLabel}>Now</Text>
          </View>
          <View style={styles.goalEnd}>
            <Text style={styles.goalValue}>{goal.toFixed(1)}</Text>
            <Text style={styles.goalLabel}>Goal</Text>
          </View>
        </View>
        <View style={styles.reason}>
          <Icon name="calendar" size={14} color={colors.accent} />
          <Text style={styles.reasonText}>{etaText}</Text>
        </View>
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  target: {
    gap: spacing.sm + 4,
    padding: spacing.lg - 4,
  },
  targetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
  },
  deltaText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  hero: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  reason: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  reasonText: {
    ...typography.footnote,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  noPlanTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  splitBar: {
    flexDirection: 'row',
    height: 10,
    gap: 2,
    marginTop: spacing.xs,
  },
  splitSegment: {
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
  },
  legendItem: {
    flex: 1,
    gap: 2,
  },
  legendHead: {
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
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  legendValue: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  legendPct: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  weightCard: {
    gap: spacing.md,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    ...typography.statMedium,
    fontSize: 19,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  chartEmpty: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  chartEmptyText: {
    ...typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  goalCard: {
    gap: spacing.md - 2,
  },
  goalEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalMid: {
    alignItems: 'center',
  },
  goalEnd: {
    alignItems: 'flex-end',
  },
  goalValue: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  goalLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  weighRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  weighField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  weighInput: {
    ...typography.statLarge,
    flex: 1,
    color: colors.textPrimary,
    padding: 0,
  },
  weighUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  weighSave: {
    minWidth: 104,
  },
  weighHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm + 2,
    lineHeight: 16,
  },
});
