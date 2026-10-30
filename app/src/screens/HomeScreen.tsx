import React, { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { dateFromKey, entryDateKey, localDateKey } from '../utils/date';
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
  const scrollRef = useDevAutoScroll('today');

  const target = plan?.targetMacros ?? DEFAULT_TARGET;

  const caloriesByDay = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of entries) {
      const key = entryDateKey(entry.loggedAt);
      totals[key] = (totals[key] ?? 0) + entry.totalMacros.calories;
    }
    const progress: Record<string, number> = {};
    for (const key of Object.keys(totals)) progress[key] = totals[key] / target.calories;
    return progress;
  }, [entries, target.calories]);

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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to today"
                    onPress={() => setSelectedKey(todayKey)}
                    hitSlop={8}
                    style={styles.headerButton}
                  >
                    <Text style={styles.headerButtonText}>Today</Text>
                  </Pressable>
                ),
        }}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.dateLine}>{dateLine}</Text>
        <WeekStrip selectedKey={selectedKey} onSelect={setSelectedKey} progressByDay={caloriesByDay} />

        <CalorieCard eaten={totals.calories} target={target.calories} />

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
            />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

function CalorieCard({ eaten, target }: { eaten: number; target: number }) {
  const left = Math.round(target - eaten);
  const over = left < 0;
  return (
    <Card style={styles.hero}>
      <View
        style={styles.heroText}
        accessible
        accessibilityLabel={`${Math.abs(left)} calories ${over ? 'over' : 'left'}. ${Math.round(
          eaten,
        )} eaten of ${target}.`}
      >
        <Text style={styles.heroNumber} numberOfLines={1} adjustsFontSizeToFit>{Math.abs(left).toLocaleString()}</Text>
        <Text style={styles.heroCaption}>{over ? 'Calories over' : 'Calories left'}</Text>
        <View style={styles.heroStats}>
          <HeroStat label="Eaten" value={Math.round(eaten)} />
          <View style={styles.heroDivider} />
          <HeroStat label="Target" value={target} />
        </View>
      </View>
      <ProgressRing progress={target > 0 ? eaten / target : 0} color={colors.calories} size={116} strokeWidth={12}>
        <Icon name="flame.fill" size={26} color={colors.calories} />
      </ProgressRing>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text style={styles.heroStatValue}>{value.toLocaleString()}</Text>
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
      <Text style={styles.nutrientLabel}>{label}</Text>
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
}: {
  label: string;
  symbol: MealSymbol;
  mealType: MealType;
  dateKey: string;
  entries: FoodLogEntry[];
}) {
  const calories = Math.round(entries.reduce((sum, entry) => sum + entry.totalMacros.calories, 0));

  return (
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${entries.length ? `${calories} calories` : 'nothing logged'}`}
        accessibilityHint={`Log something to ${label.toLowerCase()}`}
        onPress={() => {
          void Haptics.selectionAsync();
          useReviewStore.getState().setTarget({ mealType, dateKey });
          router.navigate('/log');
        }}
        style={styles.mealHeader}
      >
        <Icon name={symbol} size={17} color={colors.textSecondary} />
        <Text style={styles.mealTitle}>{label}</Text>
        <Text style={styles.mealCalories}>
          {entries.length ? `${calories.toLocaleString()} kcal` : 'Nothing yet'}
        </Text>
        <View style={styles.addButton}>
          <Icon name="plus" size={13} color={colors.accent} weight="bold" />
        </View>
      </Pressable>
      {entries.map((entry) => (
        <EntryRow key={entry.id} entry={entry} />
      ))}
    </Card>
  );
}

function EntryRow({ entry }: { entry: FoodLogEntry }) {
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
    <Pressable
      onPress={edit}
      onLongPress={showActions}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${Math.round(entry.totalMacros.calories)} calories, ${timeLabel(entry.loggedAt)}`}
      accessibilityHint="Opens the meal to edit it"
      accessibilityActions={[
        { name: 'again', label: 'Log again today' },
        { name: 'delete', label: 'Delete from log' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'again') again();
        if (event.nativeEvent.actionName === 'delete') deleteEntryWithUndo(entry);
      }}
      style={({ pressed }) => [styles.entry, pressed && styles.entryPressed]}
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
        <Text style={styles.entryKcalValue}>{Math.round(entry.totalMacros.calories)}</Text>
        <Text style={styles.entryKcalUnit}>kcal</Text>
      </View>
    </Pressable>
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
  headerButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  headerButtonText: {
    ...typography.headline,
    color: colors.accent,
  },
  dateLine: {
    ...typography.footnote,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
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
  entryPressed: {
    backgroundColor: colors.fill,
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

