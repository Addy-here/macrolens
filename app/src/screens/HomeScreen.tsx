import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MacroRing } from '../components/glass';
import { MacroBar } from '../components/ui/MacroBar';
import { Panel } from '../components/ui/Panel';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { TextButton } from '../components/ui/TextButton';
import { colors, spacing, typography } from '../theme';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { sumMacros } from '../utils/macros';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function WarmGlow({ color, size }: { color: string; size: number }) {
  const id = `warm-${color.replace('#', '')}`;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.34} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Totals are derived here from `entries`, not inside a Zustand selector.
 * A selector that returns a new object every call loops forever.
 */
export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const todayIso = new Date().toISOString().slice(0, 10);
  const entries = useFoodLogStore((s) => s.entries);
  const plan = usePlanStore((s) => s.currentPlan);

  const todayEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.loggedAt.startsWith(todayIso))
        .slice()
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
    [entries, todayIso],
  );

  const totals = useMemo(
    () => sumMacros(todayEntries.map((entry) => entry.totalMacros)),
    [todayEntries],
  );

  const targetCalories = plan?.targetCalories ?? 2000;
  const targetMacros = plan?.targetMacros ?? {
    calories: targetCalories,
    proteinG: 150,
    carbsG: 200,
    fatG: 65,
  };
  const eaten = Math.round(totals.calories);
  const remaining = targetCalories - eaten;
  const over = remaining < 0;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl + spacing.lg }]}
    >
      <ScreenHeader eyebrow={dateLabel} title="Today" />

      <View style={styles.hero}>
        <View
          accessible
          accessibilityLabel={`${Math.abs(remaining).toLocaleString()} ${over ? 'over today' : 'left today'}`}
          style={styles.glow}
        >
          <WarmGlow color={over ? colors.danger : colors.accent} size={200} />
          <MacroRing
            progress={targetCalories > 0 ? eaten / targetCalories : 0}
            color={over ? colors.danger : colors.accent}
            size={168}
            strokeWidth={11}
          />
          <View style={styles.heroCopy} pointerEvents="none">
            <Text style={[styles.heroNumber, over && styles.heroOver]} numberOfLines={1} adjustsFontSizeToFit>
              {Math.abs(remaining).toLocaleString()}
            </Text>
            <Text style={styles.heroLabel}>{over ? 'over' : 'left'}</Text>
          </View>
        </View>
        <Text style={styles.heroMeta}>
          {eaten.toLocaleString()} of {targetCalories.toLocaleString()} eaten
        </Text>
      </View>

      <Panel style={styles.macros}>
        <MacroBar
          label="Protein"
          value={totals.proteinG}
          target={targetMacros.proteinG}
          color={colors.protein}
        />
        <MacroBar
          label="Carbs"
          value={totals.carbsG}
          target={targetMacros.carbsG}
          color={colors.carbs}
        />
        <MacroBar label="Fat" value={totals.fatG} target={targetMacros.fatG} color={colors.fat} />
      </Panel>

      <Text style={styles.section}>Meals</Text>
      {todayEntries.length === 0 ? (
        <Panel>
          <Text style={styles.empty}>Nothing logged yet.</Text>
          <TextButton label="Log a meal" onPress={() => router.push('/log')} />
        </Panel>
      ) : (
        <Panel padded={false}>
          {todayEntries.map((entry, index) => (
            <View key={entry.id} style={[styles.meal, index > 0 && styles.mealDivider]}>
              <View style={styles.mealCopy}>
                <Text numberOfLines={2} style={styles.mealName}>
                  {entry.items.map((item) => item.name).join(', ')}
                </Text>
                <Text style={styles.mealMeta}>
                  {titleCase(entry.mealType)} · {formatTime(entry.loggedAt)}
                </Text>
              </View>
              <Text style={styles.mealKcal}>
                {Math.round(entry.totalMacros.calories)}
                <Text style={styles.mealUnit}> kcal</Text>
              </Text>
            </View>
          ))}
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  glow: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    position: 'absolute',
    alignItems: 'center',
    width: 140,
  },
  heroNumber: {
    ...typography.statLarge,
    fontSize: 44,
    letterSpacing: -1.4,
    color: colors.textPrimary,
  },
  heroOver: {
    color: colors.danger,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroMeta: {
    ...typography.body,
    color: colors.textSecondary,
  },
  macros: {
    gap: spacing.md,
  },
  section: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  mealDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  mealCopy: {
    flex: 1,
    gap: 2,
  },
  mealName: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
  },
  mealMeta: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  mealKcal: {
    ...typography.statMedium,
    color: colors.textPrimary,
  },
  mealUnit: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
