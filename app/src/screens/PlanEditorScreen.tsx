import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Tappable } from '../components/ui/Tappable';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { SheetFooter } from '../components/ui/SheetFooter';
import { GroupLabel, ListRow } from '../components/ui/ListRow';
import { Segmented } from '../components/ui/Segmented';
import { HeightInput, IntegerInput, WeightInput } from '../components/ui/UnitFields';
import { colors, radius, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useUnits } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { useUserStore } from '../store/useUserStore';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { latestTrendKg, planFromEdit, savePlanProfile } from '../services/planFlow';
import {
  ACTIVITY_LEVELS,
  calorieFloor,
  dailyAdjustment,
  dayCalories,
  DIET_STYLES,
  goalKind,
  splitFor,
  type GoalKind,
} from '../utils/planCalculator';
import { KG_PER_LB, kcalFromEnergy, energyValue } from '../utils/units';
import { projectedGoalDate } from '../utils/weight';
import type { MacroSplit, UserProfile } from '../types';

export const BLANK_PROFILE: UserProfile = {
  id: 'local-user',
  heightCm: 170,
  startingWeightKg: 75,
  goalWeightKg: 70,
  targetRateKgPerWeek: -0.5,
  activityLevel: 'moderate',
  birthYear: new Date().getFullYear() - 30,
  sex: 'other',
  dietStyle: 'balanced',
};

/** Weekly paces offered, in the unit people think in. */
function paceChoices(kind: GoalKind, pounds: boolean): number[] {
  if (kind === 'maintain') return [0];
  const steps = kind === 'lose' ? (pounds ? [0.5, 1, 1.5, 2] : [0.25, 0.5, 0.75, 1]) : pounds ? [0.25, 0.5, 1] : [0.1, 0.25, 0.5];
  const sign = kind === 'lose' ? -1 : 1;
  return steps.map((step) => sign * (pounds ? step * KG_PER_LB : step));
}

const WEEKEND_CHOICES = [0, 150, 300, 450];

/**
 * Every setting the target comes from: goal, pace, body, activity, how the
 * calories split into macros, and how they spread across the week. The
 * target the edits produce is shown before anything is saved.
 */
