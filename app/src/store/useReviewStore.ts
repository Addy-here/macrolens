import { create } from 'zustand';
import type { FoodItem } from '../types';

interface PendingReview {
  photoUri: string;
  items: FoodItem[];
}

interface ReviewState {
  pending: PendingReview | null;
  /** Bumps when a review is confirmed, so the camera can clear its photo. */
  loggedToken: number;
  setPending: (pending: PendingReview) => void;
  clear: () => void;
  markLogged: () => void;
}

export const useReviewStore = create<ReviewState>((set) => ({
  pending: null,
  loggedToken: 0,
  setPending: (pending) => set({ pending }),
  clear: () => set({ pending: null }),
  markLogged: () => set((state) => ({ pending: null, loggedToken: state.loggedToken + 1 })),
}));
