import React from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { AppMark } from '../components/ui/AppMark';
import { Card } from '../components/ui/Card';
import { GroupLabel, ListRow } from '../components/ui/ListRow';
import { Segmented } from '../components/ui/Segmented';
import { IntegerInput } from '../components/ui/UnitFields';
import { colors, spacing, typography } from '../theme';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useFoodLibraryStore } from '../store/useFoodLibraryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { BackupError, exportBackup, pickBackup, restoreBackup } from '../services/backup';
import { eraseAllData, exportFoodCsv, exportWaterCsv, exportWeightCsv } from '../services/dataExport';
import { providerLabel } from '../services/aiKey';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { clearAllData, seedSampleData } from '../dev/sampleData';
import { mlFromWater, waterUnitLabel, waterValue } from '../utils/units';

/**
 * App settings: units, the calendar, water, reminders, foods and AI, and
 * data. Goals and body stats belong to the plan and are edited from Plan.
 */
export function SettingsScreen() {
  const units = useSettingsStore((s) => s.units);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const setWeekStart = useSettingsStore((s) => s.setWeekStart);
  const water = useSettingsStore((s) => s.water);
  const setWater = useSettingsStore((s) => s.setWater);
  const reminders = useSettingsStore((s) => s.reminders);
  const myFoodCount = useFoodLibraryStore((s) => s.foods.length);
  const provider = useAiKeyStore((s) => s.provider);
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const scrollRef = useDevAutoScroll('settings');

  const remindersOn = Object.values(reminders).filter((reminder) => reminder.enabled).length;

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

  function chooseCsv() {
    const run = (task: () => Promise<void>) => () =>
      void task().catch(() => Alert.alert('Couldn’t export', 'Try again in a moment.'));
    const options = [
      { label: 'Food Log', run: run(exportFoodCsv) },
      { label: 'Weigh-Ins', run: run(exportWeightCsv) },
      { label: 'Water', run: run(exportWaterCsv) },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Export as CSV', options: [...options.map((o) => o.label), 'Cancel'], cancelButtonIndex: options.length },
        (index) => options[index]?.run(),
      );
    } else {
      Alert.alert('Export as CSV', undefined, [
        ...options.map((o) => ({ text: o.label, onPress: o.run })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  function confirmErase() {
    Alert.alert(
      'Delete all data?',
      'Meals, photos, weigh-ins, water, My Foods, and your plan are deleted from this iPhone. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            eraseAllData();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            useToastStore.getState().show('All data deleted');
          },
        },
      ],
    );
  }

  const waterUnit = waterUnitLabel(units.water);

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
      <GroupLabel>Units</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          icon="scalemass.fill"
          tint={colors.tile.gray}
          title="Weight"
          trailing={
            <Picker
              label="Weight unit"
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
                { value: 'st', label: 'st' },
              ]}
              value={units.weight}
              onChange={(value) => setUnit('weight', value)}
              wide
            />
          }
        />
        <ListRow
          icon="ruler.fill"
          tint={colors.tile.teal}
          title="Height"
          trailing={
            <Picker
              label="Height unit"
              options={[
                { value: 'cm', label: 'cm' },
                { value: 'ftin', label: 'ft, in' },
              ]}
              value={units.height}
              onChange={(value) => setUnit('height', value)}
            />
          }
        />
        <ListRow
          icon="flame.fill"
          tint={colors.tile.orange}
          title="Energy"
          trailing={
            <Picker
              label="Energy unit"
              options={[
                { value: 'kcal', label: 'kcal' },
                { value: 'kJ', label: 'kJ' },
              ]}
              value={units.energy}
              onChange={(value) => setUnit('energy', value)}
            />
          }
        />
        <ListRow
          icon="fork.knife"
          tint={colors.tile.green}
          title="Food"
          trailing={
            <Picker
              label="Food weight unit"
              options={[
                { value: 'g', label: 'g' },
                { value: 'oz', label: 'oz' },
              ]}
              value={units.food}
              onChange={(value) => setUnit('food', value)}
            />
          }
        />
        <ListRow
          icon="drop.fill"
          tint={colors.tile.indigo}
          title="Water"
          trailing={
            <Picker
              label="Water unit"
              options={[
                { value: 'ml', label: 'ml' },
                { value: 'floz', label: 'fl oz' },
              ]}
              value={units.water}
              onChange={(value) => setUnit('water', value)}
            />
          }
        />
      </Card>

      <GroupLabel>General</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          icon="calendar"
          tint={colors.tile.pink}
          title="Week starts on"
          trailing={
            <Picker
              label="First day of the week"
              options={[
                { value: 0, label: 'Sun' },
                { value: 1, label: 'Mon' },
              ]}
              value={weekStartsOn}
              onChange={setWeekStart}
            />
          }
        />
        <ListRow
          icon="bell.fill"
          tint={colors.tile.orange}
          title="Reminders"
          value={remindersOn ? `${remindersOn} on` : 'Off'}
          accessory="chevron"
          onPress={() => router.push('/settings/reminders')}
        />
      </Card>

      <GroupLabel>Water</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          icon="drop.fill"
          tint={colors.tile.indigo}
          title="Track water"
          trailing={
            <Switch
              value={water.enabled}
              onValueChange={(enabled) => setWater({ enabled })}
              trackColor={{ true: colors.accent }}
              accessibilityLabel="Track water"
            />
          }
        />
        {water.enabled ? (
          <>
            <ListRow
              icon="target"
              tint={colors.tile.teal}
              title="Daily goal"
              trailing={
                <IntegerInput
                  value={waterValue(water.goalMl, units.water)}
                  unit={waterUnit}
                  label="Daily water goal"
                  min={1}
                  max={units.water === 'floz' ? 400 : 10000}
                  onChange={(value) => setWater({ goalMl: Math.round(mlFromWater(value, units.water)) })}
                />
              }
            />
            <ListRow
              icon="cup.and.saucer.fill"
              tint={colors.tile.gray}
              title="Glass size"
              trailing={
                <IntegerInput
                  value={waterValue(water.glassMl, units.water)}
                  unit={waterUnit}
                  label="Glass size"
                  min={1}
                  max={units.water === 'floz' ? 64 : 2000}
                  onChange={(value) => setWater({ glassMl: Math.round(mlFromWater(value, units.water)) })}
                />
              }
            />
          </>
        ) : null}
      </Card>

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
        {Platform.OS !== 'web' ? (
          <ListRow
            icon="sparkles"
            tint={colors.tile.indigo}
            title="AI"
            value={hasKey ? providerLabel(provider) : 'No key'}
            accessory="chevron"
            onPress={() => router.push('/settings/ai')}
          />
        ) : null}
      </Card>

      <GroupLabel>Data</GroupLabel>
      <Card padded={false}>
        <ListRow first icon="square.and.arrow.up" tint={colors.tile.teal} title="Export Backup" onPress={() => void runExport()} />
        <ListRow icon="square.and.arrow.down" tint={colors.tile.indigo} title="Import Backup" onPress={() => void runImport()} />
        <ListRow icon="tablecells" tint={colors.tile.green} title="Export as CSV" onPress={chooseCsv} />
        <ListRow icon="trash.fill" tint={colors.danger} title="Delete All Data" destructive onPress={confirmErase} />
      </Card>
      <Text style={styles.footnote}>Stored only on this iPhone. Deleting the app deletes it, so export a backup first.</Text>

      {__DEV__ ? (
        <>
          <GroupLabel>Developer</GroupLabel>
          <Card padded={false}>
            <ListRow first icon="wand.and.stars" tint={colors.tile.indigo} title="Load sample data" onPress={seedSampleData} />
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

      <View style={styles.about} accessible accessibilityLabel={`Macrolens version ${Constants.expoConfig?.version ?? ''}`}>
        <AppMark size={44} tile />
        <Text style={styles.footer}>Macrolens {Constants.expoConfig?.version}</Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

/** A compact segmented control for a row's trailing edge. */
function Picker<T extends string | number>({
  label,
  options,
  value,
  onChange,
  wide = false,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  wide?: boolean;
}) {
  return (
    <View style={wide ? styles.pickerWide : styles.picker}>
      <Segmented accessibilityLabel={label} options={options} value={value} onChange={onChange} />
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.tabBottom,
  },
  picker: {
    width: 128,
  },
  pickerWide: {
    width: 160,
  },
  footnote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    lineHeight: 18,
  },
  about: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  footer: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
