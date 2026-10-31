import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  defaultUnits,
  defaultWeekStart,
  energyName,
  energyNumber,
  energySpoken,
  formatEnergy,
  formatMass,
  formatPace,
  formatWater,
  formatWeight,
  formatWeightDelta,
  formatHeight,
  METRIC,
  type Units,
} from '../utils/units';

export type ReminderKey = 'breakfast' | 'lunch' | 'dinner' | 'weighIn';

export interface Reminder {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Weekdays it fires on, 0 Sunday to 6 Saturday. Missing means every day. */
  days?: number[];
}

export interface WaterSettings {
  enabled: boolean;
  goalMl: number;
  /** One tap of + adds this much. */
  glassMl: number;
}

interface SettingsState {
  /** Set once the first-run defaults have been decided. */
  migrated: boolean;
  units: Units;
  /** 0 Sunday, 1 Monday. */
  weekStartsOn: 0 | 1;
  water: WaterSettings;
  reminders: Record<ReminderKey, Reminder>;
  setUnit: <K extends keyof Units>(key: K, value: Units[K]) => void;
  setWeekStart: (day: 0 | 1) => void;
  setWater: (patch: Partial<WaterSettings>) => void;
  setReminder: (key: ReminderKey, patch: Partial<Reminder>) => void;
}

export const DEFAULT_REMINDERS: Record<ReminderKey, Reminder> = {
  breakfast: { enabled: false, hour: 8, minute: 30 },
  lunch: { enabled: false, hour: 12, minute: 30 },
  dinner: { enabled: false, hour: 19, minute: 0 },
  weighIn: { enabled: false, hour: 7, minute: 30 },
};

const initialUnits = defaultUnits();

/** 2 L and a 250 ml glass; in fluid ounces they read 68 and 8. */
export const DEFAULT_WATER: WaterSettings = { enabled: true, goalMl: 2000, glassMl: 250 };

/** App preferences: units, calendar, water, reminders. Goals and body stats live in the plan (useUserStore). */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      migrated: false,
      units: initialUnits,
      weekStartsOn: defaultWeekStart(),
      water: DEFAULT_WATER,
      reminders: DEFAULT_REMINDERS,
      setUnit: (key, value) => set((state) => ({ units: { ...state.units, [key]: value } })),
      setWeekStart: (weekStartsOn) => set({ weekStartsOn }),
      setWater: (patch) => set((state) => ({ water: { ...state.water, ...patch } })),
      setReminder: (key, patch) =>
        set((state) => ({ reminders: { ...state.reminders, [key]: { ...state.reminders[key], ...patch } } })),
    }),
    {
      name: 'macrolens-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        migrated: state.migrated,
        units: state.units,
        weekStartsOn: state.weekStartsOn,
        water: state.water,
        reminders: state.reminders,
      }),
      // Someone who used Macrolens before units existed entered everything in kg and saw a Sunday week.
      onRehydrateStorage: () => (state) => {
        if (!state || state.migrated) return;
        void AsyncStorage.getItem('macrolens-user').then((raw) => {
          const existing = raw ? (JSON.parse(raw) as { state?: { profile?: unknown } }).state?.profile : null;
          useSettingsStore.setState(existing ? { units: METRIC, weekStartsOn: 0, migrated: true } : { migrated: true });
        });
      },
      // Settings added later get their defaults instead of undefined.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          ...saved,
          units: { ...current.units, ...saved.units },
          water: { ...current.water, ...saved.water },
          reminders: { ...current.reminders, ...saved.reminders },
        };
      },
    },
  ),
);

/** The person's units, with formatters bound to them. Re-renders when a unit changes. */
export function useUnits() {
  const units = useSettingsStore((s) => s.units);
  return useMemo(
    () => ({
      ...units,
      weightText: (kg: number, digits = 1) => formatWeight(kg, units.weight, { digits }),
      weightDelta: (kg: number) => formatWeightDelta(kg, units.weight),
      pace: (kgPerWeek: number) => formatPace(kgPerWeek, units.weight),
      heightText: (cm: number) => formatHeight(cm, units.height),
      energyText: (kcal: number) => formatEnergy(kcal, units.energy),
      energyNumber: (kcal: number) => energyNumber(kcal, units.energy),
      energySpoken: (kcal: number) => energySpoken(kcal, units.energy),
      energyName: energyName(units.energy),
      massText: (grams: number) => formatMass(grams, units.food),
      waterText: (ml: number) => formatWater(ml, units.water),
    }),
    [units],
  );
}

export type BoundUnits = ReturnType<typeof useUnits>;
