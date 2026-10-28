import { create } from 'zustand';
import type { UserProfile } from '../types';

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  isOnboarded: boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isOnboarded: false,

  setProfile: (profile) => set({ profile, isOnboarded: true }),

  updateProfile: (patch) => {
    const current = get().profile;
    if (!current) return;
    set({ profile: { ...current, ...patch } });
  },
}));
