import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Card } from '../components/ui/Card';
import { GroupLabel } from '../components/ui/ListRow';
import { colors, spacing, typography } from '../theme';
import { libraryFoodFromItem, useFoodLibraryStore, type LibraryFood } from '../store/useFoodLibraryStore';
import { useReviewStore } from '../store/useReviewStore';
import { useDevAction } from '../dev/devScroll';
import { itemFromFood } from '../utils/describe';
import { createId } from '../utils/id';
import type { FoodItem } from '../types';

type Field = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'satFat' | 'sodium';

const FIELDS: { key: Field; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'satFat', label: 'Saturated fat', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
];

type Values = Record<Field, string> & { name: string; grams: string; servingLabel: string };

const fmt = (value: number | undefined) => (value == null ? '' : String(Math.round(value * 10) / 10));

function valuesFromItem(item: FoodItem): Values {
  return {
    name: item.name,
    grams: String(item.portionGrams),
    servingLabel: item.serving?.label ?? '',
    calories: fmt(item.macros.calories),
    protein: fmt(item.macros.proteinG),
    carbs: fmt(item.macros.carbsG),
    fat: fmt(item.macros.fatG),
    fiber: fmt(item.micros?.fiberG),
    sugar: fmt(item.micros?.sugarG),
    satFat: fmt(item.micros?.saturatedFatG),
    sodium: fmt(item.micros?.sodiumMg),
  };
}

