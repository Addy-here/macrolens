import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AiKeySection } from '../components/AiKeySection';
import { GlassButton } from '../components/glass';
import { Panel } from '../components/ui/Panel';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { colors, spacing, typography } from '../theme';
import { useUserStore } from '../store/useUserStore';
import { usePlanStore } from '../store/usePlanStore';
import { calculateInitialPlan } from '../utils/planCalculator';
import type { ActivityLevel, UserProfile } from '../types';

const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; detail: string }[] = [
  { key: 'sedentary', label: 'Sedentary', detail: 'Desk, little walking' },
  { key: 'light', label: 'Lightly active', detail: 'Walking most days' },
  { key: 'moderate', label: 'Moderately active', detail: 'Exercise a few times a week' },
  { key: 'active', label: 'Active', detail: 'Hard sessions most days' },
  { key: 'very-active', label: 'Very active', detail: 'Training twice a day' },
];

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

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const setPlan = usePlanStore((s) => s.setPlan);
  const currentPlan = usePlanStore((s) => s.currentPlan);

  const [draft, setDraft] = useState<UserProfile>(profile ?? BLANK_PROFILE);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
  }

  function handleSave() {
    setProfile(draft);
    const next = calculateInitialPlan(draft);
    if (currentPlan) {
      next.previousTargetCalories = currentPlan.targetCalories;
      next.changeReason = 'Updated from the goals you just saved.';
    }
    setPlan(next);
    setSaved(true);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl + spacing.xl,
        }}
      >
        <ScreenHeader title="Settings" detail="Goals set this week’s calories. Keys stay on this iPhone." />

        <AiKeySection />

        <Text style={styles.groupTitle}>Body</Text>
        <Panel padded={false}>
          <NumberRow label="Height" unit="cm" value={draft.heightCm} onChange={(v) => patch('heightCm', v)} />
          <NumberRow
            label="Current weight"
            unit="kg"
            value={draft.startingWeightKg}
            onChange={(v) => patch('startingWeightKg', v)}
          />
          <NumberRow
            label="Goal weight"
            unit="kg"
            value={draft.goalWeightKg}
            onChange={(v) => patch('goalWeightKg', v)}
            last
          />
          {bmiPreview ? <Text style={styles.footerNote}>BMI {bmiPreview}</Text> : null}
        </Panel>

        <Text style={styles.groupTitle}>Pace</Text>
        <Panel padded={false}>
          <NumberRow
            label="Per week"
            unit="kg"
            value={draft.targetRateKgPerWeek}
            onChange={(v) => patch('targetRateKgPerWeek', v)}
            last
          />
          <Text style={styles.footerNote}>
            {weeksToGoal !== null
              ? `About ${weeksToGoal} week${weeksToGoal === 1 ? '' : 's'} at this pace. A steady range is −1.0 to −0.25 kg.`
              : 'Negative loses weight. A steady range is −1.0 to −0.25 kg a week.'}
          </Text>
        </Panel>

        <Text style={styles.groupTitle}>Activity</Text>
        <Panel padded={false}>
          {ACTIVITY_LEVELS.map((level, index) => {
            const active = draft.activityLevel === level.key;
            return (
              <Pressable
                key={level.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => patch('activityLevel', level.key)}
                style={[styles.choice, index > 0 && styles.divider]}
              >
                <View style={styles.choiceCopy}>
                  <Text style={[styles.choiceLabel, active && styles.choiceLabelOn]}>{level.label}</Text>
                  <Text style={styles.choiceDetail}>{level.detail}</Text>
                </View>
                <View style={[styles.mark, active && styles.markOn]} />
              </Pressable>
            );
          })}
        </Panel>

        <View style={styles.save}>
          <GlassButton label="Save goals" variant="primary" onPress={handleSave} />
          {saved ? <Text style={styles.saved}>Saved. This week’s target is on Plan.</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function NumberRow({
  label,
  unit,
  value,
  onChange,
  last = false,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        keyboardAppearance="dark"
        defaultValue={String(value)}
        accessibilityLabel={`${label} in ${unit}`}
        onEndEditing={(e) => {
          const parsed = parseFloat(e.nativeEvent.text);
          if (!Number.isNaN(parsed)) onChange(parsed);
        }}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  groupTitle: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  input: {
    ...typography.bodyEmphasized,
    color: colors.textPrimary,
    minWidth: 64,
    textAlign: 'right',
  },
  unit: {
    ...typography.caption,
    color: colors.textTertiary,
    width: 28,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  choiceCopy: {
    flex: 1,
    gap: 2,
  },
  choiceLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  choiceLabelOn: {
    color: colors.accent,
  },
  choiceDetail: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  mark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  markOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  save: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  saved: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'center',
  },
});
