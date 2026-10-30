import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
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

const ACTIVITY_LEVELS: { key: ActivityLevel; label: string }[] = [
  { key: 'sedentary', label: 'Sedentary' },
  { key: 'light', label: 'Lightly active' },
  { key: 'moderate', label: 'Moderately active' },
  { key: 'active', label: 'Active' },
  { key: 'very-active', label: 'Very active' },
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
        <ScreenHeader title="Settings" />

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
                {active && Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
                  <GlassView
                    pointerEvents="none"
                    style={styles.choiceGlass}
                    glassEffectStyle="regular"
                    tintColor={colors.accentSoft}
                    isInteractive
                    colorScheme="light"
                  />
                ) : null}
                <Text style={[styles.choiceLabel, active && styles.choiceLabelOn]}>{level.label}</Text>
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
        keyboardAppearance="light"
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
    ...typography.caption,
    color: colors.textTertiary,
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
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  choiceGlass: {
    ...StyleSheet.absoluteFill,
  },
  choiceLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  choiceLabelOn: {
    color: colors.accent,
    fontWeight: '600',
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
