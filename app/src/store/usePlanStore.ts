import { create } from 'zustand';
import type { AdaptivePlan, WeightEntry } from '../types';

interface PlanState {
  currentPlan: AdaptivePlan | null;
  weightHistory: WeightEntry[];
  setPlan: (plan: AdaptivePlan) => void;
  addWeightEntry: (entry: WeightEntry) => void;
  /** Simple exponentially-weighted trend over recent weight entries, used
   *  as the input to weekly plan recalculation (see docs/PRODUCT.md —
   *  "Adaptive weight-loss plans"). Smoothing factor alpha tunable later
   *  once we have real usage data to calibrate against. */
  trendWeightKg: (alpha?: number) => number | null;
}

export const usePlanStore = create<PlanState>((set, get) => ({
  currentPlan: null,
  weightHistory: [],

  setPlan: (plan) => set({ currentPlan: plan }),

  addWeightEntry: (entry) =>
    set((state) => ({
      weightHistory: [...state.weightHistory, entry].sort((a, b) =>
        a.loggedAt.localeCompare(b.loggedAt),
      ),
    })),

  trendWeightKg: (alpha = 0.25) => {
    const history = get().weightHistory;
    if (history.length === 0) return null;
    let trend = history[0].weightKg;
    for (let i = 1; i < history.length; i++) {
      trend = alpha * history[i].weightKg + (1 - alpha) * trend;
    }
    return trend;
  },
}));
