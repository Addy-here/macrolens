import * as Haptics from 'expo-haptics';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useReviewStore, type ReviewOrigin } from '../store/useReviewStore';
import { useToastStore } from '../store/useToastStore';
import { addDays, entryDateKey, localDateKey } from '../utils/date';
import { parseDescription } from '../utils/describe';
import { parserLibrarySnapshot } from '../store/useFoodLibraryStore';
import { createId } from '../utils/id';
import { entryTitle, type MealType } from '../utils/meals';
import { estimateFromText, VisionError } from './visionApi';
import type { FoodItem, FoodLogEntry } from '../types';

/**
 * The ways a meal reaches the review sheet. Each one only stages a pending
 * review; the sheet's Confirm is still the single write to the log.
 */

export class DescribeError extends Error {}

export type DescribeMode = 'local' | 'ai';

/**
 * A spoken or typed description → items.
 *
 * `local` uses the on-device match (instant, offline) — what the Log screen
 * showed while you talked. `ai` sends the whole description to the person's
 * provider and uses its answer instead; if that fails, the local match is
 * used and the reason comes back as `note`.
 */
export async function stageDescription(
  text: string,
  origin: Extract<ReviewOrigin, 'voice' | 'text'>,
  mode: DescribeMode,
) {
  const parsed = parseDescription(text, new Date(), parserLibrarySnapshot());
  if (parsed.items.length === 0 && mode === 'local') {
    throw new DescribeError('Nothing to log yet.');
  }

  let items = parsed.items;
  let note: string | undefined;
  let aiUsed = false;
  if (mode === 'ai') {
    try {
      items = (await estimateFromText(text)).map((item) => ({ ...item, heard: item.name }));
      aiUsed = true;
    } catch (error) {
      note = error instanceof VisionError ? error.message : 'The AI estimate failed.';
      if (parsed.items.length === 0) throw new DescribeError(note);
    }
  }

  const { target } = useReviewStore.getState();
  const dateKey = parsed.dayOffset !== 0 ? localDateKey(addDays(new Date(), parsed.dayOffset)) : target?.dateKey;
  useReviewStore.getState().setPending({
    origin,
    items,
    transcript: text.trim(),
    mealType: parsed.mealType ?? target?.mealType,
    mealFrom: parsed.mealType ? 'said' : target ? 'target' : 'clock',
    dateKey,
    aiUsed,
    aiNote: note,
  });
  return { note };
}

/** Re-estimates the meal on the review sheet with AI, from what was said. */
export async function recheckWithAI() {
  const pending = useReviewStore.getState().pending;
  if (!pending?.transcript) return;
  const items = (await estimateFromText(pending.transcript)).map((item) => ({ ...item, heard: item.name }));
  useReviewStore.setState({ pending: { ...pending, items, aiUsed: true, aiNote: undefined } });
}

export function stageEdit(entry: FoodLogEntry) {
  useReviewStore.getState().setPending({
    origin: 'edit',
    items: entry.items.map((item) => ({ ...item })),
    photoUri: entry.photoUri,
    mealType: entry.mealType,
    dateKey: entryDateKey(entry.loggedAt),
    entryId: entry.id,
    loggedAt: entry.loggedAt,
  });
}

export function stageAgain(entry: FoodLogEntry) {
  const { target } = useReviewStore.getState();
  useReviewStore.getState().setPending({
    origin: 'again',
    items: entry.items.map((item) => ({ ...item, id: createId(), userAdjusted: false })),
    photoUri: entry.photoUri,
    mealType: target?.mealType ?? entry.mealType,
    dateKey: target?.dateKey,
  });
}

export function quickAddItem(calories: number): FoodItem {
  return {
    id: createId(),
    name: 'Quick add',
    portionGrams: 1,
    userAdjusted: false,
    source: 'manual-custom',
    macros: { calories: Math.round(calories), proteinG: 0, carbsG: 0, fatG: 0 },
  };
}

export function deleteEntryWithUndo(entry: FoodLogEntry) {
  useFoodLogStore.getState().removeEntry(entry.id);
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  useToastStore.getState().show(`Deleted ${entryTitle(entry.items)}`, {
    label: 'Undo',
    run: () => useFoodLogStore.getState().addEntry(entry),
  });
}

/** When a meal on an earlier day has no time of its own, it gets the usual time for that meal. */
export function loggedAtFor(dateKey: string, mealType: MealType, keep?: string) {
  if (keep && entryDateKey(keep) === dateKey) return keep;
  const today = localDateKey(new Date());
  if (dateKey === today) return new Date().toISOString();
  const [y, m, d] = dateKey.split('-').map(Number);
  const hour = { breakfast: 8, lunch: 12, snack: 15, dinner: 19 }[mealType];
  return new Date(y, m - 1, d, hour, 30).toISOString();
}
