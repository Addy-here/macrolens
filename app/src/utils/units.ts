/**
 * Display units. Everything is stored metric — kilograms, centimetres,
 * kilocalories, grams, millilitres — and converted only at the edge, where a
 * number is shown or typed. Changing a unit never rewrites data.
 */

export type WeightUnit = 'kg' | 'lb' | 'st';
export type HeightUnit = 'cm' | 'ftin';
export type EnergyUnit = 'kcal' | 'kJ';
export type FoodUnit = 'g' | 'oz';
export type WaterUnit = 'ml' | 'floz';

export interface Units {
  weight: WeightUnit;
  height: HeightUnit;
  energy: EnergyUnit;
  food: FoodUnit;
  water: WaterUnit;
}

export const KG_PER_LB = 0.45359237;
export const LB_PER_ST = 14;
export const CM_PER_IN = 2.54;
export const KJ_PER_KCAL = 4.184;
export const G_PER_OZ = 28.349523125;
export const ML_PER_FLOZ = 29.5735295625;

export const METRIC: Units = { weight: 'kg', height: 'cm', energy: 'kcal', food: 'g', water: 'ml' };
export const US: Units = { weight: 'lb', height: 'ftin', energy: 'kcal', food: 'g', water: 'floz' };

/** Imperial defaults where people weigh themselves in pounds; metric everywhere else. */
export function defaultUnits(locale = deviceLocale()): Units {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  if (region === 'US' || region === 'LR' || region === 'MM') return US;
  if (region === 'GB') return { ...METRIC, weight: 'st', height: 'ftin' };
  if (region === 'AU' || region === 'NZ') return { ...METRIC, energy: 'kJ' };
  return METRIC;
}

/** Sunday where the calendar starts on Sunday (US, Canada, Japan…), Monday elsewhere. */
export function defaultWeekStart(locale = deviceLocale()): 0 | 1 {
  const region = locale.split(/[-_]/)[1]?.toUpperCase() ?? '';
  return ['US', 'CA', 'JP', 'MX', 'BR', 'IL', 'PH', 'KR', 'TW', 'HK', 'IN', 'ZA', 'AR', 'CO'].includes(region) ? 0 : 1;
}

function deviceLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

