import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Tappable } from '../components/ui/Tappable';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Card } from '../components/ui/Card';
import { FoodThumb } from '../components/ui/FoodThumb';
import { Icon } from '../components/ui/Icon';
import { MacroMarks } from '../components/ui/MacroMarks';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ProgressRing } from '../components/ui/ProgressRing';
import { SectionHeader } from '../components/ui/SectionHeader';
import { WeekStrip } from '../components/ui/WeekStrip';
import { colors, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useSettingsStore, useUnits, type BoundUnits } from '../store/useSettingsStore';
import { useUserStore } from '../store/useUserStore';
import { useWaterStore } from '../store/useWaterStore';
import { GlassButton } from '../components/glass';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { addDays, dateFromKey, entryDateKey, localDateKey, startOfWeek } from '../utils/date';
import { targetsForDate } from '../utils/planCalculator';
import { microTargets, sumMacros, sumMicros } from '../utils/macros';
import { entryTitle, MEALS, timeLabel, type MealSymbol, type MealType } from '../utils/meals';
import { deleteEntryWithUndo, stageAgain, stageEdit } from '../services/logFlow';
import { useReviewStore } from '../store/useReviewStore';
import type { FoodLogEntry, Macros } from '../types';

const DEFAULT_TARGET: Macros = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65 };

function titleFor(key: string) {
  const today = localDateKey(new Date());
  if (key === today) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === localDateKey(yesterday)) return 'Yesterday';
  return dateFromKey(key).toLocaleDateString(undefined, { weekday: 'long' });
}

/**
 * Totals are derived here from `entries`, not inside a Zustand selector.
 * A selector that returns a new object every call loops forever.
 */
