// Game data: items, crops, recipes, realms.

const ITEMS = {
  // Crops / produce
  rice:           { name: "Rice",           desc: "Grain. Mortal staple food.",                value: 4,   edible: 18 },
  spirit_grain:   { name: "Spirit Grain",   desc: "Faintly luminous grain. Restores qi.",      value: 14,  qiRestore: 8 },
  qi_lotus:       { name: "Qi Lotus",       desc: "Blooms with raw qi. Used in pills.",        value: 30 },
  blood_pepper:   { name: "Blood Pepper",   desc: "Spicy. Strengthens body refinement.",       value: 22 },

  // Forageables / drops
  spirit_herb:    { name: "Spirit Herb",    desc: "Foraged in the forest. Pill ingredient.",   value: 10 },
  beast_hide:     { name: "Beast Hide",     desc: "Tough hide from a low spirit beast.",       value: 12 },
  beast_core:     { name: "Beast Core",     desc: "Crystallized qi from a slain beast.",       value: 35 },
  wolf_fang:      { name: "Wolf Fang",      desc: "Fang of a spirit wolf. Sharp and cold.",    value: 28 },

  // Materials
  talisman_paper: { name: "Talisman Paper", desc: "Yellow paper for inscribing.",              value: 6 },
  cinnabar_ink:   { name: "Cinnabar Ink",   desc: "Vermilion ink, channels qi.",               value: 10 },

  // Crafted talismans
  fire_talisman:  { name: "Fire Talisman",  desc: "Throw to burn a beast.",                    value: 25, throwable: true, dmg: 18 },
  ward_talisman:  { name: "Ward Talisman",  desc: "Briefly slows incoming beasts.",            value: 30, useable: "ward" },

  // Crafted pills
  qi_pill:        { name: "Qi Recovery Pill",  desc: "Restores 40 Qi.",                        value: 60, qiRestore: 40 },
  body_pill:      { name: "Body Refining Pill", desc: "Heals 30 HP, +1 max HP next dawn.",     value: 80, hpRestore: 30, bodyBoost: 1 },
  foundation_pill:{ name: "Foundation Pill",   desc: "Bonus to next breakthrough attempt.",    value: 220, breakthroughBoost: 0.25 },

  // Tools
  hoe_wood:       { name: "Wooden Hoe",     desc: "Basic. Tills 1 plot at a time.",            value: 0 },
  hoe_iron:       { name: "Iron Hoe",       desc: "Tills faster. Reduces stamina cost.",       value: 200 },
  watering_can:   { name: "Watering Can",   desc: "Waters 1 plot at the well.",                value: 0 },
};

// Crops: { sprite_key, growthHours (in-game), seedCost, sellPrice (override), restoresQi? }
const CROPS = {
  rice:         { name: "Rice",         spriteKey: "rice",         growthDays: 2, seedCost: 8,  yields: "rice",         qty: 3 },
  spirit_grain: { name: "Spirit Grain", spriteKey: "spirit_grain", growthDays: 3, seedCost: 30, yields: "spirit_grain", qty: 2,  unlockRealm: 1 },
  qi_lotus:     { name: "Qi Lotus",     spriteKey: "qi_lotus",     growthDays: 4, seedCost: 80, yields: "qi_lotus",     qty: 1,  unlockRealm: 2 },
  blood_pepper: { name: "Blood Pepper", spriteKey: "blood_pepper", growthDays: 3, seedCost: 50, yields: "blood_pepper", qty: 2,  unlockRealm: 1 },
};

// Recipes: produce item from inputs at a station.
const RECIPES = {
  fire_talisman: {
    output: "fire_talisman", qty: 1, station: "desk",
    inputs: { talisman_paper: 1, cinnabar_ink: 1 }, qiCost: 8,
    label: "Fire Talisman",
  },
  ward_talisman: {
    output: "ward_talisman", qty: 1, station: "desk",
    inputs: { talisman_paper: 2, cinnabar_ink: 1 }, qiCost: 12,
    label: "Ward Talisman",
  },
  qi_pill: {
    output: "qi_pill", qty: 1, station: "furnace",
    inputs: { spirit_herb: 2 }, qiCost: 10,
    label: "Qi Recovery Pill",
  },
  body_pill: {
    output: "body_pill", qty: 1, station: "furnace",
    inputs: { spirit_herb: 1, beast_hide: 1, blood_pepper: 1 }, qiCost: 18,
    label: "Body Refining Pill",
  },
  foundation_pill: {
    output: "foundation_pill", qty: 1, station: "furnace",
    inputs: { qi_lotus: 1, beast_core: 1, spirit_herb: 3 }, qiCost: 40,
    label: "Foundation Pill", unlockRealm: 2,
  },
};

