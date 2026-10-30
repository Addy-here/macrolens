import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useReviewStore } from '../store/useReviewStore';
import { useUserStore } from '../store/useUserStore';
import { calculateInitialPlan } from '../utils/planCalculator';
import { createId } from '../utils/id';
import { sumMacros } from '../utils/macros';
import type { FoodItem, FoodLogEntry, UserProfile, WeightEntry } from '../types';

/**
 * Development only: a believable month of data so every screen can be
 * looked at in the simulator. Photos are public Unsplash images.
 */

const photo = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70&fm=jpg&fit=crop`;

function item(name: string, grams: number, calories: number, p: number, c: number, f: number): FoodItem {
  return {
    id: createId(),
    name,
    portionGrams: grams,
    macros: { calories, proteinG: p, carbsG: c, fatG: f },
    userAdjusted: false,
    source: 'vision-ai',
  };
}

const MEALS = {
  avocadoToast: () => ({
    photo: photo('photo-1525351484163-7529414344d8'),
    items: [
      item('Sourdough toast', 60, 160, 6, 30, 2),
      item('Avocado', 70, 112, 1.4, 6, 10.5),
      item('Fried egg', 50, 90, 6.3, 0.4, 7),
    ],
  }),
  pancakes: () => ({
    photo: photo('photo-1567620905732-2d1ec7ab7445'),
    items: [item('Pancakes', 180, 410, 10, 62, 12), item('Maple syrup', 30, 78, 0, 20, 0)],
  }),
  eggPlate: () => ({
    photo: photo('photo-1490645935967-10de6ba17061'),
    items: [
      item('Boiled eggs', 100, 155, 13, 1.1, 11),
      item('Sautéed spinach', 80, 40, 3, 3, 2.5),
      item('Avocado', 50, 80, 1, 4.3, 7.5),
    ],
  }),
  pokeBowl: () => ({
    photo: photo('photo-1546069901-ba9599a7e63c'),
    items: [
      item('Salmon', 120, 250, 25, 0, 16),
      item('Sushi rice', 180, 234, 4.3, 52, 0.5),
      item('Edamame', 50, 61, 5.5, 4.5, 2.6),
      item('Cucumber & cabbage', 80, 22, 1, 5, 0.1),
    ],
  }),
  chickpeaBowl: () => ({
    photo: photo('photo-1512621776951-a57141f2eefd'),
    items: [
      item('Chickpeas', 120, 197, 10.4, 33, 3.1),
      item('Avocado', 60, 96, 1.2, 5.1, 9),
      item('Cherry tomatoes', 80, 14, 0.7, 3.1, 0.2),
      item('Roasted squash', 90, 40, 1, 10, 0.1),
    ],
  }),
  steakSalad: () => ({
    photo: photo('photo-1504674900247-0877df9cc836'),
    items: [
      item('Sirloin steak', 150, 310, 39, 0, 17),
      item('Mixed greens', 80, 15, 1.2, 2.9, 0.2),
      item('Vinaigrette', 20, 90, 0, 1, 10),
    ],
  }),
  pizza: () => ({
    photo: photo('photo-1565299624946-b28f40a0ae38'),
    items: [item('BBQ chicken pizza', 220, 580, 27, 66, 22)],
  }),
  salad: () => ({
    photo: photo('photo-1540189549336-e6e99c3679fe'),
    items: [item('Garden salad', 200, 140, 4, 14, 8), item('Feta', 30, 80, 4.3, 1.2, 6.4)],
  }),
};

type MealKey = keyof typeof MEALS;

const DAY_PLAN: { meal: FoodLogEntry['mealType']; hour: number; options: MealKey[] }[] = [
  { meal: 'breakfast', hour: 8, options: ['avocadoToast', 'pancakes', 'eggPlate'] },
  { meal: 'lunch', hour: 12, options: ['pokeBowl', 'chickpeaBowl', 'salad'] },
  { meal: 'dinner', hour: 19, options: ['steakSalad', 'pizza', 'chickpeaBowl'] },
  { meal: 'snack', hour: 16, options: ['salad'] },
];

function entryAt(date: Date, meal: FoodLogEntry['mealType'], key: MealKey): FoodLogEntry {
  const { photo: uri, items } = MEALS[key]();
  return {
    id: createId(),
    loggedAt: date.toISOString(),
    mealType: meal,
    items,
    photoUri: uri,
    totalMacros: sumMacros(items.map((food) => food.macros)),
  };
}

export const SAMPLE_PROFILE: UserProfile = {
  id: 'local-user',
  heightCm: 178,
  startingWeightKg: 82.4,
  goalWeightKg: 76,
  targetRateKgPerWeek: -0.5,
  activityLevel: 'moderate',
  birthYear: 1994,
  sex: 'male',
};

/** Resolves once every persisted store has read its saved state. */
export function whenStoresHydrated() {
  const stores = [useFoodLogStore, usePlanStore, useUserStore];
  return Promise.all(
    stores.map(
      (store) =>
        new Promise<void>((resolve) => {
          if (store.persist.hasHydrated()) resolve();
          else store.persist.onFinishHydration(() => resolve());
        }),
    ),
  );
}

export function seedSampleData() {
  const now = new Date();
  const entries: FoodLogEntry[] = [];

  for (let daysAgo = 9; daysAgo >= 0; daysAgo--) {
    DAY_PLAN.forEach((slot, slotIndex) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, slot.hour, 10 + slotIndex * 7);
      if (daysAgo === 0) {
        // Today: breakfast, lunch, and a snack so far. Dinner is still open.
        if (slot.meal === 'dinner') return;
      } else if (slot.meal === 'snack' && daysAgo % 3 !== 0) {
        return;
      }
      const key = slot.options[(daysAgo + slotIndex) % slot.options.length];
      entries.push(entryAt(date, slot.meal, key));
    });
  }

  const weights: WeightEntry[] = [];
  const days = 48;
  for (let i = days; i >= 0; i--) {
    if (i % 4 === 2) continue; // a few skipped mornings
    const t = (days - i) / days;
    const base = 82.4 - 2.3 * t;
    const noise = Math.sin(i * 1.7) * 0.35 + Math.cos(i * 0.9) * 0.2;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 7, 20);
    weights.push({ id: createId(), loggedAt: date.toISOString(), weightKg: Math.round((base + noise) * 10) / 10 });
  }

  const plan = calculateInitialPlan(SAMPLE_PROFILE);
  plan.previousTargetCalories = plan.targetCalories + 80;
  plan.changeReason =
    'You lost 0.3 kg this week against a 0.5 kg plan, so the daily target is 80 kcal lower.';

  useUserStore.getState().setProfile(SAMPLE_PROFILE);
  usePlanStore.setState({ currentPlan: plan, weightHistory: weights });
  useFoodLogStore.setState({ entries });
}

export function clearAllData() {
  useUserStore.setState({ profile: null, isOnboarded: false });
  usePlanStore.setState({ currentPlan: null, weightHistory: [] });
  useFoodLogStore.setState({ entries: [] });
  useReviewStore.getState().clear();
}

/** A pending estimate, as if the model had just answered. Still needs Confirm. */
export function stageSampleReview() {
  const { photo: uri, items } = MEALS.pokeBowl();
  useReviewStore.getState().setPending({ photoUri: uri, items });
}
