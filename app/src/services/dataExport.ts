import { Share } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { useFoodLibraryStore } from '../store/useFoodLibraryStore';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useReviewStore } from '../store/useReviewStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useUserStore } from '../store/useUserStore';
import { useWaterStore } from '../store/useWaterStore';
import { entryDateKey, localDateKey } from '../utils/date';
import { mealLabel } from '../utils/meals';
import { energyValue, massValue, waterValue, weightValue } from '../utils/units';

/**
 * Spreadsheet exports, in the person's units, and erasing everything.
 */

const cell = (value: string | number | undefined) => {
  if (value == null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const round1 = (value: number | undefined) => (value == null ? undefined : Math.round(value * 10) / 10);

async function shareCsv(name: string, rows: (string | number | undefined)[][]) {
  const csv = rows.map((row) => row.map(cell).join(',')).join('\n');
  const file = new File(Paths.cache, `${name} ${localDateKey(new Date())}.csv`);
  if (file.exists) file.delete();
  file.create();
  await file.write(csv);
  await Share.share({ url: file.uri, title: name });
}

/** One row per food, so a spreadsheet can total by day, meal, or food. */
export async function exportFoodCsv() {
  const { units } = useSettingsStore.getState();
  const energy = units.energy;
  const rows: (string | number | undefined)[][] = [
    [
      'Date',
      'Time',
      'Meal',
      'Food',
      `Amount (${units.food})`,
      `Energy (${energy})`,
      'Protein (g)',
      'Carbs (g)',
      'Fat (g)',
      'Fiber (g)',
      'Sugar (g)',
      'Saturated fat (g)',
      'Sodium (mg)',
    ],
  ];
  const entries = [...useFoodLogStore.getState().entries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  for (const entry of entries) {
    const when = new Date(entry.loggedAt);
    for (const item of entry.items) {
      if (item.unresolved) continue;
      rows.push([
        entryDateKey(entry.loggedAt),
        when.toTimeString().slice(0, 5),
        mealLabel(entry.mealType),
        item.name,
        massValue(item.portionGrams, units.food),
        energyValue(item.macros.calories, energy),
        round1(item.macros.proteinG),
        round1(item.macros.carbsG),
        round1(item.macros.fatG),
        round1(item.micros?.fiberG),
        round1(item.micros?.sugarG),
        round1(item.micros?.saturatedFatG),
        item.micros?.sodiumMg != null ? Math.round(item.micros.sodiumMg) : undefined,
      ]);
    }
  }
  await shareCsv('Macrolens food log', rows);
}

export async function exportWeightCsv() {
  const { units } = useSettingsStore.getState();
  const unit = units.weight === 'kg' ? 'kg' : 'lb';
  const rows: (string | number | undefined)[][] = [['Date', 'Time', `Weight (${unit})`]];
  for (const entry of usePlanStore.getState().weightHistory) {
    const when = new Date(entry.loggedAt);
    rows.push([entryDateKey(entry.loggedAt), when.toTimeString().slice(0, 5), round1(weightValue(entry.weightKg, unit))]);
  }
  await shareCsv('Macrolens weigh-ins', rows);
}

export async function exportWaterCsv() {
  const { units } = useSettingsStore.getState();
  const rows: (string | number | undefined)[][] = [['Date', `Water (${units.water === 'floz' ? 'fl oz' : 'ml'})`]];
  const byDay = useWaterStore.getState().byDay;
  for (const key of Object.keys(byDay).sort()) rows.push([key, waterValue(byDay[key], units.water)]);
  await shareCsv('Macrolens water', rows);
}

/** Meals, photos, weigh-ins, water, My Foods, and the plan. Units, reminders, and the AI key stay. */
export function eraseAllData() {
  useFoodLogStore.setState({ entries: [] });
  usePlanStore.setState({ currentPlan: null, weightHistory: [] });
  useUserStore.setState({ profile: null, isOnboarded: false });
  useFoodLibraryStore.setState({ foods: [], links: {} });
  useWaterStore.setState({ byDay: {} });
  useReviewStore.getState().clear();
  useReviewStore.getState().setTarget(null);
  const photos = new Directory(Paths.document, 'meal-photos');
  if (photos.exists) photos.delete();
}
