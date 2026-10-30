import type { Food } from './foods';

/**
 * Regional staples and restaurant dishes, added after people used voice
 * logging. Values per 100 g: [kcal, protein, carbs, fat] and
 * [fiber, sugar, sodium mg, saturated fat]. Indian dishes follow typical home
 * or restaurant recipes (IFCT/USDA); chain dishes follow the chains' published
 * nutrition divided by the published serving weight.
 */

const p = (label: string, grams: number, plural = `${label}s`) => ({ label, plural, grams });

export const MORE_FOODS: Food[] = [
  // Indian
  { id: 'paneer', name: 'Paneer', aliases: ['paneer', 'panir', 'paner', 'panner', 'panerr', 'cottage cheese cubes'], per100: [321, 21, 3.6, 25], more: [0, 2.6, 18, 16], serving: 100, piece: p('cube', 25), units: { cup: 150 } },
  { id: 'palak-paneer', name: 'Palak paneer', aliases: ['palak paneer', 'saag paneer', 'spinach paneer'], per100: [150, 7, 6, 11], more: [2, 2, 380, 5], serving: 250, units: { bowl: 250, cup: 240, plate: 300 } },
  { id: 'paneer-tikka', name: 'Paneer tikka', aliases: ['paneer tikka'], per100: [260, 16, 6, 19], more: [1, 3, 450, 10], serving: 150, piece: p('piece', 25) },
  { id: 'paneer-butter-masala', name: 'Paneer butter masala', aliases: ['paneer butter masala', 'paneer makhani', 'shahi paneer', 'kadai paneer', 'matar paneer'], per100: [220, 8, 8, 17], more: [1.5, 4, 420, 9], serving: 250, units: { bowl: 250, cup: 240 } },
  { id: 'butter-chicken', name: 'Butter chicken', aliases: ['butter chicken', 'murgh makhani', 'chicken tikka masala', 'tikka masala'], per100: [175, 13, 6, 11], more: [1, 3.5, 450, 5], serving: 250, units: { bowl: 250, cup: 240, plate: 300 } },
  { id: 'chicken-tikka', name: 'Chicken tikka', aliases: ['chicken tikka', 'tandoori chicken'], per100: [150, 25, 3, 4.5], more: [0.5, 1.5, 500, 1.3], serving: 150, piece: p('piece', 30) },
  { id: 'roti', name: 'Roti', aliases: ['roti', 'rotis', 'chapati', 'chapatti', 'phulka'], per100: [264, 9, 49, 3.7], more: [7, 1, 300, 0.6], serving: 40, piece: p('roti', 40) },
  { id: 'paratha', name: 'Paratha', aliases: ['paratha', 'aloo paratha', 'parantha', 'plain paratha'], per100: [326, 6.4, 45, 13], more: [6, 2, 450, 5], serving: 80, piece: p('paratha', 80) },
  { id: 'naan', name: 'Naan', aliases: ['naan', 'garlic naan', 'butter naan'], per100: [310, 9, 50, 7.5], more: [2, 3.5, 465, 1.8], serving: 90, piece: p('naan', 90) },
  { id: 'dal', name: 'Dal', aliases: ['dal', 'daal', 'dhal', 'dal tadka', 'dal fry', 'toor dal', 'moong dal', 'masoor dal', 'dal makhani'], per100: [130, 6.5, 17, 4], more: [4, 1, 300, 1], serving: 250, units: { bowl: 250, cup: 240 } },
  { id: 'rajma', name: 'Rajma', aliases: ['rajma', 'rajma chawal', 'kidney bean curry'], per100: [125, 6, 17, 3.5], more: [5, 1.5, 320, 0.6], serving: 250, units: { bowl: 250, cup: 240 } },
  { id: 'chole', name: 'Chole', aliases: ['chole', 'chana masala', 'chana', 'chickpea curry', 'chole bhature'], per100: [160, 7, 20, 6], more: [6, 3, 350, 0.8], serving: 250, units: { bowl: 250, cup: 240 } },
  { id: 'biryani', name: 'Chicken biryani', aliases: ['biryani', 'chicken biryani', 'mutton biryani', 'biriyani'], per100: [180, 9, 22, 6.5], more: [1, 1, 450, 2], serving: 350, units: { plate: 350, bowl: 300, cup: 200 } },
  { id: 'veg-biryani', name: 'Veg biryani', aliases: ['veg biryani', 'vegetable biryani', 'pulao', 'pulav', 'veg pulao'], per100: [160, 3.5, 25, 5.5], more: [2, 1.5, 380, 1.5], serving: 300, units: { plate: 300, bowl: 300, cup: 200 } },
  { id: 'jeera-rice', name: 'Jeera rice', aliases: ['jeera rice', 'cumin rice'], per100: [150, 2.8, 27, 3.5], more: [0.6, 0.2, 200, 1.5], serving: 160, units: { cup: 160, bowl: 250, plate: 300 } },
  { id: 'poha', name: 'Poha', aliases: ['poha', 'pohe', 'aval'], per100: [180, 3.5, 30, 5], more: [1.5, 2, 300, 0.7], serving: 200, units: { plate: 200, bowl: 200, cup: 150 } },
  { id: 'upma', name: 'Upma', aliases: ['upma', 'uppittu', 'rava upma'], per100: [190, 4, 27, 7.5], more: [2, 1, 320, 1.5], serving: 200, units: { plate: 200, bowl: 200, cup: 150 } },
  { id: 'idli', name: 'Idli', aliases: ['idli', 'idly', 'idlis'], per100: [130, 4, 27, 0.4], more: [1, 0.3, 230, 0.1], serving: 120, piece: p('idli', 40) },
  { id: 'dosa', name: 'Dosa', aliases: ['dosa', 'plain dosa', 'dosai'], per100: [168, 3.9, 29, 3.7], more: [1, 0.5, 300, 0.6], serving: 100, piece: p('dosa', 100) },
  { id: 'masala-dosa', name: 'Masala dosa', aliases: ['masala dosa', 'mysore masala dosa'], per100: [190, 4, 27, 7.5], more: [2, 1, 400, 1.5], serving: 200, piece: p('dosa', 200) },
  { id: 'sambar', name: 'Sambar', aliases: ['sambar', 'sambhar'], per100: [65, 3, 9, 2], more: [2.5, 2, 330, 0.3], serving: 250, units: { bowl: 250, cup: 240 }, liquid: true },
  { id: 'vada', name: 'Vada', aliases: ['vada', 'medu vada', 'wada'], per100: [290, 10, 30, 15], more: [4, 1, 400, 2], serving: 100, piece: p('vada', 50) },
  { id: 'samosa', name: 'Samosa', aliases: ['samosa', 'samosas'], per100: [308, 5, 32, 18], more: [3, 2, 420, 3.5], serving: 70, piece: p('samosa', 70) },
  { id: 'pakora', name: 'Pakora', aliases: ['pakora', 'pakoda', 'bhaji', 'onion bhaji', 'bhajiya'], per100: [330, 8, 30, 20], more: [4, 2, 450, 2.5], serving: 100, piece: p('pakora', 20) },
  { id: 'khichdi', name: 'Khichdi', aliases: ['khichdi', 'khichri', 'kitchari'], per100: [120, 4.5, 20, 2.5], more: [2.5, 0.5, 300, 1], serving: 250, units: { bowl: 250, cup: 240, plate: 300 } },
  { id: 'raita', name: 'Raita', aliases: ['raita', 'cucumber raita', 'boondi raita'], per100: [60, 3, 5, 3], more: [0.4, 4, 250, 2], serving: 150, units: { bowl: 150, cup: 245 } },
  { id: 'ghee', name: 'Ghee', aliases: ['ghee', 'clarified butter'], per100: [900, 0, 0, 100], more: [0, 0, 2, 62], serving: 5, units: { tsp: 5, tbsp: 13 } },
  { id: 'chai', name: 'Chai', aliases: ['chai', 'masala chai', 'milk tea', 'cutting chai', 'indian tea'], per100: [50, 1.7, 7, 1.7], more: [0, 6.5, 20, 1.1], serving: 150, units: { cup: 150, glass: 200 }, liquid: true },
  { id: 'lassi', name: 'Lassi', aliases: ['lassi', 'sweet lassi', 'mango lassi'], per100: [90, 3, 14, 2.5], more: [0, 13, 45, 1.6], serving: 250, units: { glass: 250, cup: 240 }, liquid: true },
  { id: 'gulab-jamun', name: 'Gulab jamun', aliases: ['gulab jamun', 'gulab jamuns', 'rasgulla', 'jalebi'], per100: [380, 5, 50, 18], more: [0.5, 40, 50, 9], serving: 80, piece: p('piece', 40, 'pieces') },
  { id: 'aloo-gobi', name: 'Aloo gobi', aliases: ['aloo gobi', 'aloo sabzi', 'aloo matar', 'jeera aloo'], per100: [100, 2.5, 11, 5.5], more: [3, 2.5, 350, 0.8], serving: 200, units: { bowl: 200, cup: 180 } },
  { id: 'sabzi', name: 'Sabzi', aliases: ['sabzi', 'subzi', 'sabji', 'bhindi', 'bhindi masala', 'veg curry', 'mixed veg curry', 'baingan bharta'], per100: [100, 2.5, 10, 6], more: [3.5, 3, 350, 0.9], serving: 200, units: { bowl: 200, cup: 180 } },
  { id: 'egg-curry', name: 'Egg curry', aliases: ['egg curry', 'anda curry'], per100: [150, 9, 5, 10.5], more: [1, 2.5, 400, 2.5], serving: 250, units: { bowl: 250, cup: 240 } },
  { id: 'fish-curry', name: 'Fish curry', aliases: ['fish curry', 'goan fish curry', 'macher jhol'], per100: [120, 13, 4, 6], more: [1, 1.5, 420, 3], serving: 250, units: { bowl: 250, cup: 240 } },
  { id: 'pav-bhaji', name: 'Pav bhaji', aliases: ['pav bhaji', 'pao bhaji'], per100: [175, 4, 22, 8], more: [3.5, 4, 450, 3.5], serving: 300, units: { plate: 300 } },
  { id: 'pav', name: 'Pav', aliases: ['pav', 'pao', 'bun'], per100: [290, 8.5, 53, 4.5], more: [2.5, 6, 450, 1.5], serving: 40, piece: p('pav', 40, 'pav') },
  { id: 'dhokla', name: 'Dhokla', aliases: ['dhokla', 'khaman', 'khaman dhokla'], per100: [160, 6, 27, 3.5], more: [2.5, 6, 450, 0.5], serving: 120, piece: p('piece', 30, 'pieces') },
  { id: 'curd', name: 'Curd', aliases: ['curd', 'dahi', 'homemade curd'], per100: [61, 3.5, 4.7, 3.3], more: [0, 4.7, 46, 2.1], serving: 150, units: { bowl: 150, cup: 245, tbsp: 15 } },

  // Chinese-American and Asian
  { id: 'orange-chicken', name: 'Panda Express orange chicken', aliases: ['panda express orange chicken', 'orange chicken', 'panda orange chicken'], per100: [302, 15.4, 31.5, 14.2], more: [0.6, 11.7, 506, 3.1], serving: 162, units: { plate: 162, bowl: 162, serving: 162 } },
  { id: 'kung-pao-chicken', name: 'Kung pao chicken', aliases: ['kung pao chicken', 'kung pao'], per100: [179, 10, 9, 11], more: [1.5, 4, 600, 2], serving: 162, units: { plate: 300, bowl: 250 } },
  { id: 'general-tso', name: "General Tso's chicken", aliases: ["general tso's chicken", 'general tso chicken', 'general tsos chicken', 'general tso', 'sesame chicken'], per100: [290, 13, 29, 13], more: [0.7, 13, 550, 2.5], serving: 200, units: { plate: 300, bowl: 250 } },
  { id: 'sweet-sour-chicken', name: 'Sweet and sour chicken', aliases: ['sweet and sour chicken', 'sweet and sour pork'], per100: [230, 10, 26, 9], more: [0.8, 14, 350, 1.6], serving: 200, units: { plate: 300, bowl: 250 } },
  { id: 'teriyaki-chicken', name: 'Teriyaki chicken', aliases: ['teriyaki chicken', 'chicken teriyaki', 'teriyaki'], per100: [160, 18, 10, 5], more: [0.3, 8, 700, 1.4], serving: 200, units: { plate: 300, bowl: 250 } },
  { id: 'beef-broccoli', name: 'Beef and broccoli', aliases: ['beef and broccoli', 'broccoli beef', 'beef broccoli'], per100: [120, 9, 8, 5.5], more: [1.5, 4, 500, 1.6], serving: 200, units: { plate: 300, bowl: 250 } },
  { id: 'chow-mein', name: 'Chow mein', aliases: ['chow mein', 'panda express chow mein', 'hakka noodles'], per100: [192, 5, 30, 7.5], more: [2.2, 3.4, 330, 1.3], serving: 266, units: { plate: 266, bowl: 266, cup: 200 } },
  { id: 'panda-fried-rice', name: 'Fried rice (Panda Express)', aliases: ['panda express fried rice', 'panda fried rice'], per100: [197, 4.5, 32, 6.1], more: [0.8, 1.1, 322, 1.1], serving: 264, units: { plate: 264, bowl: 264 } },
  { id: 'egg-roll', name: 'Egg roll', aliases: ['egg roll', 'spring roll', 'spring rolls', 'egg rolls'], per100: [250, 6, 27, 13], more: [2, 4, 500, 2.5], serving: 85, piece: p('roll', 85) },
  { id: 'tempeh', name: 'Tempeh', aliases: ['tempeh'], per100: [192, 20, 7.6, 11], more: [5, 0, 9, 2.5], serving: 100 },

  // Breakfast and US chains
  { id: 'egg-mcmuffin', name: 'Egg McMuffin', aliases: ['egg mcmuffin', 'mcmuffin', 'breakfast sandwich', 'egg sandwich', 'bacon egg and cheese'], per100: [226, 12.4, 21.9, 9.5], more: [1.5, 2.2, 555, 4.4], serving: 137, piece: p('sandwich', 137) },
  { id: 'french-toast', name: 'French toast', aliases: ['french toast'], per100: [230, 8, 25, 11], more: [1, 8, 480, 3], serving: 130, piece: p('slice', 65) },
  { id: 'hash-browns', name: 'Hash browns', aliases: ['hash brown', 'hash browns', 'hashbrown'], per100: [265, 2.6, 29, 15], more: [2.7, 0.3, 350, 2.5], serving: 60, piece: p('hash brown', 60) },
  { id: 'overnight-oats', name: 'Overnight oats', aliases: ['overnight oats'], per100: [150, 5.5, 22, 4.5], more: [3, 7, 40, 1], serving: 250, units: { cup: 240, bowl: 250 } },
  { id: 'fried-chicken', name: 'Fried chicken', aliases: ['fried chicken', 'kfc', 'chicken tenders', 'chicken strips', 'popcorn chicken'], per100: [290, 20, 10, 19], more: [0.5, 0.3, 550, 5], serving: 140, piece: p('piece', 140) },
  { id: 'chicken-wrap', name: 'Chicken wrap', aliases: ['chicken wrap', 'wrap sandwich', 'shawarma', 'chicken shawarma', 'kathi roll', 'frankie'], per100: [230, 14, 22, 9], more: [2, 2, 600, 3], serving: 250, piece: p('wrap', 250) },
  { id: 'frappuccino', name: 'Frappuccino', aliases: ['frappuccino', 'frappe', 'caramel frappuccino', 'mocha frappuccino', 'iced blended coffee'], per100: [80, 1, 11.6, 3.3], more: [0, 11, 50, 2.1], serving: 473, units: { cup: 473, glass: 473 }, liquid: true },
  { id: 'mocha', name: 'Mocha', aliases: ['mocha', 'cafe mocha', 'hot chocolate', 'hot cocoa'], per100: [78, 2.8, 9.5, 3.2], more: [0.6, 7.6, 40, 2], serving: 355, units: { cup: 355 }, liquid: true },
  { id: 'boba', name: 'Bubble tea', aliases: ['boba', 'bubble tea', 'boba tea', 'milk tea with boba', 'pearl milk tea'], per100: [75, 0.5, 15, 1.5], more: [0.2, 12, 15, 1.2], serving: 500, units: { cup: 500, bottle: 500 }, liquid: true },
  { id: 'energy-drink', name: 'Energy drink', aliases: ['energy drink', 'red bull', 'monster', 'monster energy'], per100: [45, 0, 11, 0], more: [0, 11, 40, 0], serving: 250, units: { can: 250 }, liquid: true },
  { id: 'string-cheese', name: 'String cheese', aliases: ['string cheese', 'cheese stick'], per100: [280, 24, 3, 18], more: [0, 1, 700, 11], serving: 28, piece: p('stick', 28) },
  { id: 'beef-jerky', name: 'Beef jerky', aliases: ['beef jerky', 'jerky'], per100: [410, 33, 11, 26], more: [1.8, 9, 1785, 11], serving: 28, units: { bag: 28, handful: 28 } },
  { id: 'crackers', name: 'Crackers', aliases: ['crackers', 'cracker', 'saltines', 'ritz'], per100: [480, 8, 64, 21], more: [2.5, 7, 900, 6], serving: 30, piece: p('cracker', 3) },
  { id: 'apple-pie', name: 'Apple pie', aliases: ['apple pie', 'pie'], per100: [237, 1.9, 34, 11], more: [1.6, 16, 200, 4], serving: 125, piece: p('slice', 125) },
];
