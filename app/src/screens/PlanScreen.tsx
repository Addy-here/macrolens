import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/glass';
import { colors, spacing, typography } from '../theme';
import { usePlanStore } from '../store/usePlanStore';

/**
 * Weekly adaptive plan screen — see docs/PRODUCT.md "Adaptive weight-loss
 * plans". Shows current targets, the plain-language reason they changed
 * (if they did), and the weight trend. The actual recalculation logic
 * (TDEE estimate vs. actual trend) lives server-side — see
 * docs/DECISIONS.md backend entry — this screen only renders the result.
 */
export function PlanScreen() {
  const insets = useSafeAreaInsets();
  const plan = usePlanStore((s) => s.currentPlan);
  const trendWeightKg = usePlanStore((s) => s.trendWeightKg());

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <Text style={[typography.largeTitle, { color: colors.textPrimary }]}>
        Your Plan
      </Text>

      <GlassCard style={styles.card} elevation="card" tint="light">
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          This week's target
        </Text>
        <Text style={[typography.statLarge, { color: colors.textPrimary, marginTop: spacing.xs }]}>
          {plan ? `${plan.targetCalories} kcal/day` : 'Not set up yet'}
        </Text>
        {plan?.changeReason && (
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing.sm },
            ]}
          >
            {plan.changeReason}
          </Text>
        )}
      </GlassCard>

      <GlassCard style={styles.card} elevation="card" tint="light">
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Weight trend
        </Text>
        <Text style={[typography.statLarge, { color: colors.textPrimary, marginTop: spacing.xs }]}>
          {trendWeightKg ? `${trendWeightKg.toFixed(1)} kg` : 'No entries yet'}
        </Text>
        <Text
          style={[typography.caption, { color: colors.textTertiary, marginTop: spacing.xs }]}
        >
          Smoothed trend, not your last single entry — see docs/PRODUCT.md
          for why.
        </Text>
      </GlassCard>

      {!plan && (
        <GlassCard style={styles.card} elevation="card" tint="medium">
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Complete onboarding to generate your first adaptive plan based
            on your stats and goals.
          </Text>
        </GlassCard>
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
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
});
