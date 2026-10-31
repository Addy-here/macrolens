import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useReviewStore } from '../store/useReviewStore';
import { useSettingsStore, type Reminder, type ReminderKey } from '../store/useSettingsStore';
import { addDays, entryDateKey, localDateKey } from '../utils/date';
import type { MealType } from '../utils/meals';
import type { FoodLogEntry, WeightEntry } from '../types';

/**
 * Meal and weigh-in reminders, as local notifications. Instead of one
 * repeating notification each, the next seven days are scheduled one by one,
 * so a reminder can be left out when that meal is already logged or the
 * weigh-in is done. They're rescheduled whenever the log or the settings
 * change. Nothing leaves the phone.
 */

const DAYS_AHEAD = 7;
const PREFIX = 'macrolens-reminder';

const COPY: Record<ReminderKey, { title: string; body: string; url: string; meal?: MealType }> = {
  breakfast: { title: 'Breakfast', body: 'What did you have? Say it or snap it.', url: '/log', meal: 'breakfast' },
  lunch: { title: 'Lunch', body: 'Log lunch while you remember it.', url: '/log', meal: 'lunch' },
  dinner: { title: 'Dinner', body: 'Log dinner to close out the day.', url: '/log', meal: 'dinner' },
  weighIn: { title: 'Weigh in', body: 'Step on the scale before breakfast. The trend does the rest.', url: '/plan' },
};

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function reminderPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** Asks once; later calls return what the person chose. */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true } });
  return next.status === 'granted';
}

let running: Promise<void> | null = null;
let again = false;

/** Cancels Macrolens's reminders and schedules the coming week from the current settings and log. */
export async function syncReminders() {
  if (Platform.OS === 'web') return;
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await scheduleWeek();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function scheduleWeek() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((request) => request.identifier.startsWith(PREFIX))
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)),
  );

  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  const planned = planReminders(
    useSettingsStore.getState().reminders,
    useFoodLogStore.getState().entries,
    usePlanStore.getState().weightHistory,
  );
  for (const slot of planned) {
    if (slot.status !== 'scheduled') continue;
    const copy = COPY[slot.key];
    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}-${slot.key}-${slot.dateKey}`,
      content: { title: copy.title, body: copy.body, data: { url: copy.url, meal: copy.meal, dateKey: slot.dateKey } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.at },
    });
  }
}

export type SlotStatus = 'scheduled' | 'past' | 'off' | 'done';

export interface ReminderSlot {
  key: ReminderKey;
  dateKey: string;
  at: Date;
  /** `done`: that meal is logged or the weigh-in is in; `off`: a day turned off; `past`: the time has gone. */
  status: SlotStatus;
}

/** Every enabled reminder over the coming week, and whether each will fire. Shared by the scheduler and the screen. */
export function planReminders(
  reminders: Record<ReminderKey, Reminder>,
  entries: FoodLogEntry[],
  weights: WeightEntry[],
  now = new Date(),
): ReminderSlot[] {
  const logged = new Set(entries.map((entry) => `${entryDateKey(entry.loggedAt)}:${entry.mealType}`));
  const weighed = new Set(weights.map((entry) => entryDateKey(entry.loggedAt)));
  const slots: ReminderSlot[] = [];
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const day = addDays(now, offset);
    const dateKey = localDateKey(day);
    for (const key of Object.keys(reminders) as ReminderKey[]) {
      const { enabled, hour, minute, days } = reminders[key];
      if (!enabled) continue;
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
      const meal = COPY[key].meal;
      const status: SlotStatus =
        days && !days.includes(day.getDay())
          ? 'off'
          : (meal && logged.has(`${dateKey}:${meal}`)) || (key === 'weighIn' && weighed.has(dateKey))
            ? 'done'
            : at.getTime() <= now.getTime() + 30_000
              ? 'past'
              : 'scheduled';
      slots.push({ key, dateKey, at, status });
    }
  }
  return slots;
}

/** "Next today", or "Logged today · Next tomorrow" when today's was skipped for that reason. The time is beside it in the row. */
export function nextReminderLabel(key: ReminderKey, slots: ReminderSlot[], now = new Date()) {
  const mine = slots.filter((slot) => slot.key === key);
  const todayKey = localDateKey(now);
  const doneToday = mine.some((slot) => slot.dateKey === todayKey && slot.status === 'done');
  const next = mine.find((slot) => slot.status === 'scheduled');
  const day = !next
    ? null
    : next.dateKey === todayKey
      ? 'today'
      : next.dateKey === localDateKey(addDays(now, 1))
        ? 'tomorrow'
        : next.at.toLocaleDateString(undefined, { weekday: 'long' });
  const parts = [doneToday ? (key === 'weighIn' ? 'Weighed in today' : 'Logged today') : null, day ? `Next ${day}` : null];
  return parts.filter(Boolean).join(' · ');
}

/** A notification in a few seconds, to check that reminders reach this iPhone. */
export async function sendTestReminder() {
  await Notifications.scheduleNotificationAsync({
    // Outside the reminder prefix, so a resync doesn't cancel it.
    identifier: 'macrolens-test',
    content: { title: 'Macrolens', body: 'Reminders are working.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}

/** Mounted once at the root: keeps reminders in step with the log and opens the right place when one is tapped. */
export function useReminders() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void syncReminders(), 1000);
    };
    schedule();
    const unsubscribe = [
      useSettingsStore.subscribe((state, prev) => state.reminders !== prev.reminders && schedule()),
      useFoodLogStore.subscribe((state, prev) => state.entries !== prev.entries && schedule()),
      usePlanStore.subscribe((state, prev) => state.weightHistory !== prev.weightHistory && schedule()),
    ];

    const open = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as { url?: string; meal?: MealType; dateKey?: string } | undefined;
      if (!data?.url) return;
      if (data.meal) useReviewStore.getState().setTarget({ mealType: data.meal, dateKey: data.dateKey ?? localDateKey(new Date()) });
      if (router.canDismiss()) router.dismissAll();
      router.navigate(data.url as Href);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    // A tap that launched the app.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      open(response);
      void Notifications.clearLastNotificationResponseAsync();
    });

    return () => {
      clearTimeout(timer);
      unsubscribe.forEach((fn) => fn());
      subscription.remove();
    };
  }, []);
}

export function timeLabelFor(hour: number, minute: number) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
