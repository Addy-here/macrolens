import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from '../components/glass';
import { Panel } from '../components/ui/Panel';
import { TextButton } from '../components/ui/TextButton';
import { colors, radius, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useReviewStore } from '../store/useReviewStore';
import { createId } from '../utils/id';
import { sumMacros } from '../utils/macros';
import type { FoodItem, FoodLogEntry } from '../types';

const MEAL_TYPES: { key: FoodLogEntry['mealType']; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

function suggestedMeal(date = new Date()): FoodLogEntry['mealType'] {
  const hour = date.getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

/** Nothing from the model is saved until the user confirms here. */
export function FoodReviewScreen() {
  const insets = useSafeAreaInsets();
  const pending = useReviewStore((s) => s.pending);
  const [items, setItems] = useState<FoodItem[]>(pending?.items ?? []);
  const [mealType, setMealType] = useState<FoodLogEntry['mealType']>(suggestedMeal);

  useEffect(() => {
    setItems(pending?.items ?? []);
  }, [pending]);

  const adjustPortion = (id: string, newGrams: number) => {
    if (!Number.isFinite(newGrams) || newGrams <= 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.portionGrams <= 0) return item;
        const ratio = newGrams / item.portionGrams;
        return {
          ...item,
          portionGrams: Math.round(newGrams),
          userAdjusted: true,
          macros: {
            calories: Math.max(0, Math.round(item.macros.calories * ratio)),
            proteinG: Math.max(0, Math.round(item.macros.proteinG * ratio * 10) / 10),
            carbsG: Math.max(0, Math.round(item.macros.carbsG * ratio * 10) / 10),
            fatG: Math.max(0, Math.round(item.macros.fatG * ratio * 10) / 10),
          },
        };
      }),
    );
  };

  const confirm = () => {
    if (!pending || items.length === 0) return;
    useFoodLogStore.getState().addEntry({
      id: createId(),
      loggedAt: new Date().toISOString(),
      mealType,
      items,
      photoUri: pending.photoUri,
      totalMacros: sumMacros(items.map((item) => item.macros)),
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    useReviewStore.getState().markLogged();
    router.back();
  };

  if (!pending) {
    return (
      <View style={[styles.screen, styles.emptyReview]}>
        <Text style={styles.lede}>Nothing to review.</Text>
        <TextButton label="Close" onPress={() => router.back()} />
      </View>
    );
  }

  const totals = sumMacros(items.map((item) => item.macros));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Image source={{ uri: pending.photoUri }} style={styles.photo} />
        <Text style={styles.lede}>Change a portion if it looks off. Nothing is saved until you confirm.</Text>

        <View style={styles.segment}>
          {MEAL_TYPES.map((meal) => {
            const selected = mealType === meal.key;
            return (
              <Pressable
                key={meal.key}
                onPress={() => setMealType(meal.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.segmentItem, selected && styles.segmentItemOn]}
              >
                <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>{meal.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Panel padded={false}>
          {items.map((item, index) => (
            <View key={item.id} style={[styles.item, index > 0 && styles.itemDivider]}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Pressable
                  onPress={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.name}`}
                  hitSlop={8}
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.portionRow}>
                <TextInput
                  style={styles.portionInput}
                  keyboardType="number-pad"
                  keyboardAppearance="dark"
                  defaultValue={String(item.portionGrams)}
                  accessibilityLabel={`${item.name} portion in grams`}
                  onEndEditing={(e) => adjustPortion(item.id, Number(e.nativeEvent.text))}
                />
                <Text style={styles.grams}>g</Text>
                <Text style={styles.macros}>
                  {item.macros.calories} kcal · {item.macros.proteinG}p · {item.macros.carbsG}c ·{' '}
                  {item.macros.fatG}f
                </Text>
              </View>
            </View>
          ))}
          <View style={styles.total}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{Math.round(totals.calories)}</Text>
          </View>
        </Panel>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <GlassButton
          label="Confirm and log"
          variant="primary"
          onPress={confirm}
          disabled={items.length === 0}
          style={styles.confirm}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyReview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  lede: {
    ...typography.body,
    color: colors.textSecondary,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm - 2,
  },
  segmentItemOn: {
    backgroundColor: colors.accentSoft,
  },
  segmentLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  segmentLabelOn: {
    color: colors.accent,
    fontWeight: '700',
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  itemDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
    flex: 1,
  },
  remove: {
    ...typography.caption,
    color: colors.danger,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  portionInput: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'right',
  },
  grams: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  macros: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  total: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  totalValue: {
    ...typography.statMedium,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  confirm: {
    width: '100%',
  },
});
