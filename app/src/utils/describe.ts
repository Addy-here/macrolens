import { FOODS, type Food, type UnitName } from '../data/foods';
import type { FoodItem, Micros } from '../types';
import { createId } from './id';
import type { MealType } from './meals';

/**
 * Turns "two scrambled eggs, a slice of sourdough with butter and a flat
 * white for breakfast" into foods with grams and macros, using the on-device
 * food reference. Works on raw speech too, where there is no punctuation.
 * Anything it can't match comes back `unresolved` for the review sheet.
 */

export interface ParsedDescription {
  items: FoodItem[];
  mealType?: MealType;
  /** 0 for today, -1 for yesterday. */
  dayOffset: number;
  /**
   * False when the match looks shaky — words it couldn't place, or foods run
   * together with nothing between them ("orange chicken" as two foods). The
   * app hands those descriptions to the AI when a key is saved.
   */
  confident: boolean;
}

// ---------------------------------------------------------------------------
// Vocabulary

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, dozen: 12, half: 0.5,
  quarter: 0.25, couple: 2, few: 3, several: 3, both: 2, another: 1,
};

type MassUnit = 'g' | 'kg' | 'oz' | 'lb' | 'ml' | 'l';

const MASS_UNITS: Record<string, { unit: MassUnit; grams: number }> = {
  g: { unit: 'g', grams: 1 }, gram: { unit: 'g', grams: 1 }, grams: { unit: 'g', grams: 1 }, gr: { unit: 'g', grams: 1 },
  kg: { unit: 'kg', grams: 1000 }, kilo: { unit: 'kg', grams: 1000 }, kilos: { unit: 'kg', grams: 1000 },
  kilogram: { unit: 'kg', grams: 1000 }, kilograms: { unit: 'kg', grams: 1000 },
  oz: { unit: 'oz', grams: 28.35 }, ounce: { unit: 'oz', grams: 28.35 }, ounces: { unit: 'oz', grams: 28.35 },
  lb: { unit: 'lb', grams: 453.6 }, lbs: { unit: 'lb', grams: 453.6 }, pound: { unit: 'lb', grams: 453.6 },
  pounds: { unit: 'lb', grams: 453.6 },
  ml: { unit: 'ml', grams: 1 }, milliliter: { unit: 'ml', grams: 1 }, milliliters: { unit: 'ml', grams: 1 },
  millilitre: { unit: 'ml', grams: 1 }, millilitres: { unit: 'ml', grams: 1 },
  l: { unit: 'l', grams: 1000 }, liter: { unit: 'l', grams: 1000 }, liters: { unit: 'l', grams: 1000 },
  litre: { unit: 'l', grams: 1000 }, litres: { unit: 'l', grams: 1000 },
};

const UNIT_WORDS: Record<string, UnitName> = {
  piece: 'piece', pieces: 'piece', square: 'piece', squares: 'piece', fillet: 'piece', fillets: 'piece',
  slice: 'slice', slices: 'slice', strip: 'slice', strips: 'slice', rasher: 'slice', rashers: 'slice',
  cup: 'cup', cups: 'cup', mug: 'cup', mugs: 'cup', mugful: 'cup',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tbs: 'tbsp', spoon: 'tbsp', spoons: 'tbsp', spoonful: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  bowl: 'bowl', bowls: 'bowl', bowlful: 'bowl',
  plate: 'plate', plates: 'plate', plateful: 'plate',
  glass: 'glass', glasses: 'glass',
  can: 'can', cans: 'can', tin: 'can', tins: 'can',
  bottle: 'bottle', bottles: 'bottle',
  scoop: 'scoop', scoops: 'scoop',
  handful: 'handful', handfuls: 'handful',
  shot: 'shot', shots: 'shot',
  pint: 'pint', pints: 'pint',
  bar: 'bar', bars: 'bar',
  bag: 'bag', bags: 'bag', packet: 'bag', packets: 'bag', pack: 'bag',
  serving: 'serving', servings: 'serving', portion: 'serving', portions: 'serving', helping: 'serving',
};

/** Grams per unit when a food doesn't define its own. */
const GENERIC_UNIT_GRAMS: Record<UnitName, (food: Food) => number> = {
  piece: (food) => food.piece?.grams ?? food.serving,
  serving: (food) => food.serving,
  slice: () => 30,
  cup: (food) => (food.liquid ? 240 : 150),
  tbsp: () => 15,
  tsp: () => 5,
  bowl: () => 300,
  plate: () => 350,
  glass: () => 250,
  can: () => 355,
  bottle: () => 500,
  scoop: () => 30,
  handful: () => 30,
  shot: () => 44,
  pint: () => 473,
  bar: () => 50,
  bag: () => 30,
};