export function HomeScreen() {
  const todayKey = localDateKey(new Date());
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const entries = useFoodLogStore((s) => s.entries);
  const plan = usePlanStore((s) => s.currentPlan);
  const hasProfile = useUserStore((s) => Boolean(s.profile));
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const water = useSettingsStore((s) => s.water);
  const u = useUnits();
  const scrollRef = useDevAutoScroll('today');

  // With a weekend shift, each day has its own target.
  const target = useMemo(() => targetsForDate(plan, dateFromKey(selectedKey), DEFAULT_TARGET), [plan, selectedKey]);

  const caloriesByDay = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of entries) {
      const key = entryDateKey(entry.loggedAt);
      totals[key] = (totals[key] ?? 0) + entry.totalMacros.calories;
    }
    const progress: Record<string, number> = {};
    for (const key of Object.keys(totals)) {
      progress[key] = totals[key] / targetsForDate(plan, dateFromKey(key), DEFAULT_TARGET).calories;
    }
    return progress;
  }, [entries, plan]);

  const dayEntries = useMemo(
    () =>
      entries
        .filter((entry) => entryDateKey(entry.loggedAt) === selectedKey)
        .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    [entries, selectedKey],
  );

  const totals = useMemo(() => sumMacros(dayEntries.map((entry) => entry.totalMacros)), [dayEntries]);
  const micros = useMemo(
    () => sumMicros(dayEntries.flatMap((entry) => entry.items.filter((item) => !item.unresolved).map((item) => item.micros))),
    [dayEntries],
  );
  const microGoals = microTargets(target.calories);
  const hasMicros = dayEntries.some((entry) => entry.items.some((item) => item.micros));

  useDevAction('today.editFirst', () => {
    if (!dayEntries[0]) return;
    stageEdit(dayEntries[0]);
    router.push('/review');
  });
  useDevAction('today.addLunch', () => {
    useReviewStore.getState().setTarget({ mealType: 'lunch', dateKey: selectedKey });
    router.navigate('/log');
  });
  useDevAction('today.deleteFirst', () => {
    if (dayEntries[0]) deleteEntryWithUndo(dayEntries[0]);
  });

  const dateLine = dateFromKey(selectedKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: titleFor(selectedKey),
          headerLeft:
            selectedKey === todayKey
              ? undefined
              : () => (
                  <Tappable
                    accessibilityRole="button"
                    accessibilityLabel="Back to today"
                    onPress={() => setSelectedKey(todayKey)}
                    hitSlop={8}
                    style={styles.headerButton}
                  >
                    <Text style={styles.headerButtonText}>Today</Text>
                  </Tappable>
                ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <View style={styles.dateRow}>
          <Text style={styles.dateLine}>{dateLine}</Text>
          <WeekButton direction={-1} onPress={() => setSelectedKey(localDateKey(addDays(dateFromKey(selectedKey), -7)))} />
          <WeekButton
            direction={1}
            disabled={localDateKey(addDays(startOfWeek(dateFromKey(selectedKey), weekStartsOn), 7)) > todayKey}
            onPress={() => {
              const next = localDateKey(addDays(dateFromKey(selectedKey), 7));
              setSelectedKey(next > todayKey ? todayKey : next);
            }}
          />
        </View>
        <WeekStrip selectedKey={selectedKey} onSelect={setSelectedKey} progressByDay={caloriesByDay} weekStartsOn={weekStartsOn} />

        {!hasProfile ? <SetupPrompt /> : null}

        <CalorieCard eaten={totals.calories} target={target.calories} u={u} />

        <View style={styles.macroRow}>
          <MacroCard label="Protein" value={totals.proteinG} target={target.proteinG} color={colors.protein} />
          <MacroCard label="Carbs" value={totals.carbsG} target={target.carbsG} color={colors.carbs} />
          <MacroCard label="Fat" value={totals.fatG} target={target.fatG} color={colors.fat} />
        </View>

        <Card style={styles.nutrients}>
          <Nutrient known={hasMicros} label="Fiber" value={micros.fiberG} goal={microGoals.fiberG} unit="g" />
          <Nutrient known={hasMicros} label="Sugar" value={micros.sugarG} goal={microGoals.sugarG} unit="g" limit />
          <Nutrient known={hasMicros} label="Sat. fat" value={micros.saturatedFatG} goal={microGoals.saturatedFatG} unit="g" limit />
          <Nutrient known={hasMicros} label="Sodium" value={micros.sodiumMg} goal={microGoals.sodiumMg} unit="mg" limit />
        </Card>

        {water.enabled ? <WaterCard dateKey={selectedKey} u={u} /> : null}

        <SectionHeader
          title="Meals"
          trailing={dayEntries.length > 0 ? `${dayEntries.length} logged` : undefined}
        />
        <View style={styles.meals}>
          {MEALS.map((meal) => (
            <MealCard
              key={meal.key}
              label={meal.label}
              symbol={meal.symbol}
              mealType={meal.key}
              dateKey={selectedKey}
              entries={dayEntries.filter((entry) => entry.mealType === meal.key)}
              u={u}
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function CalorieCard({ eaten, target, u }: { eaten: number; target: number; u: BoundUnits }) {
  const left = Math.round(target - eaten);
  const over = left < 0;
  return (
    <Card style={styles.hero}>
      <View
        style={styles.heroText}
        accessible
        accessibilityLabel={`${u.energySpoken(Math.abs(left))} ${over ? 'over' : 'left'}. ${u.energyNumber(
          eaten,
        )} eaten of ${u.energyNumber(target)}.`}
      >
        <Text style={styles.heroNumber} numberOfLines={1} adjustsFontSizeToFit>{u.energyNumber(Math.abs(left))}</Text>
        <Text style={styles.heroCaption}>{`${u.energyName} ${over ? 'over' : 'left'}`}</Text>
        <View style={styles.heroStats}>
          <HeroStat label="Eaten" value={u.energyNumber(eaten)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Target" value={u.energyNumber(target)} />
        </View>
      </View>
      <ProgressRing progress={target > 0 ? eaten / target : 0} color={colors.calories} size={116} strokeWidth={12}>
        <Icon name="flame.fill" size={26} color={colors.calories} />
      </ProgressRing>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function MacroCard({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const left = Math.round(target - value);
  return (
    <Card
      style={styles.macroCard}
      padded={false}
    >
      <View
        accessible
        accessibilityLabel={`${label}, ${Math.round(value)} of ${target} grams, ${Math.abs(left)} ${
          left < 0 ? 'over' : 'left'
        }`}
        style={styles.macroInner}
      >
        <View style={styles.macroLabelRow}>
          <View style={[styles.macroDot, { backgroundColor: color }]} />
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        <Text style={styles.macroValue}>
          {Math.round(value)}
          <Text style={styles.macroTarget}> /{target}g</Text>
        </Text>
        <ProgressBar progress={target > 0 ? value / target : 0} color={color} />
      </View>
    </Card>
  );
}

/**
 * One extra nutrient against its daily guide. Fiber is a goal to reach; the
 * others are limits, shown in the same neutral ink as everything else.
 */
function Nutrient({
  label,
  value,
  goal,
  unit,
  limit = false,
  known,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  limit?: boolean;
  /** False when no meal that day carries this detail (e.g. quick adds), so 0 would mislead. */
  known: boolean;
}) {
  const shown = !known ? '–' : unit === 'mg' ? Math.round(value).toLocaleString() : Math.round(value);
  return (
    <View
      style={styles.nutrient}
      accessible
      accessibilityLabel={`${label} ${Math.round(value)} ${unit === 'mg' ? 'milligrams' : 'grams'}, ${limit ? 'limit' : 'goal'} ${goal}`}
    >
      <Text style={styles.nutrientLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
      <Text style={styles.nutrientValue}>
        {shown}
        <Text style={styles.nutrientUnit}> {unit}</Text>
      </Text>
      <ProgressBar progress={goal > 0 ? value / goal : 0} color={colors.textTertiary} height={4} />
    </View>
  );
}

function MealCard({
  label,
  symbol,
  mealType,
  dateKey,
  entries,
  u,
}: {
  label: string;
  symbol: MealSymbol;
  mealType: MealType;
  dateKey: string;
  entries: FoodLogEntry[];
  u: BoundUnits;
}) {
  const calories = Math.round(entries.reduce((sum, entry) => sum + entry.totalMacros.calories, 0));

  return (
    <Card padded={false}>
      <Tappable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${entries.length ? u.energySpoken(calories) : 'nothing logged'}`}
        accessibilityHint={`Log something to ${label.toLowerCase()}`}
        onPress={() => {
          void Haptics.selectionAsync();
          useReviewStore.getState().setTarget({ mealType, dateKey });
          router.navigate('/log');
        }}
        feedback="row"
        style={styles.mealHeader}
      >
        <Icon name={symbol} size={17} color={colors.textSecondary} />
        <Text style={styles.mealTitle}>{label}</Text>
        <Text style={styles.mealCalories}>
          {entries.length ? u.energyText(calories) : 'Nothing yet'}
        </Text>
        <View style={styles.addButton}>
          <Icon name="plus" size={13} color={colors.accent} weight="bold" />
        </View>
      </Tappable>
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} u={u} />
      ))}
    </Card>
  );
}

function EntryRow({ entry, u }: { entry: FoodLogEntry; u: BoundUnits }) {
  const title = entryTitle(entry.items);

  const edit = () => {
    void Haptics.selectionAsync();
    stageEdit(entry);
    router.push('/review');
  };

  const again = () => {
    useReviewStore.getState().setTarget(null);
    stageAgain(entry);
    router.push('/review');
  };

  const showActions = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: ['Edit', 'Log again today', 'Delete', 'Cancel'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        (index) => {
          if (index === 0) edit();
          if (index === 1) again();
          if (index === 2) deleteEntryWithUndo(entry);
        },
      );
      return;
    }
    Alert.alert(title, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntryWithUndo(entry) },
    ]);
  };

  return (
    <Tappable
      onPress={edit}
      onLongPress={showActions}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${u.energySpoken(entry.totalMacros.calories)}, ${timeLabel(entry.loggedAt)}`}
      accessibilityHint="Opens the meal to edit it"
      accessibilityActions={[
        { name: 'again', label: 'Log again today' },
        { name: 'delete', label: 'Delete from log' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'again') again();
        if (event.nativeEvent.actionName === 'delete') deleteEntryWithUndo(entry);
      }}
      feedback="row"
      style={styles.entry}
    >
      <FoodThumb uri={entry.photoUri} size={54} symbol={MEALS.find((meal) => meal.key === entry.mealType)?.symbol} />
      <View style={styles.entryBody}>
        <Text style={styles.entryTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.entryMeta}>{timeLabel(entry.loggedAt)}</Text>
        <MacroMarks macros={entry.totalMacros} />
      </View>
      <View style={styles.entryKcal}>
        <Text style={styles.entryKcalValue}>{u.energyNumber(entry.totalMacros.calories)}</Text>
        <Text style={styles.entryKcalUnit}>{u.energy}</Text>
      </View>
    </Tappable>
  );
}

function WeekButton({ direction, disabled, onPress }: { direction: 1 | -1; disabled?: boolean; onPress: () => void }) {
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={direction < 0 ? 'Previous week' : 'Next week'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={styles.weekButton}
    >
      <Icon
        name={direction < 0 ? 'chevron.left' : 'chevron.right'}
        size={13}
        color={disabled ? colors.textTertiary : colors.accent}
        weight="bold"
      />
    </Tappable>
  );
}

function SetupPrompt() {
  return (
    <Card style={styles.setup}>
      <View style={styles.setupText}>
        <Text style={styles.setupTitle}>Set up your plan</Text>
        <Text style={styles.setupBody}>Get a daily target from your goal, body, and activity.</Text>
      </View>
      <GlassButton label="Set Up" variant="tonal" onPress={() => router.push('/plan-editor')} />
    </Card>
  );
}

/** Water for the day: the amount against the goal, and a glass at a time. */
function WaterCard({ dateKey, u }: { dateKey: string; u: BoundUnits }) {
  const ml = useWaterStore((s) => s.byDay[dateKey] ?? 0);
  const { goalMl, glassMl } = useSettingsStore((s) => s.water);
  const add = (direction: 1 | -1) => {
    if (direction < 0 && ml === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useWaterStore.getState().add(dateKey, direction * glassMl);
  };
  return (
    <Card style={styles.water}>
      <View style={styles.waterTop}>
        <Icon name="drop.fill" size={16} color={colors.textSecondary} />
        <View style={styles.waterText} accessible accessibilityLabel={`Water, ${u.waterText(ml)} of ${u.waterText(goalMl)}`}>
          <Text style={styles.waterValue}>
            {u.waterText(ml)}
            <Text style={styles.waterGoal}> of {u.waterText(goalMl)}</Text>
          </Text>
        </View>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel={`Remove a glass, ${u.waterText(glassMl)}`}
          disabled={ml === 0}
          hitSlop={6}
          onPress={() => add(-1)}
          style={[styles.waterButton, styles.waterMinus, ml === 0 && styles.waterDisabled]}
        >
          <Icon name="minus" size={13} color={colors.textPrimary} weight="bold" />
        </Tappable>
        <Tappable
          accessibilityRole="button"
          accessibilityLabel={`Add a glass, ${u.waterText(glassMl)}`}
          hitSlop={6}
          onPress={() => add(1)}
          style={styles.waterButton}
        >
          <Icon name="plus" size={13} color={colors.accent} weight="bold" />
        </Tappable>
      </View>
      <ProgressBar progress={goalMl > 0 ? ml / goalMl : 0} color={colors.water} height={6} />
    </Card>
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm + 4,
    marginTop: -spacing.xs - 4,
  },
  dateLine: {
    ...typography.footnote,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  weekButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  setup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  setupText: {
    flex: 1,
    gap: 2,
  },
  setupTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  setupBody: {
    ...typography.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  water: {
    gap: spacing.sm + 2,
    marginTop: spacing.sm + 2,
    paddingVertical: spacing.md - 4,
  },
  waterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  waterText: {
    flex: 1,
  },
  waterValue: {
    ...typography.statSmall,
    fontSize: 17,
    color: colors.textPrimary,
  },
  waterGoal: {
    ...typography.footnote,
    color: colors.textTertiary,
  },
  waterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  waterMinus: {
    backgroundColor: colors.fill,
  },
  waterDisabled: {
    opacity: 0.4,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg - 4,
  },
  heroText: {
    flex: 1,
  },
  heroNumber: {
    ...typography.hero,
    color: colors.textPrimary,
  },
  heroCaption: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginTop: -2,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.hairline,
  },
  heroStatValue: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  heroStatLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.sm + 2,
  },
  macroCard: {
    flex: 1,
    minWidth: 0,
  },
  macroInner: {
    padding: spacing.md - 2,
    gap: spacing.sm,
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  macroValue: {
    ...typography.statMedium,
    color: colors.textPrimary,
  },
  macroTarget: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  meals: {
    gap: spacing.sm + 2,
  },
  nutrients: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm + 2,
    paddingVertical: spacing.md - 2,
  },
  nutrient: {
    flex: 1,
    gap: 4,
  },
  nutrientLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nutrientValue: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  nutrientUnit: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  mealTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    flex: 1,
  },
  mealCalories: {
    ...typography.footnote,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  entryBody: {
    flex: 1,
    gap: 3,
  },
  entryTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  entryMeta: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  entryKcal: {
    alignItems: 'flex-end',
  },
  entryKcalValue: {
    ...typography.statSmall,
    fontSize: 17,
    color: colors.textPrimary,
  },
  entryKcalUnit: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});

