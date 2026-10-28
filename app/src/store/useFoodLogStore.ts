import { create } from 'zustand';
import type { FoodLogEntry, Macros } from '../types';

interface FoodLogState {
  entries: FoodLogEntry[];
  addEntry: (entry: FoodLogEntry) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<FoodLogEntry>) => void;
  /** Entries for a given ISO date (yyyy-mm-dd), for daily totals/history.
   *  CAUTION: these return newly-allocated arrays/objects. Call them
   *  imperatively (e.g. `useFoodLogStore.getState().totalsForDate(...)`)
   *  for one-off reads, never as `useFoodLogStore(s => s.totalsForDate(x))`
   *  — that pattern causes an infinite render loop since the selector
   *  result changes identity every call. For reactive use in a component,
   *  subscribe to `entries` and derive with `useMemo` instead (see
   *  HomeScreen.tsx). */
  entriesForDate: (isoDate: string) => FoodLogEntry[];
  /** Summed macros for a given ISO date. See caution above. */
  totalsForDate: (isoDate: string) => Macros;
}

const emptyMacros: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export const useFoodLogStore = create<FoodLogState>((set, get) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({ entries: [...state.entries, entry] })),

  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

  updateEntry: (id, patch) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  entriesForDate: (isoDate) =>
    get().entries.filter((e) => e.loggedAt.startsWith(isoDate)),

  totalsForDate: (isoDate) =>
    get()
      .entriesForDate(isoDate)
      .reduce<Macros>(
        (acc, entry) => ({
          calories: acc.calories + entry.totalMacros.calories,
          proteinG: acc.proteinG + entry.totalMacros.proteinG,
          carbsG: acc.carbsG + entry.totalMacros.carbsG,
          fatG: acc.fatG + entry.totalMacros.fatG,
        }),
        { ...emptyMacros },
      ),
}));
