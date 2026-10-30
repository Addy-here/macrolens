import type { Macros, Micros } from '../types';

export const emptyMacros: Macros = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

export function sumMacros(list: Macros[]): Macros {
  return list.reduce<Macros>(
    (acc, macros) => ({
      calories: acc.calories + macros.calories,
      proteinG: acc.proteinG + macros.proteinG,
      carbsG: acc.carbsG + macros.carbsG,
      fatG: acc.fatG + macros.fatG,
    }),
    { ...emptyMacros },
  );
}

/** Adds up whatever micronutrients the items carry. Missing values count as zero. */
export function sumMicros(list: (Micros | undefined)[]): Required<Pick<Micros, 'fiberG' | 'sugarG' | 'sodiumMg' | 'saturatedFatG'>> {
  const total = { fiberG: 0, sugarG: 0, sodiumMg: 0, saturatedFatG: 0 };
  for (const micros of list) {
    if (!micros) continue;
    total.fiberG += micros.fiberG ?? 0;
    total.sugarG += micros.sugarG ?? 0;
    total.sodiumMg += micros.sodiumMg ?? 0;
    total.saturatedFatG += micros.saturatedFatG ?? 0;
  }
  return total;
}

/**
 * Daily guide amounts for the extra nutrients, scaled to the calorie target:
 * fiber 14 g per 1,000 kcal; added-sugar and saturated-fat limits at 10% of
 * energy (US Dietary Guidelines); sodium under 2,300 mg.
 */
export function microTargets(calories: number) {
  return {
    fiberG: Math.round((calories / 1000) * 14),
    sugarG: Math.round((calories * 0.1) / 4),
    saturatedFatG: Math.round((calories * 0.1) / 9),
    sodiumMg: 2300,
  };
}
