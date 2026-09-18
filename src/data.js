// ---------------------------------------------------------------------------
// Rosters.
//
// TWO HARD RULES govern what may be added here. Please respect them in PRs,
// they are the whole reason the art style works and the whole reason the game
// stays friendly to everyone:
//
//   1. EMOJI MUST HAVE NO EYES OF THEIR OWN.
//      Every face in this game is drawn by src/faces.js at runtime, from the
//      individual's genome. An emoji that ships with a vendor-drawn face
//      (🐶 🧸 🌝 🎃 🧿 ...) would end up with four eyes and would not inherit
//      its expression from its parents. So: fruit, food, plants, weather,
//      objects. Nothing that already looks back at you.
//
//   2. NOTHING WITH A POLITICAL READING.
//      No flags, no national or party symbols, no religious symbols, no
//      military insignia, no gestures. Radicals are picked from the Kangxi
//      set and kept to concrete things: nature, animals, tools, body parts.
//
// See docs/ROSTER.md before opening a PR that touches this file.
// ---------------------------------------------------------------------------

// The five phases (五行) plus two extras, used for attack colours and for the
// damage triangle. Purely flavour + a small numeric nudge.
export const ELEMENTS = {
  fire:   { name: '火 fire',   color: '#ff7043', glow: '#ff3d00' },
  water:  { name: '水 water',  color: '#4fc3f7', glow: '#0288d1' },
  wood:   { name: '木 wood',   color: '#81c784', glow: '#2e7d32' },
  metal:  { name: '金 metal',  color: '#e0e0e0', glow: '#90a4ae' },
  earth:  { name: '土 earth',  color: '#d7a86e', glow: '#8d6e63' },
  beast:  { name: '獸 beast',  color: '#f06292', glow: '#ad1457' },
  spirit: { name: '鬼 spirit', color: '#b388ff', glow: '#6200ea' },
};

// 生剋: fire melts metal, metal cuts wood, wood breaks earth, earth soaks
// water, water quenches fire. A defender whose element beats the attacker's
// deals a bit more; the reverse deals a bit less.
const BEATS = {
  fire: 'metal', metal: 'wood', wood: 'earth', earth: 'water', water: 'fire',
  beast: 'spirit', spirit: 'beast',
};

export function elementMultiplier(attacker, defender) {
  if (BEATS[attacker] === defender) return 1.3;
  if (BEATS[defender] === attacker) return 0.78;
  return 1;
}

// --- Defenders: eyeless, apolitical emoji ----------------------------------
// `bias` nudges a species' starting genome before mutation takes over, so a
// 🌰 chestnut starts tanky and a 🌶 chili starts glassy. Selection is free to
// walk any of them anywhere over time — this is only where they begin.
const E = (glyph, name, bias = {}) => ({ id: glyph, glyph, name, bias });

