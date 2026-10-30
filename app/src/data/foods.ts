import { NUTRIENTS } from './foodNutrients';
import { MORE_FOODS } from './foodsMore';

/**
 * On-device food reference for spoken and typed logging, so a description
 * becomes foods without an API key or a network. Values are per 100 g
 * (per 100 ml for drinks), rounded from USDA FoodData Central for the
 * common preparation; mixed dishes are typical restaurant versions. They are
 * estimates the user confirms on the review sheet, never silent truth.
 */

export type UnitName =
  | 'piece'
  | 'slice'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'bowl'
  | 'plate'
  | 'glass'
  | 'can'
  | 'bottle'
  | 'scoop'
  | 'handful'
  | 'shot'
  | 'pint'
  | 'bar'
  | 'bag'
  | 'serving';

export interface Food {
  id: string;
  name: string;
  /** Lowercase phrases people say. Plurals are generated. */
  aliases: string[];
  /** kcal, protein, carbs, fat per 100 g. */
  per100: [kcal: number, protein: number, carbs: number, fat: number];
  /** Grams meant by the bare word ("toast with avocado"). */
  serving: number;
  /** A countable unit ("2 eggs"). Its grams are one piece. */
  piece?: { label: string; plural: string; grams: number };
  /** Grams in one of each unit people use for this food. */
  units?: Partial<Record<UnitName, number>>;
  liquid?: boolean;
  /** Fiber, sugar, sodium (mg), saturated fat per 100 g. */
  more?: [fiber: number, sugar: number, sodiumMg: number, satFat: number];
  /** A phrase the person linked to this food; items show the food's own name, not the phrase. */
  linked?: boolean;
}

const p = (label: string, grams: number, plural = `${label}s`) => ({ label, plural, grams });

