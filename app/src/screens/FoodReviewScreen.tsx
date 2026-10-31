import React, { useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ListRow } from '../components/ui/ListRow';
import { MacroMarks } from '../components/ui/MacroMarks';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Segmented } from '../components/ui/Segmented';
import { SheetFooter } from '../components/ui/SheetFooter';
import { Stepper } from '../components/ui/Stepper';
import { colors, radius, spacing, typography } from '../theme';
import { deleteEntryWithUndo, loggedAtFor, recheckWithAI } from '../services/logFlow';
import { persistPhoto, resolvePhotoUri } from '../services/photos';
import { VisionError } from '../services/visionApi';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useFoodLibraryStore } from '../store/useFoodLibraryStore';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useReviewStore } from '../store/useReviewStore';
import { useSettingsStore, useUnits } from '../store/useSettingsStore';
import { energyValue, formatEnergy, gramsFromMass, kcalFromEnergy, massValue } from '../utils/units';
import { useToastStore } from '../store/useToastStore';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { addDays, dateFromKey, localDateKey } from '../utils/date';
import { portionLabel } from '../utils/describe';
import { createId } from '../utils/id';
import { sumMacros, sumMicros } from '../utils/macros';
import { MEALS, mealLabel, scaleItem, suggestedMeal, type MealType } from '../utils/meals';
import type { FoodItem } from '../types';

