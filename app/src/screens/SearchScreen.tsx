import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { SearchBarCommands } from 'react-native-screens';
import * as Haptics from 'expo-haptics';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { GroupLabel } from '../components/ui/ListRow';
import { SheetFooter } from '../components/ui/SheetFooter';
import { colors, spacing, typography } from '../theme';
import { FOODS } from '../data/foods';
import { quickAddItem } from '../services/logFlow';
import { useFoodLibraryStore } from '../store/useFoodLibraryStore';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useReviewStore } from '../store/useReviewStore';
import { itemFromFood, portionLabel, searchFoods } from '../utils/describe';
import { createId } from '../utils/id';
import { useDevAction } from '../dev/devScroll';
import type { FoodItem } from '../types';

const STAPLES = ['egg', 'banana', 'greek-yogurt', 'chicken-breast', 'white-rice', 'oatmeal', 'roti', 'dal', 'apple', 'coffee'];

interface Row {
  key: string;
  item: FoodItem;
  /** The food it came from, for linking a phrase to it. */
  foodId?: string;
  mine?: boolean;
}

/**
 * Find a food and add it. Tapping adds a default serving; portions are set on
 * the review sheet. `?mode=add` adds to the review that opened it; `?link=`
 * (from "Find it") also remembers the phrase → food, and closes after one pick.
 */
export function SearchScreen() {
  const { mode, q, link } = useLocalSearchParams<{ mode?: string; q?: string; link?: string }>();
  const adding = mode === 'add';
  const entries = useFoodLogStore((s) => s.entries);
  const myFoods = useFoodLibraryStore((s) => s.foods);
  const pendingCount = useReviewStore((s) => s.pending?.items.length ?? 0);
  const [query, setQuery] = useState(q ?? '');
  const [added, setAdded] = useState<Record<string, number>>({});
  const searchBar = useRef<SearchBarCommands>(null);

  // Starting from the Log screen begins a new meal rather than adding to a stale one.
  useEffect(() => {
    if (!adding) useReviewStore.getState().clear();
  }, [adding]);

  useEffect(() => {
    if (q) setTimeout(() => searchBar.current?.setText(q), 50);
  }, [q]);

  const recent = useMemo<Row[]>(() => {
    const seen = new Set<string>();
    const rows: Row[] = [];
    for (const entry of [...entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))) {
      for (const item of entry.items) {
        if (item.unresolved || seen.has(item.name)) continue;
        seen.add(item.name);
        rows.push({ key: `recent:${item.name}`, item, mine: Boolean(item.libraryId) });
        if (rows.length === 12) return rows;
      }
    }
    return rows;
  }, [entries]);

  const mine = useMemo<Row[]>(
    () =>
      myFoods
        .filter((food) => food.origin !== 'learned')
        .slice(0, 12)
        .map((food) => ({ key: `my:${food.id}`, item: { ...itemFromFood(food), libraryId: food.id }, foodId: food.id, mine: true })),
    [myFoods],
  );

  const staples = useMemo<Row[]>(
    () =>
      STAPLES.map((id) => FOODS.find((food) => food.id === id))
        .filter((food): food is (typeof FOODS)[number] => Boolean(food))
        .map((food) => ({ key: `food:${food.id}`, item: itemFromFood(food), foodId: food.id })),
    [],
  );

  const results = useMemo<Row[]>(
    () =>
      searchFoods(query, 30, myFoods).map(({ food, alias, mine: isMine }) => ({
        key: `food:${food.id}:${alias}`,
        item: { ...itemFromFood(food, alias), libraryId: isMine ? food.id : undefined },
        foodId: food.id,
        mine: isMine,
      })),
    [myFoods, query],
  );

  const trimmed = query.trim();
  const quickCalories = Number(trimmed.replace(/kcal|cal|calories/gi, '').trim());
  const showQuick = trimmed.length > 0 && Number.isFinite(quickCalories) && quickCalories > 0 && quickCalories < 5000;
  const addedCount = Object.values(added).reduce((sum, count) => sum + count, 0);

  const add = (row: Row) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useReviewStore.getState().addItems([{ ...row.item, id: createId(), userAdjusted: false }]);
    setAdded((prev) => ({ ...prev, [row.key]: (prev[row.key] ?? 0) + 1 }));
    if (link && row.foodId) {
      useFoodLibraryStore.getState().link(link, row.foodId);
      router.back();
    }
  };

  const create = () => {
    router.push({ pathname: '/food-editor', params: { create: trimmed } });
  };

  // Memoised: a new options object every render makes the header update the screen in a loop.
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      title: adding ? 'Add Food' : 'Search',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.textPrimary },
      headerRight: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={() => router.back()} style={styles.close}>
          <Icon name="xmark" size={15} color={colors.textPrimary} weight="semibold" />
        </Pressable>
      ),
      headerSearchBarOptions: {
        ref: searchBar,
        placeholder: 'Foods, drinks, or calories',
        // At the top under the title: iOS 26 otherwise docks it at the bottom, over the Done/Review bar.
        placement: 'stacked' as const,
        autoFocus: !q,
        hideWhenScrolling: false,
        autoCapitalize: 'none' as const,
        onChangeText: (event: { nativeEvent: { text: string } }) => setQuery(event.nativeEvent.text),
        onCancelButtonPress: () => setQuery(''),
      },
    }),
    [adding, q],
  );

  useDevAction('search.addFirst', () => {
    const row = results[0] ?? recent[0] ?? staples[0];
    if (row) add(row);
  });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={headerOptions} />

      <KeyboardAwareScrollView
        bottomOffset={24}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {showQuick ? (
          <Card padded={false}>
            <ResultRow
              first
              row={{ key: `quick:${quickCalories}`, item: quickAddItem(quickCalories) }}
              detail="Quick add"
              count={added[`quick:${quickCalories}`]}
              onAdd={add}
            />
          </Card>
        ) : null}

        {trimmed ? (
          <>
            {results.length > 0 ? <Section title="Results" rows={results} added={added} onAdd={add} /> : null}
            {!showQuick ? (
              <Card padded={false} style={results.length > 0 ? styles.createAfter : undefined}>
                <Pressable accessibilityRole="button" onPress={create} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={styles.addButton}>
                    <Icon name="plus" size={13} color={colors.accent} weight="bold" />
                  </View>
                  <Text style={styles.createText} numberOfLines={1}>
                    Create “{trimmed}”
                  </Text>
                </Pressable>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            {mine.length > 0 ? <Section title="My Foods" rows={mine} added={added} onAdd={add} /> : null}
            {recent.length > 0 ? <Section title="Recent" rows={recent} added={added} onAdd={add} /> : null}
            <Section title="Staples" rows={staples} added={added} onAdd={add} />
          </>
        )}
      </KeyboardAwareScrollView>

      {!link && (adding ? addedCount : pendingCount) > 0 ? (
        <SheetFooter>
          <GlassButton
            label={adding ? 'Done' : `Review ${pendingCount} ${pendingCount === 1 ? 'item' : 'items'}`}
            icon={adding ? 'checkmark' : 'arrow.right'}
            variant="primary"
            onPress={() => (adding ? router.back() : router.replace('/review'))}
          />
        </SheetFooter>
      ) : null}
    </View>
  );
}

