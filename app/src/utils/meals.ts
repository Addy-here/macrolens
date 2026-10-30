import type { SFSymbol } from 'expo-symbols';
import type { FoodItem, FoodLogEntry, Micros } from '../types';

export type MealType = FoodLogEntry['mealType'];

export type MealSymbol = SFSymbol;

export const MEALS: { key: MealType; label: string; symbol: MealSymbol }[] = [
  { key: 'breakfast', label: 'Breakfast', symbol: 'sunrise.fill' },
  { key: 'lunch', label: 'Lunch', symbol: 'sun.max.fill' },
  { key: 'dinner', label: 'Dinner', symbol: 'moon.stars.fill' },
  { key: 'snack', label: 'Snack', symbol: 'carrot.fill' },
];

export function mealLabel(key: MealType) {
  return MEALS.find((meal) => meal.key === key)?.label ?? key;
}

/** The meal the clock suggests. Late night and the small hours are a snack, not breakfast. */
export function suggestedMeal(date = new Date()): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 4 * 60 && minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes >= 10 * 60 + 30 && minutes < 15 * 60) return 'lunch';
  if (minutes >= 17 * 60 && minutes < 22 * 60) return 'dinner';
  return 'snack';
}

/** "Salmon, sushi rice, edamame" — the foods in one logged photo, as a single line. */
export function entryTitle(items: FoodItem[]) {
  if (items.length === 0) return 'Meal';
  return items
    .map((food, index) => (index === 0 ? food.name : food.name.charAt(0).toLowerCase() + food.name.slice(1)))
    .join(', ');
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Scale an item's macros to a new portion. Used by the review stepper. */
export function scaleItem(item: FoodItem, grams: number): FoodItem {
  if (!Number.isFinite(grams) || grams <= 0 || item.portionGrams <= 0) return item;
  const ratio = grams / item.portionGrams;
  const tenth = (value: number) => Math.max(0, Math.round(value * ratio * 10) / 10);
  return {
    ...item,
    portionGrams: Math.round(grams),
    userAdjusted: true,
    macros: {
      calories: Math.max(0, Math.round(item.macros.calories * ratio)),
      proteinG: tenth(item.macros.proteinG),
      carbsG: tenth(item.macros.carbsG),
      fatG: tenth(item.macros.fatG),
    },
    micros: item.micros ? scaleMicros(item.micros, ratio) : undefined,
  };
}

export function scaleMicros(micros: Micros, ratio: number): Micros {
  const out: Micros = {};
  for (const [key, value] of Object.entries(micros) as [keyof Micros, number | undefined][]) {
    if (value == null) continue;
    out[key] = key.endsWith('Mg') ? Math.round(value * ratio) : Math.round(value * ratio * 10) / 10;
  }
  return out;
}
