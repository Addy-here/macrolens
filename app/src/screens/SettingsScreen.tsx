import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import type { SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { AiKeySection } from '../components/AiKeySection';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { GroupLabel, ListRow } from '../components/ui/ListRow';
import { Segmented } from '../components/ui/Segmented';
import { colors, spacing, typography } from '../theme';
import { useUserStore } from '../store/useUserStore';
import { useFoodLibraryStore } from '../store/useFoodLibraryStore';
import { useToastStore } from '../store/useToastStore';
import { BackupError, exportBackup, pickBackup, restoreBackup } from '../services/backup';
import { router } from 'expo-router';
import { usePlanStore } from '../store/usePlanStore';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { clearAllData, seedSampleData } from '../dev/sampleData';
import { calculateInitialPlan } from '../utils/planCalculator';
import type { ActivityLevel, UserProfile } from '../types';

const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; detail: string }[] = [
  { key: 'sedentary', label: 'Sedentary', detail: 'Desk job, little exercise' },
  { key: 'light', label: 'Lightly active', detail: 'Walks, exercise 1–3 days a week' },
  { key: 'moderate', label: 'Moderately active', detail: 'Exercise 3–5 days a week' },
  { key: 'active', label: 'Active', detail: 'Hard exercise most days' },
  { key: 'very-active', label: 'Very active', detail: 'Physical job or two-a-days' },
];