const UNIT_LABELS: Record<UnitName, [string, string]> = {
  piece: ['piece', 'pieces'], slice: ['slice', 'slices'], cup: ['cup', 'cups'], tbsp: ['tbsp', 'tbsp'],
  tsp: ['tsp', 'tsp'], bowl: ['bowl', 'bowls'], plate: ['plate', 'plates'], glass: ['glass', 'glasses'],
  can: ['can', 'cans'], bottle: ['bottle', 'bottles'], scoop: ['scoop', 'scoops'], handful: ['handful', 'handfuls'],
  shot: ['shot', 'shots'], pint: ['pint', 'pints'], bar: ['bar', 'bars'], bag: ['bag', 'bags'],
  serving: ['serving', 'servings'],
};

/** Size words scale a counted or default portion. Coffee sizes set a volume. */
const SIZES: Record<string, number> = {
  small: 0.75, little: 0.75, mini: 0.5, medium: 1, regular: 1, normal: 1, large: 1.3, big: 1.3,
  huge: 1.6, giant: 1.6, jumbo: 1.6, xl: 1.6,
};
const DRINK_SIZES_ML: Record<string, number> = { tall: 355, grande: 473, venti: 591 };

/** Words that split one food from the next. */
const SEPARATORS = new Set([',', 'and', 'with', 'plus', 'then', 'also', 'alongside', 'followed', 'topped', 'w']);

/** Words that carry no food meaning in a description. */
const FILLER = new Set([
  'i', "i've", 'ive', "i'd", 'id', 'had', 'have', 'has', 'ate', 'eaten', 'eat', 'eating', 'drank', 'drink', 'drinking',
  'just', 'some', 'bit', 'about', 'around', 'approximately', 'roughly', 'like', 'um', 'uh', 'umm', 'er', 'so',
  'today', 'my', 'was', 'were', 'is', 'got', 'grabbed', 'made', 'me', 'for', 'of', 'the', 'on', 'top', 'side',
  'by', 'up', 'to', 'in', 'it', 'its', 'that', 'this', 'there', 'then', 'also', 'had', 'snacked', 'having',
  'cooked', 'grilled', 'baked', 'roasted', 'steamed', 'raw', 'fresh', 'homemade', 'organic', 'plain', 'hot',
  'iced', 'cold', 'warm', 'toasted', 'sliced', 'chopped', 'whole', 'extra', 'light', 'spicy', 'sweet', 'leftover',
  'leftovers', 'quick', 'little', 'tiny', 'side', 'sides', 'pan', 'seared', 'sauteed', 'sautéed', 'oven', 'air',
  'pretty', 'really', 'very', 'large', 'or', 'maybe', 'probably', 'think', 'than', 'less', 'more', 'lunch',
  'breakfast', 'dinner', 'supper', 'brunch', 'snack', 'snacks', 'meal', 'morning', 'night', 'tonight', 'evening',
  'afternoon', 'yesterday', 'last', 'at', 'as', 'we', 'our', 'with', 'along', 'each', 'all', 'too', 'much',
  'shared', 'split', 'which', 'what', 'well', 'okay', 'ok', 'yeah', 'yes', 'no', 'not', 'any', 'into', 'from',
  // Talk people wrap around a voice note.
  'know', 'else', 'guess', 'kind', 'sort', 'stuff', 'thing', 'things', 'something', 'mean', 'tell', 'say', 'said',
  'lot', 'bunch', 'order', 'ordered', 'restaurant', 'place', 'home', 'out', 'went', 'go', 'going', 'did', 'do',
  'feel', 'felt', 'hungry', 'full', 'some', 'also', 'and', 'then', 'there', 'here', 'now', 'earlier', 'later',
  // Small talk that comes through when someone tests the mic or chats before describing the meal.
  'am', 'are', 'be', 'been', 'being', 'doing', 'done', 'how', 'why', 'who', 'when', 'where', 'whats', "what's", 'up',
  'good', 'great', 'fine', 'nice', 'cool', 'awesome', 'thing', 'think', 'thought', 'go', 'gonna', 'wanna', 'yo',
  'your', 'yours', 'us', 'they', 'them', 'he', 'she', 'his', 'her', "it's", "that's", "there's", "i'm", 'im',
  'does', 'doesnt', "doesn't", 'dont', "don't", 'cant', "can't", 'should', 'might', 'must', 'shall', 'testing',
  'test', 'check', 'mic', 'microphone', 'okay', 'hmm', 'mm', 'ah', 'eh', 'oops', 'sorry',
  'hello', 'hi', 'hey', 'hiya', 'so', 'basically', 'actually', 'anyway', 'alright', 'right', 'oh', 'hmm', 'please',
  'thanks', 'thank', 'you', 'log', 'add', 'record', 'track', 'let', 'lets', "let's", 'see', 'can', 'could', 'would',
  'will', 'please', 'want', 'need',
]);

