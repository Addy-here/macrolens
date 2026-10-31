import type { ActivityLevel, AdaptivePlan, DietStyle, MacroSplit, Macros, UserProfile } from '../types';
import { localDateKey } from './date';

/**
 * The plan's numbers. Maintenance starts from the Mifflin-St Jeor formula ×
 * activity, and is replaced by what the person's own intake and weight trend
 * say once there are enough days of both (see utils/expenditure.ts). The
 * target is maintenance minus (or plus) the energy of the weekly pace, unless
 * the person typed their own.
 */

export const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; detail: string }[] = [
  { key: 'sedentary', label: 'Sedentary', detail: 'Desk job, little exercise' },
  { key: 'light', label: 'Lightly active', detail: 'Walks, exercise 1–3 days a week' },
  { key: 'moderate', label: 'Moderately active', detail: 'Exercise 3–5 days a week' },
  { key: 'active', label: 'Active', detail: 'Hard exercise most days' },
  { key: 'very-active', label: 'Very active', detail: 'Physical job or two-a-days' },
];

export const KCAL_PER_KG = 7700;

export const DIET_STYLES: { key: DietStyle; label: string; split: MacroSplit }[] = [
  { key: 'balanced', label: 'Balanced', split: { protein: 30, carbs: 40, fat: 30 } },
  { key: 'high-protein', label: 'High protein', split: { protein: 40, carbs: 35, fat: 25 } },
  { key: 'low-carb', label: 'Low carb', split: { protein: 35, carbs: 20, fat: 45 } },
  { key: 'low-fat', label: 'Low fat', split: { protein: 25, carbs: 55, fat: 20 } },
  { key: 'keto', label: 'Keto', split: { protein: 25, carbs: 5, fat: 70 } },
  { key: 'custom', label: 'Custom', split: { protein: 30, carbs: 40, fat: 30 } },
];

export function dietLabel(style: DietStyle | undefined) {
  return DIET_STYLES.find((d) => d.key === (style ?? 'balanced'))?.label ?? 'Balanced';
}

export function activityLabel(level: ActivityLevel) {
  return ACTIVITY_LEVELS.find((a) => a.key === level)?.label ?? level;
}

export function splitFor(profile: Pick<UserProfile, 'dietStyle' | 'customSplit'>): MacroSplit {
  if (profile.dietStyle === 'custom' && profile.customSplit) return profile.customSplit;
  return DIET_STYLES.find((d) => d.key === (profile.dietStyle ?? 'balanced'))!.split;
}

/** The lowest daily target the app will suggest on its own. */
export function calorieFloor(sex: UserProfile['sex']) {
  return sex === 'male' ? 1500 : sex === 'female' ? 1200 : 1350;
}

export type GoalKind = 'lose' | 'maintain' | 'gain';

export function goalKind(ratePerWeek: number): GoalKind {
  return ratePerWeek < 0 ? 'lose' : ratePerWeek > 0 ? 'gain' : 'maintain';
}

export function ageFrom(birthYear: number, now = new Date()) {
  return now.getFullYear() - birthYear;
}

export function bmr(profile: UserProfile, weightKg = profile.startingWeightKg) {
  const age = ageFrom(profile.birthYear);
  const base = 10 * weightKg + 6.25 * profile.heightCm - 5 * age;
  if (profile.sex === 'male') return base + 5;
  if (profile.sex === 'female') return base - 161;
  return base - 78; // midpoint for 'other' / unspecified
}

export function formulaMaintenance(profile: UserProfile, weightKg?: number) {
  return Math.round(bmr(profile, weightKg) * ACTIVITY_MULTIPLIER[profile.activityLevel]);
}

/** Daily energy the weekly pace adds (gain) or removes (lose). */
export function dailyAdjustment(ratePerWeek: number) {
  return Math.round((ratePerWeek * KCAL_PER_KG) / 7);
}

export function macrosFor(calories: number, split: MacroSplit): Macros {
  return {
    calories: Math.round(calories),
    proteinG: Math.round((calories * split.protein) / 100 / 4),
    carbsG: Math.round((calories * split.carbs) / 100 / 4),
    fatG: Math.round((calories * split.fat) / 100 / 9),
  };
}

/**
 * Builds the plan from the profile. `maintenance` overrides the formula (the
 * measured estimate); `weightKg` is the current trend weight when known.
 */
export function buildPlan(
  profile: UserProfile,
  options: { maintenance?: number; weightKg?: number; basis?: AdaptivePlan['basis'] } = {},
): AdaptivePlan {
  const maintenance = options.maintenance ?? formulaMaintenance(profile, options.weightKg);
  const custom = profile.calorieOverride != null && profile.calorieOverride > 0;
  const floor = calorieFloor(profile.sex);
  const computed = maintenance + dailyAdjustment(profile.targetRateKgPerWeek);
  const targetCalories = custom ? Math.round(profile.calorieOverride!) : Math.max(floor, Math.round(computed));
  return {
    weekStartDate: localDateKey(new Date()),
    targetCalories,
    targetMacros: macrosFor(targetCalories, splitFor(profile)),
    maintenanceCalories: maintenance,
    basis: custom ? 'custom' : (options.basis ?? 'formula'),
    floored: !custom && computed < floor,
    weekendExtraKcal: profile.weekendExtraKcal ?? 0,
  };
}

/** Kept for callers that only have a profile: the formula plan. */
export function calculateInitialPlan(profile: UserProfile): AdaptivePlan {
  return buildPlan(profile);
}

/**
 * The day's targets. With a weekend shift, Saturday and Sunday get the extra
 * and Monday–Friday share the cost, so the week adds up to the same total.
 */
export function targetsForDate(plan: AdaptivePlan | null | undefined, date: Date, fallback: Macros): Macros {
  if (!plan) return fallback;
  const extra = plan.weekendExtraKcal ?? 0;
  if (!extra) return plan.targetMacros;
  const calories = dayCalories(plan.targetCalories, extra, date.getDay());
  // Protein holds steady every day; the difference comes from carbs and fat in their usual proportion.
  const { proteinG, carbsG, fatG } = plan.targetMacros;
  const carbKcal = carbsG * 4;
  const fatKcal = fatG * 9;
  const flexible = carbKcal + fatKcal || 1;
  const diff = calories - plan.targetCalories;
  return {
    calories,
    proteinG,
    carbsG: Math.max(0, Math.round((carbKcal + (diff * carbKcal) / flexible) / 4)),
    fatG: Math.max(0, Math.round((fatKcal + (diff * fatKcal) / flexible) / 9)),
  };
}

export function dayCalories(average: number, weekendExtra: number, weekday: number) {
  const weekend = weekday === 0 || weekday === 6;
  return Math.round(weekend ? average + weekendExtra : average - (weekendExtra * 2) / 5);
}
