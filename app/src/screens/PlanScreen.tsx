import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Tappable } from '../components/ui/Tappable';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ListRow } from '../components/ui/ListRow';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Segmented } from '../components/ui/Segmented';
import { TrendChart } from '../components/ui/TrendChart';
import { WeightInput } from '../components/ui/UnitFields';
import { colors, radius, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useUnits, type BoundUnits } from '../store/useSettingsStore';
import { useUserStore } from '../store/useUserStore';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { applyCheckIn, pendingCheckIn, skipCheckIn, type CheckIn } from '../services/planFlow';
import { createId } from '../utils/id';
import { estimateExpenditure, loggedDaysInWindow, MIN_LOGGED_DAYS } from '../utils/expenditure';
import {
  activityLabel,
  ageFrom,
  dayCalories,
  dietLabel,
  formulaMaintenance,
  goalKind,
} from '../utils/planCalculator';
import { pointsInRange, projectedGoalDate, trendSeries, WEIGHT_RANGES, type WeightRange } from '../utils/weight';
import type { AdaptivePlan, UserProfile } from '../types';

/**
 * The plan: today's target and why it is what it is, the weight trend that
 * steers it, progress to the goal, measured maintenance, and every setting
 * the target comes from (edited in the plan editor sheet).
 */
export function PlanScreen() {
  const plan = usePlanStore((s) => s.currentPlan);
  const weightHistory = usePlanStore((s) => s.weightHistory);
  const addWeightEntry = usePlanStore((s) => s.addWeightEntry);
  const entries = useFoodLogStore((s) => s.entries);
  const profile = useUserStore((s) => s.profile);
  const u = useUnits();
  const scrollRef = useDevAutoScroll('plan');
  const [range, setRange] = useState<WeightRange>('1M');
  const [draftKg, setDraftKg] = useState<number | null>(null);
  const [fieldKey, setFieldKey] = useState(0);
  const weighRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  useDevAction('plan.focusWeight', () => weighRef.current?.focus());

  const series = useMemo(() => trendSeries(weightHistory), [weightHistory]);
  const visible = useMemo(() => pointsInRange(series, range), [series, range]);
  const latest = series[series.length - 1];
  const trendKg = latest?.trend ?? null;
  const checkIn = useMemo(
    () => pendingCheckIn(profile, plan, entries, weightHistory),
    [profile, plan, entries, weightHistory],
  );

  const canSave = draftKg != null && draftKg > 20 && draftKg < 400;

  function saveWeight() {
    if (!canSave || draftKg == null) return;
    addWeightEntry({ id: createId(), loggedAt: new Date().toISOString(), weightKg: Math.round(draftKg * 100) / 100 });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDraftKg(null);
    // Remount the field so it shows the placeholder again.
    setFieldKey((key) => key + 1);
  }
  useDevAction('plan.saveWeight', saveWeight);
  useDevAction('plan.checkIn', () => checkIn && applyCheckIn(checkIn));

  const rangeChange = visible.length > 1 ? visible[visible.length - 1].trend - visible[0].trend : null;
  const openEditor = () => router.push('/plan-editor');

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: profile
            ? () => (
                <Tappable accessibilityRole="button" hitSlop={8} onPress={openEditor} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>Edit</Text>
                </Tappable>
              )
            : undefined,
        }}
      />
      <KeyboardAwareScrollView
        // Clears the system bar iOS adds above the keyboard (Done, Passwords), which isn't counted in its height.
        bottomOffset={64}
        ref={scrollRef as never}
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {plan && profile ? <TargetCard plan={plan} u={u} /> : <SetupCard />}

        {checkIn ? <CheckInCard checkIn={checkIn} u={u} /> : null}

        <SectionHeader
          title="Weight"
          trailing={
            series.length ? (
              <Tappable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/plan/weights')}>
                <Text style={styles.link}>All Weigh-Ins</Text>
              </Tappable>
            ) : undefined
          }
        />
        <Card style={styles.weightCard}>
          <Segmented
            accessibilityLabel="Chart range"
            options={WEIGHT_RANGES.map((value) => ({ value, label: value }))}
            value={range}
            onChange={setRange}
          />
          <View style={styles.stats}>
            <Stat label="Trend" value={trendKg != null ? u.weightText(trendKg) : '—'} />
            <Stat label={`Change, ${range}`} value={rangeChange != null ? u.weightDelta(rangeChange) : '—'} />
            <Stat
              label="To goal"
              value={
                trendKg != null && profile && goalKind(profile.targetRateKgPerWeek) !== 'maintain'
                  ? u.weightDelta(profile.goalWeightKg - trendKg).replace(/^[+−]/, '')
                  : '—'
              }
            />
          </View>
          {visible.length > 1 ? (
            <TrendChart points={visible} goalKg={profile?.goalWeightKg} unit={u.weight} />
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

        <SectionHeader
          title="Weigh in"
          trailing={
            <Tappable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/weigh-in')}>
              <Text style={styles.link}>Other Day</Text>
            </Tappable>
          }
        />
        <Card>
          <View style={styles.weighRow}>
            <WeightInput
              key={`${fieldKey}-${u.weight}`}
              kg={draftKg}
              unit={u.weight}
              variant="hero"
              label="Today’s weight"
              placeholderKg={latest?.scale}
              inputRef={weighRef}
              onChangeKg={setDraftKg}
              onSubmit={saveWeight}
            />
            <GlassButton label="Save" variant="primary" onPress={saveWeight} disabled={!canSave} style={styles.weighSave} />
          </View>
          {latest ? (
            <Text style={styles.weighHint}>
              Last {u.weightText(latest.scale)} ·{' '}
              {new Date(latest.time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
          ) : null}
        </Card>

        {profile && trendKg != null && goalKind(profile.targetRateKgPerWeek) !== 'maintain' ? (
          <GoalCard profile={profile} trendKg={trendKg} u={u} />
        ) : null}

        {profile && plan ? <MaintenanceCard plan={plan} profile={profile} trendKg={trendKg} u={u} /> : null}

        {profile && plan ? <PlanSettings profile={profile} plan={plan} u={u} onEdit={openEditor} /> : null}
      </KeyboardAwareScrollView>
    </>
  );
}

function TargetCard({ plan, u }: { plan: AdaptivePlan; u: BoundUnits }) {
  const { proteinG, carbsG, fatG } = plan.targetMacros;
  const split = [
    { label: 'Protein', grams: proteinG, kcal: proteinG * 4, color: colors.protein },
    { label: 'Carbs', grams: carbsG, kcal: carbsG * 4, color: colors.carbs },
    { label: 'Fat', grams: fatG, kcal: fatG * 9, color: colors.fat },
  ];
  const totalKcal = split.reduce((sum, part) => sum + part.kcal, 0) || 1;
  const delta = plan.previousTargetCalories != null ? plan.targetCalories - plan.previousTargetCalories : null;
  const weekend = plan.weekendExtraKcal ?? 0;

  return (
    <Card style={styles.target}>
      <View style={styles.targetTop}>
        <Text style={styles.cardLabel}>{plan.basis === 'custom' ? 'Your daily target' : 'Daily target'}</Text>
        {delta ? (
          <View style={styles.deltaChip}>
            <Icon name={delta < 0 ? 'arrow.down' : 'arrow.up'} size={10} color={colors.textSecondary} weight="bold" />
            <Text style={styles.deltaText}>{u.energyText(Math.abs(delta))}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.heroRow} accessible accessibilityLabel={`${u.energySpoken(plan.targetCalories)} a day`}>
        <Text style={styles.hero} numberOfLines={1} adjustsFontSizeToFit>
          {u.energyNumber(plan.targetCalories)}
        </Text>
        <Text style={styles.heroUnit}>{u.energy} a day</Text>
      </View>
      {weekend ? (
        <Text style={styles.schedule}>
          Mon–Fri {u.energyText(dayCalories(plan.targetCalories, weekend, 1))} · Sat–Sun{' '}
          {u.energyText(dayCalories(plan.targetCalories, weekend, 6))}
        </Text>
      ) : null}

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
          <View key={part.label} style={[styles.splitSegment, { flex: part.kcal || 0.001, backgroundColor: part.color }]} />
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

function SetupCard() {
  return (
    <Card style={styles.target}>
      <Text style={styles.cardLabel}>Daily target</Text>
      <Text style={styles.noPlanTitle}>Set up your plan</Text>
      <Text style={styles.reasonText}>
        Your goal, body, and activity give a starting target. Each week it adjusts to how your weight actually moves.
      </Text>
      <GlassButton label="Set Up Plan" icon="target" variant="primary" onPress={() => router.push('/plan-editor')} />
    </Card>
  );
}

function CheckInCard({ checkIn, u }: { checkIn: CheckIn; u: BoundUnits }) {
  const { change, plan } = checkIn;
  return (
    <Card style={styles.checkIn}>
      <View style={styles.checkInHead}>
        <View style={styles.checkInIcon}>
          <Icon name="calendar.badge.checkmark" size={16} color={colors.accent} />
        </View>
        <Text style={styles.checkInTitle}>Weekly check-in</Text>
      </View>
      <Text style={styles.checkInNumber}>
        {u.energyNumber(plan.targetCalories)}
        <Text style={styles.checkInUnit}>
          {' '}
          {u.energy} a day{change !== 0 ? ` · ${change > 0 ? '+' : '−'}${u.energyNumber(Math.abs(change))}` : ' · no change'}
        </Text>
      </Text>
      <Text style={styles.reasonText}>{checkIn.reason}</Text>
      <View style={styles.checkInActions}>
        <GlassButton label="Keep Current" onPress={skipCheckIn} style={styles.flex} />
        <GlassButton label="Update" icon="checkmark" variant="tonal" onPress={() => applyCheckIn(checkIn)} style={styles.flex} />
      </View>
    </Card>
  );
}

function GoalCard({ profile, trendKg, u }: { profile: UserProfile; trendKg: number; u: BoundUnits }) {
  const { startingWeightKg: start, goalWeightKg: goal, targetRateKgPerWeek: rate } = profile;
  const span = goal - start;
  const progress = span !== 0 ? (trendKg - start) / span : 1;
  const eta = projectedGoalDate(trendKg, goal, rate);
  const reached = Math.abs(goal - trendKg) < 0.05 || (span < 0 ? trendKg <= goal : trendKg >= goal);
  const etaText = reached
    ? 'You’ve reached your goal. Set a new one, or switch to maintain.'
    : eta
      ? `At ${u.pace(rate)} a week, the trend reaches ${u.weightText(goal)} around ${eta.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: eta.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        })}.`
      : 'Your trend is moving away from the goal right now. Give it a week of logging.';

  return (
    <>
      <SectionHeader title="Goal" trailing={`${Math.round(Math.min(Math.max(progress, 0), 1) * 100)}% there`} />
      <Card style={styles.goalCard}>
        <ProgressBar progress={progress} color={colors.accent} height={10} />
        <View style={styles.goalEnds}>
          <View>
            <Text style={styles.goalValue}>{u.weightText(start)}</Text>
            <Text style={styles.goalLabel}>Start</Text>
          </View>
          <View style={styles.goalMid}>
            <Text style={styles.goalValue}>{u.weightText(trendKg)}</Text>
            <Text style={styles.goalLabel}>Now</Text>
          </View>
          <View style={styles.goalEnd}>
            <Text style={styles.goalValue}>{u.weightText(goal)}</Text>
            <Text style={styles.goalLabel}>Goal</Text>
          </View>
        </View>
        <View style={styles.reason}>
          <Icon name={reached ? 'checkmark.seal.fill' : 'calendar'} size={14} color={colors.accent} />
          <Text style={styles.reasonText}>{etaText}</Text>
        </View>
      </Card>
    </>
  );
}

/** Maintenance the target is built on, and whether it's measured yet. */
function MaintenanceCard({
  plan,
  profile,
  trendKg,
  u,
}: {
  plan: AdaptivePlan;
  profile: UserProfile;
  trendKg: number | null;
  u: BoundUnits;
}) {
  const entries = useFoodLogStore((s) => s.entries);
  const weights = usePlanStore((s) => s.weightHistory);
  const formula = formulaMaintenance(profile, trendKg ?? undefined);
  const estimate = useMemo(() => estimateExpenditure(entries, weights, formula), [entries, weights, formula]);
  const loggedDays = useMemo(() => loggedDaysInWindow(entries), [entries]);
  const value = estimate?.kcal ?? plan.maintenanceCalories ?? formula;
  const detail = estimate
    ? `Measured from ${estimate.loggedDays} logged days and your weight trend.`
    : `Estimated from your body and activity. It’s measured once you’ve logged ${MIN_LOGGED_DAYS} days and weighed in over two weeks.`;

  return (
    <>
      <SectionHeader title="Maintenance" />
      <Card style={styles.goalCard}>
        <View style={styles.maintenanceRow} accessible accessibilityLabel={`Maintenance ${u.energySpoken(value)} a day. ${detail}`}>
          <Text style={styles.maintenanceValue}>
            {u.energyNumber(value)}
            <Text style={styles.heroUnitSmall}> {u.energy} a day</Text>
          </Text>
          <View style={[styles.basisChip, estimate && styles.basisChipMeasured]}>
            <Text style={[styles.basisText, estimate && styles.basisTextMeasured]}>{estimate ? 'Measured' : 'Estimate'}</Text>
          </View>
        </View>
        <Text style={styles.reasonText}>{detail}</Text>
        {!estimate ? (
          <View style={styles.daysRow}>
            <ProgressBar progress={Math.min(loggedDays / MIN_LOGGED_DAYS, 1)} color={colors.accent} height={6} />
            <Text style={styles.daysText}>
              {Math.min(loggedDays, MIN_LOGGED_DAYS)} of {MIN_LOGGED_DAYS} days
            </Text>
          </View>
        ) : null}
      </Card>
    </>
  );
}

function PlanSettings({ profile, plan, u, onEdit }: { profile: UserProfile; plan: AdaptivePlan; u: BoundUnits; onEdit: () => void }) {
  const kind = goalKind(profile.targetRateKgPerWeek);
  const goal =
    kind === 'maintain' ? 'Maintain' : `${kind === 'lose' ? 'Lose' : 'Gain'} ${u.pace(profile.targetRateKgPerWeek)} a week`;
  const weekend = profile.weekendExtraKcal ?? 0;
  const sex = profile.sex === 'male' ? 'Male' : profile.sex === 'female' ? 'Female' : null;
  const body = [sex, `${ageFrom(profile.birthYear)}`, u.heightText(profile.heightCm)].filter(Boolean).join(' · ');
  return (
    <>
      <SectionHeader title="Your plan" />
      <Card padded={false}>
        <ListRow first icon="target" tint={colors.tile.orange} title="Goal" value={goal} accessory="chevron" onPress={onEdit} />
        {kind !== 'maintain' ? (
          <ListRow
            icon="flag.checkered"
            tint={colors.tile.green}
            title="Goal weight"
            value={u.weightText(profile.goalWeightKg)}
            accessory="chevron"
            onPress={onEdit}
          />
        ) : null}
        <ListRow icon="figure.walk" tint={colors.tile.teal} title="Activity" value={activityLabel(profile.activityLevel)} accessory="chevron" onPress={onEdit} />
        <ListRow icon="chart.pie.fill" tint={colors.tile.pink} title="Macros" value={dietLabel(profile.dietStyle)} accessory="chevron" onPress={onEdit} />
        <ListRow
          icon="flame.fill"
          tint={colors.tile.orange}
          title="Daily target"
          value={plan.basis === 'custom' ? 'Custom' : 'Adaptive'}
          accessory="chevron"
          onPress={onEdit}
        />
        <ListRow
          icon="calendar"
          tint={colors.tile.indigo}
          title="Weekends"
          value={weekend ? `+${u.energyText(weekend)}` : 'Same'}
          accessory="chevron"
          onPress={onEdit}
        />
        <ListRow icon="person.fill" tint={colors.tile.gray} title="Body" value={body} accessory="chevron" onPress={onEdit} />
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
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
    paddingBottom: spacing.tabBottom,
  },
  headerButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  headerButtonText: {
    ...typography.headline,
    color: colors.accent,
  },
  link: {
    ...typography.subheadline,
    fontWeight: '500',
    color: colors.accent,
  },
  flex: {
    flex: 1,
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
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.sm,
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
  heroUnitSmall: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  schedule: {
    ...typography.footnote,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: -spacing.sm,
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
  checkIn: {
    gap: spacing.sm + 2,
    marginTop: spacing.sm + 2,
  },
  checkInHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkInIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  checkInTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  checkInNumber: {
    ...typography.statMedium,
    fontSize: 24,
    color: colors.textPrimary,
  },
  checkInUnit: {
    ...typography.subheadline,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  checkInActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  weightCard: {
    gap: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  maintenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  maintenanceValue: {
    ...typography.statLarge,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  basisChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
  },
  basisChipMeasured: {
    backgroundColor: colors.accentSoft,
  },
  basisText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  basisTextMeasured: {
    color: colors.accent,
  },
  daysRow: {
    gap: spacing.xs + 2,
  },
  daysText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  weighRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  weighSave: {
    minWidth: 96,
  },
  weighHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm + 2,
    lineHeight: 16,
  },
});