const PACES = [0, -0.25, -0.5, -0.75, -1];

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
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const setPlan = usePlanStore((s) => s.setPlan);
  const currentPlan = usePlanStore((s) => s.currentPlan);
  const scrollRef = useDevAutoScroll('settings');
  const myFoodCount = useFoodLibraryStore((s) => s.foods.length);

  const [draft, setDraft] = useState<UserProfile>(profile ?? BLANK_PROFILE);
  const [saved, setSaved] = useState(Boolean(profile));

  // A profile that arrives after mount (store hydration, sample data) replaces the draft.
  useEffect(() => {
    if (profile) {
      setDraft(profile);
      setSaved(true);
    }
  }, [profile]);

  const preview = useMemo(() => calculateInitialPlan(draft), [draft]);

  function patch<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  useDevAction('settings.export', () => void runExport());

  async function runExport() {
    try {
      await exportBackup();
    } catch {
      Alert.alert('Couldn’t export', 'Try again in a moment.');
    }
  }

  async function runImport() {
    try {
      const summary = await pickBackup();
      if (!summary) return;
      const when = summary.exportedAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
      Alert.alert(
        'Replace your data?',
        `Backup from ${when}: ${summary.meals} meals, ${summary.weighIns} weigh-ins, ${summary.foods} foods. Everything on this iPhone is replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              void restoreBackup(summary.backup).then(() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                useToastStore.getState().show('Backup restored', undefined, 'done');
              });
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Couldn’t import', error instanceof BackupError ? error.message : 'Try another file.');
    }
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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const paceOptions = PACES.includes(draft.targetRateKgPerWeek)
    ? PACES
    : [...PACES, draft.targetRateKgPerWeek].sort((a, b) => b - a);
  const dailyGap = Math.round((-draft.targetRateKgPerWeek * 7700) / 7);

  return (
    <KeyboardAwareScrollView
      // Clears the system bar iOS adds above the keyboard (Done, Passwords), which isn't counted in its height.
      bottomOffset={64}
      ref={scrollRef as never}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.preview}>
        <View style={styles.previewText}>
          <Text style={styles.previewLabel}>{saved ? 'Your daily target' : 'New daily target'}</Text>
          <Text style={styles.previewNumber}>
            {preview.targetCalories.toLocaleString()}
            <Text style={styles.previewUnit}> kcal</Text>
          </Text>
          <Text style={styles.previewDetail}>
            {preview.targetMacros.proteinG} g protein · {preview.targetMacros.carbsG} g carbs ·{' '}
            {preview.targetMacros.fatG} g fat
          </Text>
        </View>
        <View style={[styles.previewStatus, saved && styles.previewStatusSaved]}>
          <Icon
            name={saved ? 'checkmark' : 'pencil'}
            size={12}
            color={saved ? colors.success : colors.accent}
            weight="bold"
          />
        </View>
      </Card>

      <GroupLabel>Body</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          icon="person.fill"
          tint={colors.tile.indigo}
          title="Sex"
          trailing={
            <View style={styles.sexPicker}>
              <Segmented
                accessibilityLabel="Sex"
                options={[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                  { value: 'other', label: 'Other' },
                ]}
                value={draft.sex}
                onChange={(sex) => patch('sex', sex)}
              />
            </View>
          }
        />
        <NumberRow
          icon="birthday.cake.fill"
          tint={colors.tile.pink}
          label="Birth year"
          value={draft.birthYear}
          integer
          onChange={(v) => patch('birthYear', v)}
        />
        <NumberRow
          icon="ruler.fill"
          tint={colors.tile.teal}
          label="Height"
          unit="cm"
          value={draft.heightCm}
          onChange={(v) => patch('heightCm', v)}
        />
        <NumberRow
          icon="scalemass.fill"
          tint={colors.tile.gray}
          label="Current weight"
          unit="kg"
          value={draft.startingWeightKg}
          onChange={(v) => patch('startingWeightKg', v)}
        />
        <NumberRow
          icon="flag.checkered"
          tint={colors.tile.green}
          label="Goal weight"
          unit="kg"
          value={draft.goalWeightKg}
          onChange={(v) => patch('goalWeightKg', v)}
        />
      </Card>

      <GroupLabel>Pace, kg per week</GroupLabel>
      <Card style={styles.pace}>
        <Segmented
          accessibilityLabel="Weekly pace"
          options={paceOptions.map((value) => ({
            value,
            label: value === 0 ? 'Maintain' : String(Math.abs(value)),
          }))}
          value={draft.targetRateKgPerWeek}
          onChange={(value) => patch('targetRateKgPerWeek', value)}
        />
        <Text style={styles.paceHint}>
          {dailyGap === 0
            ? 'Eat at maintenance. The target follows your trend to hold it steady.'
            : `About ${dailyGap.toLocaleString()} kcal a day under maintenance.${
                draft.targetRateKgPerWeek <= -0.75 ? ' A faster pace is harder to keep up.' : ''
              }`}
        </Text>
      </Card>

      <GroupLabel>Activity</GroupLabel>
      <Card padded={false}>
        {ACTIVITY_LEVELS.map((level, index) => (
          <ListRow
            key={level.key}
            first={index === 0}
            title={level.label}
            subtitle={level.detail}
            accessory="check"
            selected={draft.activityLevel === level.key}
            onPress={() => patch('activityLevel', level.key)}
          />
        ))}
      </Card>

      <View style={styles.save}>
        <GlassButton
          label={saved ? 'Goals Saved' : 'Save Goals'}
          icon={saved ? 'checkmark' : undefined}
          variant="primary"
          onPress={handleSave}
          disabled={saved}
        />
      </View>

      <GroupLabel>Food</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          icon="fork.knife"
          tint={colors.tile.orange}
          title="My Foods"
          value={myFoodCount ? String(myFoodCount) : undefined}
          accessory="chevron"
          onPress={() => router.push('/settings/foods')}
        />
      </Card>

      <AiKeySection />

      <GroupLabel>Data</GroupLabel>
      <Card padded={false}>
        <ListRow first icon="square.and.arrow.up" tint={colors.tile.teal} title="Export Backup" onPress={() => void runExport()} />
        <ListRow icon="square.and.arrow.down" tint={colors.tile.indigo} title="Import Backup" onPress={() => void runImport()} />
      </Card>
      <Text style={styles.footnote}>Stored only on this iPhone. Deleting the app deletes it, so export a backup first.</Text>

      {__DEV__ ? (
        <>
          <GroupLabel>Developer</GroupLabel>
          <Card padded={false}>
            <ListRow
              first
              icon="wand.and.stars"
              tint={colors.tile.indigo}
              title="Load sample data"
              onPress={seedSampleData}
            />
            <ListRow
              icon="trash.fill"
              tint={colors.tile.pink}
              title="Clear all data"
              onPress={() =>
                Alert.alert('Clear all data?', 'Meals, weigh-ins, goals, and the plan are removed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: clearAllData },
                ])
              }
            />
          </Card>
        </>
      ) : null}

    </KeyboardAwareScrollView>
  );
}

function NumberRow({
  icon,
  tint,
  label,
  unit,
  value,
  integer = false,
  onChange,
}: {
  icon: SFSymbol;
  tint: string;
  label: string;
  unit?: string;
  value: number;
  integer?: boolean;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <ListRow
      icon={icon}
      tint={tint}
      title={label}
      trailing={
        <View style={styles.numberField}>
          <TextInput
            style={styles.numberInput}
            keyboardType={integer ? 'number-pad' : 'decimal-pad'}
            keyboardAppearance="light"
            value={text}
            onChangeText={setText}
            selectTextOnFocus
            accessibilityLabel={unit ? `${label} in ${unit}` : label}
            onEndEditing={() => {
              const parsed = integer ? parseInt(text, 10) : parseFloat(text.replace(',', '.'));
              if (Number.isFinite(parsed) && parsed > 0) onChange(parsed);
              else setText(String(value));
            }}
          />
          <Text style={styles.numberUnit} numberOfLines={1}>{unit ?? ''}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg - 4,
  },
  previewText: {
    flex: 1,
    gap: 2,
  },
  previewLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  previewNumber: {
    ...typography.statLarge,
    fontSize: 36,
    color: colors.textPrimary,
  },
  previewUnit: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  previewDetail: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  previewStatus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  previewStatusSaved: {
    backgroundColor: 'rgba(31, 157, 99, 0.12)',
  },
  sexPicker: {
    width: 210,
  },
  numberField: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  numberInput: {
    ...typography.statSmall,
    fontSize: 17,
    color: colors.textPrimary,
    minWidth: 56,
    textAlign: 'right',
    padding: 0,
  },
  numberUnit: {
    ...typography.callout,
    color: colors.textTertiary,
    minWidth: 24,
  },
  pace: {
    gap: spacing.sm + 4,
  },
  paceHint: {
    ...typography.footnote,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  save: {
    marginTop: spacing.lg,
  },
  footnote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    lineHeight: 18,
  },
  footer: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
