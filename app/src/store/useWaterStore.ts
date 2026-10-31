import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WaterState {
  /** Millilitres drunk, keyed by local date (yyyy-mm-dd). */
  byDay: Record<string, number>;
  add: (dateKey: string, ml: number) => void;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set) => ({
      byDay: {},
      add: (dateKey, ml) =>
        set((state) => {
          const next = Math.max(0, Math.round((state.byDay[dateKey] ?? 0) + ml));
          const { [dateKey]: _old, ...rest } = state.byDay;
          return { byDay: next > 0 ? { ...rest, [dateKey]: next } : rest };
        }),
    }),
    {
      name: 'macrolens-water',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ byDay: state.byDay }),
    },
  ),
);
