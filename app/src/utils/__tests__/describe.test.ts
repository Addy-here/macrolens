/// <reference types="jest" />
import { FOODS } from '../../data/foods';
import { itemFromFood, parseDescription, portionLabel, searchFoods } from '../describe';
import { suggestedMeal } from '../meals';

const NOON = new Date(2026, 9, 29, 12, 0);

function parse(text: string) {
  return parseDescription(text, NOON);
}

function summary(text: string) {
  return parse(text).items.map((item) => `${item.unresolved ? '?' : ''}${item.name}|${item.portionGrams}`);
}

describe('food reference', () => {
  it('has unique ids and sane macros', () => {
    const ids = new Set<string>();
    for (const food of FOODS) {
      expect(ids.has(food.id)).toBe(false);
      ids.add(food.id);
      const [kcal, protein, carbs, fat] = food.per100;
      // Energy from macros (4/4/9) should be close to the stated kcal. Alcohol is the known exception,
      // and low-calorie produce runs high because USDA carbs include fiber, which yields far less than 4 kcal/g.
      const fromMacros = protein * 4 + carbs * 4 + fat * 9;
      if (!['beer', 'wine', 'spirit'].includes(food.id) && kcal > 20) {
        expect(Math.abs(fromMacros - kcal) / kcal).toBeLessThan(kcal < 100 ? 0.3 : 0.12);
      }
      expect(food.serving).toBeGreaterThan(0);
    }
  });
});

describe('parseDescription', () => {
  it('reads counts, slices, and a splash of milk', () => {
    expect(summary('Two scrambled eggs, a slice of sourdough with butter and a coffee with milk')).toEqual([
      'Scrambled eggs|122',
      'Sourdough|50',
      'Butter|10',
      'Coffee|240',
      'Milk|30',
    ]);
  });

  it('works on speech with no punctuation', () => {
    expect(summary('i had two eggs toast and an orange juice')).toEqual(['Egg|100', 'Toast|28', 'Orange juice|250']);
  });

  it('reads weights and volumes', () => {
    expect(summary('200g chicken breast and 1.5 cups of rice')).toEqual(['Chicken breast|200', 'Rice|237']);
    expect(summary('12 oz steak')).toEqual(['Steak|340']);
    expect(summary('500 ml of oat milk')).toEqual(['Oat milk|500']);
  });

  it('reads halves and fractions', () => {
    expect(summary('half an avocado')).toEqual(['Avocado|75']);
    expect(summary('one and a half bananas')).toEqual(['Banana|177']);
    expect(summary('1/2 cup of oatmeal')).toEqual(['Oatmeal|117']);
  });

  it('keeps multi-word dishes together', () => {
    expect(summary('mac and cheese and a side salad')).toEqual(['Mac and cheese|200', 'Side salad|60']);
    expect(summary('fish and chips')).toEqual(['Fish and chips|350']);
    expect(summary('a peanut butter and jelly sandwich')).toEqual(['Peanut butter and jelly sandwich|108']);
  });

  it('uses the food’s own units and sizes', () => {
    expect(summary('a pint of beer')).toEqual(['Beer|473']);
    expect(summary('two glasses of red wine')).toEqual(['Red wine|300']);
    expect(summary('a grande latte')).toEqual(['Latte|473']);
    expect(summary('a large banana')).toEqual(['Banana|153']);
    expect(summary('3 slices of pizza')).toEqual(['Pizza|321']);
    expect(summary('a double espresso')).toEqual(['Double espresso|30']);
  });

  it('shows portions in the unit that was said', () => {
    const [eggs] = parse('three eggs').items;
    expect(portionLabel(eggs)).toBe('3 eggs');
    const [rice] = parse('2 cups of rice').items;
    expect(portionLabel(rice)).toBe('2 cups');
    const [chicken] = parse('150 g chicken').items;
    expect(portionLabel(chicken)).toBe('150 g');
  });

  it('computes macros from grams', () => {
    const [egg] = parse('2 eggs').items;
    expect(egg.macros.calories).toBe(143);
    expect(egg.macros.proteinG).toBeCloseTo(12.6, 1);
  });

  it('flags what it can’t match instead of guessing', () => {
    expect(summary('kimchi fried rice and a bowl of pho')).toEqual(['?Kimchi|100', 'Fried rice|300', 'Pho|600']);
    expect(parse('a glass of kombucha').items[0]).toMatchObject({ unresolved: true, name: 'Kombucha' });
  });

  it('reads the meal and day', () => {
    expect(parse('for breakfast I had oatmeal').mealType).toBe('breakfast');
    expect(parse('yesterday for dinner a burger and fries')).toMatchObject({ mealType: 'dinner', dayOffset: -1 });
    expect(parse('last night pizza')).toMatchObject({ mealType: 'dinner', dayOffset: -1 });
    expect(parse('a banana').mealType).toBeUndefined();
  });

  it('does not mistake a dish name for the meal', () => {
    const result = parse('a breakfast burrito');
    expect(result.mealType).toBeUndefined();
    expect(result.items.map((item) => item.name)).toEqual(['Breakfast burrito']);
  });

  it('ignores greetings and talk around the food', () => {
    expect(summary('Hello I ate some rice')).toEqual(['Rice|158']);
    expect(summary('hey can you log a banana please')).toEqual(['Banana|118']);
    expect(summary('a can of coke')).toEqual(['Coke|355']);
    expect(summary('cup of tea')).toEqual(['Tea|240']);
  });

  it('returns nothing for an empty description', () => {
    expect(parse('').items).toEqual([]);
    expect(parse('um I had').items).toEqual([]);
  });
});