export const EMOJI = [
  // orchard
  E('🍎', 'Apple'),            E('🍊', 'Tangerine', { spd: 0.2 }),
  E('🍋', 'Lemon', { atk: 0.2 }), E('🍌', 'Banana', { spd: 0.3 }),
  E('🍉', 'Watermelon', { hp: 0.4, spd: -0.2 }),
  E('🍇', 'Grapes', { spd: 0.3, hp: -0.2 }),
  E('🍓', 'Strawberry'),       E('🍒', 'Cherries', { spd: 0.25 }),
  E('🍑', 'Peach', { hp: 0.2 }), E('🥭', 'Mango', { atk: 0.15 }),
  E('🍍', 'Pineapple', { def: 0.35 }), E('🥥', 'Coconut', { def: 0.45, spd: -0.25 }),
  E('🥝', 'Kiwi'),             E('🍅', 'Tomato', { hp: 0.15 }),
  // garden
  E('🥑', 'Avocado', { def: 0.2 }), E('🍆', 'Aubergine'),
  E('🥔', 'Potato', { hp: 0.45, spd: -0.3 }), E('🥕', 'Carrot', { atk: 0.25 }),
  E('🌽', 'Corn', { rng: 0.3 }), E('🌶', 'Chili', { atk: 0.5, hp: -0.3 }),
  E('🥒', 'Cucumber'),         E('🥦', 'Broccoli', { def: 0.25 }),
  E('🧄', 'Garlic', { atk: 0.2 }), E('🧅', 'Onion', { hp: 0.25 }),
  E('🍄', 'Mushroom', { spd: 0.2 }), E('🌰', 'Chestnut', { def: 0.5, spd: -0.2 }),
  E('🥜', 'Peanut', { def: 0.3 }),
  // kitchen
  E('🍞', 'Bread', { hp: 0.3 }), E('🥐', 'Croissant', { spd: 0.2 }),
  E('🥨', 'Pretzel'),          E('🧀', 'Cheese', { hp: 0.2 }),
  E('🍕', 'Pizza', { atk: 0.2 }), E('🌮', 'Taco', { spd: 0.2 }),
  E('🥚', 'Egg', { hp: -0.2, spd: 0.35 }), E('🍙', 'Rice Ball', { def: 0.2 }),
  E('🍜', 'Noodles', { rng: 0.25 }), E('🍣', 'Sushi', { atk: 0.2 }),
  E('🍦', 'Ice Cream', { spd: 0.3 }), E('🍩', 'Doughnut'),
  E('🍪', 'Cookie', { atk: 0.15 }), E('🎂', 'Cake', { hp: 0.35, spd: -0.15 }),
  E('🧁', 'Cupcake'),          E('🍫', 'Chocolate', { hp: 0.2 }),
  E('🍭', 'Lollipop', { rng: 0.3 }), E('☕', 'Coffee', { spd: 0.45, hp: -0.25 }),
  E('🍵', 'Tea', { spd: 0.3 }), E('🧊', 'Ice Cube', { def: 0.4 }),
  // green things
  E('🌸', 'Blossom', { spd: 0.25 }), E('🌹', 'Rose', { atk: 0.3 }),
  E('🌻', 'Sunflower', { rng: 0.35 }), E('🌷', 'Tulip'),
  E('🌱', 'Sprout', { hp: -0.3, spd: 0.4 }), E('🌲', 'Pine', { hp: 0.4, spd: -0.25 }),
  E('🌴', 'Palm', { rng: 0.2 }), E('🌵', 'Cactus', { def: 0.45, atk: 0.2 }),
  E('🍀', 'Clover', { spd: 0.2 }), E('🍁', 'Maple', { atk: 0.2 }),
  E('🪨', 'Pebble', { def: 0.6, spd: -0.35 }), E('🪵', 'Log', { hp: 0.5, spd: -0.3 }),
  // weather & shiny
  E('⭐', 'Star', { atk: 0.3, rng: 0.2 }), E('☁️', 'Cloud', { def: 0.3, hp: -0.15 }),
  E('🌈', 'Rainbow', { rng: 0.4 }), E('❄️', 'Snowflake', { spd: 0.25 }),
  E('🔥', 'Flame', { atk: 0.45, hp: -0.25 }), E('💧', 'Droplet', { spd: 0.3 }),
  E('🌊', 'Wave', { atk: 0.25, rng: 0.2 }), E('⚡', 'Bolt', { atk: 0.4, spd: 0.3, hp: -0.3 }),
  E('💎', 'Gem', { def: 0.5, atk: 0.2 }), E('🔮', 'Orb', { rng: 0.45 }),
  E('🎈', 'Balloon', { spd: 0.4, hp: -0.35 }), E('🎁', 'Gift', { hp: 0.3 }),
  E('🔔', 'Bell', { atk: 0.2 }), E('🧩', 'Puzzle', { def: 0.25 }),
  E('🎲', 'Die', { atk: 0.3, hp: -0.15 }), E('⚽', 'Ball', { spd: 0.25 }),
];

// --- Attackers: Kangxi radicals --------------------------------------------
// tier 1 = trash mob, 2 = mid, 3 = heavy. `mass` slows it and fattens it.
const R = (glyph, name, element, tier, mass = 1, extra = {}) =>
  ({ glyph, name, element, tier, mass, ...extra });

