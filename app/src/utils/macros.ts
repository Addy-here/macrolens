import type { Macros } from '../types';

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