const BASE_FOODS: Food[] = [
  // Eggs and dairy
  { id: 'egg', name: 'Egg', aliases: ['egg', 'boiled egg', 'hard boiled egg', 'soft boiled egg', 'poached egg', 'large egg'], per100: [143, 12.6, 0.7, 9.5], serving: 50, piece: p('egg', 50) },
  { id: 'fried-egg', name: 'Fried egg', aliases: ['fried egg', 'sunny side up egg', 'over easy egg'], per100: [196, 13.6, 0.8, 15], serving: 46, piece: p('egg', 46) },
  { id: 'scrambled-eggs', name: 'Scrambled eggs', aliases: ['scrambled egg', 'scrambled eggs'], per100: [149, 10, 1.6, 11], serving: 122, piece: p('egg', 61) },
  { id: 'omelette', name: 'Omelette', aliases: ['omelette', 'omelet', 'cheese omelette', 'veggie omelette'], per100: [154, 10.6, 0.6, 11.7], serving: 120, piece: p('omelette', 120) },
  { id: 'egg-white', name: 'Egg whites', aliases: ['egg white', 'egg whites'], per100: [52, 10.9, 0.7, 0.2], serving: 99, piece: p('egg white', 33), units: { cup: 243 } },
  { id: 'milk', name: 'Milk', aliases: ['milk', 'whole milk'], per100: [61, 3.2, 4.8, 3.3], serving: 244, units: { cup: 244, glass: 250, tbsp: 15 }, liquid: true },
  { id: 'milk-2', name: 'Milk, 2%', aliases: ['2% milk', 'two percent milk', 'semi skimmed milk', 'reduced fat milk'], per100: [50, 3.3, 4.8, 2], serving: 244, units: { cup: 244, glass: 250 }, liquid: true },
  { id: 'milk-skim', name: 'Skim milk', aliases: ['skim milk', 'skimmed milk', 'fat free milk', 'nonfat milk'], per100: [34, 3.4, 5, 0.1], serving: 244, units: { cup: 244, glass: 250 }, liquid: true },
  { id: 'oat-milk', name: 'Oat milk', aliases: ['oat milk', 'oatmilk'], per100: [45, 1, 6.5, 1.5], serving: 240, units: { cup: 240, glass: 250 }, liquid: true },
  { id: 'almond-milk', name: 'Almond milk', aliases: ['almond milk'], per100: [15, 0.6, 0.3, 1.2], serving: 240, units: { cup: 240, glass: 250 }, liquid: true },
  { id: 'greek-yogurt', name: 'Greek yogurt', aliases: ['greek yogurt', 'greek yoghurt', 'skyr', 'plain greek yogurt'], per100: [59, 10.3, 3.6, 0.4], serving: 170, units: { cup: 245, tbsp: 15 }, piece: p('pot', 170) },
  { id: 'yogurt', name: 'Yogurt', aliases: ['yogurt', 'yoghurt', 'plain yogurt'], per100: [61, 3.5, 4.7, 3.3], serving: 170, units: { cup: 245, tbsp: 15 }, piece: p('pot', 150) },
  { id: 'cottage-cheese', name: 'Cottage cheese', aliases: ['cottage cheese'], per100: [81, 10.5, 4.8, 2.3], serving: 113, units: { cup: 226, tbsp: 14 } },
  { id: 'cheese', name: 'Cheese', aliases: ['cheddar', 'cheddar cheese', 'cheese'], per100: [403, 25, 1.3, 33], serving: 28, units: { slice: 28, cup: 113 } },
  { id: 'mozzarella', name: 'Mozzarella', aliases: ['mozzarella', 'fresh mozzarella', 'burrata'], per100: [300, 22, 2.2, 22], serving: 56, units: { slice: 28, cup: 112 } },
  { id: 'feta', name: 'Feta', aliases: ['feta', 'feta cheese'], per100: [264, 14, 4, 21], serving: 30, units: { cup: 150, tbsp: 9 } },
  { id: 'parmesan', name: 'Parmesan', aliases: ['parmesan', 'parmigiano', 'parmesan cheese', 'grated parmesan'], per100: [392, 36, 3.2, 26], serving: 10, units: { tbsp: 5, cup: 100 } },
  { id: 'cream-cheese', name: 'Cream cheese', aliases: ['cream cheese', 'philadelphia'], per100: [342, 6, 4, 34], serving: 30, units: { tbsp: 15 } },
  { id: 'butter', name: 'Butter', aliases: ['butter'], per100: [717, 0.9, 0.1, 81], serving: 10, units: { tbsp: 14, tsp: 5, slice: 10 } },

  // Meat, fish, plant protein
  { id: 'chicken-breast', name: 'Chicken breast', aliases: ['chicken breast', 'grilled chicken', 'chicken', 'baked chicken', 'roast chicken', 'chicken fillet'], per100: [165, 31, 0, 3.6], serving: 120, piece: p('breast', 170), units: { cup: 140 } },
  { id: 'chicken-thigh', name: 'Chicken thigh', aliases: ['chicken thigh', 'chicken thighs'], per100: [209, 26, 0, 10.9], serving: 100, piece: p('thigh', 100) },
  { id: 'chicken-nuggets', name: 'Chicken nuggets', aliases: ['chicken nugget', 'chicken nuggets', 'nugget', 'nuggets'], per100: [296, 15, 16, 19], serving: 96, piece: p('nugget', 16) },
  { id: 'ground-beef', name: 'Ground beef', aliases: ['ground beef', 'minced beef', 'beef mince', 'mince'], per100: [250, 26, 0, 15], serving: 113 },
  { id: 'steak', name: 'Steak', aliases: ['steak', 'sirloin', 'ribeye', 'rib eye', 'beef steak', 'filet mignon'], per100: [230, 28, 0, 13], serving: 170, piece: p('steak', 225) },
  { id: 'pork-chop', name: 'Pork chop', aliases: ['pork chop', 'pork', 'pork loin'], per100: [231, 26, 0, 14], serving: 150, piece: p('chop', 150) },
  { id: 'bacon', name: 'Bacon', aliases: ['bacon'], per100: [541, 37, 1.4, 42], serving: 16, piece: p('slice', 8), units: { slice: 8 } },
  { id: 'sausage', name: 'Sausage', aliases: ['sausage', 'breakfast sausage', 'bratwurst'], per100: [333, 19, 1, 28], serving: 45, piece: p('sausage', 45) },
  { id: 'ham', name: 'Ham', aliases: ['ham', 'deli ham'], per100: [145, 21, 1.5, 5.5], serving: 56, units: { slice: 28 } },
  { id: 'turkey', name: 'Turkey', aliases: ['turkey', 'turkey breast', 'deli turkey', 'sliced turkey'], per100: [104, 17, 4, 1.7], serving: 56, units: { slice: 28 } },
  { id: 'salmon', name: 'Salmon', aliases: ['salmon', 'salmon fillet', 'grilled salmon', 'smoked salmon', 'baked salmon'], per100: [206, 22, 0, 12], serving: 150, piece: p('fillet', 150) },
  { id: 'tuna', name: 'Tuna', aliases: ['tuna', 'canned tuna'], per100: [116, 25.5, 0, 0.8], serving: 120, units: { can: 120 } },
  { id: 'white-fish', name: 'White fish', aliases: ['cod', 'tilapia', 'white fish', 'haddock', 'fish'], per100: [105, 23, 0, 0.9], serving: 150, piece: p('fillet', 150) },
  { id: 'shrimp', name: 'Shrimp', aliases: ['shrimp', 'prawn', 'prawns'], per100: [99, 24, 0.2, 0.3], serving: 100, piece: p('shrimp', 6, 'shrimp') },
  { id: 'tofu', name: 'Tofu', aliases: ['tofu', 'firm tofu'], per100: [144, 15.6, 2.8, 8.7], serving: 120, units: { cup: 250 } },
  { id: 'beans', name: 'Beans', aliases: ['black beans', 'beans', 'pinto beans', 'kidney beans'], per100: [132, 8.9, 23.7, 0.5], serving: 86, units: { cup: 172, can: 260 } },
  { id: 'chickpeas', name: 'Chickpeas', aliases: ['chickpeas', 'chickpea', 'garbanzo beans'], per100: [164, 8.9, 27.4, 2.6], serving: 82, units: { cup: 164, can: 250 } },
  { id: 'lentils', name: 'Lentils', aliases: ['lentils', 'lentil'], per100: [116, 9, 20, 0.4], serving: 198, units: { cup: 198, bowl: 250 } },
  { id: 'edamame', name: 'Edamame', aliases: ['edamame'], per100: [121, 11.9, 8.9, 5.2], serving: 75, units: { cup: 155 } },
  { id: 'hummus', name: 'Hummus', aliases: ['hummus', 'houmous'], per100: [166, 7.9, 14.3, 9.6], serving: 30, units: { tbsp: 15, cup: 246 } },
  { id: 'protein-powder', name: 'Protein powder', aliases: ['protein powder', 'whey', 'whey protein'], per100: [380, 78, 8, 6], serving: 30, units: { scoop: 30 } },
  { id: 'protein-shake', name: 'Protein shake', aliases: ['protein shake', 'shake', 'protein drink'], per100: [36, 7, 1, 0.5], serving: 330, units: { bottle: 330, glass: 330, cup: 240 }, liquid: true },
  { id: 'protein-bar', name: 'Protein bar', aliases: ['protein bar', 'quest bar'], per100: [367, 33, 40, 13], serving: 60, piece: p('bar', 60), units: { bar: 60 } },

  // Grains, bread, starch
  { id: 'white-rice', name: 'White rice', aliases: ['rice', 'white rice', 'steamed rice', 'jasmine rice', 'basmati rice', 'basmati', 'sushi rice'], per100: [130, 2.7, 28, 0.3], serving: 158, units: { cup: 158, bowl: 250, plate: 300, tbsp: 12 } },
  { id: 'brown-rice', name: 'Brown rice', aliases: ['brown rice'], per100: [123, 2.7, 25.6, 1], serving: 195, units: { cup: 195, bowl: 250 } },
  { id: 'fried-rice', name: 'Fried rice', aliases: ['fried rice', 'egg fried rice'], per100: [163, 6, 22, 6], serving: 300, units: { cup: 160, bowl: 300, plate: 350 } },
  { id: 'quinoa', name: 'Quinoa', aliases: ['quinoa'], per100: [120, 4.4, 21.3, 1.9], serving: 185, units: { cup: 185, bowl: 250 } },
  { id: 'couscous', name: 'Couscous', aliases: ['couscous'], per100: [112, 3.8, 23, 0.2], serving: 157, units: { cup: 157 } },
  { id: 'pasta', name: 'Pasta', aliases: ['pasta', 'spaghetti', 'penne', 'noodles', 'macaroni', 'linguine', 'fusilli'], per100: [158, 5.8, 31, 0.9], serving: 200, units: { cup: 140, bowl: 250, plate: 300 } },
  { id: 'bolognese', name: 'Spaghetti bolognese', aliases: ['spaghetti bolognese', 'bolognese', 'spag bol', 'pasta bolognese'], per100: [130, 7, 16, 4.5], serving: 400, units: { bowl: 400, plate: 400 } },
  { id: 'mac-and-cheese', name: 'Mac and cheese', aliases: ['mac and cheese', 'macaroni and cheese', 'mac n cheese'], per100: [164, 6.5, 19, 7], serving: 200, units: { cup: 200, bowl: 300 } },
  { id: 'lasagna', name: 'Lasagna', aliases: ['lasagna', 'lasagne'], per100: [135, 8, 13, 5.5], serving: 250, piece: p('piece', 250), units: { slice: 250, plate: 300 } },
  { id: 'oatmeal', name: 'Oatmeal', aliases: ['oatmeal', 'porridge', 'oats'], per100: [71, 2.5, 12, 1.5], serving: 234, units: { cup: 234, bowl: 300 } },
  { id: 'granola', name: 'Granola', aliases: ['granola', 'muesli'], per100: [471, 10, 64, 20], serving: 50, units: { cup: 120, handful: 30, bowl: 60, tbsp: 8 } },
  { id: 'cereal', name: 'Cereal', aliases: ['cereal', 'cornflakes', 'corn flakes', 'cheerios', 'bran flakes'], per100: [370, 8, 82, 2], serving: 40, units: { cup: 30, bowl: 45 } },
  { id: 'white-bread', name: 'Bread', aliases: ['bread', 'toast', 'white bread', 'white toast'], per100: [265, 9, 49, 3.2], serving: 28, piece: p('slice', 28), units: { slice: 28 } },
  { id: 'wheat-bread', name: 'Whole wheat bread', aliases: ['whole wheat bread', 'wholemeal bread', 'brown bread', 'whole grain bread', 'wholewheat toast', 'whole wheat toast', 'multigrain bread'], per100: [252, 12.4, 43, 3.5], serving: 32, piece: p('slice', 32), units: { slice: 32 } },
  { id: 'sourdough', name: 'Sourdough', aliases: ['sourdough', 'sourdough bread', 'sourdough toast'], per100: [272, 10.7, 51.9, 2.4], serving: 50, piece: p('slice', 50), units: { slice: 50 } },
  { id: 'bagel', name: 'Bagel', aliases: ['bagel'], per100: [257, 10, 50, 1.5], serving: 105, piece: p('bagel', 105) },
  { id: 'english-muffin', name: 'English muffin', aliases: ['english muffin'], per100: [227, 8.9, 44, 1.7], serving: 57, piece: p('muffin', 57) },
  { id: 'croissant', name: 'Croissant', aliases: ['croissant', 'pain au chocolat'], per100: [406, 8, 46, 21], serving: 57, piece: p('croissant', 57) },
  { id: 'tortilla', name: 'Tortilla', aliases: ['tortilla', 'wrap', 'flour tortilla'], per100: [312, 8.3, 51, 8.1], serving: 45, piece: p('tortilla', 45) },
  { id: 'pita', name: 'Pita', aliases: ['pita', 'pitta', 'flatbread'], per100: [275, 9, 55, 1.2], serving: 60, piece: p('pita', 60) },
  { id: 'pancakes', name: 'Pancakes', aliases: ['pancake', 'pancakes', 'hotcakes'], per100: [227, 6.4, 28, 9.7], serving: 180, piece: p('pancake', 60) },
  { id: 'waffle', name: 'Waffle', aliases: ['waffle', 'waffles'], per100: [291, 7.9, 33, 14], serving: 75, piece: p('waffle', 75) },
  { id: 'potato', name: 'Potato', aliases: ['potato', 'baked potato', 'boiled potato', 'potatoes', 'jacket potato'], per100: [93, 2.5, 21, 0.1], serving: 173, piece: p('potato', 173), units: { cup: 150 } },
  { id: 'sweet-potato', name: 'Sweet potato', aliases: ['sweet potato', 'yam', 'sweet potatoes'], per100: [90, 2, 21, 0.2], serving: 130, piece: p('sweet potato', 130, 'sweet potatoes'), units: { cup: 200 } },
  { id: 'mashed-potatoes', name: 'Mashed potatoes', aliases: ['mashed potato', 'mashed potatoes', 'mash'], per100: [113, 1.9, 17, 4.2], serving: 210, units: { cup: 210, scoop: 100 } },
  { id: 'fries', name: 'French fries', aliases: ['fries', 'french fries', 'potato wedges', 'wedges'], per100: [312, 3.4, 41, 15], serving: 117, units: { cup: 60, plate: 150, handful: 30 } },

  // Fruit
  { id: 'banana', name: 'Banana', aliases: ['banana'], per100: [89, 1.1, 22.8, 0.3], serving: 118, piece: p('banana', 118) },
  { id: 'apple', name: 'Apple', aliases: ['apple'], per100: [52, 0.3, 13.8, 0.2], serving: 182, piece: p('apple', 182), units: { slice: 20 } },
  { id: 'orange', name: 'Orange', aliases: ['orange', 'clementine', 'mandarin', 'tangerine'], per100: [47, 0.9, 11.8, 0.1], serving: 131, piece: p('orange', 131) },
  { id: 'strawberries', name: 'Strawberries', aliases: ['strawberry', 'strawberries'], per100: [32, 0.7, 7.7, 0.3], serving: 152, piece: p('strawberry', 12, 'strawberries'), units: { cup: 152, handful: 60, bowl: 200 } },
  { id: 'blueberries', name: 'Blueberries', aliases: ['blueberry', 'blueberries', 'berries', 'mixed berries'], per100: [57, 0.7, 14.5, 0.3], serving: 148, units: { cup: 148, handful: 50, bowl: 200 } },
  { id: 'raspberries', name: 'Raspberries', aliases: ['raspberry', 'raspberries', 'blackberries'], per100: [52, 1.2, 12, 0.7], serving: 123, units: { cup: 123, handful: 50 } },
  { id: 'grapes', name: 'Grapes', aliases: ['grape', 'grapes'], per100: [69, 0.7, 18, 0.2], serving: 151, piece: p('grape', 5), units: { cup: 151, handful: 50, bowl: 200 } },
  { id: 'avocado', name: 'Avocado', aliases: ['avocado', 'avo'], per100: [160, 2, 8.5, 14.7], serving: 75, piece: p('avocado', 150), units: { slice: 15, cup: 150 } },
  { id: 'mango', name: 'Mango', aliases: ['mango'], per100: [60, 0.8, 15, 0.4], serving: 165, piece: p('mango', 200), units: { cup: 165, slice: 40 } },
  { id: 'pineapple', name: 'Pineapple', aliases: ['pineapple'], per100: [50, 0.5, 13, 0.1], serving: 165, units: { cup: 165, slice: 85 } },
  { id: 'watermelon', name: 'Watermelon', aliases: ['watermelon', 'melon', 'cantaloupe'], per100: [30, 0.6, 7.6, 0.2], serving: 280, units: { cup: 152, slice: 280 } },
  { id: 'peach', name: 'Peach', aliases: ['peach', 'nectarine', 'plum'], per100: [39, 0.9, 9.5, 0.3], serving: 150, piece: p('peach', 150, 'peaches') },
  { id: 'pear', name: 'Pear', aliases: ['pear'], per100: [57, 0.4, 15, 0.1], serving: 178, piece: p('pear', 178) },
  { id: 'kiwi', name: 'Kiwi', aliases: ['kiwi', 'kiwifruit'], per100: [61, 1.1, 14.7, 0.5], serving: 69, piece: p('kiwi', 69) },
  { id: 'dates', name: 'Dates', aliases: ['date', 'dates', 'medjool date'], per100: [277, 1.8, 75, 0.2], serving: 48, piece: p('date', 24) },
  { id: 'raisins', name: 'Raisins', aliases: ['raisins', 'dried fruit', 'sultanas'], per100: [299, 3.1, 79, 0.5], serving: 30, units: { handful: 30, tbsp: 9, cup: 145 } },

  // Vegetables
  { id: 'broccoli', name: 'Broccoli', aliases: ['broccoli'], per100: [35, 2.4, 7.2, 0.4], serving: 156, units: { cup: 156, handful: 40 } },
  { id: 'spinach', name: 'Spinach', aliases: ['spinach'], per100: [23, 2.9, 3.6, 0.4], serving: 60, units: { cup: 30, handful: 25 } },
  { id: 'salad-greens', name: 'Salad greens', aliases: ['lettuce', 'salad greens', 'mixed greens', 'greens', 'rocket', 'arugula', 'side salad', 'leaves'], per100: [15, 1.4, 2.9, 0.2], serving: 60, units: { cup: 36, handful: 25, bowl: 100 } },
  { id: 'kale', name: 'Kale', aliases: ['kale'], per100: [49, 4.3, 8.8, 0.9], serving: 42, units: { cup: 21, handful: 20 } },
  { id: 'carrot', name: 'Carrot', aliases: ['carrot', 'baby carrots'], per100: [41, 0.9, 9.6, 0.2], serving: 61, piece: p('carrot', 61), units: { cup: 128, handful: 50 } },
  { id: 'tomato', name: 'Tomato', aliases: ['tomato', 'tomatoes', 'cherry tomatoes', 'cherry tomato'], per100: [18, 0.9, 3.9, 0.2], serving: 123, piece: p('tomato', 123, 'tomatoes'), units: { slice: 20, cup: 150 } },
  { id: 'cucumber', name: 'Cucumber', aliases: ['cucumber'], per100: [15, 0.7, 3.6, 0.1], serving: 100, piece: p('cucumber', 300), units: { slice: 7, cup: 120 } },
  { id: 'bell-pepper', name: 'Bell pepper', aliases: ['pepper', 'bell pepper', 'red pepper', 'green pepper', 'capsicum'], per100: [31, 1, 6, 0.3], serving: 120, piece: p('pepper', 120), units: { cup: 92 } },
  { id: 'onion', name: 'Onion', aliases: ['onion', 'onions', 'red onion'], per100: [40, 1.1, 9.3, 0.1], serving: 55, piece: p('onion', 110), units: { cup: 160 } },
  { id: 'mushrooms', name: 'Mushrooms', aliases: ['mushroom', 'mushrooms'], per100: [22, 3.1, 3.3, 0.3], serving: 70, units: { cup: 70, handful: 40 } },
  { id: 'corn', name: 'Corn', aliases: ['corn', 'sweetcorn', 'corn on the cob'], per100: [96, 3.4, 21, 1.5], serving: 100, piece: p('cob', 100), units: { cup: 145 } },
  { id: 'green-beans', name: 'Green beans', aliases: ['green beans', 'string beans'], per100: [35, 1.9, 7.9, 0.3], serving: 125, units: { cup: 125, handful: 50 } },
  { id: 'peas', name: 'Peas', aliases: ['peas', 'green peas'], per100: [84, 5.4, 15.6, 0.2], serving: 80, units: { cup: 160 } },
  { id: 'zucchini', name: 'Zucchini', aliases: ['zucchini', 'courgette'], per100: [17, 1.2, 3.1, 0.3], serving: 124, piece: p('zucchini', 200, 'zucchini'), units: { cup: 124 } },
  { id: 'cauliflower', name: 'Cauliflower', aliases: ['cauliflower'], per100: [25, 1.9, 5, 0.3], serving: 107, units: { cup: 107 } },
  { id: 'asparagus', name: 'Asparagus', aliases: ['asparagus'], per100: [22, 2.4, 4.1, 0.2], serving: 90, piece: p('spear', 15), units: { cup: 180 } },
  { id: 'mixed-veg', name: 'Mixed vegetables', aliases: ['vegetables', 'veggies', 'mixed vegetables', 'mixed veg', 'stir fry vegetables', 'roasted vegetables', 'veg'], per100: [65, 2.9, 13, 0.2], serving: 150, units: { cup: 182, bowl: 250, handful: 50 } },

  // Nuts, fats, condiments
  { id: 'almonds', name: 'Almonds', aliases: ['almond', 'almonds'], per100: [579, 21, 22, 50], serving: 28, piece: p('almond', 1.2), units: { handful: 28, cup: 143 } },
  { id: 'walnuts', name: 'Walnuts', aliases: ['walnut', 'walnuts', 'pecans'], per100: [654, 15, 14, 65], serving: 28, units: { handful: 28, cup: 117 } },
  { id: 'mixed-nuts', name: 'Mixed nuts', aliases: ['nuts', 'mixed nuts', 'cashews', 'peanuts', 'trail mix', 'pistachios'], per100: [607, 20, 21, 54], serving: 28, units: { handful: 28, cup: 137 } },
  { id: 'peanut-butter', name: 'Peanut butter', aliases: ['peanut butter', 'almond butter', 'nut butter'], per100: [588, 25, 20, 50], serving: 32, units: { tbsp: 16, tsp: 5 } },
  { id: 'olive-oil', name: 'Olive oil', aliases: ['olive oil', 'oil', 'cooking oil', 'vegetable oil'], per100: [884, 0, 0, 100], serving: 13.5, units: { tbsp: 13.5, tsp: 4.5 } },
  { id: 'mayo', name: 'Mayonnaise', aliases: ['mayo', 'mayonnaise', 'aioli'], per100: [680, 1, 0.6, 75], serving: 14, units: { tbsp: 14, tsp: 5 } },
  { id: 'ketchup', name: 'Ketchup', aliases: ['ketchup', 'tomato sauce', 'bbq sauce', 'barbecue sauce'], per100: [101, 1, 27, 0.1], serving: 17, units: { tbsp: 17, tsp: 6 } },
  { id: 'dressing', name: 'Salad dressing', aliases: ['dressing', 'salad dressing', 'vinaigrette', 'ranch', 'caesar dressing'], per100: [430, 1, 6, 44], serving: 30, units: { tbsp: 15 } },
  { id: 'salsa', name: 'Salsa', aliases: ['salsa', 'pico de gallo'], per100: [36, 1.5, 7, 0.2], serving: 32, units: { tbsp: 16, cup: 260 } },
  { id: 'guacamole', name: 'Guacamole', aliases: ['guacamole', 'guac'], per100: [155, 2, 8.6, 14], serving: 30, units: { tbsp: 15, cup: 230, scoop: 60 } },
  { id: 'sour-cream', name: 'Sour cream', aliases: ['sour cream', 'creme fraiche'], per100: [198, 2.4, 4.6, 19], serving: 24, units: { tbsp: 12 } },
  { id: 'soy-sauce', name: 'Soy sauce', aliases: ['soy sauce', 'soya sauce', 'tamari'], per100: [53, 8, 4.9, 0.6], serving: 16, units: { tbsp: 16, tsp: 5 } },
  { id: 'honey', name: 'Honey', aliases: ['honey'], per100: [304, 0.3, 82, 0], serving: 21, units: { tbsp: 21, tsp: 7 } },
  { id: 'sugar', name: 'Sugar', aliases: ['sugar', 'brown sugar'], per100: [387, 0, 100, 0], serving: 4.2, units: { tsp: 4.2, tbsp: 12.5 } },
  { id: 'jam', name: 'Jam', aliases: ['jam', 'jelly', 'marmalade'], per100: [278, 0.4, 69, 0.1], serving: 20, units: { tbsp: 20, tsp: 7 } },
  { id: 'maple-syrup', name: 'Maple syrup', aliases: ['maple syrup', 'syrup'], per100: [260, 0, 67, 0.1], serving: 20, units: { tbsp: 20, tsp: 7 } },
  { id: 'cream', name: 'Cream', aliases: ['cream', 'heavy cream', 'double cream', 'half and half', 'creamer'], per100: [340, 2.8, 2.7, 36], serving: 15, units: { tbsp: 15, tsp: 5 } },

  // Drinks
  { id: 'coffee', name: 'Coffee', aliases: ['coffee', 'black coffee', 'americano', 'filter coffee', 'drip coffee', 'cold brew', 'long black'], per100: [1, 0.1, 0, 0], serving: 240, units: { cup: 240, glass: 350 }, liquid: true },
  { id: 'espresso', name: 'Espresso', aliases: ['espresso', 'double espresso'], per100: [9, 0.1, 1.7, 0.2], serving: 30, units: { shot: 30, cup: 60 }, liquid: true },
  { id: 'latte', name: 'Latte', aliases: ['latte', 'cafe latte', 'iced latte', 'chai latte', 'matcha latte'], per100: [40, 2.7, 4, 1.5], serving: 355, units: { cup: 355, glass: 355 }, liquid: true },
  { id: 'cappuccino', name: 'Cappuccino', aliases: ['cappuccino', 'cortado', 'macchiato'], per100: [30, 2, 2.9, 1.1], serving: 240, units: { cup: 240 }, liquid: true },
  { id: 'flat-white', name: 'Flat white', aliases: ['flat white'], per100: [50, 2.7, 4, 2.6], serving: 240, units: { cup: 240 }, liquid: true },
  { id: 'tea', name: 'Tea', aliases: ['tea', 'black tea', 'green tea', 'herbal tea', 'iced tea'], per100: [1, 0, 0.2, 0], serving: 240, units: { cup: 240, glass: 350 }, liquid: true },
  { id: 'orange-juice', name: 'Orange juice', aliases: ['orange juice', 'oj', 'juice', 'apple juice', 'grapefruit juice'], per100: [45, 0.7, 10.4, 0.2], serving: 250, units: { cup: 248, glass: 250, bottle: 330 }, liquid: true },
  { id: 'smoothie', name: 'Smoothie', aliases: ['smoothie', 'fruit smoothie', 'acai bowl'], per100: [60, 1, 14, 0.3], serving: 350, units: { cup: 240, glass: 350, bottle: 450, bowl: 350 }, liquid: true },
  { id: 'soda', name: 'Soda', aliases: ['soda', 'coke', 'cola', 'pepsi', 'sprite', 'soft drink', 'lemonade'], per100: [42, 0, 10.6, 0], serving: 355, units: { can: 355, bottle: 500, glass: 250, cup: 240 }, liquid: true },
  { id: 'zero-drink', name: 'Zero-calorie drink', aliases: ['diet coke', 'diet soda', 'coke zero', 'pepsi max', 'zero sugar soda', 'sparkling water', 'water', 'soda water', 'seltzer'], per100: [0, 0, 0, 0], serving: 355, units: { can: 355, bottle: 500, glass: 250, cup: 240 }, liquid: true },
  { id: 'beer', name: 'Beer', aliases: ['beer', 'lager', 'ale', 'ipa', 'stout'], per100: [43, 0.5, 3.6, 0], serving: 355, units: { can: 355, bottle: 355, pint: 473, glass: 355 }, liquid: true },
  { id: 'wine', name: 'Wine', aliases: ['wine', 'red wine', 'white wine', 'rose', 'prosecco', 'champagne'], per100: [84, 0.1, 2.6, 0], serving: 150, units: { glass: 150, bottle: 750 }, liquid: true },
  { id: 'spirit', name: 'Spirits', aliases: ['vodka', 'whisky', 'whiskey', 'gin', 'rum', 'tequila', 'spirits'], per100: [231, 0, 0, 0], serving: 44, units: { shot: 44, glass: 60 }, liquid: true },

  // Snacks and sweets
  { id: 'dark-chocolate', name: 'Dark chocolate', aliases: ['dark chocolate', '70% chocolate'], per100: [598, 7.8, 46, 43], serving: 20, piece: p('square', 10), units: { bar: 100 } },
  { id: 'chocolate', name: 'Chocolate', aliases: ['chocolate', 'milk chocolate', 'chocolate bar', 'candy bar', 'snickers', 'kit kat'], per100: [535, 7.6, 59, 30], serving: 45, units: { bar: 45, piece: 10 } },
  { id: 'cookie', name: 'Cookie', aliases: ['cookie', 'biscuit', 'chocolate chip cookie', 'oreo'], per100: [488, 5, 64, 24], serving: 35, piece: p('cookie', 35) },
  { id: 'ice-cream', name: 'Ice cream', aliases: ['ice cream', 'gelato', 'frozen yogurt'], per100: [207, 3.5, 24, 11], serving: 132, units: { scoop: 66, cup: 132, bowl: 200 } },
  { id: 'potato-chips', name: 'Potato chips', aliases: ['chips', 'potato chips', 'crisps', 'tortilla chips'], per100: [536, 7, 53, 35], serving: 28, units: { handful: 15, bowl: 60, cup: 20, bag: 28 } },
  { id: 'popcorn', name: 'Popcorn', aliases: ['popcorn'], per100: [450, 10, 60, 20], serving: 30, units: { cup: 11, bowl: 50, handful: 8 } },
  { id: 'granola-bar', name: 'Granola bar', aliases: ['granola bar', 'cereal bar', 'muesli bar', 'kind bar'], per100: [471, 10, 64, 20], serving: 40, piece: p('bar', 40), units: { bar: 40 } },
  { id: 'muffin', name: 'Muffin', aliases: ['muffin', 'blueberry muffin', 'chocolate muffin'], per100: [377, 5, 54, 16], serving: 113, piece: p('muffin', 113) },
  { id: 'donut', name: 'Donut', aliases: ['donut', 'doughnut'], per100: [421, 5, 51, 22], serving: 60, piece: p('donut', 60) },
  { id: 'brownie', name: 'Brownie', aliases: ['brownie'], per100: [466, 6, 57, 24], serving: 56, piece: p('brownie', 56) },
  { id: 'cake', name: 'Cake', aliases: ['cake', 'chocolate cake', 'cheesecake', 'birthday cake', 'carrot cake'], per100: [371, 4.2, 55, 16], serving: 95, piece: p('slice', 95), units: { slice: 95 } },
  { id: 'rice-cake', name: 'Rice cake', aliases: ['rice cake', 'rice cakes'], per100: [387, 8, 82, 2.8], serving: 9, piece: p('rice cake', 9) },

  // Mixed dishes
  { id: 'pizza', name: 'Pizza', aliases: ['pizza', 'cheese pizza', 'margherita', 'margherita pizza', 'pepperoni pizza'], per100: [266, 11, 33, 10], serving: 214, piece: p('slice', 107), units: { slice: 107 } },
  { id: 'burger', name: 'Burger', aliases: ['burger', 'hamburger', 'cheeseburger', 'beef burger', 'big mac'], per100: [255, 13.5, 23, 12.5], serving: 220, piece: p('burger', 220) },
  { id: 'chicken-sandwich', name: 'Chicken sandwich', aliases: ['chicken sandwich', 'chicken burger'], per100: [240, 14, 24, 10], serving: 200, piece: p('sandwich', 200) },
  { id: 'sandwich', name: 'Sandwich', aliases: ['sandwich', 'sub', 'turkey sandwich', 'ham sandwich', 'club sandwich', 'panini', 'blt'], per100: [230, 12, 26, 8], serving: 200, piece: p('sandwich', 200) },
  { id: 'pbj', name: 'PB&J sandwich', aliases: ['peanut butter and jelly sandwich', 'peanut butter and jelly', 'pb and j', 'pbj', 'peanut butter sandwich'], per100: [363, 11, 45, 16], serving: 108, piece: p('sandwich', 108) },
  { id: 'grilled-cheese', name: 'Grilled cheese', aliases: ['grilled cheese', 'cheese toastie', 'toastie'], per100: [330, 11, 28, 19], serving: 120, piece: p('sandwich', 120) },
  { id: 'avocado-toast', name: 'Avocado toast', aliases: ['avocado toast', 'avo toast', 'smashed avocado'], per100: [205, 5, 21, 12], serving: 130, piece: p('slice', 130) },
  { id: 'hot-dog', name: 'Hot dog', aliases: ['hot dog', 'hotdog'], per100: [250, 10, 22, 13], serving: 100, piece: p('hot dog', 100) },
  { id: 'burrito', name: 'Burrito', aliases: ['burrito', 'chicken burrito', 'beef burrito', 'breakfast burrito'], per100: [190, 9.5, 22, 7], serving: 400, piece: p('burrito', 400) },
  { id: 'burrito-bowl', name: 'Burrito bowl', aliases: ['burrito bowl', 'chipotle bowl', 'grain bowl', 'buddha bowl'], per100: [140, 9, 15, 5], serving: 500, units: { bowl: 500 } },
  { id: 'taco', name: 'Taco', aliases: ['taco', 'tacos', 'fish taco', 'chicken taco'], per100: [226, 9, 20, 12], serving: 160, piece: p('taco', 80) },
  { id: 'quesadilla', name: 'Quesadilla', aliases: ['quesadilla'], per100: [290, 13, 24, 16], serving: 180, piece: p('quesadilla', 180) },
  { id: 'sushi', name: 'Sushi', aliases: ['sushi', 'sushi roll', 'california roll', 'maki', 'nigiri', 'sashimi'], per100: [140, 4.5, 22, 3.5], serving: 230, piece: p('piece', 30), units: { plate: 300 } },
  { id: 'poke-bowl', name: 'Poke bowl', aliases: ['poke bowl', 'poke'], per100: [140, 9, 17, 4], serving: 450, units: { bowl: 450 } },
  { id: 'caesar-salad', name: 'Caesar salad', aliases: ['caesar salad', 'chicken caesar salad', 'chicken caesar'], per100: [160, 7, 8, 11], serving: 250, units: { bowl: 250, plate: 300 } },
  { id: 'salad', name: 'Salad', aliases: ['salad', 'garden salad', 'green salad', 'greek salad'], per100: [70, 2, 5, 5], serving: 200, units: { bowl: 200, plate: 250 } },
  { id: 'chicken-salad', name: 'Chicken salad', aliases: ['chicken salad', 'grilled chicken salad', 'cobb salad'], per100: [130, 12, 4, 7.5], serving: 300, units: { bowl: 300, plate: 350 } },
  { id: 'soup', name: 'Soup', aliases: ['soup', 'chicken soup', 'tomato soup', 'vegetable soup', 'chicken noodle soup', 'minestrone', 'lentil soup'], per100: [45, 2.5, 6, 1.4], serving: 300, units: { bowl: 300, cup: 245 }, liquid: true },
  { id: 'ramen', name: 'Ramen', aliases: ['ramen', 'pho', 'noodle soup', 'udon'], per100: [115, 5, 13, 5], serving: 600, units: { bowl: 600 } },
  { id: 'pad-thai', name: 'Pad thai', aliases: ['pad thai', 'stir fry noodles', 'lo mein'], per100: [170, 8, 22, 6], serving: 350, units: { plate: 350, bowl: 350, cup: 200 } },
  { id: 'curry', name: 'Chicken curry', aliases: ['curry', 'chicken curry', 'thai curry', 'green curry'], per100: [150, 12, 6, 9], serving: 250, units: { bowl: 250, cup: 240, plate: 300 } },
  { id: 'stir-fry', name: 'Stir-fry', aliases: ['stir fry', 'chicken stir fry', 'beef stir fry'], per100: [120, 10, 8, 5.5], serving: 300, units: { plate: 300, bowl: 300, cup: 200 } },
  { id: 'chili', name: 'Chili', aliases: ['chili', 'chilli', 'chili con carne'], per100: [110, 8, 9, 4.5], serving: 250, units: { bowl: 250, cup: 250 } },
  { id: 'dumplings', name: 'Dumplings', aliases: ['dumpling', 'dumplings', 'gyoza', 'potstickers', 'dim sum'], per100: [220, 8, 25, 9.5], serving: 150, piece: p('dumpling', 25) },
  { id: 'fish-and-chips', name: 'Fish and chips', aliases: ['fish and chips', 'fish n chips'], per100: [220, 10, 20, 11], serving: 350, units: { plate: 350 } },
  { id: 'chicken-wings', name: 'Chicken wings', aliases: ['chicken wing', 'chicken wings', 'wings', 'buffalo wings'], per100: [290, 27, 0, 19.5], serving: 160, piece: p('wing', 32) },
  { id: 'nachos', name: 'Nachos', aliases: ['nachos'], per100: [306, 8, 32, 17], serving: 250, units: { plate: 250 } },
];

export const FOODS: Food[] = [
  ...BASE_FOODS.map((food) => ({ ...food, more: food.more ?? NUTRIENTS[food.id] })),
  ...MORE_FOODS,
];