export const RADICALS = [
  // 五行
  R('火', 'fire',      'fire',   1, 0.85, { burn: true }),
  R('水', 'water',     'water',  1, 1),
  R('氵', 'splash',    'water',  1, 0.8),
  R('木', 'tree',      'wood',   1, 1.15),
  R('金', 'metal',     'metal',  2, 1.35),
  R('土', 'earth',     'earth',  1, 1.2),
  R('石', 'stone',     'earth',  2, 1.5),
  R('山', 'mountain',  'earth',  3, 2.1, { armour: 0.25 }),
  R('田', 'field',     'earth',  1, 1.1),
  // weather
  R('雨', 'rain',      'water',  2, 1.1),
  R('冫', 'ice',       'water',  1, 0.75, { chill: true }),
  R('风', 'wind',      'wood',   1, 0.6, { swift: true }),
  R('气', 'vapour',    'spirit', 1, 0.65, { swift: true }),
  R('日', 'sun',       'fire',   2, 1.2),
  R('月', 'moon',      'spirit', 2, 1),
  // tools
  R('刀', 'blade',     'metal',  1, 0.9, { pierce: true }),
  R('刂', 'edge',      'metal',  1, 0.8, { pierce: true }),
  R('力', 'force',     'metal',  2, 1.3),
  R('弓', 'bow',       'wood',   2, 0.95, { ranged: true }),
  R('矢', 'arrow',     'metal',  1, 0.7, { swift: true, pierce: true }),
  R('斤', 'axe',       'metal',  2, 1.4),
  R('戈', 'halberd',   'metal',  2, 1.25, { pierce: true }),
  R('网', 'net',       'wood',   2, 1.1, { chill: true }),
  R('糸', 'thread',    'wood',   1, 0.7),
  R('竹', 'bamboo',    'wood',   1, 0.95),
  R('米', 'grain',     'wood',   1, 0.8),
  R('皿', 'dish',      'earth',  1, 1.05),
  R('舟', 'boat',      'wood',   2, 1.4),
  R('车', 'cart',      'metal',  3, 1.9, { armour: 0.2 }),
  R('门', 'gate',      'metal',  3, 2.0, { armour: 0.3 }),
  // creatures
  R('虫', 'bug',       'beast',  1, 0.6, { swift: true }),
  R('鱼', 'fish',      'beast',  1, 0.85),
  R('鸟', 'bird',      'beast',  1, 0.7, { swift: true }),
  R('犬', 'dog',       'beast',  1, 0.9, { swift: true }),
  R('牛', 'ox',        'beast',  2, 1.6),
  R('羊', 'ram',       'beast',  2, 1.25),
  R('马', 'horse',     'beast',  2, 1.15, { swift: true }),
  R('鹿', 'deer',      'beast',  2, 1.1, { swift: true }),
  R('鼠', 'rat',       'beast',  1, 0.55, { swift: true }),
  R('龙', 'dragon',    'spirit', 3, 2.2, { armour: 0.2, burn: true }),
  R('龟', 'tortoise',  'earth',  3, 2.0, { armour: 0.4 }),
  // body
  R('爪', 'claw',      'beast',  1, 0.8, { pierce: true }),
  R('牙', 'fang',      'beast',  1, 0.85, { pierce: true }),
  R('角', 'horn',      'beast',  2, 1.3, { pierce: true }),
  R('骨', 'bone',      'spirit', 2, 1.2),
  R('齿', 'teeth',     'beast',  2, 1.15),
  R('首', 'head',      'spirit', 2, 1.3),
  R('手', 'hand',      'beast',  1, 0.95),
  R('足', 'foot',      'beast',  1, 1),
  R('耳', 'ear',       'spirit', 1, 0.8),
  R('口', 'mouth',     'spirit', 1, 0.9),
  R('目', 'eye',       'spirit', 3, 1.5, { armour: 0.15, terrify: true }),
  R('心', 'heart',     'spirit', 2, 1.1),
  R('毛', 'fur',       'beast',  1, 0.9),
  R('鬼', 'ghost',     'spirit', 3, 1.7, { terrify: true }),
];

export const EMOJI_BY_ID = new Map(EMOJI.map((e) => [e.id, e]));
