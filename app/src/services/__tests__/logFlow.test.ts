/// <reference types="jest" />
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
}));
jest.mock('../aiKey', () => ({ readSelectedAiKey: jest.fn() }));
jest.mock('../visionApi', () => {
  const actual = jest.requireActual('../visionApi');
  return { ...actual, estimateFromText: jest.fn() };
});

import { FOODS } from '../../data/foods';
import { useFoodLibraryStore } from '../../store/useFoodLibraryStore';
import { useReviewStore } from '../../store/useReviewStore';
import { addDays, localDateKey } from '../../utils/date';
import { itemFromFood, portionLabel } from '../../utils/describe';
import { DescribeError, loggedAtFor, recheckWithAI, stageDescription } from '../logFlow';
import { estimateFromText, VisionError } from '../visionApi';
import type { FoodItem } from '../../types';

const estimate = estimateFromText as jest.MockedFunction<typeof estimateFromText>;

function aiItem(name: string, calories: number): FoodItem {
  return {
    id: name,
    name,
    portionGrams: 200,
    userAdjusted: false,
    source: 'text-ai',
    macros: { calories, proteinG: 20, carbsG: 30, fatG: 10 },
  };
}

beforeEach(() => {
  useReviewStore.setState({ pending: null, target: null });
  useFoodLibraryStore.setState({ foods: [], links: {} });
  estimate.mockReset();
});

describe('stageDescription', () => {
  it('uses the instant match in local mode, without calling the AI', async () => {
    await stageDescription('two eggs and a banana', 'voice', 'local');
    const pending = useReviewStore.getState().pending!;
    expect(pending).toMatchObject({ origin: 'voice', aiUsed: false, mealFrom: 'clock' });
    expect(pending.items.map((item) => item.name)).toEqual(['Egg', 'Banana']);
    expect(estimate).not.toHaveBeenCalled();
  });

  it('sends the whole description in AI mode and uses its answer instead', async () => {
    estimate.mockResolvedValue({ items: [aiItem('Panda Express orange chicken', 490), aiItem('Fried rice', 520)] });
    await stageDescription('panda express orange chicken and fried rice', 'voice', 'ai');
    expect(estimate).toHaveBeenCalledWith('panda express orange chicken and fried rice');
    const pending = useReviewStore.getState().pending!;
    expect(pending.aiUsed).toBe(true);
    expect(pending.items.map((item) => item.name)).toEqual(['Panda Express orange chicken', 'Fried rice']);
  });

  it('falls back to the instant match, with a note, when the AI fails', async () => {
    estimate.mockRejectedValue(new VisionError('That API key was rejected. Check it in Settings.'));
    const { note } = await stageDescription('kimchi and rice', 'text', 'ai');
    expect(note).toMatch(/rejected/);
    expect(useReviewStore.getState().pending!.items).toHaveLength(2);
  });

  it('carries the spoken meal and day, and otherwise the meal chosen on Today', async () => {
    await stageDescription('yesterday for dinner a burger', 'voice', 'local');
    expect(useReviewStore.getState().pending).toMatchObject({
      mealType: 'dinner',
      mealFrom: 'said',
      dateKey: localDateKey(addDays(new Date(), -1)),
    });

    useReviewStore.getState().setTarget({ mealType: 'snack', dateKey: '2026-10-27' });
    await stageDescription('an apple', 'voice', 'local');
    expect(useReviewStore.getState().pending).toMatchObject({ mealType: 'snack', mealFrom: 'target', dateKey: '2026-10-27' });
  });

  it('refuses an empty description', async () => {
    await expect(stageDescription('um', 'voice', 'local')).rejects.toBeInstanceOf(DescribeError);
  });

  it('re-checks a staged description with AI from the review sheet', async () => {
    await stageDescription('orange and chicken', 'voice', 'local');
    estimate.mockResolvedValue({ items: [aiItem('Orange chicken', 490)], notice: 'Gemini wasn’t available, so OpenRouter’s Claude Haiku 5.5 estimated this.' });
    await recheckWithAI();
    expect(useReviewStore.getState().pending).toMatchObject({
      aiUsed: true,
      items: [{ name: 'Orange chicken' }],
      modelNote: 'Gemini wasn’t available, so OpenRouter’s Claude Haiku 5.5 estimated this.',
    });
  });
});

describe('My Foods', () => {
  it('learns AI estimates that were logged, and matches them next time', async () => {
    useFoodLibraryStore.getState().learn([aiItem('Grandma’s lasagna', 600)]);
    const [food] = useFoodLibraryStore.getState().foods;
    expect(food).toMatchObject({ name: 'Grandma’s lasagna', origin: 'learned', serving: 200 });
    expect(food.per100[0]).toBe(300);

    await stageDescription('grandma’s lasagna', 'voice', 'local');
    expect(useReviewStore.getState().pending!.items[0]).toMatchObject({ name: 'Grandma’s lasagna', portionGrams: 200 });
    expect(useReviewStore.getState().pending!.items[0].macros.calories).toBe(600);
  });

  it('never overwrites a food the person made with a learned one', () => {
    useFoodLibraryStore.setState({
      foods: [{ ...useFoodLibraryStoreFood('Dal'), origin: 'created' }],
      links: {},
    });
    useFoodLibraryStore.getState().learn([aiItem('Dal', 999)]);
    expect(useFoodLibraryStore.getState().foods).toHaveLength(1);
    expect(useFoodLibraryStore.getState().foods[0].origin).toBe('created');
  });

  it('maps a linked phrase to the food it was resolved to', async () => {
    useFoodLibraryStore.getState().link('chips', 'fries');
    await stageDescription('a burger and chips', 'voice', 'local');
    expect(useReviewStore.getState().pending!.items.map((item) => item.name)).toEqual(['Burger', 'French fries']);
  });
});

function useFoodLibraryStoreFood(name: string) {
  return {
    id: `my-${name}`,
    name,
    aliases: [name.toLowerCase()],
    per100: [100, 5, 10, 3] as [number, number, number, number],
    serving: 200,
    updatedAt: new Date().toISOString(),
    origin: 'created' as const,
  };
}

describe('review store', () => {
  it('adds a repeated food to its portion instead of a second row', () => {
    const banana = FOODS.find((food) => food.id === 'banana')!;
    useReviewStore.getState().addItems([itemFromFood(banana)]);
    useReviewStore.getState().addItems([itemFromFood(banana)]);
    const items = useReviewStore.getState().pending!.items;
    expect(items).toHaveLength(1);
    expect(portionLabel(items[0])).toBe('2 bananas');
    expect(items[0].macros.calories).toBe(210);
  });
});

describe('loggedAtFor', () => {
  it('uses now for today, the usual meal time for an earlier day, and keeps an edited meal’s time', () => {
    const today = localDateKey(new Date());
    expect(Math.abs(new Date(loggedAtFor(today, 'lunch')).getTime() - Date.now())).toBeLessThan(2000);
    const earlier = new Date(loggedAtFor('2026-10-20', 'dinner'));
    expect([earlier.getDate(), earlier.getHours()]).toEqual([20, 19]);
    const kept = new Date(2026, 9, 20, 7, 5).toISOString();
    expect(loggedAtFor('2026-10-20', 'breakfast', kept)).toBe(kept);
  });
});