export function PlanEditorScreen() {
  const profile = useUserStore((s) => s.profile);
  const current = usePlanStore((s) => s.currentPlan);
  const weights = usePlanStore((s) => s.weightHistory);
  const u = useUnits();
  const scrollRef = useDevAutoScroll('plan-editor');

  const initial = useMemo(() => profile ?? BLANK_PROFILE, [profile]);
  const [draft, setDraft] = useState<UserProfile>(initial);
  // A first plan starts with the weights empty rather than a guess someone might save.
  const [goalText, setGoalText] = useState<number | null>(profile ? initial.goalWeightKg : null);
  const [startText, setStartText] = useState<number | null>(profile ? initial.startingWeightKg : null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || !profile;

  const patch = (next: Partial<UserProfile>) => setDraft((prev) => ({ ...prev, ...next }));

  const kind = goalKind(draft.targetRateKgPerWeek);
  const pounds = u.weight !== 'kg';
  const paces = paceChoices(kind, pounds);
  const split = splitFor(draft);
  const splitTotal = split.protein + split.carbs + split.fat;
  const custom = draft.calorieOverride != null;
  const inRange = (kg: number | null) => kg != null && kg > 25 && kg < 400;
  const weightsOk = inRange(startText) && (kind === 'maintain' || inRange(goalText));
  const problem = !weightsOk
    ? 'Enter your weights'
    : splitTotal !== 100
      ? `Macros add up to ${splitTotal}%`
      : custom && (draft.calorieOverride ?? 0) < 800
        ? 'Target is too low'
        : null;
  const valid = problem == null;

  const entries = useFoodLogStore((s) => s.entries);
  // Unchanged, it's the plan as it stands; any edit rebuilds it on today's maintenance.
  const preview = useMemo(
    () => (!dirty && current ? current : planFromEdit(draft, entries, weights)),
    [dirty, current, draft, entries, weights],
  );
  const delta = current && profile ? preview.targetCalories - current.targetCalories : 0;
  const hasWeighIns = weights.length > 0;

  function chooseKind(next: GoalKind) {
    const rate = next === 'maintain' ? 0 : paceChoices(next, pounds)[1] ?? paceChoices(next, pounds)[0];
    patch({
      targetRateKgPerWeek: Math.round(rate * 1000) / 1000,
      ...(next === 'maintain' ? { goalWeightKg: draft.startingWeightKg } : {}),
    });
    if (next === 'maintain') setGoalText(draft.startingWeightKg);
  }

  function save() {
    if (!valid) return;
    savePlanProfile({
      ...draft,
      id: draft.id || 'local-user',
      goalWeightKg: kind === 'maintain' ? draft.startingWeightKg : draft.goalWeightKg,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    useToastStore.getState().show(profile ? 'Plan saved' : 'Plan set', undefined, 'done');
  }

  function cancel() {
    if (!dirty || !profile) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  useDevAction('planEditor.save', save);
  // The simulator has no way to type, so this stands in for entering weights.
  useDevAction('planEditor.fill', () => {
    setStartText(84);
    setGoalText(78);
    patch({ startingWeightKg: 84, goalWeightKg: 78, sex: 'female', heightCm: 168 });
  });
  useDevAction('planEditor.maintain', () => chooseKind('maintain'));
  useDevAction('planEditor.gain', () => chooseKind('gain'));
  useDevAction('planEditor.customMacros', () =>
    patch({ dietStyle: 'custom', customSplit: { protein: 35, carbs: 40, fat: 20 } }),
  );
  useDevAction('planEditor.customTarget', () => patch({ calorieOverride: 1900 }));
  useDevAction('planEditor.weekends', () => patch({ weekendExtraKcal: 300 }));

  const saveRef = useRef(save);
  saveRef.current = save;
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      title: profile ? 'Edit Plan' : 'Set Up Plan',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.textPrimary },
      // Swiping the sheet away would drop edits without asking.
      gestureEnabled: !dirty || !profile,
      headerLeft: () => (
        <Tappable accessibilityRole="button" hitSlop={8} onPress={() => cancelRef.current()} style={styles.headerButton}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </Tappable>
      ),
    }),
    [dirty, profile],
  );

  // Where you are now: the trend once there are weigh-ins, the weight typed here before that.
  const nowKg = latestTrendKg(weights) ?? draft.startingWeightKg;
  const eta = kind !== 'maintain' ? projectedGoalDate(nowKg, draft.goalWeightKg, draft.targetRateKgPerWeek) : null;
  const wrongWay =
    (kind === 'lose' && draft.goalWeightKg >= nowKg) || (kind === 'gain' && draft.goalWeightKg <= nowKg);
  const daily = Math.abs(dailyAdjustment(draft.targetRateKgPerWeek));
  const paceNote =
    kind === 'maintain'
      ? 'Eat at maintenance to hold your weight.'
      : `About ${u.energyText(daily)} a day ${kind === 'lose' ? 'under' : 'over'} maintenance.${
          !weightsOk
            ? ''
            : wrongWay
            ? ` Your goal weight is ${kind === 'lose' ? 'above' : 'below'} where you are now.`
            : eta
              ? ` Reach ${u.weightText(draft.goalWeightKg)} around ${eta.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: eta.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })}.`
              : ''
        }${kind === 'lose' && Math.abs(draft.targetRateKgPerWeek) > 0.75 ? ' A faster pace is harder to keep up.' : ''}`;

  const weekendExtra = draft.weekendExtraKcal ?? 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={headerOptions} />
      <KeyboardAwareScrollView
        bottomOffset={64}
        ref={scrollRef as never}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Card style={styles.preview}>
          <View style={styles.previewTop}>
            <Text style={styles.previewLabel}>{profile && delta === 0 ? 'Daily target' : 'New daily target'}</Text>
            {delta !== 0 && weightsOk ? (
              <Text style={styles.previewDelta}>
                {delta > 0 ? '+' : '−'}
                {u.energyText(Math.abs(delta))}
              </Text>
            ) : null}
          </View>
          {weightsOk ? (
            <>
              <Text style={styles.previewNumber} accessibilityLabel={`${u.energySpoken(preview.targetCalories)} a day`}>
                {u.energyNumber(preview.targetCalories)}
                <Text style={styles.previewUnit}> {u.energy}</Text>
              </Text>
              <Text style={styles.previewDetail}>
                {preview.targetMacros.proteinG} g protein · {preview.targetMacros.carbsG} g carbs · {preview.targetMacros.fatG} g fat
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.previewNumber}>—</Text>
              <Text style={styles.previewDetail}>Enter your current and goal weight.</Text>
            </>
          )}
          {weekendExtra ? (
            <Text style={styles.previewNote}>
              Mon–Fri {u.energyText(dayCalories(preview.targetCalories, weekendExtra, 1))} · Sat–Sun{' '}
              {u.energyText(dayCalories(preview.targetCalories, weekendExtra, 6))}
            </Text>
          ) : null}
          {preview.floored ? (
            <Text style={styles.previewNote}>Held at the {u.energyText(calorieFloor(draft.sex))} minimum.</Text>
          ) : null}
        </Card>

        <GroupLabel>Goal</GroupLabel>
        <Card padded={false}>
          <View style={styles.inset}>
            <Segmented
              accessibilityLabel="Goal"
              options={[
                { value: 'lose', label: 'Lose' },
                { value: 'maintain', label: 'Maintain' },
                { value: 'gain', label: 'Gain' },
              ]}
              value={kind}
              onChange={chooseKind}
            />
          </View>
          {kind !== 'maintain' ? (
            <ListRow
              icon="flag.checkered"
              tint={colors.tile.green}
              title="Goal weight"
              trailing={
                <WeightInput
                  kg={goalText}
                  unit={u.weight}
                  label="Goal weight"
                  onChangeKg={(kg) => {
                    setGoalText(kg);
                    if (kg != null && kg > 25 && kg < 400) patch({ goalWeightKg: Math.round(kg * 100) / 100 });
                  }}
                />
              }
            />
          ) : null}
        </Card>

        {kind !== 'maintain' ? (
          <>
            <GroupLabel>{`Pace, ${pounds ? 'lb' : 'kg'} a week`}</GroupLabel>
            <Card style={styles.pace}>
              <Segmented
                accessibilityLabel="Weekly pace"
                options={paces.map((value) => ({ value, label: u.pace(value).split(' ')[0] }))}
                value={paces.reduce((best, value) =>
                  Math.abs(value - draft.targetRateKgPerWeek) < Math.abs(best - draft.targetRateKgPerWeek) ? value : best,
                )}
                onChange={(value) => patch({ targetRateKgPerWeek: Math.round(value * 1000) / 1000 })}
              />
              <Text style={styles.hint}>{paceNote}</Text>
            </Card>
          </>
        ) : (
          <Text style={styles.footnote}>{paceNote}</Text>
        )}

        <GroupLabel>Body</GroupLabel>
        <Card padded={false}>
          <ListRow
            first
            icon="person.fill"
            tint={colors.tile.indigo}
            title="Sex"
            trailing={
              <View style={styles.sexPicker}>
                <Segmented
                  accessibilityLabel="Sex"
                  options={[
                    { value: 'female', label: 'Female' },
                    { value: 'male', label: 'Male' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={draft.sex}
                  onChange={(sex) => patch({ sex })}
                />
              </View>
            }
          />
          <ListRow
            icon="birthday.cake.fill"
            tint={colors.tile.pink}
            title="Birth year"
            trailing={
              <IntegerInput
                value={draft.birthYear}
                label="Birth year"
                min={1900}
                max={new Date().getFullYear() - 13}
                onChange={(birthYear) => patch({ birthYear })}
              />
            }
          />
          <ListRow
            icon="ruler.fill"
            tint={colors.tile.teal}
            title="Height"
            trailing={<HeightInput cm={draft.heightCm} unit={u.height} onChangeCm={(heightCm) => patch({ heightCm })} />}
          />
          <ListRow
            icon="scalemass.fill"
            tint={colors.tile.gray}
            title={hasWeighIns ? 'Starting weight' : 'Current weight'}
            trailing={
              <WeightInput
                kg={startText}
                unit={u.weight}
                label={hasWeighIns ? 'Starting weight' : 'Current weight'}
                onChangeKg={(kg) => {
                  setStartText(kg);
                  if (kg != null && kg > 25 && kg < 400) {
                    const rounded = Math.round(kg * 100) / 100;
                    patch(kind === 'maintain' ? { startingWeightKg: rounded, goalWeightKg: rounded } : { startingWeightKg: rounded });
                  }
                }}
              />
            }
          />
        </Card>

        <GroupLabel>Activity</GroupLabel>
        <Card padded={false}>
          {ACTIVITY_LEVELS.map((level, index) => (
            <ListRow
              key={level.key}
              first={index === 0}
              title={level.label}
              subtitle={level.detail}
              accessory="check"
              selected={draft.activityLevel === level.key}
              onPress={() => patch({ activityLevel: level.key })}
            />
          ))}
        </Card>

        <GroupLabel>Macros</GroupLabel>
        <Card padded={false}>
          {DIET_STYLES.map((style, index) => (
            <ListRow
              key={style.key}
              first={index === 0}
              title={style.label}
              subtitle={
                style.key === 'custom'
                  ? 'Your own split'
                  : `${style.split.protein}% protein · ${style.split.carbs}% carbs · ${style.split.fat}% fat`
              }
              accessory="check"
              selected={(draft.dietStyle ?? 'balanced') === style.key}
              onPress={() =>
                patch(
                  style.key === 'custom'
                    ? { dietStyle: 'custom', customSplit: draft.customSplit ?? splitFor(draft) }
                    : { dietStyle: style.key },
                )
              }
            />
          ))}
        </Card>
        {draft.dietStyle === 'custom' ? (
          <>
            <Card padded={false} style={styles.splitCard}>
              {(['protein', 'carbs', 'fat'] as (keyof MacroSplit)[]).map((key, index) => (
                <ListRow
                  key={key}
                  first={index === 0}
                  title={key === 'protein' ? 'Protein' : key === 'carbs' ? 'Carbs' : 'Fat'}
                  trailing={
                    <View style={styles.splitValue}>
                      <View style={[styles.dot, { backgroundColor: colors[key] }]} />
                      <IntegerInput
                        value={split[key]}
                        unit="%"
                        label={`${key} percent`}
                        min={0}
                        max={100}
                        onChange={(value) => patch({ customSplit: { ...split, [key]: value } })}
                      />
                    </View>
                  }
                />
              ))}
            </Card>
            <Text style={[styles.footnote, splitTotal !== 100 && styles.warn]}>
              {splitTotal === 100 ? 'Adds up to 100%.' : `Adds up to ${splitTotal}%. Make it 100% to save.`}
            </Text>
          </>
        ) : null}

        <GroupLabel>Daily target</GroupLabel>
        <Card padded={false}>
          <View style={styles.inset}>
            <Segmented
              accessibilityLabel="Daily target"
              options={[
                { value: 'auto', label: 'Calculated' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={custom ? 'custom' : 'auto'}
              onChange={(mode) =>
                patch({
                  calorieOverride:
                    mode === 'custom' ? Math.round((current?.targetCalories ?? preview.targetCalories) / 10) * 10 : null,
                })
              }
            />
          </View>
          {custom ? (
            <ListRow
              icon="flame.fill"
              tint={colors.tile.orange}
              title={u.energyName}
              trailing={
                <IntegerInput
                  value={energyValue(draft.calorieOverride ?? 0, u.energy)}
                  unit={u.energy}
                  label={u.energyName}
                  min={1}
                  max={50000}
                  onChange={(value) => patch({ calorieOverride: Math.round(kcalFromEnergy(value, u.energy)) })}
                />
              }
            />
          ) : null}
        </Card>
        <Text style={styles.footnote}>
          {custom
            ? 'Weekly check-ins are off while you set the number.'
            : 'Adjusts each week to how your weight actually moves.'}
        </Text>

        <GroupLabel>Weekends</GroupLabel>
        <Card style={styles.pace}>
          <Segmented
            accessibilityLabel="Extra on weekends"
            options={WEEKEND_CHOICES.map((value) => ({
              value,
              label: value === 0 ? 'Same' : `+${u.energyNumber(value)}`,
            }))}
            value={WEEKEND_CHOICES.includes(weekendExtra) ? weekendExtra : 0}
            onChange={(value) => patch({ weekendExtraKcal: value })}
          />
          <Text style={styles.hint}>
            {weekendExtra === 0
              ? `${u.energyText(preview.targetCalories)} every day.`
              : `Mon–Fri ${u.energyText(dayCalories(preview.targetCalories, weekendExtra, 1))} · Sat–Sun ${u.energyText(
                  dayCalories(preview.targetCalories, weekendExtra, 6),
                )}. Same total for the week.`}
          </Text>
        </Card>
      </KeyboardAwareScrollView>
      <SheetFooter>
        <GlassButton
          label={
            problem
              ? problem
              : !dirty
                ? 'No changes'
                : `Save · ${u.energyText(preview.targetCalories)} a day`
          }
          icon={valid && dirty ? 'checkmark' : undefined}
          variant="primary"
          onPress={save}
          disabled={!valid || !dirty}
        />
      </SheetFooter>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  headerButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  headerCancel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  preview: {
    gap: 2,
    padding: spacing.lg - 4,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  previewDelta: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    overflow: 'hidden',
  },
  previewNumber: {
    ...typography.statLarge,
    fontSize: 36,
    color: colors.textPrimary,
  },
  previewUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  previewDetail: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  previewNote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  inset: {
    padding: spacing.md - 4,
  },
  pace: {
    gap: spacing.sm + 4,
  },
  hint: {
    ...typography.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  footnote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    lineHeight: 18,
  },
  warn: {
    color: colors.danger,
  },
  sexPicker: {
    width: 210,
  },
  splitCard: {
    marginTop: spacing.sm + 2,
  },
  splitValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
