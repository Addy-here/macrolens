/// <reference types="jest" />
import { addDays } from '../date';
import { estimateExpenditure } from '../expenditure';
import { buildPlan, dayCalories, macrosFor, splitFor, targetsForDate } from '../planCalculator';
import {
  cmFromFeetInches,
  defaultUnits,
  feetInches,
  formatEnergy,
  formatPace,
  formatWater,
  formatWeight,
  formatWeightDelta,
  stonesPounds,
  weightToKg,
  weightTick,
} from '../units';
import type { FoodLogEntry, UserProfile, WeightEntry } from '../../types';

const PROFILE: UserProfile = {
  id: 'u',
  heightCm: 178,
  startingWeightKg: 80,
  goalWeightKg: 75,
  targetRateKgPerWeek: -0.5,
  activityLevel: 'moderate',
  birthYear: new Date().getFullYear() - 32,
  sex: 'male',
};

describe('units', () => {
  it('formats body weight in every unit', () => {
    expect(formatWeight(76, 'kg')).toBe('76.0 kg');
    expect(formatWeight(76, 'lb')).toBe('167.6 lb');
    expect(formatWeight(76, 'st')).toBe('11 st 13.6 lb');
    expect(stonesPounds(weightToKg(12, 'st'))).toEqual({ st: 12, lb: 0 });
    expect(weightTick(76, 'st')).toBe('12st 0');
  });

  it('reads changes in pounds for stones', () => {
    expect(formatWeightDelta(-1, 'kg')).toBe('−1.0 kg');
    expect(formatWeightDelta(-1, 'st')).toBe('−2.2 lb');
    expect(formatWeightDelta(0.02, 'lb')).toBe('0.0 lb');
    expect(formatPace(-0.5, 'kg')).toBe('0.5 kg');
    expect(formatPace(-weightToKg(1, 'lb'), 'lb')).toBe('1 lb');
  });

  it('round-trips height', () => {
    expect(feetInches(cmFromFeetInches(5, 11))).toEqual({ ft: 5, inch: 11 });
    expect(feetInches(178)).toEqual({ ft: 5, inch: 10 });
  });

  it('formats energy and water', () => {
    expect(formatEnergy(2000, 'kcal')).toBe('2,000 kcal');
    expect(formatEnergy(2000, 'kJ')).toBe('8,368 kJ');
    expect(formatWater(2000, 'ml')).toBe('2 L');
    expect(formatWater(250, 'ml')).toBe('250 ml');
    expect(formatWater(250, 'floz')).toBe('8 fl oz');
  });

  it('picks defaults from the region', () => {
    expect(defaultUnits('en-US').weight).toBe('lb');
    expect(defaultUnits('en-GB').weight).toBe('st');
    expect(defaultUnits('en-AU').energy).toBe('kJ');
    expect(defaultUnits('de-DE')).toMatchObject({ weight: 'kg', height: 'cm', energy: 'kcal' });
  });
});

describe('plan', () => {
  it('builds a target from maintenance and pace', () => {
    const plan = buildPlan(PROFILE, { maintenance: 2600 });
    expect(plan.targetCalories).toBe(2600 - 550);
    expect(plan.basis).toBe('formula');
    expect(plan.targetMacros.proteinG).toBe(Math.round((2050 * 0.3) / 4));
  });

  it('never suggests less than the floor, but respects a typed target', () => {
    const tiny = { ...PROFILE, targetRateKgPerWeek: -1 };
    expect(buildPlan(tiny, { maintenance: 2000 })).toMatchObject({ targetCalories: 1500, floored: true });
    expect(buildPlan({ ...tiny, calorieOverride: 1300 }, { maintenance: 2000 })).toMatchObject({
      targetCalories: 1300,
      basis: 'custom',
      floored: false,
    });
  });

  it('uses the diet style split', () => {
    expect(splitFor({ dietStyle: 'keto' })).toEqual({ protein: 25, carbs: 5, fat: 70 });
    expect(splitFor({ dietStyle: 'custom', customSplit: { protein: 40, carbs: 40, fat: 20 } }).protein).toBe(40);
    expect(macrosFor(2000, { protein: 25, carbs: 5, fat: 70 }).carbsG).toBe(25);
  });

  it('moves calories to the weekend without changing the week', () => {
    const plan = buildPlan({ ...PROFILE, weekendExtraKcal: 300 }, { maintenance: 2600 });
    const week = [0, 1, 2, 3, 4, 5, 6].map((day) => dayCalories(plan.targetCalories, 300, day));
    expect(week.reduce((a, b) => a + b, 0)).toBeCloseTo(plan.targetCalories * 7, -1);
    const saturday = new Date(2026, 9, 31);
    const monday = new Date(2026, 10, 2);
    const sat = targetsForDate(plan, saturday, plan.targetMacros);
    const mon = targetsForDate(plan, monday, plan.targetMacros);
    expect(sat.calories - mon.calories).toBe(420);
    expect(sat.proteinG).toBe(mon.proteinG);
    // Macros still add up to the day's energy.
    const kcal = (m: typeof sat) => m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9;
    expect(Math.abs(kcal(sat) - sat.calories)).toBeLessThan(15);
  });
});

describe('expenditure', () => {
  const now = new Date(2026, 9, 30, 12);
  function data(intake: number, lossPerWeek: number, days = 28) {
    const entries: FoodLogEntry[] = [];
    const weights: WeightEntry[] = [];
    for (let i = days; i >= 1; i--) {
      const day = addDays(now, -i);
      entries.push({
        id: `e${i}`,
        loggedAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).toISOString(),
        mealType: 'lunch',
        items: [],
        totalMacros: { calories: intake, proteinG: 0, carbsG: 0, fatG: 0 },
      });
      weights.push({
        id: `w${i}`,
        loggedAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7).toISOString(),
        weightKg: 80 - (lossPerWeek / 7) * (days - i),
      });
    }
    return { entries, weights };
  }

  it('measures maintenance from intake and the trend', () => {
    const { entries, weights } = data(2000, 0.5);
    const estimate = estimateExpenditure(entries, weights, 2500, now)!;
    expect(estimate.loggedDays).toBeGreaterThanOrEqual(21);
    // 0.5 kg a week is 550 kcal a day; the smoothed trend lags a little behind the scale.
    expect(estimate.measured).toBeGreaterThan(2350);
    expect(estimate.measured).toBeLessThan(2600);
  });

  it('waits for enough logged days', () => {
    const { entries, weights } = data(2000, 0.5, 8);
    expect(estimateExpenditure(entries, weights, 2500, now)).toBeNull();
  });

  it('keeps a wild measurement near the formula', () => {
    const { entries, weights } = data(600, 0);
    expect(estimateExpenditure(entries, weights, 2500, now)!.kcal).toBe(1750);
  });
});
