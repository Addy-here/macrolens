import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { GroupLabel, ListRow } from '../components/ui/ListRow';
import { colors, radius, spacing, typography } from '../theme';
import { useSettingsStore, type ReminderKey } from '../store/useSettingsStore';
import { useDevAction } from '../dev/devScroll';
import { daysLabel, reminderPermission, requestReminderPermission, type PermissionState } from '../services/reminders';

const HEADER = { title: 'Reminders', headerLargeTitleEnabled: false };

const MEAL_ROWS: { key: ReminderKey; title: string; icon: SFSymbol; tint: string }[] = [
  { key: 'breakfast', title: 'Breakfast', icon: 'sunrise.fill', tint: colors.tile.orange },
  { key: 'lunch', title: 'Lunch', icon: 'sun.max.fill', tint: colors.tile.teal },
  { key: 'dinner', title: 'Dinner', icon: 'moon.stars.fill', tint: colors.tile.indigo },
];

/** Meal and weigh-in reminders. A reminder is skipped on days that meal or weigh-in is already logged. */
export function RemindersScreen() {
  const reminders = useSettingsStore((s) => s.reminders);
  const setReminder = useSettingsStore((s) => s.setReminder);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const { fontScale } = useWindowDimensions();
  const [permission, setPermission] = useState<PermissionState>('undetermined');

  const refresh = useCallback(() => void reminderPermission().then(setPermission), []);
  useEffect(() => {
    refresh();
    // Coming back from the Settings app may have changed it.
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => subscription.remove();
  }, [refresh]);

  async function toggle(key: ReminderKey, on: boolean) {
    if (!on) {
      setReminder(key, { enabled: false });
      return;
    }
    const granted = await requestReminderPermission();
    refresh();
    if (!granted) {
      Alert.alert('Notifications are off', 'Turn on notifications for Macrolens in Settings to get reminders.', [
        { text: 'Not Now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    setReminder(key, { enabled: true });
  }

  // Shows the on state without the permission prompt, which can't be answered in the simulator.
  useDevAction('reminders.demo', () => {
    setReminder('breakfast', { enabled: true });
    setReminder('weighIn', { enabled: true, days: [1, 3, 5] });
  });

  const anyOn = Object.values(reminders).some((reminder) => reminder.enabled);
  const blocked = permission === 'denied' && anyOn;

  // At large text sizes the time moves to its own row so the name isn't cut off.
  const stacked = fontScale >= 1.3;
  const row = (key: ReminderKey, title: string, icon: SFSymbol, tint: string, first: boolean) => {
    const reminder = reminders[key];
    const picker = (
      <DateTimePicker
        value={new Date(2000, 0, 1, reminder.hour, reminder.minute)}
        mode="time"
        display="compact"
        accentColor={colors.accent}
        themeVariant="light"
        accessibilityLabel={`${title} reminder time`}
        onChange={(_, date) => date && setReminder(key, { hour: date.getHours(), minute: date.getMinutes() })}
      />
    );
    return (
      <React.Fragment key={key}>
        <ListRow
          first={first}
          icon={icon}
          tint={tint}
          title={title}
          trailing={
            <View style={styles.trailing}>
              {reminder.enabled && !stacked ? picker : null}
              <Switch
                value={reminder.enabled}
                onValueChange={(on) => void toggle(key, on)}
                trackColor={{ true: colors.accent }}
                accessibilityLabel={`${title} reminder`}
              />
            </View>
          }
        />
        {reminder.enabled && stacked ? <ListRow title="Time" trailing={picker} /> : null}
      </React.Fragment>
    );
  };

  return (
    <>
      <Stack.Screen options={HEADER} />
      <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {blocked ? (
          <Card style={styles.blocked}>
            <View style={styles.blockedHead}>
              <Icon name="bell.slash.fill" size={16} color={colors.danger} />
              <Text style={styles.blockedTitle}>Notifications are off for Macrolens</Text>
            </View>
            <GlassButton label="Open Settings" onPress={() => void Linking.openSettings()} />
          </Card>
        ) : null}

        <GroupLabel>Meals</GroupLabel>
        <Card padded={false}>{MEAL_ROWS.map((meal, index) => row(meal.key, meal.title, meal.icon, meal.tint, index === 0))}</Card>
        <Text style={styles.footnote}>Skipped on days you’ve already logged that meal.</Text>

        <GroupLabel>Weight</GroupLabel>
        <Card padded={false}>
          {row('weighIn', 'Weigh-in', 'scalemass.fill', colors.tile.gray, true)}
          {reminders.weighIn.enabled ? (
            <WeekdayPicker
              days={reminders.weighIn.days}
              weekStartsOn={weekStartsOn}
              onChange={(days) => setReminder('weighIn', { days })}
            />
          ) : null}
        </Card>
        <Text style={styles.footnote}>
          {reminders.weighIn.enabled ? `${daysLabel(reminders.weighIn.days, weekStartsOn)}. ` : ''}Skipped on days you’ve already
          weighed in.
        </Text>
      </ScrollView>
    </>
  );
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Seven day toggles in calendar order. At least one day stays on. */
function WeekdayPicker({
  days,
  weekStartsOn,
  onChange,
}: {
  days: number[] | undefined;
  weekStartsOn: 0 | 1;
  onChange: (days: number[]) => void;
}) {
  const on = new Set(days ?? EVERY_DAY);
  const order = EVERY_DAY.map((i) => (i + weekStartsOn) % 7);
  return (
    <View style={styles.weekdays} accessibilityRole="toolbar" accessibilityLabel="Days">
      {order.map((day) => {
        const selected = on.has(day);
        const last = selected && on.size === 1;
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityLabel={NAMES[day]}
            accessibilityState={{ selected, disabled: last }}
            disabled={last}
            hitSlop={4}
            onPress={() => {
              void Haptics.selectionAsync();
              const next = new Set(on);
              if (selected) next.delete(day);
              else next.add(day);
              onChange(EVERY_DAY.filter((d) => next.has(d)));
            }}
            style={[styles.weekday, selected && styles.weekdayOn]}
          >
            <Text style={[styles.weekdayText, selected && styles.weekdayTextOn]}>{LETTERS[day]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md - 2,
  },
  weekday: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  weekdayOn: {
    backgroundColor: colors.accent,
  },
  weekdayText: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  weekdayTextOn: {
    color: colors.onAccent,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.tabBottom,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footnote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    lineHeight: 18,
  },
  blocked: {
    gap: spacing.md - 4,
    marginTop: spacing.md,
  },
  blockedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  blockedTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
    flex: 1,
  },
});