function dayLabel(key: string) {
  const today = localDateKey(new Date());
  if (key === today) return 'Today';
  if (key === localDateKey(addDays(new Date(), -1))) return 'Yesterday';
  return dateFromKey(key).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/**
 * The only place a meal is written to the log. Every way of logging — voice,
 * typing, photo, search, log again, quick add — and editing an existing meal
 * ends here, and nothing is saved until Confirm.
 */
export function FoodReviewScreen() {
  const pending = useReviewStore((s) => s.pending);
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const u = useUnits();
  const [mealType, setMealType] = useState<MealType>(suggestedMeal);
  const [dateKey, setDateKey] = useState(() => localDateKey(new Date()));
  const [rechecking, setRechecking] = useState(false);
  const scrollRef = useDevAutoScroll('review');

  // Each new review starts from what was staged with it (or sensible defaults).
  useEffect(() => {
    if (!pending) return;
    setMealType(pending.mealType ?? suggestedMeal());
    setDateKey(pending.dateKey ?? localDateKey(new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.session]);

  const editingHeader = Boolean(pending?.entryId);
  // Memoised: a new options object every render makes the header update the screen in a loop.
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      title: editingHeader ? 'Edit Meal' : 'Review',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.textPrimary },
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          onPress={() => {
            router.back();
            useReviewStore.getState().clear();
          }}
          style={styles.close}
        >
          <Icon name="xmark" size={15} color={colors.textPrimary} weight="semibold" />
        </Pressable>
      ),
    }),
    [editingHeader],
  );

  useDevAction('review.confirm', () => confirm());
  useDevAction('review.delete', () => deleteMeal());
  useDevAction('review.editFirst', () => {
    const first = pending?.items.find((item) => !item.unresolved);
    if (first) router.push({ pathname: '/food-editor', params: { item: first.id } });
  });

  if (!pending) {
    return <View style={styles.screen} />;
  }

  const items = pending.items;
  const editing = Boolean(pending.entryId);
  const resolved = items.filter((item) => !item.unresolved);
  const totals = sumMacros(resolved.map((item) => item.macros));
  const micros = sumMicros(resolved.map((item) => item.micros));
  const hasMicros = resolved.some((item) => item.micros);
  const unresolved = items.length - resolved.length;
  const today = localDateKey(new Date());
  const clockMeal = suggestedMeal();
  const nudge =
    !editing && dateKey === today && pending.mealFrom !== 'said' && mealType !== clockMeal ? clockMeal : null;
  const canRecheck = hasKey && Boolean(pending.transcript) && !pending.aiUsed && !editing;

  function confirm() {
    if (!pending || items.length === 0 || unresolved > 0) return;
    const id = pending.entryId ?? createId();
    const entry = {
      id,
      loggedAt: loggedAtFor(dateKey, mealType, pending.loggedAt),
      mealType,
      items,
      photoUri: persistPhoto(pending.photoUri || undefined, id),
      totalMacros: totals,
      totalMicros: hasMicros ? micros : undefined,
    };
    const log = useFoodLogStore.getState();
    if (editing) log.updateEntry(id, entry);
    else log.addEntry(entry);
    // A dish the AI estimated and you kept is matched instantly next time.
    useFoodLibraryStore.getState().learn(items);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useReviewStore.getState().markLogged();
    router.back();
    useToastStore.getState().show(
      editing ? 'Saved' : `${mealLabel(mealType)} · ${formatEnergy(totals.calories, useSettingsStore.getState().units.energy)}`,
      editing ? undefined : { label: 'Undo', run: () => useFoodLogStore.getState().removeEntry(id) },
      'done',
    );
  }

  function chooseDay() {
    const keys = Array.from({ length: 7 }, (_, i) => localDateKey(addDays(new Date(), -i)));
    const labels = keys.map(dayLabel);
    const pick = (index: number) => {
      if (index >= 0 && index < keys.length) setDateKey(keys[index]);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...labels, 'Cancel'], cancelButtonIndex: labels.length }, pick);
    } else {
      Alert.alert('Day', undefined, [
        ...labels.slice(0, 3).map((label, index) => ({ text: label, onPress: () => pick(index) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  function deleteMeal() {
    const entry = useFoodLogStore.getState().entries.find((candidate) => candidate.id === pending?.entryId);
    if (!entry) return;
    router.back();
    useReviewStore.getState().clear();
    deleteEntryWithUndo(entry);
  }

  async function recheck() {
    setRechecking(true);
    try {
      await recheckWithAI();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Couldn’t reach the AI', error instanceof VisionError ? error.message : undefined);
    } finally {
      setRechecking(false);
    }
  }

  const confirmLabel =
    items.length === 0
      ? 'Nothing to log'
      : unresolved > 0
        ? `Match or remove ${unresolved} ${unresolved === 1 ? 'item' : 'items'}`
        : editing
          ? 'Save'
          : `Log ${u.energyText(totals.calories)}`;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={headerOptions} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        ref={scrollRef as never}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {pending.photoUri ? (
          <Image source={{ uri: resolvePhotoUri(pending.photoUri) }} style={styles.photo} contentFit="cover" transition={200} />
        ) : null}

        {pending.transcript ? (
          <View style={styles.quote}>
            <Text style={styles.quoteText}>“{pending.transcript}”</Text>
            {pending.aiNote ? <Text style={styles.aiNote}>{pending.aiNote}</Text> : null}
            {canRecheck ? (
              <Pressable
                accessibilityRole="button"
                disabled={rechecking}
                onPress={() => void recheck()}
                hitSlop={6}
                style={({ pressed }) => [styles.askAI, pressed && styles.pressed]}
              >
                <Icon name="sparkles" size={13} color={colors.accent} />
                <Text style={styles.askAIText}>{rechecking ? 'Asking…' : 'Ask AI'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Card style={styles.summary}>
          <View accessible accessibilityLabel={`Total ${u.energySpoken(totals.calories)}`} style={styles.summaryTop}>
            <Text style={styles.summaryNumber} numberOfLines={1} adjustsFontSizeToFit>{u.energyNumber(totals.calories)}</Text>
            <Text style={styles.summaryUnit}>{u.energy}</Text>
          </View>
          <View style={styles.nutrientRow}>
            <NutrientTotal label="Protein" value={totals.proteinG} unit="g" color={colors.protein} />
            <NutrientTotal label="Carbs" value={totals.carbsG} unit="g" color={colors.carbs} />
            <NutrientTotal label="Fat" value={totals.fatG} unit="g" color={colors.fat} />
          </View>
          {hasMicros ? (
            <View style={[styles.nutrientRow, styles.nutrientRowSecond]}>
              <NutrientTotal label="Fiber" value={micros.fiberG} unit="g" />
              <NutrientTotal label="Sugar" value={micros.sugarG} unit="g" />
              <NutrientTotal label="Sat. fat" value={micros.saturatedFatG} unit="g" />
              <NutrientTotal label="Sodium" value={micros.sodiumMg} unit="mg" />
            </View>
          ) : null}
        </Card>

        <Segmented
          accessibilityLabel="Meal"
          options={MEALS.map((meal) => ({ value: meal.key, label: meal.label }))}
          value={mealType}
          onChange={setMealType}
        />
        {nudge ? (
          <Pressable accessibilityRole="button" onPress={() => setMealType(nudge)} style={styles.nudge} hitSlop={4}>
            <Icon name="clock" size={13} color={colors.textSecondary} />
            <Text style={styles.nudgeText}>
              It’s {new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.{' '}
              <Text style={styles.nudgeAction}>Log as {mealLabel(nudge)}</Text>
            </Text>
          </Pressable>
        ) : null}
        <Card padded={false}>
          <ListRow first icon="calendar" tint={colors.tile.orange} title="Day" value={dayLabel(dateKey)} accessory="chevron" onPress={chooseDay} />
        </Card>

        <SectionHeader title="Items" trailing={items.length > 1 ? `${items.length}` : undefined} />
        {items.map((food) => (
          <ItemCard key={food.id} food={food} />
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/search?mode=add')}
          style={({ pressed }) => [styles.addItem, pressed && styles.pressed]}
        >
          <Icon name="plus.circle.fill" size={20} color={colors.accent} weight="regular" />
          <Text style={styles.addItemText}>Add item</Text>
        </Pressable>

        {editing ? (
          <Pressable accessibilityRole="button" onPress={deleteMeal} style={styles.deleteMeal}>
            <Text style={styles.deleteMealText}>Delete Meal</Text>
          </Pressable>
        ) : null}
      </KeyboardAwareScrollView>

      <SheetFooter>
        <GlassButton
          label={confirmLabel}
          icon={items.length && !unresolved ? 'checkmark' : undefined}
          variant="primary"
          onPress={confirm}
          disabled={items.length === 0 || unresolved > 0}
        />
      </SheetFooter>
    </View>
  );
}

function ItemCard({ food }: { food: FoodItem }) {
  const u = useUnits();
  const update = (next: FoodItem) => useReviewStore.getState().updateItem(next);
  const remove = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useReviewStore.getState().removeItem(food.id);
  };
  const quick = food.source === 'manual-custom' && food.name === 'Quick add';
  const ai = food.source === 'vision-ai' || food.source === 'text-ai';
  const mine = Boolean(food.libraryId);
  const badge = food.userAdjusted ? 'edited' : mine ? 'mine' : ai ? 'ai' : null;

  if (food.unresolved) {
    return (
      <Card style={[styles.item, styles.unresolved]}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemName, styles.unresolvedName]} numberOfLines={2}>
            {food.name}
          </Text>
          <Text style={styles.tagMuted}>Not found</Text>
        </View>
        <View style={styles.itemControls}>
          <GlassButton
            label="Find it"
            icon="magnifyingglass"
            onPress={() => {
              const phrase = food.heard ?? food.name;
              useReviewStore.getState().removeItem(food.id);
              router.push({ pathname: '/search', params: { mode: 'add', q: phrase, link: phrase } });
            }}
            style={styles.findButton}
          />
          <RemoveButton name={food.name} onPress={remove} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.item}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${food.name}, ${u.energySpoken(food.macros.calories)}. Edit nutrition`}
        onPress={() => router.push({ pathname: '/food-editor', params: { item: food.id } })}
        style={({ pressed }) => [styles.itemTap, pressed && styles.pressed]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitle}>
            <Text style={styles.itemNameText} numberOfLines={2}>
              {food.name}
            </Text>
            {badge ? <SourceBadge kind={badge} /> : null}
          </View>
          <Text style={styles.itemKcal}>{u.energyText(food.macros.calories)}</Text>
          <Icon name="chevron.right" size={12} color={colors.textTertiary} weight="semibold" />
        </View>
        {quick ? null : (
          <View style={styles.itemMeta}>
            <MacroMarks macros={food.macros} />
            {food.serving ? <Text style={styles.metaText}>{u.massText(food.portionGrams)}</Text> : null}
          </View>
        )}
      </Pressable>
      <View style={styles.itemControls}>
        {quick ? (
          <Stepper
            label={u.energyName}
            value={energyValue(food.macros.calories, u.energy)}
            unit={u.energy}
            step={u.energy === 'kJ' ? 50 : 10}
            onChange={(value) =>
              update({ ...food, userAdjusted: true, macros: { ...food.macros, calories: Math.round(kcalFromEnergy(value, u.energy)) } })
            }
          />
        ) : food.serving ? (
          <Stepper
            label={`${food.name}, ${portionLabel(food, u.food)}`}
            value={Math.round((food.portionGrams / food.serving.grams) * 4) / 4}
            unit={food.portionGrams <= food.serving.grams + 0.5 ? food.serving.label : food.serving.plural}
            step={food.serving.grams >= 100 ? 0.5 : 1}
            min={0.25}
            onChange={(count) => update(scaleItem(food, count * food.serving!.grams))}
          />
        ) : (
          <Stepper
            label={`${food.name} portion`}
            value={massValue(food.portionGrams, u.food)}
            unit={u.food}
            step={u.food === 'oz' ? 0.5 : food.portionGrams <= 50 ? 5 : 10}
            min={u.food === 'oz' ? 0.25 : 1}
            onChange={(value) => update(scaleItem(food, gramsFromMass(value, u.food)))}
          />
        )}
        <RemoveButton name={food.name} onPress={remove} />
      </View>
    </Card>
  );
}

function RemoveButton({ name, onPress }: { name: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Remove ${name}`} hitSlop={8} style={styles.remove}>
      <Icon name="trash" size={16} color={colors.textTertiary} weight="medium" />
    </Pressable>
  );
}

/** One nutrient total. Macros carry their color dot; the others share the same type, without one. */
function NutrientTotal({ label, value, unit, color }: { label: string; value: number; unit: string; color?: string }) {
  const shown = Math.round(value).toLocaleString();
  return (
    <View style={styles.nutrient} accessible accessibilityLabel={`${label} ${shown} ${unit === 'mg' ? 'milligrams' : 'grams'}`}>
      <View style={styles.nutrientLabelRow}>
        {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
        <Text style={styles.nutrientLabel}>{label}</Text>
      </View>
      <Text style={styles.nutrientValue}>
        {shown}
        <Text style={styles.nutrientUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

const BADGES = {
  ai: { icon: 'sparkles', label: 'AI estimate', tint: colors.accent, background: colors.accentSoft },
  edited: { icon: 'pencil', label: 'Edited', tint: colors.textSecondary, background: colors.fill },
  mine: { icon: 'person.fill', label: 'My food', tint: colors.textSecondary, background: colors.fill },
} as const;

/** Where an item's numbers came from, as a small icon badge in front of its name. */
function SourceBadge({ kind }: { kind: keyof typeof BADGES }) {
  const badge = BADGES[kind];
  return (
    <View accessible accessibilityLabel={badge.label} style={[styles.badge, { backgroundColor: badge.background }]}>
      <Icon name={badge.icon} size={11} color={badge.tint} weight="semibold" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pressed: {
    opacity: 0.6,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm + 4,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceRaised,
  },
  quote: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
  },
  quoteText: {
    ...typography.callout,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  aiNote: {
    ...typography.footnote,
    color: colors.danger,
  },
  askAI: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  askAIText: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.accent,
  },
  summary: {
    gap: spacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  summaryNumber: {
    ...typography.hero,
    fontSize: 44,
    color: colors.textPrimary,
  },
  summaryUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  nutrientRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.md - 4,
  },
  nutrientRowSecond: {
    marginTop: -spacing.xs,
  },
  nutrient: {
    flex: 1,
    gap: 2,
  },
  nutrientLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutrientLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nutrientValue: {
    ...typography.statMedium,
    fontSize: 18,
    color: colors.textPrimary,
  },
  nutrientUnit: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  nudgeText: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  nudgeAction: {
    fontWeight: '600',
    color: colors.accent,
  },
  item: {
    gap: spacing.sm,
  },
  itemTap: {
    gap: spacing.sm,
  },
  unresolved: {
    borderWidth: 1.5,
    borderColor: colors.accentSoft,
  },
  unresolvedName: {
    color: colors.textSecondary,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    ...typography.headline,
    color: colors.textPrimary,
    flex: 1,
  },
  itemTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemNameText: {
    ...typography.headline,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  itemKcal: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  tagMuted: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  findButton: {
    minWidth: 130,
  },
  remove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  addItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xs,
  },
  addItemText: {
    ...typography.headline,
    color: colors.accent,
  },
  deleteMeal: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  deleteMealText: {
    ...typography.body,
    color: colors.danger,
  },
});