// Cultivation realms — classic xianxia ladder (compressed).
const REALMS = [
  { name: "Mortal",                stages: 0, qiToBreakthrough: 100,  hpMax: 60,  qiMax: 30,  atk: 4,  def: 0 },
  { name: "Body Refinement",       stages: 3, qiToBreakthrough: 150,  hpMax: 100, qiMax: 60,  atk: 8,  def: 2 },
  { name: "Qi Gathering",          stages: 3, qiToBreakthrough: 250,  hpMax: 150, qiMax: 120, atk: 14, def: 4 },
  { name: "Foundation Establishment", stages: 3, qiToBreakthrough: 400, hpMax: 220, qiMax: 200, atk: 22, def: 7 },
  { name: "Core Formation",        stages: 3, qiToBreakthrough: 600,  hpMax: 320, qiMax: 320, atk: 32, def: 11 },
  { name: "Nascent Soul",          stages: 0, qiToBreakthrough: Infinity, hpMax: 500, qiMax: 500, atk: 50, def: 18 },
];

// Beast definitions
const BEASTS = {
  rabbit: {
    name: "Spirit Rabbit", spriteKey: "beast_rabbit",
    hp: 18, dmg: 4, speed: 1.4, xp: 8, drops: [{ id: "beast_hide", chance: 0.55 }],
    minRealm: 0,
  },
  boar: {
    name: "Iron Tusk Boar", spriteKey: "beast_boar",
    hp: 50, dmg: 12, speed: 1.0, xp: 22, drops: [
      { id: "beast_hide", chance: 0.85 },
      { id: "beast_core", chance: 0.35 },
    ],
    minRealm: 1,
  },
  wolf: {
    name: "Frost Spirit Wolf", spriteKey: "beast_wolf",
    hp: 90, dmg: 22, speed: 1.7, xp: 55, drops: [
      { id: "beast_hide", chance: 0.7 },
      { id: "wolf_fang", chance: 0.6 },
      { id: "beast_core", chance: 0.7 },
    ],
    minRealm: 2,
  },
};

// Market prices: buying seeds and supplies.
const SHOP_BUY = [
  { id: "rice_seed",         label: "Rice Seed",          price: 8,  give: { _seed: "rice" } },
  { id: "spirit_grain_seed", label: "Spirit Grain Seed",  price: 30, give: { _seed: "spirit_grain" }, unlockRealm: 1 },
  { id: "blood_pepper_seed", label: "Blood Pepper Seed",  price: 50, give: { _seed: "blood_pepper" }, unlockRealm: 1 },
  { id: "qi_lotus_seed",     label: "Qi Lotus Seed",      price: 80, give: { _seed: "qi_lotus" }, unlockRealm: 2 },
  { id: "talisman_paper",    label: "Talisman Paper x5",  price: 25, give: { talisman_paper: 5 } },
  { id: "cinnabar_ink",      label: "Cinnabar Ink x3",    price: 25, give: { cinnabar_ink: 3 } },
  { id: "rice_meal",         label: "Bowl of Rice (eat)", price: 5,  give: { rice: 1 } },
];

// House upgrade tiers
const HOUSE_TIERS = [
  { tier: 0, name: "Mud-walled Hut",  cost: 0,    qiRegenBonus: 0,   sleepHeal: 0.6, },
  { tier: 1, name: "Timber House",    cost: 300,  qiRegenBonus: 0.3, sleepHeal: 0.85 },
  { tier: 2, name: "Spirit Courtyard", cost: 1500, qiRegenBonus: 0.7, sleepHeal: 1.0, hpBonus: 30 },
];

// Building / structure unlocks
const STRUCTURES = [
  { id: "mat",     name: "Meditation Mat", cost: 0,   built: true,  desc: "Already in your yard." },
  { id: "desk",    name: "Talisman Desk",  cost: 150, built: false, desc: "Inscribe talismans here." },
  { id: "furnace", name: "Pill Furnace",   cost: 400, built: false, desc: "Refine pills from herbs and beast materials." },
];