function itemFromValues(values: Values, base?: FoodItem): FoodItem {
  const n = (text: string) => {
    const parsed = parseFloat(text.replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const optional = (text: string) => (text.trim() === '' ? undefined : n(text));
  const grams = Math.max(1, Math.round(n(values.grams) || base?.portionGrams || 100));
  const label = values.servingLabel.trim();
  const micros = {
    fiberG: optional(values.fiber),
    sugarG: optional(values.sugar),
    saturatedFatG: optional(values.satFat),
    sodiumMg: optional(values.sodium),
  };
  const hasMicros = Object.values(micros).some((value) => value != null);
  return {
    id: base?.id ?? createId(),
    name: values.name.trim() || 'Food',
    portionGrams: grams,
    userAdjusted: true,
    source: base?.source ?? 'manual-custom',
    heard: base?.heard,
    libraryId: base?.libraryId,
    serving: label ? { label, plural: label.endsWith('s') ? label : `${label}s`, grams } : base?.serving,
    macros: { calories: Math.round(n(values.calories)), proteinG: n(values.protein), carbsG: n(values.carbs), fatG: n(values.fat) },
    micros: hasMicros ? micros : base?.micros,
  };
}

/**
 * Nutrition for one food. Three uses:
 *  - `?item=<id>`: tweak an item on the review sheet (and remember it, by default);
 *  - `?food=<id>`: edit one of My Foods;
 *  - `?create=<name>`: make a new food, added to the meal being built unless `from=library`.
 */
export function FoodEditorScreen() {
  const params = useLocalSearchParams<{ item?: string; food?: string; create?: string; from?: string }>();
  const pendingItem = useReviewStore((s) => s.pending?.items.find((item) => item.id === params.item));
  const libraryFood = useFoodLibraryStore((s) => s.foods.find((food) => food.id === params.food));
  const mode: 'item' | 'food' | 'create' = params.item ? 'item' : params.food ? 'food' : 'create';

  const initial = useMemo<Values>(() => {
    if (mode === 'item' && pendingItem) return valuesFromItem(pendingItem);
    if (mode === 'food' && libraryFood) return valuesFromItem(itemFromFood(libraryFood));
    return { ...valuesFromItem(blankItem()), name: params.create ?? '' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [values, setValues] = useState<Values>(initial);
  const [remember, setRemember] = useState(true);

  const set = (key: keyof Values) => (text: string) => setValues((prev) => ({ ...prev, [key]: text }));
  const canSave = values.name.trim().length > 0;

  function save() {
    if (!canSave) return;
    const library = useFoodLibraryStore.getState();
    if (mode === 'item' && pendingItem) {
      // Saving without changing anything shouldn't add to My Foods or mark the item edited.
      if (JSON.stringify(values) === JSON.stringify(initial)) {
        router.back();
        return;
      }
      let item = itemFromValues(values, pendingItem);
      if (remember) {
        const food = libraryFoodFromItem(item, 'edited', pendingItem.libraryId);
        library.upsert(food);
        item = { ...item, libraryId: food.id };
      }
      useReviewStore.getState().updateItem(item);
    } else if (mode === 'food' && libraryFood) {
      const food = libraryFoodFromItem(itemFromValues(values), libraryFood.origin === 'learned' ? 'edited' : libraryFood.origin, libraryFood.id);
      library.upsert({ ...food, aliases: Array.from(new Set([...food.aliases, ...libraryFood.aliases])) });
    } else {
      const food: LibraryFood = libraryFoodFromItem(itemFromValues(values), 'created');
      library.upsert(food);
      if (params.from !== 'library') useReviewStore.getState().addItems([{ ...itemFromFood(food), libraryId: food.id }]);
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function remove() {
    if (!libraryFood) return;
    Alert.alert(`Delete ${libraryFood.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          useFoodLibraryStore.getState().remove(libraryFood.id);
          router.back();
        },
      },
    ]);
  }

  useDevAction('editor.save', save);

  // The header reads the latest values through a ref, so its options only change when Save is enabled or not.
  const saveRef = useRef(save);
  saveRef.current = save;
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      title: mode === 'create' ? 'New Food' : mode === 'food' ? 'Edit Food' : 'Nutrition',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.textPrimary },
      headerLeft: () => (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable accessibilityRole="button" hitSlop={8} disabled={!canSave} onPress={() => saveRef.current()} style={styles.headerButton}>
          <Text style={[styles.headerSave, !canSave && styles.disabled]}>Save</Text>
        </Pressable>
      ),
    }),
    [canSave, mode],
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={headerOptions} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Card padded={false}>
          <Row first label="Name">
            <TextInput
              value={values.name}
              onChangeText={set('name')}
              placeholder="Food name"
              placeholderTextColor={colors.textTertiary}
              autoFocus={mode === 'create' && !values.name}
              style={[styles.input, styles.textInput]}
              accessibilityLabel="Name"
            />
          </Row>
          <Row label="Serving">
            <TextInput
              value={values.servingLabel}
              onChangeText={set('servingLabel')}
              placeholder="e.g. slice"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              style={[styles.input, styles.textInput]}
              accessibilityLabel="Serving name"
            />
          </Row>
          <Row label="Weight" unit="g">
            <NumberInput value={values.grams} onChangeText={set('grams')} label="Weight in grams" />
          </Row>
        </Card>

        <GroupLabel>{mode === 'item' ? 'For this portion' : 'Per serving'}</GroupLabel>
        <Card padded={false}>
          {FIELDS.map((field, index) => (
            <Row key={field.key} first={index === 0} label={field.label} unit={field.unit} strong={index < 4}>
              <NumberInput value={values[field.key]} onChangeText={set(field.key)} label={`${field.label} in ${field.unit}`} />
            </Row>
          ))}
        </Card>

        {mode === 'item' ? (
          <Card padded={false} style={styles.rememberCard}>
            <Row first label="Save to My Foods">
              <Switch value={remember} onValueChange={setRemember} trackColor={{ true: colors.accent }} />
            </Row>
          </Card>
        ) : null}

        {mode === 'food' ? (
          <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
            <Text style={styles.deleteText}>Delete Food</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function blankItem(): FoodItem {
  return {
    id: createId(),
    name: '',
    portionGrams: 100,
    userAdjusted: false,
    source: 'manual-custom',
    macros: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  };
}

function Row({
  label,
  unit,
  first = false,
  strong = true,
  children,
}: {
  label: string;
  unit?: string;
  first?: boolean;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.row, !first && styles.divider]}>
      <Text style={[styles.rowLabel, !strong && styles.rowLabelSoft]}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

function NumberInput({ value, onChangeText, label }: { value: string; onChangeText: (text: string) => void; label: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      keyboardAppearance="light"
      placeholder="–"
      placeholderTextColor={colors.textTertiary}
      selectTextOnFocus
      style={[styles.input, styles.numberInput]}
      accessibilityLabel={label}
    />
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
  headerSave: {
    ...typography.headline,
    color: colors.accent,
  },
  disabled: {
    opacity: 0.35,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  rowLabelSoft: {
    color: colors.textSecondary,
  },
  rowValue: {
    flex: 1,
    alignItems: 'flex-end',
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 12,
    textAlign: 'right',
  },
  textInput: {
    alignSelf: 'stretch',
  },
  numberInput: {
    ...typography.statSmall,
    fontSize: 17,
    minWidth: 80,
  },
  unit: {
    ...typography.callout,
    color: colors.textTertiary,
    width: 32,
  },
  rememberCard: {
    marginTop: spacing.lg,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  deleteText: {
    ...typography.body,
    color: colors.danger,
  },
});