function Section({
  title,
  rows,
  added,
  onAdd,
}: {
  title: string;
  rows: Row[];
  added: Record<string, number>;
  onAdd: (row: Row) => void;
}) {
  return (
    <View>
      <GroupLabel>{title}</GroupLabel>
      <Card padded={false}>
        {rows.map((row, index) => (
          <ResultRow key={row.key} row={row} first={index === 0} count={added[row.key]} onAdd={onAdd} />
        ))}
      </Card>
    </View>
  );
}

function ResultRow({
  row,
  first,
  count,
  detail,
  onAdd,
}: {
  row: Row;
  first: boolean;
  count?: number;
  detail?: string;
  onAdd: (row: Row) => void;
}) {
  const { item } = row;
  const kcal = Math.round(item.macros.calories);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${item.name}, ${detail ?? portionLabel(item)}, ${kcal} calories${count ? `, added ${count}` : ''}`}
      onPress={() => onAdd(row)}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {row.mine ? <Text style={styles.mine}>Mine</Text> : null}
        </View>
        <Text style={styles.rowMeta}>
          {detail ?? portionLabel(item)} · {kcal} kcal
        </Text>
      </View>
      {count ? (
        <View style={styles.addedBadge}>
          <Icon name="checkmark" size={11} color={colors.onAccent} weight="bold" />
          {count > 1 ? <Text style={styles.addedCount}>{count}</Text> : null}
        </View>
      ) : (
        <View style={styles.addButton}>
          <Icon name="plus" size={13} color={colors.accent} weight="bold" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
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
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowName: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  mine: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.accent,
  },
  rowMeta: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  addedCount: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.onAccent,
  },
  createAfter: {
    marginTop: spacing.sm,
  },
  createText: {
    ...typography.body,
    color: colors.accent,
    flex: 1,
  },
});