// ---------------------------------------------------------------------------
// Alias index

interface AliasHit {
  food: Food;
  alias: string;
}

/** Shorthand aliases that read badly as an item name. The food's name is shown instead. */
const SHORTHAND = new Set(['avo', 'mash', 'veg', 'whey', 'sub', 'guac', 'pbj', 'oj', 'pb and j', 'mac n cheese',
  'spag bol', 'fish n chips', 'oats', 'large egg', 'ipa', 'blt', 'xl',
  // Spellings that speech recognition produces; the item shows the proper name.
  'panir', 'paner', 'panner', 'panerr', 'chapatti', 'idly', 'idlis', 'pohe', 'biriyani', 'parantha', 'daal', 'dhal',
  'subzi', 'sabji', 'sambhar', 'wada', 'pakoda', 'khichri', 'pao', 'general tsos chicken', 'hashbrown', 'pitta']);

function plural(word: string) {
  if (/(s|x|ch|sh)$/.test(word)) return `${word}es`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/[^aeiou]o$/.test(word)) return `${word}es`;
  return `${word}s`;
}

function token(alias: string) {
  return alias.replace(/\s+/g, '_');
}

interface AliasIndex {
  aliases: Map<string, AliasHit>;
  /** Multi-word aliases, longest first, for joining into one token before splitting. */
  phrases: string[];
}

function buildIndex(foods: Food[]): AliasIndex {
  const aliases = new Map<string, AliasHit>();
  const phrases: string[] = [];
  for (const food of foods) {
    for (const raw of food.aliases) {
      // Same treatment as typed or spoken input: lowercase, straight quotes, single spaces.
      const alias = raw.toLowerCase().replace(/[’‘]/g, "'").replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      if (!alias) continue;
      const words = alias.split(' ');
      const last = words[words.length - 1];
      const forms = new Set([alias, [...words.slice(0, -1), plural(last)].join(' ')]);
      for (const form of forms) {
        const key = token(form);
        if (!aliases.has(key)) aliases.set(key, { food, alias });
        if (form.includes(' ')) phrases.push(form);
      }
    }
  }
  phrases.sort((a, b) => b.length - a.length);
  return { aliases, phrases };
}

const BUILT_IN = buildIndex(FOODS);
const libraryIndexes = new WeakMap<Food[], AliasIndex & { allPhrases: string[] }>();

/**
 * The person's own foods (created, edited, or learned from an AI estimate
 * they logged) are looked up before the built-in reference, so their version
 * of "orange chicken" wins. Cached per library array.
 */
function indexFor(library: Food[]) {
  let index = libraryIndexes.get(library);
  if (!index) {
    const own = buildIndex(library);
    index = {
      ...own,
      allPhrases: [...own.phrases, ...BUILT_IN.phrases].sort((a, b) => b.length - a.length),
    };
    libraryIndexes.set(library, index);
  }
  return index;
}

// ---------------------------------------------------------------------------
// Normalising

const WORD_NUMBER_PATTERN = Object.keys(NUMBER_WORDS).join('|');

