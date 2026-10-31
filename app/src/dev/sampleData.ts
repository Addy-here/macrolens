import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useReviewStore } from '../store/useReviewStore';
import { useUserStore } from '../store/useUserStore';
import { useWaterStore } from '../store/useWaterStore';
import { useFoodLibraryStore } from '../store/useFoodLibraryStore';
import { DEFAULT_WATER, useSettingsStore } from '../store/useSettingsStore';
import { localDateKey } from '../utils/date';
import { proposePlan } from '../services/planFlow';
import { createId } from '../utils/id';
import { parseDescription } from '../utils/describe';
import { sumMacros, sumMicros } from '../utils/macros';
import type { FoodItem, FoodLogEntry, UserProfile, WeightEntry } from '../types';

/**
 * Development only: a believable month of data so every screen can be
 * looked at in the simulator. Photos are public Unsplash images.
 */

const photo = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70&fm=jpg&fit=crop`;

/** Sample meals are written the way people say them and parsed, so they carry full nutrition. */
function described(text: string): FoodItem[] {
  return parseDescription(text).items.filter((food) => !food.unresolved);
}

const MEALS = {
  avocadoToast: () => ({
    photo: photo('photo-1525351484163-7529414344d8'),
    items: described('a slice of sourdough toast, half an avocado and a fried egg'),
  }),
  pancakes: () => ({
    photo: photo('photo-1567620905732-2d1ec7ab7445'),
    items: described('three pancakes with 2 tbsp maple syrup'),
  }),
  eggPlate: () => ({
    photo: photo('photo-1490645935967-10de6ba17061'),
    items: described('two boiled eggs, a cup of spinach and half an avocado'),
  }),
  pokeBowl: () => ({
    photo: photo('photo-1546069901-ba9599a7e63c'),
    items: described('a poke bowl'),
  }),
  chickpeaBowl: () => ({
    photo: photo('photo-1512621776951-a57141f2eefd'),
    items: described('a cup of chickpeas, half an avocado, cherry tomatoes and a cup of quinoa'),
  }),
  steakSalad: () => ({
    photo: photo('photo-1504674900247-0877df9cc836'),
    items: described('150 g steak, mixed greens and a tablespoon of vinaigrette'),
  }),
  pizza: () => ({
    photo: photo('photo-1565299624946-b28f40a0ae38'),
    items: described('three slices of pizza'),
  }),
  salad: () => ({
    photo: photo('photo-1540189549336-e6e99c3679fe'),
    items: described('a greek salad with feta'),
  }),
  yogurtBowl: () => ({
    photo: photo('photo-1488477181946-6428a0291777'),
    items: described('a pot of greek yogurt with half a cup of granola and a banana'),
  }),
  barLatte: () => ({
    photo: undefined,
    items: described('a protein bar and a latte'),
  }),
};

type MealKey = keyof typeof MEALS;

const DAY_PLAN: { meal: FoodLogEntry['mealType']; hour: number; options: MealKey[] }[] = [
  { meal: 'breakfast', hour: 8, options: ['avocadoToast', 'pancakes', 'eggPlate'] },
  { meal: 'lunch', hour: 12, options: ['pokeBowl', 'chickpeaBowl', 'salad'] },
  { meal: 'dinner', hour: 19, options: ['steakSalad', 'pizza', 'chickpeaBowl'] },
  { meal: 'snack', hour: 16, options: ['yogurtBowl', 'salad', 'barLatte'] },
  { meal: 'snack', hour: 10, options: ['barLatte'] },
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
    totalMicros: sumMicros(items.map((food) => food.micros)),
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
  const stores = [useFoodLogStore, usePlanStore, useUserStore, useSettingsStore, useWaterStore, useFoodLibraryStore];
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

  for (let daysAgo = 23; daysAgo >= 0; daysAgo--) {
    DAY_PLAN.forEach((slot, slotIndex) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, slot.hour, 10 + slotIndex * 7);
      if (daysAgo === 0) {
        // Today: whatever has happened by now. Dinner is still open.
        if (slot.meal === 'dinner' || date.getTime() > now.getTime()) return;
      } else if (slot.hour === 10 && daysAgo % 2 !== 0) {
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

  const { plan } = proposePlan(SAMPLE_PROFILE, entries, weights);
  plan.previousTargetCalories = plan.targetCalories + 80;
  plan.changeReason =
    'You lost 0.3 kg this week against a 0.5 kg plan, so the daily target is 80 kcal lower.';
  // Set a few days ago, so the weekly check-in isn't due yet.
  plan.weekStartDate = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3));

  const water: Record<string, number> = {};
  for (let daysAgo = 9; daysAgo >= 0; daysAgo--) {
    const key = localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo));
    water[key] = daysAgo === 0 ? 1000 : 1500 + ((daysAgo * 250) % 1000);
  }
  useWaterStore.setState({ byDay: water });
  useSettingsStore.getState().setWater(DEFAULT_WATER);

  useUserStore.getState().setProfile(SAMPLE_PROFILE);
  usePlanStore.setState({ currentPlan: plan, weightHistory: weights });
  useFoodLogStore.setState({ entries });
}

export function clearAllData() {
  useUserStore.setState({ profile: null, isOnboarded: false });
  usePlanStore.setState({ currentPlan: null, weightHistory: [] });
  useFoodLogStore.setState({ entries: [] });
  useWaterStore.setState({ byDay: {} });
  useReviewStore.getState().clear();
}

/** A plan last set eight days ago, so the weekly check-in shows. */
export function makeCheckInDue() {
  const plan = usePlanStore.getState().currentPlan;
  if (!plan) return;
  const now = new Date();
  usePlanStore.setState({
    currentPlan: { ...plan, weekStartDate: localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 8)) },
  });
}

/** A pending estimate, as if the model had just answered. Still needs Confirm. */
export function stageSampleReview() {
  const { photo: uri } = MEALS.pokeBowl();
  // Staged as a photo estimate would arrive: from the AI, several items.
  const items = described('120 g salmon, a cup of sushi rice, edamame and a cucumber').map((food) => ({
    ...food,
    source: 'vision-ai' as const,
  }));
  useReviewStore.getState().setPending({ origin: 'photo', photoUri: uri, items, aiUsed: true, mealFrom: 'clock' });
}