const round = (value: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

// ---------------------------------------------------------------------------
// Body weight

/** Kilograms as the number a scale shows in this unit (stones as decimal stones). */
export function weightValue(kg: number, unit: WeightUnit) {
  if (unit === 'lb') return kg / KG_PER_LB;
  if (unit === 'st') return kg / KG_PER_LB / LB_PER_ST;
  return kg;
}

export function weightToKg(value: number, unit: WeightUnit) {
  if (unit === 'lb') return value * KG_PER_LB;
  if (unit === 'st') return value * LB_PER_ST * KG_PER_LB;
  return value;
}

/** Stones and pounds, pounds to one decimal: 12 st 3.4 lb. */
export function stonesPounds(kg: number) {
  const totalLb = round(kg / KG_PER_LB, 1);
  const st = Math.floor(totalLb / LB_PER_ST);
  const lb = round(totalLb - st * LB_PER_ST, 1);
  return { st, lb };
}

export function weightUnitLabel(unit: WeightUnit) {
  return unit === 'st' ? 'st' : unit;
}

/** "76.0 kg", "167.6 lb", "12 st 3.4 lb". */
export function formatWeight(kg: number, unit: WeightUnit, { digits = 1, withUnit = true } = {}) {
  if (unit === 'st') {
    const { st, lb } = stonesPounds(kg);
    return withUnit ? `${st} st ${lb.toFixed(digits)} lb` : `${st}:${lb.toFixed(digits)}`;
  }
  const shown = weightValue(kg, unit).toFixed(digits);
  return withUnit ? `${shown} ${unit}` : shown;
}

/** Short label for chart ticks: "76.0", "167.6", "12st 3". */
export function weightTick(kg: number, unit: WeightUnit) {
  if (unit === 'st') {
    const totalLb = Math.round(kg / KG_PER_LB);
    return `${Math.floor(totalLb / LB_PER_ST)}st ${totalLb % LB_PER_ST}`;
  }
  return weightValue(kg, unit).toFixed(1);
}

/** Unit a change in weight reads in. Stones users talk about changes in pounds. */
export function deltaUnit(unit: WeightUnit): 'kg' | 'lb' {
  return unit === 'kg' ? 'kg' : 'lb';
}

/** "−1.2 kg", "+0.4 lb". */
export function formatWeightDelta(kg: number, unit: WeightUnit, { signed = true } = {}) {
  const du = deltaUnit(unit);
  const value = round(weightValue(kg, du), 1);
  if (value === 0) return `0.0 ${du}`;
  const sign = !signed ? '' : value > 0 ? '+' : '−';
  return `${sign}${Math.abs(value).toFixed(1)} ${du}`;
}

/** Weekly pace in the unit people think in: "0.5 kg", "1 lb". */
export function formatPace(kgPerWeek: number, unit: WeightUnit) {
  const du = deltaUnit(unit);
  const value = Math.abs(weightValue(kgPerWeek, du));
  const shown = Number.isInteger(round(value, 2)) ? String(round(value, 0)) : String(round(value, 2));
  return `${shown} ${du}`;
}

// ---------------------------------------------------------------------------
// Height

export function feetInches(cm: number) {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}

export function cmFromFeetInches(ft: number, inch: number) {
  return round((ft * 12 + inch) * CM_PER_IN, 1);
}

export function formatHeight(cm: number, unit: HeightUnit) {
  if (unit === 'ftin') {
    const { ft, inch } = feetInches(cm);
    return `${ft}′ ${inch}″`;
  }
  return `${Math.round(cm)} cm`;
}

// ---------------------------------------------------------------------------
// Energy

export function energyValue(kcal: number, unit: EnergyUnit) {
  return Math.round(unit === 'kJ' ? kcal * KJ_PER_KCAL : kcal);
}

export function kcalFromEnergy(value: number, unit: EnergyUnit) {
  return unit === 'kJ' ? value / KJ_PER_KCAL : value;
}

/** "2,150" — rounded and grouped, no unit. */
export function energyNumber(kcal: number, unit: EnergyUnit) {
  return energyValue(kcal, unit).toLocaleString();
}

/** "2,150 kcal", "8,996 kJ". */
export function formatEnergy(kcal: number, unit: EnergyUnit) {
  return `${energyNumber(kcal, unit)} ${unit}`;
}

/** The word for the quantity: "Calories" or "Kilojoules". */
export function energyName(unit: EnergyUnit) {
  return unit === 'kJ' ? 'Kilojoules' : 'Calories';
}

/** Spoken form for VoiceOver. */
export function energySpoken(kcal: number, unit: EnergyUnit) {
  return `${energyValue(kcal, unit)} ${unit === 'kJ' ? 'kilojoules' : 'calories'}`;
}

// ---------------------------------------------------------------------------
// Food weight

export function massValue(grams: number, unit: FoodUnit) {
  return unit === 'oz' ? round(grams / G_PER_OZ, 1) : Math.round(grams);
}

export function gramsFromMass(value: number, unit: FoodUnit) {
  return unit === 'oz' ? value * G_PER_OZ : value;
}

/** "150 g", "5.3 oz". */
export function formatMass(grams: number, unit: FoodUnit) {
  return `${massValue(grams, unit)} ${unit}`;
}

// ---------------------------------------------------------------------------
// Water

export function waterValue(ml: number, unit: WaterUnit) {
  return unit === 'floz' ? Math.round(ml / ML_PER_FLOZ) : Math.round(ml);
}

export function mlFromWater(value: number, unit: WaterUnit) {
  return unit === 'floz' ? value * ML_PER_FLOZ : value;
}

/** "750 ml", "1.5 L", "24 fl oz". */
export function formatWater(ml: number, unit: WaterUnit) {
  if (unit === 'floz') return `${waterValue(ml, unit)} fl oz`;
  if (ml >= 1000) return `${round(ml / 1000, 2).toString()} L`;
  return `${Math.round(ml)} ml`;
}

export function waterUnitLabel(unit: WaterUnit) {
  return unit === 'floz' ? 'fl oz' : 'ml';
}
