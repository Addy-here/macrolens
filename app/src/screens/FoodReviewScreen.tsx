import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { MacroMarks } from '../components/ui/MacroMarks';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Segmented } from '../components/ui/Segmented';
import { Stepper } from '../components/ui/Stepper';
import { colors, radius, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useReviewStore } from '../store/useReviewStore';
import { createId } from '../utils/id';
import { sumMacros } from '../utils/macros';
import { MEALS, mealLabel, scaleItem, suggestedMeal, type MealType } from '../utils/meals';
import type { FoodItem } from '../types';

/** Nothing from the model is saved until the user confirms here. */
export function FoodReviewScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const pending = useReviewStore((s) => s.pending);
  const [items, setItems] = useState<FoodItem[]>(pending?.items ?? []);
  const [mealType, setMealType] = useState<MealType>(suggestedMeal);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setItems(pending?.items ?? []);
  }, [pending]);

  const totals = sumMacros(items.map((food) => food.macros));

  const confirm = () => {
    if (!pending || items.length === 0 || logged) return;
    useFoodLogStore.getState().addEntry({
      id: createId(),
      loggedAt: new Date().toISOString(),
      mealType,
      items,
      photoUri: pending.photoUri || undefined,
      totalMacros: totals,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLogged(true);
    setTimeout(
      () => {
        useReviewStore.getState().markLogged();
        router.back();
      },
      reduceMotion ? 450 : 900,
    );
  };

  if (!pending) {
    return (
      <View style={[styles.screen, styles.emptyReview]}>
        <Text style={styles.emptyTitle}>Nothing to review</Text>
        <GlassButton label="Close" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">
            Review
          </Text>
          <Text style={styles.subtitle}>Check portions. Nothing is saved until you log it.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Discard estimate"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.close}
        >
          <Icon name="xmark" size={13} color={colors.textSecondary} weight="bold" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {pending.photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: pending.photoUri }} style={styles.photo} contentFit="cover" transition={200} />
            <View style={styles.photoBadge}>
              <Icon name="sparkles" size={12} color={colors.textOnMedia} />
              <Text style={styles.photoBadgeText}>
                {items.length} {items.length === 1 ? 'item' : 'items'} found
              </Text>
            </View>
          </View>
        ) : null}

        <Card style={styles.summary}>
          <View
            accessible
            accessibilityLabel={`Total ${Math.round(totals.calories)} calories`}
            style={styles.summaryTop}
          >
            <Text style={styles.summaryNumber}>{Math.round(totals.calories).toLocaleString()}</Text>
            <Text style={styles.summaryUnit}>kcal</Text>
          </View>
          <View style={styles.summaryMacros}>
            <MacroTotal label="Protein" grams={totals.proteinG} color={colors.protein} />
            <MacroTotal label="Carbs" grams={totals.carbsG} color={colors.carbs} />
            <MacroTotal label="Fat" grams={totals.fatG} color={colors.fat} />
          </View>
        </Card>

        <Segmented
          accessibilityLabel="Meal"
          options={MEALS.map((meal) => ({ value: meal.key, label: meal.label }))}
          value={mealType}
          onChange={setMealType}
        />

        <SectionHeader title="Items" trailing="Tap a number to type it" />
        {items.length === 0 ? (
          <Text style={styles.emptyItems}>Every item was removed. Close to discard this photo.</Text>
        ) : null}
        {items.map((food) => (
          <Card key={food.id} style={styles.item}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName} numberOfLines={2}>
                {food.name}
              </Text>
              {food.userAdjusted ? <Text style={styles.edited}>Edited</Text> : null}
              <Text style={styles.itemKcal}>{Math.round(food.macros.calories)} kcal</Text>
            </View>
            <MacroMarks macros={food.macros} />
            <View style={styles.itemControls}>
              <Stepper
                label={`${food.name} portion`}
                value={food.portionGrams}
                unit="g"
                step={10}
                onChange={(grams) =>
                  setItems((prev) => prev.map((entry) => (entry.id === food.id ? scaleItem(entry, grams) : entry)))
                }
              />
              <Pressable
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setItems((prev) => prev.filter((entry) => entry.id !== food.id));
                }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${food.name}`}
                hitSlop={8}
                style={styles.remove}
              >
                <Icon name="trash" size={16} color={colors.textTertiary} weight="medium" />
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <GlassButton
          label={items.length ? `Log ${Math.round(totals.calories).toLocaleString()} kcal to ${mealLabel(mealType)}` : 'Nothing to log'}
          icon="checkmark"
          variant="primary"
          onPress={confirm}
          disabled={items.length === 0}
        />
      </View>

      {logged ? (
        <Animated.View entering={FadeIn.duration(160)} style={styles.done} accessibilityLiveRegion="assertive">
          <Animated.View entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)} style={styles.doneDisc}>
            <Icon name="checkmark" size={40} color={colors.onAccent} weight="bold" />
          </Animated.View>
          <Text style={styles.doneText}>Logged to {mealLabel(mealType)}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function MacroTotal({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={styles.macroTotal} accessible accessibilityLabel={`${label} ${Math.round(grams)} grams`}>
      <View style={styles.macroTotalLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.macroTotalName}>{label}</Text>
      </View>
      <Text style={styles.macroTotalValue}>{Math.round(grams)} g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  emptyReview: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.largeTitle,
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: 2,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm + 4,
  },
  photoWrap: {
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  photoBadge: {
    position: 'absolute',
    left: spacing.sm + 4,
    bottom: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  photoBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textOnMedia,
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
  summaryMacros: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.md - 4,
  },
  macroTotal: {
    flex: 1,
    gap: 2,
  },
  macroTotalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroTotalName: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  macroTotalValue: {
    ...typography.statMedium,
    fontSize: 18,
    color: colors.textPrimary,
  },
  emptyItems: {
    ...typography.callout,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  item: {
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  itemName: {
    ...typography.headline,
    color: colors.textPrimary,
    flex: 1,
  },
  edited: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  itemKcal: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  remove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  footer: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm + 4,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  done: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(242,242,247,0.94)',
  },
  doneDisc: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    ...typography.title,
    color: colors.textPrimary,
  },
});
