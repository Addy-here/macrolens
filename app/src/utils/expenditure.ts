import type { FoodLogEntry, WeightEntry } from '../types';
import { addDays, entryDateKey, localDateKey } from './date';
import { KCAL_PER_KG } from './planCalculator';
import { trendSeries } from './weight';

/**
 * Energy expenditure measured from the person's own data, the way
 * MacroFactor does it: what they ate on the days they logged, corrected by
 * how their trend weight moved. Eating 2,000 kcal a day while the trend
 * drops 0.5 kg a week means burning about 2,550.
 */

export const WINDOW_DAYS = 28;
/** Logged days needed before the measured number is used at all. */
export const MIN_LOGGED_DAYS = 10;
/** Logged days at which the measured number is trusted fully. */
const FULL_LOGGED_DAYS = 21;

export interface ExpenditureEstimate {
  /** Measured maintenance, kcal a day, blended with the formula until there is enough data. */
  kcal: number;
  /** Measured value alone, before blending. */
  measured: number;
  loggedDays: number;
  /** 0–1: how much of `kcal` comes from the measurement rather than the formula. */
  weight: number;
  avgIntake: number;
  trendChangeKg: number;
  spanDays: number;
}

/** Days with at least one meal count as logged; empty days are left out rather than read as zero. */
export function estimateExpenditure(
  entries: FoodLogEntry[],
  weights: WeightEntry[],
  formula: number,
  now = new Date(),
): ExpenditureEstimate | null {
  const end = localDateKey(now);
  const start = localDateKey(addDays(now, -WINDOW_DAYS));
  // Today is still being eaten, so it's left out.
  const intakeByDay = new Map<string, number>();
  for (const entry of entries) {
    const key = entryDateKey(entry.loggedAt);
    if (key < start || key >= end) continue;
    intakeByDay.set(key, (intakeByDay.get(key) ?? 0) + entry.totalMacros.calories);
  }
  const loggedDays = intakeByDay.size;
  if (loggedDays < MIN_LOGGED_DAYS) return null;

  const series = trendSeries(weights).filter((point) => localDateKey(new Date(point.time)) >= start);
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const spanDays = (last.time - first.time) / 86_400_000;
  if (spanDays < 10) return null;

  let total = 0;
  for (const kcal of intakeByDay.values()) total += kcal;
  const avgIntake = total / loggedDays;
  const trendChangeKg = last.trend - first.trend;
  const measured = avgIntake - (trendChangeKg * KCAL_PER_KG) / spanDays;

  // Partial logging makes the measurement wild; keep it within reason of the formula.
  const clamped = Math.min(Math.max(measured, formula * 0.7), formula * 1.35);
  const weight = Math.min(1, (loggedDays - MIN_LOGGED_DAYS + 1) / (FULL_LOGGED_DAYS - MIN_LOGGED_DAYS + 1));
  const kcal = Math.round((formula * (1 - weight) + clamped * weight) / 10) * 10;
  return { kcal, measured: Math.round(measured), loggedDays, weight, avgIntake: Math.round(avgIntake), trendChangeKg, spanDays };
}

/** Days with a meal logged in the window, not counting today — the same days the estimate uses. */
export function loggedDaysInWindow(entries: FoodLogEntry[], now = new Date()) {
  const end = localDateKey(now);
  const start = localDateKey(addDays(now, -WINDOW_DAYS));
  const days = new Set<string>();
  for (const entry of entries) {
    const key = entryDateKey(entry.loggedAt);
    if (key >= start && key < end) days.add(key);
  }
  return days.size;
}

/** Days since the plan's week started — a check-in is due at 7. */
export function daysSince(dateKey: string, now = new Date()) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const then = new Date(y, (m ?? 1) - 1, d ?? 1).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86_400_000);
}
