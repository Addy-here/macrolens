import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import { useUserStore } from '../store/useUserStore';
import { localDateKey } from '../utils/date';
import { createId } from '../utils/id';
import { daysSince, estimateExpenditure, type ExpenditureEstimate } from '../utils/expenditure';
import { buildPlan, formulaMaintenance } from '../utils/planCalculator';
import { formatEnergy, formatWeightDelta } from '../utils/units';
import { trendSeries } from '../utils/weight';
import type { AdaptivePlan, FoodLogEntry, UserProfile, WeightEntry } from '../types';

/** The latest trend weight, or null with no weigh-ins. */
export function latestTrendKg(weights: WeightEntry[]) {
  const series = trendSeries(weights);
  return series.length ? series[series.length - 1].trend : null;
}

/** What the plan would be today: measured maintenance when there's enough data, the formula otherwise. */
export function proposePlan(
  profile: UserProfile,
  entries: FoodLogEntry[],
  weights: WeightEntry[],
): { plan: AdaptivePlan; estimate: ExpenditureEstimate | null; formula: number } {
  const trend = latestTrendKg(weights) ?? undefined;
  const formula = formulaMaintenance(profile, trend);
  const estimate = estimateExpenditure(entries, weights, formula);
  const plan = buildPlan(profile, {
    maintenance: estimate?.kcal ?? formula,
    weightKg: trend,
    basis: estimate ? 'measured' : 'formula',
  });
  return { plan, estimate, formula };
}

/**
 * The plan an edit produces: built on the best maintenance known right now
 * (measured from intake and trend when there's enough data, the formula
 * otherwise), the same number the Plan tab shows.
 */
export function planFromEdit(profile: UserProfile, entries: FoodLogEntry[], weights: WeightEntry[]) {
  return proposePlan(profile, entries, weights).plan;
}

/** Saves goals from the plan editor and rebuilds the target from them. */
export function savePlanProfile(profile: UserProfile) {
  const { currentPlan, weightHistory, addWeightEntry } = usePlanStore.getState();
  // The first plan starts the weight chart, so goal progress has a starting point.
  if (weightHistory.length === 0) {
    addWeightEntry({ id: createId(), loggedAt: new Date().toISOString(), weightKg: profile.startingWeightKg });
  }
  useUserStore.getState().setProfile(profile);
  const plan = planFromEdit(profile, useFoodLogStore.getState().entries, usePlanStore.getState().weightHistory);
  if (currentPlan && currentPlan.targetCalories !== plan.targetCalories) {
    plan.previousTargetCalories = currentPlan.targetCalories;
  }
  plan.changeReason = currentPlan ? 'Updated from the plan you just saved.' : undefined;
  usePlanStore.getState().setPlan(plan);
  return plan;
}

export interface CheckIn {
  plan: AdaptivePlan;
  estimate: ExpenditureEstimate | null;
  change: number;
  reason: string;
}

/**
 * A weekly check-in, due seven days after the target was last set. Returns
 * null when it isn't due or the person set their own target.
 */
export function pendingCheckIn(
  profile: UserProfile | null,
  current: AdaptivePlan | null,
  entries: FoodLogEntry[],
  weights: WeightEntry[],
): CheckIn | null {
  if (!profile || !current || current.basis === 'custom') return null;
  if (daysSince(current.weekStartDate) < 7) return null;
  const { plan, estimate } = proposePlan(profile, entries, weights);
  const change = plan.targetCalories - current.targetCalories;
  // Nothing measured and nothing to change: no reason to interrupt.
  if (!estimate && change === 0) return null;
  const units = useSettingsStore.getState().units;
  let reason: string;
  if (!estimate) {
    reason = 'Not enough logged days yet to measure your expenditure, so the target follows your weight and activity.';
  } else {
    const weekly = (estimate.trendChangeKg / estimate.spanDays) * 7;
    const moved = Math.abs(weekly) < 0.05 ? 'held steady' : `moved ${formatWeightDelta(weekly, units.weight)} a week`;
    reason = `Over ${estimate.loggedDays} logged days you averaged ${formatEnergy(estimate.avgIntake, units.energy)} and your trend ${moved}, so you burn about ${formatEnergy(estimate.kcal, units.energy)} a day.`;
  }
  return { plan, estimate, change, reason };
}

export function applyCheckIn(checkIn: CheckIn) {
  const current = usePlanStore.getState().currentPlan;
  const units = useSettingsStore.getState().units;
  const next: AdaptivePlan = { ...checkIn.plan };
  if (current && checkIn.change !== 0) {
    next.previousTargetCalories = current.targetCalories;
    const direction = checkIn.change < 0 ? 'lower' : 'higher';
    next.changeReason = `${checkIn.reason} The target is ${formatEnergy(Math.abs(checkIn.change), units.energy)} ${direction}.`;
  } else {
    next.changeReason = `${checkIn.reason} The target stays the same.`;
  }
  usePlanStore.getState().setPlan(next);
  useToastStore.getState().show('Target updated', undefined, 'done');
}

/** Keeps this week's target and asks again in a week. */
export function skipCheckIn() {
  const current = usePlanStore.getState().currentPlan;
  if (!current) return;
  usePlanStore.getState().setPlan({ ...current, weekStartDate: localDateKey(new Date()) });
}
