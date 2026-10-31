import type { WeightEntry } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrendPoint {
  time: number;
  scale: number;
  trend: number;
}

/**
 * Exponentially weighted trend at every weigh-in, so the chart can draw the
 * smoothed line through the noisy scale readings. Same alpha as
 * `usePlanStore.trendWeightKg`.
 */
export function trendSeries(history: WeightEntry[], alpha = 0.25): TrendPoint[] {
  const sorted = [...history].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  let trend = sorted[0]?.weightKg ?? 0;
  return sorted.map((entry, index) => {
    trend = index === 0 ? entry.weightKg : alpha * entry.weightKg + (1 - alpha) * trend;
    return { time: new Date(entry.loggedAt).getTime(), scale: entry.weightKg, trend };
  });
}

export type WeightRange = '1W' | '1M' | '3M' | 'All';

export const WEIGHT_RANGES: WeightRange[] = ['1W', '1M', '3M', 'All'];

const RANGE_DAYS: Record<WeightRange, number> = { '1W': 7, '1M': 30, '3M': 91, All: Infinity };

export function pointsInRange(points: TrendPoint[], range: WeightRange, now = Date.now()) {
  const days = RANGE_DAYS[range];
  if (!Number.isFinite(days)) return points;
  const from = now - days * DAY_MS;
  return points.filter((point) => point.time >= from);
}

/** Date the trend reaches the goal at the planned weekly rate, or null if it never will. */
export function projectedGoalDate(trendKg: number, goalKg: number, ratePerWeek: number) {
  const remaining = goalKg - trendKg;
  if (Math.abs(remaining) < 0.05) return new Date();
  if (ratePerWeek === 0 || Math.sign(remaining) !== Math.sign(ratePerWeek)) return null;
  const weeks = remaining / ratePerWeek;
  return new Date(Date.now() + weeks * 7 * DAY_MS);
}
