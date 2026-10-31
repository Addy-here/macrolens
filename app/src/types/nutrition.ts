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
  saturatedFatG?: number;
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
  source: 'vision-ai' | 'text-ai' | 'food-db' | 'manual-search' | 'manual-custom' | 'barcode';
  /** A countable unit for this food ("egg", 50 g), so portions can read "2 eggs". */
  serving?: { label: string; plural: string; grams: number };
  /** The words this item was parsed from, when it came from speech or typing. */
  heard?: string;
  /** Parsed from a description but not matched to a food; it has no macros yet. */
  unresolved?: boolean;
  /** The person's own food this came from (My Foods), if any. */
  libraryId?: string;
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
  /** How the target splits into protein, carbs, and fat. Balanced when missing. */
  dietStyle?: DietStyle;
  /** Percent of energy from protein, carbs, fat when dietStyle is 'custom'. Sums to 100. */
  customSplit?: MacroSplit;
  /** A daily target the person set themselves, in kcal. Turns off the calculated target and weekly check-ins. */
  calorieOverride?: number | null;
  /** Extra kcal on Saturday and Sunday, taken evenly from the weekdays so the week's total is unchanged. */
  weekendExtraKcal?: number;
}

export type DietStyle = 'balanced' | 'high-protein' | 'low-carb' | 'low-fat' | 'keto' | 'custom';

export interface MacroSplit {
  protein: number;
  carbs: number;
  fat: number;
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
  /** Estimated maintenance (TDEE) the target was built from, in kcal. */
  maintenanceCalories?: number;
  /** Where maintenance came from: the formula, measured intake and trend, or a target the person typed. */
  basis?: 'formula' | 'measured' | 'custom';
  /** The target was raised to the minimum for safety. */
  floored?: boolean;
  /** Extra kcal on weekend days (weekdays carry less). Copied from the profile. */
  weekendExtraKcal?: number;
}
