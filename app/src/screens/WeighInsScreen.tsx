import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { GroupLabel } from '../components/ui/ListRow';
import { colors, spacing, typography } from '../theme';
import { usePlanStore } from '../store/usePlanStore';
import { useUnits } from '../store/useSettingsStore';
import { confirmDeleteWeighIn } from './WeighInScreen';
import type { WeightEntry } from '../types';

const HEADER = {
  title: 'Weigh-Ins',
  headerLargeTitleEnabled: false,
  headerRight: () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add weigh-in"
      hitSlop={8}
      onPress={() => router.push('/weigh-in')}
      style={styles.add}
    >
      <Icon name="plus" size={17} color={colors.accent} weight="semibold" />
    </Pressable>
  ),
};

/** Every weigh-in, newest first, by month. Tap to correct one; hold to delete. */
export function WeighInsScreen() {
  const history = usePlanStore((s) => s.weightHistory);
  const u = useUnits();

  const months = useMemo(() => {
    const rows = history.map((entry, index) => ({ entry, previous: history[index - 1] as WeightEntry | undefined })).reverse();
    const groups: { title: string; rows: typeof rows }[] = [];
    for (const row of rows) {
      const title = new Date(row.entry.loggedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const last = groups[groups.length - 1];
      if (last?.title === title) last.rows.push(row);
      else groups.push({ title, rows: [row] });
    }
    return groups;
  }, [history]);

  return (
    <>
      <Stack.Screen options={HEADER} />
      <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No weigh-ins yet</Text>
            <Text style={styles.emptyBody}>Weigh in a few mornings a week. The trend smooths out the daily swings.</Text>
          </View>
        ) : null}
        {months.map((month) => (
          <View key={month.title}>
            <GroupLabel>{month.title}</GroupLabel>
            <Card padded={false}>
              {month.rows.map(({ entry, previous }, index) => {
                const when = new Date(entry.loggedAt);
                const label = u.weightText(entry.weightKg);
                const change = previous ? entry.weightKg - previous.weightKg : null;
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, ${label}${
                      change != null ? `, ${u.weightDelta(change)}` : ''
                    }`}
                    accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
                    onAccessibilityAction={() => confirmDeleteWeighIn(entry, label)}
                    onPress={() => router.push({ pathname: '/weigh-in', params: { id: entry.id } })}
                    onLongPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      confirmDeleteWeighIn(entry, label);
                    }}
                    style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.date}>
                        {when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={styles.time}>{when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                    </View>
                    {change != null ? <Text style={styles.change}>{u.weightDelta(change)}</Text> : null}
                    <Text style={styles.weight}>{label}</Text>
                    <Icon name="chevron.right" size={13} color={colors.textTertiary} weight="bold" />
                  </Pressable>
                );
              })}
            </Card>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.tabBottom,
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
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
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
    gap: 1,
  },
  date: {
    ...typography.body,
    color: colors.textPrimary,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  change: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  weight: {
    ...typography.statSmall,
    fontSize: 16,
    color: colors.textPrimary,
  },
});
