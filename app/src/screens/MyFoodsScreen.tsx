import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { GroupLabel } from '../components/ui/ListRow';
import { colors, spacing, typography } from '../theme';
import { useFoodLibraryStore, type LibraryFood } from '../store/useFoodLibraryStore';
import { itemFromFood, portionLabel } from '../utils/describe';

const HEADER = {
  title: 'My Foods',
  headerLargeTitleEnabled: false,
  headerRight: () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="New food"
      hitSlop={8}
      onPress={() => router.push({ pathname: '/food-editor', params: { create: '', from: 'library' } })}
      style={styles.add}
    >
      <Icon name="plus" size={17} color={colors.accent} weight="semibold" />
    </Pressable>
  ),
};

/**
 * The person's own foods: ones they created or corrected, and AI estimates
 * they logged. These are matched before the built-in list.
 */
export function MyFoodsScreen() {
  const foods = useFoodLibraryStore((s) => s.foods);
  const { yours, learned } = useMemo(
    () => ({
      yours: foods.filter((food) => food.origin !== 'learned'),
      learned: foods.filter((food) => food.origin === 'learned'),
    }),
    [foods],
  );

  return (
    <>
      <Stack.Screen options={HEADER} />
      <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {foods.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No foods yet</Text>
            <Text style={styles.emptyBody}>Foods you create or correct, and AI estimates you log, show up here.</Text>
          </View>
        ) : null}
        {yours.length > 0 ? <FoodGroup title="Yours" foods={yours} /> : null}
        {learned.length > 0 ? <FoodGroup title="Learned" foods={learned} /> : null}
      </ScrollView>
    </>
  );
}

function FoodGroup({ title, foods }: { title: string; foods: LibraryFood[] }) {
  return (
    <View>
      <GroupLabel>{title}</GroupLabel>
      <Card padded={false}>
        {foods.map((food, index) => {
          const item = itemFromFood(food);
          return (
            <Pressable
              key={food.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/food-editor', params: { food: food.id } })}
              style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
            >
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {food.name}
                </Text>
                <Text style={styles.meta}>
                  {portionLabel(item)} · {Math.round(item.macros.calories)} kcal
                </Text>
              </View>
              <Icon name="chevron.right" size={13} color={colors.textTertiary} weight="bold" />
            </Pressable>
          );
        })}
      </Card>
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
    paddingBottom: spacing.xl,
  },
  add: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    minHeight: 52,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  pressed: {
    backgroundColor: colors.fill,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
});
