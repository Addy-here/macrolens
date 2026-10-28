/** Core domain types for food logging, shared across store/services/screens. */

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Micros {
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  // Extended/optional set — user can enable more in settings.
  potassiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  vitaminCMg?: number;
}

/** A single food item detected in a photo, or added manually/by search. */
export interface FoodItem {
  id: string;
  name: string;
  /** Estimated or user-confirmed portion weight in grams. */
  portionGrams: number;
  macros: Macros;
  micros?: Micros;
  /** Was this item's portion edited by the user after AI estimate? */
  userAdjusted: boolean;
  /** Source of this item's data. */
  source: 'vision-ai' | 'manual-search' | 'manual-custom' | 'barcode';
}

/** A logged meal/snack entry — one or more FoodItems logged together. */
export interface FoodLogEntry {
  id: string;
  loggedAt: string; // ISO timestamp
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  photoUri?: string;
  /** Aggregate macros across items — computed, not independently stored. */
  totalMacros: Macros;
  totalMicros?: Micros;
}

export interface WeightEntry {
  id: string;
  loggedAt: string; // ISO timestamp
  weightKg: number;
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very-active';

export interface UserProfile {
  id: string;
  heightCm: number;
  startingWeightKg: number;
  goalWeightKg: number;
  /** Target rate of change in kg/week; negative = weight loss. */
  targetRateKgPerWeek: number;
  activityLevel: ActivityLevel;
  birthYear: number;
  sex: 'male' | 'female' | 'other';
}

/** The current adaptive plan — recalculated weekly, see docs/PRODUCT.md. */
export interface AdaptivePlan {
  weekStartDate: string; // ISO date
  targetCalories: number;
  targetMacros: Macros;
  /** Plain-language explanation of why targets changed this week, if they did. */
  changeReason?: string;
  /** Previous week's targets, for diffing in the UI. */
  previousTargetCalories?: number;
}
