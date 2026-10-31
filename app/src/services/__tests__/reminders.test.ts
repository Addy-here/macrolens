/// <reference types="jest" />
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), canDismiss: () => false, dismissAll: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => [{ identifier: 'macrolens-reminder-old' }, { identifier: 'other' }]),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import * as Notifications from 'expo-notifications';
import { useFoodLogStore } from '../../store/useFoodLogStore';
import { usePlanStore } from '../../store/usePlanStore';
import { DEFAULT_REMINDERS, useSettingsStore } from '../../store/useSettingsStore';
import { daysLabel, syncReminders } from '../reminders';

const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
const cancel = Notifications.cancelScheduledNotificationAsync as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 30, 6, 0) });
  schedule.mockClear();
  cancel.mockClear();
  useFoodLogStore.setState({ entries: [] });
  usePlanStore.setState({ weightHistory: [] });
  useSettingsStore.setState({
    reminders: { ...DEFAULT_REMINDERS, breakfast: { enabled: true, hour: 8, minute: 30 }, weighIn: { enabled: true, hour: 7, minute: 0 } },
  });
});

afterEach(() => jest.useRealTimers());

const ids = () => schedule.mock.calls.map(([request]) => request.identifier as string);

it('schedules the coming week and clears only its own reminders', async () => {
  await syncReminders();
  expect(cancel).toHaveBeenCalledWith('macrolens-reminder-old');
  expect(cancel).not.toHaveBeenCalledWith('other');
  expect(ids()).toHaveLength(14);
  expect(ids()).toContain('macrolens-reminder-breakfast-2026-10-30');
});

it('skips a meal already logged and a weigh-in already done', async () => {
  useFoodLogStore.setState({
    entries: [
      {
        id: 'a',
        loggedAt: new Date(2026, 9, 30, 5, 50).toISOString(),
        mealType: 'breakfast',
        items: [],
        totalMacros: { calories: 300, proteinG: 0, carbsG: 0, fatG: 0 },
      },
    ],
  });
  usePlanStore.setState({ weightHistory: [{ id: 'w', loggedAt: new Date(2026, 9, 30, 5, 45).toISOString(), weightKg: 80 }] });
  await syncReminders();
  expect(ids()).not.toContain('macrolens-reminder-breakfast-2026-10-30');
  expect(ids()).not.toContain('macrolens-reminder-weighIn-2026-10-30');
  expect(ids()).toContain('macrolens-reminder-breakfast-2026-10-31');
});

it('leaves out times already past today', async () => {
  jest.setSystemTime(new Date(2026, 9, 30, 9, 0));
  await syncReminders();
  expect(ids()).not.toContain('macrolens-reminder-breakfast-2026-10-30');
  expect(ids()).toContain('macrolens-reminder-breakfast-2026-11-05');
});

it('schedules nothing without permission', async () => {
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
  await syncReminders();
  expect(schedule).not.toHaveBeenCalled();
});

it('fires a weigh-in only on the chosen days', async () => {
  useSettingsStore.setState({
    reminders: { ...DEFAULT_REMINDERS, weighIn: { enabled: true, hour: 7, minute: 0, days: [1, 3, 5] } },
  });
  await syncReminders();
  // Friday Oct 30 through Thursday Nov 5: Fri, Mon, Wed.
  expect(ids()).toEqual([
    'macrolens-reminder-weighIn-2026-10-30',
    'macrolens-reminder-weighIn-2026-11-02',
    'macrolens-reminder-weighIn-2026-11-04',
  ]);
});

it('names the chosen days', () => {
  expect(daysLabel(undefined)).toBe('Every day');
  expect(daysLabel([1, 2, 3, 4, 5])).toBe('Weekdays');
  expect(daysLabel([0, 6])).toBe('Weekends');
  expect(daysLabel([0, 1, 3, 5], 1)).toBe('Mon, Wed, Fri, Sun');
  expect(daysLabel([0, 1, 3, 5], 0)).toBe('Sun, Mon, Wed, Fri');
});
