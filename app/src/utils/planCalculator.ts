import type { ActivityLevel, AdaptivePlan, Macros, UserProfile } from '../types';

/**
 * Client-side INITIAL plan calculator — used only to seed a sensible
 * starting point the moment a user saves their goals in Settings, so the
 * Plan tab isn't empty before the backend's weekly adaptive recalculation
 * (the real source of truth once it's built — see docs/DECISIONS.md)
 * has run even once. This is deliberately simple (Mifflin-St Jeor BMR +
 * activity multiplier + weekly-rate-to-deficit conversion) and should be
 * treated as a placeholder, not the final algorithm.
 */

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
};

const KCAL_PER_KG_FAT = 7700;

function estimateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function mifflinStJeorBmr(profile: UserProfile): number {
  const { heightCm, startingWeightKg, sex, birthYear } = profile;
  const age = estimateAge(birthYear);
  const base = 10 * startingWeightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base - 78; // midpoint for 'other'/unspecified
}

function splitMacros(calories: number): Macros {
  // Simple starting split: 30% protein, 40% carbs, 30% fat — a
  // reasonable default for a weight-loss-focused plan, not personalized
  // yet (no diet-preference input exists in Settings as of this version).
  const proteinG = Math.round((calories * 0.3) / 4);
  const carbsG = Math.round((calories * 0.4) / 4);
  const fatG = Math.round((calories * 0.3) / 9);
  return { calories: Math.round(calories), proteinG, carbsG, fatG };
}

export function calculateInitialPlan(profile: UserProfile): AdaptivePlan {
  const bmr = mifflinStJeorBmr(profile);
  const tdee = bmr * ACTIVITY_MULTIPLIER[profile.activityLevel];
  const weeklyDeficitKcal = -profile.targetRateKgPerWeek * KCAL_PER_KG_FAT;
  const dailyAdjustment = weeklyDeficitKcal / 7;
  const targetCalories = Math.max(1200, Math.round(tdee - dailyAdjustment));

  return {
    weekStartDate: new Date().toISOString().slice(0, 10),
    targetCalories,
    targetMacros: splitMacros(targetCalories),
    changeReason: 'Initial plan based on your goals — will adapt weekly once you log weight.',
  };
}
