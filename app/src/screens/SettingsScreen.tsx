import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, GlassButton } from '../components/glass';
import { colors, spacing, typography, radius } from '../theme';
import { useUserStore } from '../store/useUserStore';
import { usePlanStore } from '../store/usePlanStore';
import { calculateInitialPlan } from '../utils/planCalculator';
import type { ActivityLevel, UserProfile } from '../types';

const ACTIVITY_LEVELS: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'light', label: 'Lightly active' },
  { key: 'moderate', label: 'Moderately active' },
  { key: 'active', label: 'Active' },
  { key: 'very-active', label: 'Very active' },
];

/** Default profile shown until the user has actually onboarded/saved one. */
const BLANK_PROFILE: UserProfile = {
  id: 'local-user',
  heightCm: 175,
  startingWeightKg: 80,
  goalWeightKg: 72,
  targetRateKgPerWeek: -0.5,
  activityLevel: 'moderate',
  birthYear: 1995,
  sex: 'other',
};

/**
 * Settings & Goals — the screen that was missing entirely before. Lets
 * the user set/edit height, current & goal weight, target weekly rate of
 * change, activity level, and sex (for BMR calc). This is what feeds the
 * initial AdaptivePlan calculation and is re-editable at any time — the
 * weekly adaptive recalculation (see docs/PRODUCT.md) adjusts targets
 * around whatever is saved here, it doesn't replace it.
 */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const setPlan = usePlanStore((s) => s.setPlan);
  const currentPlan = usePlanStore((s) => s.currentPlan);

  const [draft, setDraft] = useState<UserProfile>(profile ?? BLANK_PROFILE);

  const bmiPreview = useMemo(() => {
    const heightM = draft.heightCm / 100;
    if (heightM <= 0) return null;
    return (draft.startingWeightKg / (heightM * heightM)).toFixed(1);
  }, [draft.heightCm, draft.startingWeightKg]);

  const weeksToGoal = useMemo(() => {
    if (draft.targetRateKgPerWeek === 0) return null;
    const delta = draft.goalWeightKg - draft.startingWeightKg;
    const weeks = delta / draft.targetRateKgPerWeek;
    return weeks > 0 ? Math.round(weeks) : null;
  }, [draft.startingWeightKg, draft.goalWeightKg, draft.targetRateKgPerWeek]);

  function patch<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setProfile(draft);
    // Seed an initial plan immediately so the Plan tab has something to
    // show before any backend weekly recalculation has run (see
    // src/utils/planCalculator.ts for caveats — placeholder algorithm).
    if (!currentPlan) {
      setPlan(calculateInitialPlan(draft));
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.md,
        }}
      >
        <Text style={[typography.largeTitle, { color: colors.textPrimary }]}>
          Goals & Plan
        </Text>

        <GlassCard>
          <Text style={styles.sectionLabel}>Body</Text>
          <NumberRow
            label="Height (cm)"
            value={draft.heightCm}
            onChange={(v) => patch('heightCm', v)}
          />
          <NumberRow
            label="Current weight (kg)"
            value={draft.startingWeightKg}
            onChange={(v) => patch('startingWeightKg', v)}
          />
          <NumberRow
            label="Goal weight (kg)"
            value={draft.goalWeightKg}
            onChange={(v) => patch('goalWeightKg', v)}
          />
          {bmiPreview && (
            <Text style={styles.hint}>Current BMI: {bmiPreview}</Text>
          )}
        </GlassCard>

        <GlassCard>
          <Text style={styles.sectionLabel}>Target pace</Text>
          <NumberRow
            label="kg per week (negative = lose)"
            value={draft.targetRateKgPerWeek}
            step={0.1}
            onChange={(v) => patch('targetRateKgPerWeek', v)}
          />
          {weeksToGoal !== null && (
            <Text style={styles.hint}>
              ≈ {weeksToGoal} week{weeksToGoal === 1 ? '' : 's'} to reach your
              goal at this pace
            </Text>
          )}
          <Text style={styles.warning}>
            A safe sustainable range is roughly −1.0 to −0.25 kg/week.
            Faster isn't better — the adaptive plan will fight you on it.
          </Text>
        </GlassCard>

        <GlassCard>
          <Text style={styles.sectionLabel}>Activity level</Text>
          <View style={styles.chipRow}>
            {ACTIVITY_LEVELS.map((level) => {
              const active = draft.activityLevel === level.key;
              return (
                <View
                  key={level.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onTouchEnd={() => patch('activityLevel', level.key)}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      active && styles.chipLabelActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </GlassCard>

        <GlassButton label="Save goals" variant="primary" onPress={handleSave} />

        {profile && (
          <Text style={styles.savedHint}>
            Saved. Your weekly adaptive plan will recalculate from this
            baseline using your logged weight trend.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        defaultValue={String(value)}
        onEndEditing={(e) => {
          const parsed = parseFloat(e.nativeEvent.text);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  input: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
    minWidth: 70,
    textAlign: 'right',
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  warning: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.glassLight,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.background,
    fontWeight: '700',
  },
  savedHint: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'center',
  },
});
