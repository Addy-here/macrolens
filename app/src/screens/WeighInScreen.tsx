import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Card } from '../components/ui/Card';
import { ListRow } from '../components/ui/ListRow';
import { WeightInput } from '../components/ui/UnitFields';
import { colors, spacing, typography } from '../theme';
import { usePlanStore } from '../store/usePlanStore';
import { useUnits } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { useDevAction } from '../dev/devScroll';
import { createId } from '../utils/id';
import type { WeightEntry } from '../types';

/**
 * One weigh-in: a new one on any past day, or an existing one to correct or
 * delete. `?id=` edits.
 */
export function WeighInScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = usePlanStore((s) => s.weightHistory.find((entry) => entry.id === id));
  const latest = usePlanStore((s) => s.weightHistory[s.weightHistory.length - 1]);
  const u = useUnits();

  const [kg, setKg] = useState<number | null>(existing?.weightKg ?? null);
  const [date, setDate] = useState(() => (existing ? new Date(existing.loggedAt) : new Date()));
  const valid = kg != null && kg > 20 && kg < 400;

  function save() {
    if (!valid || kg == null) return;
    const store = usePlanStore.getState();
    const weightKg = Math.round(kg * 100) / 100;
    if (existing) store.updateWeightEntry(existing.id, { weightKg, loggedAt: date.toISOString() });
    else store.addWeightEntry({ id: createId(), loggedAt: date.toISOString(), weightKg });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function remove() {
    if (!existing) return;
    deleteWeighInWithUndo(existing, u.weightText(existing.weightKg));
    router.back();
  }

  useDevAction('weighIn.save', save);

  const saveRef = useRef(save);
  saveRef.current = save;
  const headerOptions = useMemo(
    () => ({
      headerShown: true,
      title: existing ? 'Edit Weigh-In' : 'Weigh-In',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.textPrimary },
      headerLeft: () => (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerCancel}>Cancel</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable accessibilityRole="button" hitSlop={8} disabled={!valid} onPress={() => saveRef.current()} style={styles.headerButton}>
          <Text style={[styles.headerSave, !valid && styles.disabled]}>Save</Text>
        </Pressable>
      ),
    }),
    [existing, valid],
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={headerOptions} />
      <KeyboardAwareScrollView
        bottomOffset={64}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.weightCard}>
          <WeightInput
            kg={kg}
            unit={u.weight}
            variant="hero"
            label="Weight"
            placeholderKg={latest?.weightKg}
            onChangeKg={setKg}
            onSubmit={save}
            autoFocus={!existing}
          />
        </Card>
        <Card padded={false} style={styles.dateCard}>
          <ListRow
            first
            icon="calendar"
            tint={colors.tile.orange}
            title="Date"
            trailing={
              <DateTimePicker
                value={date}
                mode="datetime"
                display="compact"
                maximumDate={new Date()}
                accentColor={colors.accent}
                themeVariant="light"
                onChange={(_, next) => next && setDate(next)}
              />
            }
          />
        </Card>
        {existing ? (
          <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
            <Text style={styles.deleteText}>Delete Weigh-In</Text>
          </Pressable>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

export function deleteWeighInWithUndo(entry: WeightEntry, label: string) {
  usePlanStore.getState().removeWeightEntry(entry.id);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  useToastStore.getState().show(`Deleted ${label}`, { label: 'Undo', run: () => usePlanStore.getState().addWeightEntry(entry) });
}

export function confirmDeleteWeighIn(entry: WeightEntry, label: string) {
  Alert.alert(`Delete ${label}?`, undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteWeighInWithUndo(entry, label) },
  ]);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  headerButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  headerCancel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  headerSave: {
    ...typography.headline,
    color: colors.accent,
  },
  disabled: {
    opacity: 0.35,
  },
  weightCard: {
    padding: spacing.md - 4,
  },
  dateCard: {
    marginTop: spacing.md,
  },
  delete: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  deleteText: {
    ...typography.body,
    color: colors.danger,
  },
});