function normalise(text: string) {
  let s = ` ${text.toLowerCase()} `;
  s = s.replace(/[’‘]/g, "'").replace(/[“”"]/g, ' ');
  s = s.replace(/½/g, ' 0.5 ').replace(/¼/g, ' 0.25 ').replace(/¾/g, ' 0.75 ');
  s = s.replace(/&/g, ' and ').replace(/\+/g, ' and ');
  // 1 1/2 → 1.5, 1/2 → 0.5
  s = s.replace(/(\d+)\s+(\d+)\/(\d+)/g, (_, w, n, d) => ` ${Number(w) + Number(n) / Number(d)} `);
  s = s.replace(/(\d+)\/(\d+)/g, (_, n, d) => ` ${Number(n) / Number(d)} `);
  // "one and a half", "2 and a half"
  s = s.replace(new RegExp(`\\b(\\d+(?:\\.\\d+)?|${WORD_NUMBER_PATTERN})\\s+and\\s+a\\s+half\\b`, 'g'), (_, n) => {
    const value = Number.isFinite(Number(n)) ? Number(n) : NUMBER_WORDS[n] ?? 1;
    return ` ${value + 0.5} `;
  });
  s = s.replace(/\bhalf\s+(?:of\s+)?(?:a|an)\b/g, ' 0.5 ').replace(/\ba\s+half\b/g, ' 0.5 ');
  s = s.replace(/\ba\s+(couple|few|dozen)(?:\s+of)?\b/g, ' $1 ');
  s = s.replace(/\bx\s*(\d)/g, ' $1');
  // 200g → 200 g, 12oz → 12 oz
  s = s.replace(/(\d)(g|gr|kg|ml|l|oz|lb|lbs)\b/g, '$1 $2');
  // A sentence-ending period separates like a comma; a decimal point does not.
  s = s.replace(/\.(?!\d)/g, ' , ').replace(/[;!?:()]/g, ' , ').replace(/,/g, ' , ');
  s = s.replace(/-/g, ' ').replace(/\s+/g, ' ');
  return s;
}

function readContext(s: string, now: Date) {
  let mealType: MealType | undefined;
  let dayOffset = 0;

  if (/\bday before yesterday\b/.test(s)) dayOffset = -2;
  else if (/\byesterday\b/.test(s) || /\blast night\b/.test(s)) dayOffset = -1;

  const meal = s.match(/\b(breakfast|brunch|lunch|dinner|supper|snack|snacks)\b/);
  if (meal) {
    const word = meal[1];
    mealType =
      word === 'breakfast' || word === 'brunch'
        ? 'breakfast'
        : word === 'lunch'
          ? 'lunch'
          : word === 'snack' || word === 'snacks'
            ? 'snack'
            : 'dinner';
  } else if (/\b(this morning|for brekkie)\b/.test(s)) {
    mealType = 'breakfast';
  } else if (/\b(tonight|last night|this evening)\b/.test(s)) {
    mealType = 'dinner';
  } else if (/\bthis afternoon\b/.test(s)) {
    mealType = now.getHours() < 15 ? 'lunch' : 'snack';
  }

  return { mealType, dayOffset };
}

/** Joins known multi-word foods into single tokens, so "mac and cheese" survives splitting on "and". */
function joinPhrases(s: string, phrases: string[]) {
  // Meal words inside a food name ("breakfast burrito") belong to the food, so join before stripping context.
  let out = s;
  for (const phrase of phrases) {
    if (!out.includes(phrase)) continue;
    out = out.replace(new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g'), `$1${token(phrase)}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parsing

interface Pending {
  quantity?: number;
  unit?: UnitName;
  mass?: { unit: MassUnit; grams: number };
  size?: number;
  drinkMl?: number;
  afterWith: boolean;
  words: string[];
}

function emptyPending(afterWith = false): Pending {
  return { afterWith, words: [] };
}

function readNumber(word: string) {
  if (/^\d+(\.\d+)?$/.test(word)) return Number(word);
  return NUMBER_WORDS[word];
}

const NO_LIBRARY: Food[] = [];

export function parseDescription(text: string, now = new Date(), library: Food[] = NO_LIBRARY): ParsedDescription {
  const index = indexFor(library);
  const lookup = (word: string) => index.aliases.get(word) ?? BUILT_IN.aliases.get(word);
  const normalised = normalise(text);
  const joined = joinPhrases(normalised, index.allPhrases);
  const context = readContext(joined, now);
  const tokens = joined.trim().split(' ').filter(Boolean);

  const items: FoodItem[] = [];
  let pending = emptyPending();
  /** A food right after another food, with nothing in between, is usually one dish the reference doesn't know. */
  let runTogether = false;
  let previousWasFood = false;

  const flushUnresolved = () => {
    const words = pending.words.filter((word) => !FILLER.has(word) && readNumber(word) === undefined);
    if (words.length > 0) {
      const phrase = words.join(' ').replace(/_/g, ' ');
      items.push(unresolvedItem(phrase));
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];

    if (SEPARATORS.has(word)) {
      previousWasFood = false;
      flushUnresolved();
      const lastFood = items[items.length - 1];
      pending = emptyPending(word === 'with' || word === 'w' || word === 'topped' ? Boolean(lastFood) : false);
      continue;
    }

    const hit = lookup(word);
    if (hit) {
      const nothingBetween =
        pending.quantity === undefined && !pending.unit && !pending.mass && pending.words.length === 0;
      if (previousWasFood && nothingBetween) runTogether = true;
      // Words before the food that weren't modifiers (e.g. "kimchi" in "kimchi eggs") are their own unknown item.
      flushUnresolved();
      const previous = items[items.length - 1];
      items.push(buildItem(hit, pending, previous, word));
      pending = emptyPending();
      previousWasFood = true;
      continue;
    }
    if (!FILLER.has(word)) previousWasFood = false;

    const number = readNumber(word);
    if (number !== undefined) {
      // "a" before a quantity word ("a couple") or a unit doesn't count twice.
      pending.quantity = pending.quantity !== undefined && (word === 'a' || word === 'an') ? pending.quantity : number;
      if (word === 'a' || word === 'an' || word === 'another') pending.quantity = pending.quantity ?? 1;
      continue;
    }

    const mass = MASS_UNITS[word];
    if (mass && pending.quantity !== undefined) {
      pending.mass = mass;
      continue;
    }

    // A unit needs an amount before it ("a can of coke") or "of" after it ("cup of tea"),
    // so the verb in "can you log a banana" isn't read as a 355 ml can.
    const unit = UNIT_WORDS[word];
    if (unit && (pending.quantity !== undefined || tokens[i + 1] === 'of')) {
      pending.unit = unit;
      continue;
    }

    if (word in DRINK_SIZES_ML) {
      pending.drinkMl = DRINK_SIZES_ML[word];
      continue;
    }

    if (word in SIZES) {
      pending.size = SIZES[word];
      continue;
    }

    if (word === 'double' || word === 'triple') {
      pending.quantity = (pending.quantity ?? 1) * (word === 'double' ? 2 : 3);
      continue;
    }

    pending.words.push(word);
  }
  flushUnresolved();

  const confident = !runTogether && items.every((item) => !item.unresolved);
  return { items, ...context, confident };
}

function buildItem(hit: AliasHit, pending: Pending, previous: FoodItem | undefined, said: string): FoodItem {
  const { food } = hit;
  let grams: number;
  let serving: FoodItem['serving'];

  if (pending.mass) {
    grams = (pending.quantity ?? 1) * pending.mass.grams;
  } else if (pending.unit) {
    const unitGrams = food.units?.[pending.unit] ?? GENERIC_UNIT_GRAMS[pending.unit](food);
    const sized = pending.unit === 'piece' || pending.unit === 'serving' ? (pending.size ?? 1) : 1;
    grams = (pending.quantity ?? 1) * unitGrams * sized;
    const [label, pluralLabel] =
      pending.unit === 'piece' && food.piece ? [food.piece.label, food.piece.plural] : UNIT_LABELS[pending.unit];
    serving = { label, plural: pluralLabel, grams: Math.round(unitGrams * sized * 10) / 10 };
  } else if (pending.drinkMl && food.liquid) {
    grams = (pending.quantity ?? 1) * pending.drinkMl;
  } else if (pending.quantity !== undefined) {
    const each = (food.piece?.grams ?? food.serving) * (pending.size ?? 1);
    grams = pending.quantity * each;
    if (food.piece) serving = { ...food.piece, grams: Math.round(each * 10) / 10 };
  } else {
    grams = food.serving * (pending.size ?? 1);
    // "coffee with milk" is a splash, not a glass.
    if (pending.afterWith && previous && food.liquid && grams > 60) grams = 30;
    if (food.piece && Math.abs(grams / food.piece.grams - Math.round(grams / food.piece.grams)) < 0.01) {
      serving = food.piece;
    }
  }

  grams = Math.max(1, Math.round(grams));
  const ratio = grams / 100;
  const [kcal, protein, carbs, fat] = food.per100;
  const said_ = said.replace(/_/g, ' ');

  return {
    id: createId(),
    // A linked phrase or one of the person's own foods shows the name they gave it.
    name: food.linked || food.id.startsWith('my-') ? food.name : displayName(food, hit.alias),
    portionGrams: grams,
    userAdjusted: false,
    source: 'food-db',
    serving,
    heard: said_,
    macros: {
      calories: Math.round(kcal * ratio),
      proteinG: Math.round(protein * ratio * 10) / 10,
      carbsG: Math.round(carbs * ratio * 10) / 10,
      fatG: Math.round(fat * ratio * 10) / 10,
    },
    micros: food.more ? microsFor(food.more, ratio) : undefined,
    libraryId: food.id.startsWith('my-') ? food.id : undefined,
  };
}

function microsFor([fiber, sugar, sodium, satFat]: NonNullable<Food['more']>, ratio: number): Micros {
  const tenth = (value: number) => Math.round(value * ratio * 10) / 10;
  return { fiberG: tenth(fiber), sugarG: tenth(sugar), sodiumMg: Math.round(sodium * ratio), saturatedFatG: tenth(satFat) };
}

/** The words the person used ("Basmati rice", "Pepsi"), unless that's shorthand or just the name in another number. */
function displayName(food: Food, alias: string) {
  const name = food.name.toLowerCase();
  if (SHORTHAND.has(alias) || alias.length <= 2 || alias === name || plural(alias) === name) return food.name;
  return alias.charAt(0).toUpperCase() + alias.slice(1);
}

function unresolvedItem(phrase: string): FoodItem {
  return {
    id: createId(),
    name: phrase.charAt(0).toUpperCase() + phrase.slice(1),
    portionGrams: 100,
    userAdjusted: false,
    source: 'food-db',
    heard: phrase,
    unresolved: true,
    macros: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  };
}

// ---------------------------------------------------------------------------
// Search

export interface FoodMatch {
  food: Food;
  alias: string;
  /** One of the person's own foods. */
  mine: boolean;
}

/**
 * Ranked matches for a search box: exact, then prefix, then word-prefix, then
 * substring. The person's own foods come first at the same strength, and a
 * built-in food they've replaced with their own version isn't shown twice.
 */
export function searchFoods(query: string, limit = 25, library: Food[] = NO_LIBRARY): FoodMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const replaced = new Set(library.map((food) => (food as Food & { replaces?: string }).replaces).filter(Boolean));
  const scored = new Map<string, { match: FoodMatch; score: number }>();
  const candidates = [
    ...library.map((food) => ({ food, mine: true })),
    ...FOODS.filter((food) => !replaced.has(food.id)).map((food) => ({ food, mine: false })),
  ];
  for (const { food, mine } of candidates) {
    for (const alias of [food.name.toLowerCase(), ...food.aliases]) {
      let score = 0;
      if (alias === q) score = 100;
      else if (alias.startsWith(q)) score = 80 - alias.length / 10;
      else if (alias.split(' ').some((word) => word.startsWith(q))) score = 60 - alias.length / 10;
      else if (alias.includes(q)) score = 40 - alias.length / 10;
      if (score === 0) continue;
      if (mine) score += 5;
      const existing = scored.get(food.id);
      if (!existing || existing.score < score) {
        scored.set(food.id, {
          match: { food, alias: alias === food.name.toLowerCase() ? food.aliases[0] ?? alias : alias, mine },
          score,
        });
      }
    }
  }
  return [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.match);
}

/** One default serving of a food, as an item ready for review. */
export function itemFromFood(food: Food, alias = food.aliases[0]): FoodItem {
  const parsed = buildItem({ food, alias }, emptyPending(), undefined, token(alias));
  return { ...parsed, heard: undefined };
}

/** Food names handed to the speech recognizer so it favours them. */
export const SPEECH_HINTS: string[] = FOODS.flatMap((food) => food.aliases.slice(0, 2)).filter(
  (alias, index, all) => alias.length > 3 && all.indexOf(alias) === index,
);

/** "2 eggs", "1.5 cups", or "150 g". */
export function portionLabel(item: Pick<FoodItem, 'portionGrams' | 'serving'>) {
  if (item.serving && item.serving.grams > 0) {
    const count = Math.round((item.portionGrams / item.serving.grams) * 4) / 4;
    const shown = Number.isInteger(count) ? String(count) : String(Math.round(count * 100) / 100);
    return `${shown} ${count === 1 ? item.serving.label : item.serving.plural}`;
  }
  return `${item.portionGrams} g`;
}
