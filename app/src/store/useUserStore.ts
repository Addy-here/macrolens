import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserProfile } from '../types';

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  isOnboarded: boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      isOnboarded: false,

      setProfile: (profile) => set({ profile, isOnboarded: true }),

      updateProfile: (patch) => {
        const current = get().profile;
        if (!current) return;
        set({ profile: { ...current, ...patch } });
      },
    }),
    {
      name: 'macrolens-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        isOnboarded: state.isOnboarded,
      }),
    },
  ),
);
