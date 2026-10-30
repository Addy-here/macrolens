import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { FOODS, type Food } from '../data/foods';
import { createId } from '../utils/id';
import type { FoodItem } from '../types';

export type LibraryOrigin = 'created' | 'edited' | 'learned';

/** One of the person's own foods. Same shape as the built-in reference, so the parser and search treat it alike. */
export interface LibraryFood extends Food {
  origin: LibraryOrigin;
  /** The built-in food this one stands in for, so search doesn't show both. */
  replaces?: string;
  updatedAt: string;
}

interface LibraryState {
  foods: LibraryFood[];
  /** Phrase → food id. Set when "Find it" resolves a word, so the same words match the same food next time. */
  links: Record<string, string>;
  upsert: (food: LibraryFood) => void;
  remove: (id: string) => void;
  link: (phrase: string, foodId: string) => void;
  /** Keeps AI estimates that were actually logged, so the same dish is instant and offline next time. */
  learn: (items: FoodItem[]) => void;
}

export const useFoodLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      foods: [],
      links: {},

      upsert: (food) =>
        set((state) => {
          const others = state.foods.filter((existing) => existing.id !== food.id);
          return { foods: [{ ...food, updatedAt: new Date().toISOString() }, ...others] };
        }),

      remove: (id) =>
        set((state) => ({
          foods: state.foods.filter((food) => food.id !== id),
          links: Object.fromEntries(Object.entries(state.links).filter(([, target]) => target !== id)),
        })),

      link: (phrase, foodId) => {
        const key = phrase.trim().toLowerCase();
        if (!key) return;
        set((state) => ({ links: { ...state.links, [key]: foodId } }));
      },

      learn: (items) => {
        const learned = items.filter((item) => (item.source === 'text-ai' || item.source === 'vision-ai') && !item.unresolved);
        if (learned.length === 0) return;
        const { foods } = get();
        const next = [...foods];
        for (const item of learned) {
          const name = item.name.trim().toLowerCase();
          // Never overwrite something the person made or corrected themselves.
          const existing = next.findIndex((food) => food.name.toLowerCase() === name);
          if (existing >= 0 && next[existing].origin !== 'learned') continue;
          const food = libraryFoodFromItem(item, 'learned', existing >= 0 ? next[existing].id : undefined);
          if (existing >= 0) next[existing] = food;
          else next.unshift(food);
        }
        set({ foods: next.slice(0, 500) });
      },
    }),
    {
      name: 'macrolens-library',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ foods: state.foods, links: state.links }),
    },
  ),
);

/** A library food built from a logged or edited item: per-100 g values from the item's portion. */
export function libraryFoodFromItem(item: FoodItem, origin: LibraryOrigin, id?: string): LibraryFood {
  const grams = Math.max(1, item.portionGrams);
  const per = (value: number | undefined) => Math.round(((value ?? 0) / grams) * 1000) / 10;
  const name = item.name.trim();
  const lower = name.toLowerCase();
  const builtIn = FOODS.find((food) => food.name.toLowerCase() === lower || food.aliases.includes(lower));
  const aliases = Array.from(new Set([lower, item.heard?.trim().toLowerCase()].filter((alias): alias is string => Boolean(alias))));
  return {
    id: id ?? `my-${createId()}`,
    name,
    aliases,
    per100: [per(item.macros.calories), per(item.macros.proteinG), per(item.macros.carbsG), per(item.macros.fatG)],
    more: item.micros
      ? [per(item.micros.fiberG), per(item.micros.sugarG), per(item.micros.sodiumMg), per(item.micros.saturatedFatG)]
      : undefined,
    serving: grams,
    piece: item.serving,
    origin,
    replaces: builtIn?.id,
    updatedAt: new Date().toISOString(),
  };
}

const ALL_FOODS = new Map(FOODS.map((food) => [food.id, food]));

/**
 * What the parser should look up before the built-in reference: each linked
 * phrase as an alias of the food it points to, then the person's own foods.
 */
function parserLibrary(foods: LibraryFood[], links: Record<string, string>): Food[] {
  const mine = new Map<string, Food>(foods.map((food) => [food.id, food]));
  const linked: Food[] = [];
  for (const [phrase, id] of Object.entries(links)) {
    const target = mine.get(id) ?? ALL_FOODS.get(id);
    if (target) linked.push({ ...target, aliases: [phrase], linked: true });
  }
  return [...linked, ...foods];
}

/** Stable between library changes, so the parser builds its alias index once. */
export function useParserLibrary(): Food[] {
  const foods = useFoodLibraryStore((s) => s.foods);
  const links = useFoodLibraryStore((s) => s.links);
  return useMemo(() => parserLibrary(foods, links), [foods, links]);
}

/** The same list, read once outside React (e.g. in a logging flow). */
export function parserLibrarySnapshot(): Food[] {
  const { foods, links } = useFoodLibraryStore.getState();
  return parserLibrary(foods, links);
}