describe('confidence', () => {
  it('is confident when every word is a known food', () => {
    expect(parse('an apple and a banana').confident).toBe(true);
    expect(parse('2 eggs, toast with butter and a coffee').confident).toBe(true);
  });

  it('is not confident about unknown words or foods run together', () => {
    expect(parse('kimchi and rice').confident).toBe(false);
    expect(parse('chicken rice').confident).toBe(false);
    expect(parse('hey so I ate like panda express orange chicken and fried rice').confident).toBe(true);
    expect(parse('I had a mcflurry').confident).toBe(false);
  });

  it('drops the talk around a voice note', () => {
    expect(summary('so let me know like you know what else')).toEqual([]);
    expect(summary("I am good. What do you think what you are doing let's go.")).toEqual([]);
    expect(summary("Hi hello, how are you? What's up? What are you doing?")).toEqual([]);
    expect(summary('testing testing, one two three, I had two eggs')).toEqual(['Egg|100']);
  });
});

describe('the wider reference', () => {
  it('knows regional staples and chain dishes', () => {
    expect(summary('two rotis, dal and paneer')).toEqual(['Roti|80', 'Dal|250', 'Paneer|100']);
    expect(summary('panda express orange chicken')).toEqual(['Panda Express orange chicken|162']);
    expect(summary('an egg mcmuffin and a hash brown')).toEqual(['Egg McMuffin|137', 'Hash browns|60']);
    expect(summary('I had panerr')).toEqual(['Paneer|100']);
  });

  it('carries fiber, sugar, sodium, and saturated fat', () => {
    const [banana] = parse('a banana').items;
    expect(banana.micros).toEqual({ fiberG: 3.1, sugarG: 14.4, sodiumMg: 1, saturatedFatG: 0.1 });
  });
});

describe('My Foods first', () => {
  const mine = [
    {
      id: 'my-1',
      name: 'Orange chicken',
      aliases: ['orange chicken'],
      per100: [250, 12, 25, 10] as [number, number, number, number],
      serving: 300,
    },
  ];

  it('matches the person’s own food before the built-in one', () => {
    const [item] = parseDescription('orange chicken', NOON, mine).items;
    expect(item).toMatchObject({ portionGrams: 300, libraryId: 'my-1' });
    expect(item.macros.calories).toBe(750);
  });

  it('ranks the person’s foods first in search', () => {
    expect(searchFoods('orange chicken', 5, mine)[0]).toMatchObject({ mine: true, food: { id: 'my-1' } });
  });
});

describe('searchFoods', () => {
  it('ranks exact and prefix matches first', () => {
    expect(searchFoods('egg')[0].food.id).toBe('egg');
    expect(searchFoods('chick')[0].food.id).toMatch(/chicken|chickpeas/);
    expect(searchFoods('flat white')[0].food.id).toBe('flat-white');
    expect(searchFoods('zzz')).toEqual([]);
  });

  it('builds a default serving item', () => {
    const banana = itemFromFood(FOODS.find((food) => food.id === 'banana')!);
    expect(banana).toMatchObject({ name: 'Banana', portionGrams: 118 });
    expect(portionLabel(banana)).toBe('1 banana');
  });
});

describe('suggestedMeal', () => {
  it('follows the clock, and calls the small hours a snack', () => {
    const at = (h: number, m = 0) => suggestedMeal(new Date(2026, 9, 30, h, m));
    expect([at(0, 26), at(7), at(12), at(16), at(19), at(23)]).toEqual(['snack', 'breakfast', 'lunch', 'snack', 'dinner', 'snack']);
  });
});
