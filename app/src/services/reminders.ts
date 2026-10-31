import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useReviewStore } from '../store/useReviewStore';
import { useSettingsStore, type ReminderKey } from '../store/useSettingsStore';
import { addDays, entryDateKey, localDateKey } from '../utils/date';
import type { MealType } from '../utils/meals';

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

  const { reminders } = useSettingsStore.getState();
  const enabled = (Object.keys(reminders) as ReminderKey[]).filter((key) => reminders[key].enabled);
  if (enabled.length === 0) return;
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;

  const logged = new Set(
    useFoodLogStore.getState().entries.map((entry) => `${entryDateKey(entry.loggedAt)}:${entry.mealType}`),
  );
  const weighed = new Set(usePlanStore.getState().weightHistory.map((entry) => entryDateKey(entry.loggedAt)));
  const now = new Date();

  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const day = addDays(now, offset);
    const key = localDateKey(day);
    for (const reminder of enabled) {
      const { hour, minute, days } = reminders[reminder];
      if (days && !days.includes(day.getDay())) continue;
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
      if (at.getTime() <= now.getTime() + 30_000) continue;
      const copy = COPY[reminder];
      if (copy.meal && logged.has(`${key}:${copy.meal}`)) continue;
      if (reminder === 'weighIn' && weighed.has(key)) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}-${reminder}-${key}`,
        content: { title: copy.title, body: copy.body, data: { url: copy.url, meal: copy.meal, dateKey: key } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  }
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Every day", "Weekdays", "Weekends", or "Mon, Wed, Fri" in calendar order. */
export function daysLabel(days: number[] | undefined, weekStartsOn: 0 | 1 = 0) {
  const set = new Set(days ?? [0, 1, 2, 3, 4, 5, 6]);
  if (set.size === 7) return 'Every day';
  if (set.size === 5 && ![0, 6].some((d) => set.has(d))) return 'Weekdays';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Weekends';
  const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (i + weekStartsOn) % 7);
  return order.filter((d) => set.has(d)).map((d) => DAY_NAMES[d]).join(', ');
}

export function timeLabelFor(hour: number, minute: number) {
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
