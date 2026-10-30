import { create } from 'zustand';
import type { FoodItem } from '../types';
import { scaleItem, type MealType } from '../utils/meals';

export type ReviewOrigin = 'photo' | 'voice' | 'text' | 'search' | 'again' | 'quick' | 'edit';

/** Where the next logged meal should go, chosen with a meal's "+" on Today. */
export interface LogTarget {
  mealType: MealType;
  dateKey: string;
}

export interface PendingReview {
  /** Changes every time a new review starts, so the sheet can reset its own choices. */
  session: number;
  origin: ReviewOrigin;
  items: FoodItem[];
  photoUri?: string;
  transcript?: string;
  mealType?: MealType;
  /** Where the meal choice came from. Only a clock guess is worth a nudge. */
  mealFrom?: 'said' | 'target' | 'clock';
  dateKey?: string;
  /** The items are the AI's reading of the whole description. */
  aiUsed?: boolean;
  /** Why the AI couldn't be used, when it was asked for. */
  aiNote?: string;
  /** Set when editing a meal that is already in the log. */
  entryId?: string;
  loggedAt?: string;
}

interface ReviewState {
  pending: PendingReview | null;
  target: LogTarget | null;
  /** Bumps when a review is confirmed, so capture screens can clear themselves. */
  loggedToken: number;
  setPending: (pending: Omit<PendingReview, 'session'>) => void;
  addItems: (items: FoodItem[]) => void;
  updateItem: (item: FoodItem) => void;
  removeItem: (id: string) => void;
  setTarget: (target: LogTarget | null) => void;
  clear: () => void;
  markLogged: () => void;
}

let session = 0;

/** Adding a food that's already in the meal adds to its portion ("2 bananas") instead of a second row. */
function mergeItems(existing: FoodItem[], added: FoodItem[]) {
  const merged = [...existing];
  for (const item of added) {
    const index = merged.findIndex(
      (candidate) =>
        !candidate.unresolved &&
        candidate.name === item.name &&
        candidate.source === item.source &&
        candidate.serving?.label === item.serving?.label,
    );
    if (index < 0 || item.source === 'manual-custom') {
      merged.push(item);
      continue;
    }
    const current = merged[index];
    merged[index] = { ...scaleItem(current, current.portionGrams + item.portionGrams), userAdjusted: current.userAdjusted };
  }
  return merged;
}

/**
 * The meal waiting on the review sheet. Nothing here is in the log until the
 * sheet's Confirm writes it — the review-before-save rule.
 */
export const useReviewStore = create<ReviewState>((set) => ({
  pending: null,
  target: null,
  loggedToken: 0,

  setPending: (pending) => set({ pending: { ...pending, session: ++session } }),

  addItems: (items) =>
    set((state) => ({
      pending: state.pending
        ? { ...state.pending, items: mergeItems(state.pending.items, items) }
        : {
            session: ++session,
            origin: 'search',
            items,
            mealType: state.target?.mealType,
            dateKey: state.target?.dateKey,
          },
    })),

  updateItem: (item) =>
    set((state) =>
      state.pending
        ? { pending: { ...state.pending, items: state.pending.items.map((entry) => (entry.id === item.id ? item : entry)) } }
        : {},
    ),

  removeItem: (id) =>
    set((state) =>
      state.pending ? { pending: { ...state.pending, items: state.pending.items.filter((entry) => entry.id !== id) } } : {},
    ),

  setTarget: (target) => set({ target }),
  clear: () => set({ pending: null }),
  markLogged: () => set((state) => ({ pending: null, target: null, loggedToken: state.loggedToken + 1 })),
}));
