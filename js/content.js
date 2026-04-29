// Content for high-level systems: quests, weather, decorations, dungeons,
// tournament opponents, companion templates.

// ---------- WEATHER ----------
const WEATHER = {
  clear: { name: "Clear",         desc: "Calm skies.",                                   cultMul: 1.0, particles: null },
  rain:  { name: "Rain",          desc: "Soft rain waters every plot.",                  cultMul: 1.2, particles: "rain" },
  storm: { name: "Spirit Storm",  desc: "Thunder rouses the qi. Beware lightning beasts.", cultMul: 1.4, particles: "storm" },
  snow:  { name: "Snow",          desc: "The mountain quiets — no herbs grow today.",    cultMul: 1.1, particles: "snow" },
  mist:  { name: "Spirit Mist",   desc: "Heavy mist. Rare beasts wander the forest.",    cultMul: 1.0, particles: "mist" },
};

const WEATHER_TABLE = ["clear", "clear", "clear", "rain", "rain", "snow", "storm", "mist", "clear"];

function pickWeather(day) {
  // Slight bias: more storms in late game.
  const pool = WEATHER_TABLE.slice();
  if (day > 20) pool.push("storm", "rain");
  if (day > 40) pool.push("storm", "mist");
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------- QUESTS ----------
// type: "kill" — count beasts of given id; "gather" — collect an item;
//       "deliver" — bring a specific item to merchant.
const QUESTS = {
  q_first_hunt: {
    name: "First Hunt", giver: "elder",
    desc: "Slay 5 spirit rabbits to prove your dao.",
    type: "kill", target: "rabbit", count: 5,
    reward: { money: 60, rep: 1 },
    minRealm: 0,
  },
  q_herb_basket: {
    name: "Herb Basket", giver: "elder",
    desc: "Bring back 8 spirit herbs from the forest.",
    type: "gather", target: "spirit_herb", count: 8,
    reward: { money: 80, rep: 1 },
    minRealm: 0,
  },
  q_iron_tusks: {
    name: "Iron Tusks", giver: "elder",
    desc: "Cull 3 iron-tusk boars trampling the south fields.",
    type: "kill", target: "boar", count: 3,
    reward: { money: 180, rep: 2 },
    minRealm: 1,
  },
  q_ghost_mortician: {
    name: "Ghost Mortician", giver: "elder",
    desc: "Banish 2 hungry ghosts haunting the foothills.",
    type: "kill", target: "gui", count: 2,
    reward: { money: 240, rep: 2, items: { purify_talisman: 1 } },
    minRealm: 1,
  },
  q_sworn_sister: {
    name: "Sworn Sister", giver: "elder",
    desc: "An itinerant cultivator wishes to ride your dao. Slay a wolf and a jiangshi to prove your worth.",
    type: "kill_set", target: { wolf: 1, jiangshi: 1 }, count: 2,
    reward: { money: 200, rep: 3, partner: true },
    minRealm: 2,
  },
  q_fox_pearl_courier: {
    name: "Pearl Courier", giver: "elder",
    desc: "Deliver a fox pearl to the elder. Hunt a huli jing.",
    type: "deliver", target: "fox_pearl", count: 1,
    reward: { money: 360, rep: 4 },
    minRealm: 3,
  },
  q_dragon_scale: {
    name: "Dragon's Scale", giver: "elder",
    desc: "Slay a young dragon and bring its scale to the elder.",
    type: "deliver", target: "dragon_scale", count: 1,
    reward: { money: 2500, rep: 10, items: { dragon_blood_pill: 1 } },
    minRealm: 4,
  },
};

const QUEST_ORDER = [
  "q_first_hunt", "q_herb_basket", "q_iron_tusks", "q_ghost_mortician",
  "q_sworn_sister", "q_fox_pearl_courier", "q_dragon_scale",
];

// ---------- DUNGEONS / NESTS ----------
// A dungeon is an instanced 12x10 chamber the player enters from a forest
// "cave entrance" tile. Three waves of beasts then a chest spawns.
const DUNGEONS = {
  rabbit_warren: {
    name: "Rabbit Warren",  minRealm: 0, waves: [["rabbit", "rabbit", "rabbit"], ["rabbit", "rabbit"], ["boar"]],
    bossLine: "A massive boar charges from the shadows!",
    chest: { money: 120, items: { spirit_herb: 3, beast_hide: 2 } },
  },
  ghost_hollow: {
    name: "Ghost Hollow",   minRealm: 1, waves: [["gui", "gui"], ["gui", "wolf"], ["jiangshi"]],
    bossLine: "A jiangshi hops out, talisman fluttering!",
    chest: { money: 280, items: { ghost_essence: 2, jade_seal: 1, beast_core: 2 } },
  },
  fox_grotto: {
    name: "Fox Grotto",     minRealm: 3, waves: [["huli_jing"], ["huli_jing", "wolf"], ["nine_tail_fox"]],
    bossLine: "Nine tails ignite as the matron emerges!",
    chest: { money: 800, items: { fox_pearl: 2, nine_tail_fur: 1, qi_lotus: 2 } },
  },
  dragon_hollow: {
    name: "Dragon Hollow",  minRealm: 5, waves: [["jiangshi", "wolf", "wolf"], ["nine_tail_fox", "qilin"], ["young_dragon"]],
    bossLine: "The mountain shudders — a dragon descends.",
    chest: { money: 4000, items: { dragon_scale: 1, qilin_horn: 1, dragon_blood_pill: 1 } },
  },
};

// ---------- TOURNAMENT OPPONENTS ----------
const TOURNAMENT = {
  rounds: [
    { name: "Outer Disciple",   beast: "rabbit",   scale: 4 },
    { name: "Inner Disciple",   beast: "boar",     scale: 3 },
    { name: "Elder Disciple",   beast: "wolf",     scale: 2.5 },
  ],
  entryFee: 50,
  rewardPerRound: 80,
  rewardFinal: 300,
};

// ---------- COMPANIONS ----------
const COMPANIONS = {
  partner: {
    name: "Sworn Sister Yu", spriteKey: "companion_partner",
    hp: 100, dmg: 14, speed: 95,
  },
  rabbit_pet: {
    name: "Tame Rabbit", spriteKey: "beast_rabbit",
    hp: 60, dmg: 6, speed: 110,
  },
  boar_pet: {
    name: "Tame Boar", spriteKey: "beast_boar",
    hp: 140, dmg: 14, speed: 70,
  },
  wolf_pet: {
    name: "Tame Wolf", spriteKey: "beast_wolf",
    hp: 220, dmg: 22, speed: 130,
  },
  fox_pet: {
    name: "Spirit Fox Cub", spriteKey: "companion_fox",
    hp: 180, dmg: 26, speed: 140,
  },
};

const TAMEABLE = {
  rabbit:    "rabbit_pet",
  boar:      "boar_pet",
  wolf:      "wolf_pet",
  huli_jing: "fox_pet",
};

// ---------- DECORATIONS ----------
// Each decor item lives in ITEMS too (registered below). Placing one creates
// a new structure entry with type "decor" and a unique sprite.
const DECORATIONS = {
  spirit_lantern: {
    name: "Spirit Lantern", desc: "Pulses softly with qi. +0.2 qi/sec passive.",
    spriteKey: "decor_lantern", price: 120, bonus: { qiRegen: 0.2 },
  },
  banner: {
    name: "Sect Banner",    desc: "Crimson silk on a tall pole. +5% combat XP.",
    spriteKey: "decor_banner", price: 180, bonus: { combatXpMul: 0.05 },
  },
  koi_pond: {
    name: "Mini Koi Pond",  desc: "Auspicious goldfish. +1 max HP per day.",
    spriteKey: "decor_pond", price: 320, bonus: { dailyHp: 1 },
  },
  jade_rock: {
    name: "Spirit Jade Rock", desc: "A weathered boulder of spirit jade. +2% breakthrough chance.",
    spriteKey: "decor_jade", price: 600, bonus: { breakthroughBonus: 0.02 },
  },
};

// Register decorations as ITEMS so they can be bought + placed.
for (const id in DECORATIONS) {
  const d = DECORATIONS[id];
  ITEMS[id] = { name: d.name, desc: d.desc, value: 0, decor: id };
}

// Add to shop (decorations only — tournament is reached via merchant hub)
SHOP_BUY.push(
  { id: "deco_lantern",  label: "Spirit Lantern",   price: DECORATIONS.spirit_lantern.price, give: { spirit_lantern: 1 } },
  { id: "deco_banner",   label: "Sect Banner",      price: DECORATIONS.banner.price,         give: { banner: 1 }, unlockRealm: 1 },
  { id: "deco_pond",     label: "Mini Koi Pond",    price: DECORATIONS.koi_pond.price,       give: { koi_pond: 1 }, unlockRealm: 2 },
  { id: "deco_jade",     label: "Spirit Jade Rock", price: DECORATIONS.jade_rock.price,      give: { jade_rock: 1 }, unlockRealm: 3 },
);
