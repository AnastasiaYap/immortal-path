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
  ghost_essence:  { name: "Ghost Essence",  desc: "Pale yin energy condensed from a gui.",     value: 45 },
  jade_seal:      { name: "Jade Corpse Seal", desc: "Talisman from a slain jiangshi's brow.",  value: 70 },
  fox_pearl:      { name: "Fox Pearl",      desc: "A bewitching inner pearl. Aids the mind.",  value: 110 },
  nine_tail_fur:  { name: "Nine-tail Pelt", desc: "Pelt of a nine-tailed fox.",                value: 280 },
  qilin_horn:     { name: "Qilin Horn",     desc: "Auspicious horn of a qilin.",               value: 420 },
  dragon_scale:   { name: "Dragon Scale",   desc: "A young dragon's scale, hot to the touch.", value: 700 },

  // Materials
  talisman_paper: { name: "Talisman Paper", desc: "Yellow paper for inscribing.",              value: 6 },
  cinnabar_ink:   { name: "Cinnabar Ink",   desc: "Vermilion ink, channels qi.",               value: 10 },
  iron_ore:       { name: "Iron Ore",       desc: "Mined from the stone outcrop. Smelts at the forge.", value: 8 },
  jade_shard:     { name: "Jade Shard",     desc: "A sliver of spirit jade.",                  value: 32 },
  spirit_silk:    { name: "Spirit Silk",    desc: "Soft fiber spun from spirit-rabbit fur.",   value: 24 },
  flour:          { name: "Flour",          desc: "Ground rice flour. For dumplings and cakes.", value: 4 },

  // Fish
  minnow:         { name: "Minnow",         desc: "Small pond fish.",                          value: 8,   edible: 8 },
  spirit_carp:    { name: "Spirit Carp",    desc: "Glow-scaled carp from the pond.",           value: 28,  edible: 14, qiRestore: 8 },
  koi:            { name: "Koi",            desc: "Auspicious. Worth a small fortune.",        value: 110 },
  moon_carp:      { name: "Moon Carp",      desc: "Bites only at night. Pristine flesh.",     value: 220, qiRestore: 30, hpRestore: 30 },

  // Cooked food
  spirit_congee:    { name: "Spirit Congee",    desc: "Hot porridge. Restores HP and qi.",                value: 38,  hpRestore: 25, qiRestore: 18, edible: 22 },
  fish_broth:       { name: "Fish Broth",       desc: "Restorative broth.",                               value: 55,  hpRestore: 18, qiRestore: 10, edible: 30 },
  pepper_dumplings: { name: "Pepper Dumplings", desc: "Fiery dumplings. Big stamina restore.",           value: 65,  edible: 30, staminaRestore: 60 },
  moon_cake:        { name: "Moon Cake",        desc: "Mooncarp pastry. Big breakthrough boost.",        value: 240, breakthroughBoost: 0.3, qiRestore: 30 },

  // Equipment — weapons
  iron_sword:    { name: "Iron Sword",    desc: "+6 attack.",                                   value: 90,  equip: "weapon", dmg: 6 },
  spirit_sword:  { name: "Spirit Sword",  desc: "+14 attack. Hums faintly with qi.",            value: 280, equip: "weapon", dmg: 14 },
  // Equipment — robes
  linen_robe:    { name: "Linen Robe",    desc: "+5 defense.",                                  value: 70,  equip: "robe", def: 5 },
  spirit_robe:   { name: "Spirit Robe",   desc: "+15 defense, +0.3 qi/sec.",                    value: 320, equip: "robe", def: 15, qiRegen: 0.3 },
  jade_robe:     { name: "Jade Robe",     desc: "+25 defense, +0.5 qi/sec, +20 max HP.",        value: 800, equip: "robe", def: 25, qiRegen: 0.5, hpMaxBonus: 20 },
  // Equipment — accessories
  jade_pendant:  { name: "Jade Pendant",  desc: "+20 max qi, +0.3 qi/sec.",                     value: 220, equip: "accessory", qiMaxBonus: 20, qiRegen: 0.3 },
  spirit_ring:   { name: "Spirit Ring",   desc: "+15 max HP.",                                  value: 240, equip: "accessory", hpMaxBonus: 15 },

  // Tools
  fishing_rod:   { name: "Fishing Rod",   desc: "Bamboo pole. Required to fish at the pond.",   value: 0,   tool: "rod" },

  // Crafted talismans
  fire_talisman:    { name: "Fire Talisman",    desc: "Throw to burn a beast.",                    value: 25, throwable: true, dmg: 18 },
  ward_talisman:    { name: "Ward Talisman",    desc: "Briefly slows incoming beasts.",            value: 30, useable: "ward" },
  purify_talisman:  { name: "Purification Talisman", desc: "Hurls bright yang fire — extra vs. ghosts and fox-spirits.", value: 70, throwable: true, dmg: 45 },

  // Crafted pills
  qi_pill:          { name: "Qi Recovery Pill",   desc: "Restores 40 Qi.",                        value: 60, qiRestore: 40 },
  body_pill:        { name: "Body Refining Pill", desc: "Heals 30 HP, +1 max HP next dawn.",      value: 80, hpRestore: 30, bodyBoost: 1 },
  foundation_pill:  { name: "Foundation Pill",    desc: "Bonus to next breakthrough attempt.",    value: 220, breakthroughBoost: 0.25 },
  mind_clarity_pill:{ name: "Mind Clarity Pill",  desc: "Clears the dao-mind. Big breakthrough boost.", value: 360, breakthroughBoost: 0.5, qiRestore: 60 },
  dragon_blood_pill:{ name: "Dragon Blood Pill",  desc: "Dragon blood and qilin horn refined together. +20 max HP, full heal.", value: 1200, hpRestore: 9999, bodyBoost: 20 },

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
  purify_talisman: {
    output: "purify_talisman", qty: 2, station: "desk",
    inputs: { talisman_paper: 3, cinnabar_ink: 2, ghost_essence: 1 }, qiCost: 25,
    label: "Purification Talisman ×2", unlockRealm: 2,
  },
  mind_clarity_pill: {
    output: "mind_clarity_pill", qty: 1, station: "furnace",
    inputs: { fox_pearl: 1, qi_lotus: 2, spirit_herb: 4 }, qiCost: 60,
    label: "Mind Clarity Pill", unlockRealm: 3,
  },
  dragon_blood_pill: {
    output: "dragon_blood_pill", qty: 1, station: "furnace",
    inputs: { dragon_scale: 1, qilin_horn: 1, qi_lotus: 4, beast_core: 3 }, qiCost: 200,
    label: "Dragon Blood Pill", unlockRealm: 4,
  },

  // -- Cooking (stove) --
  spirit_congee: {
    output: "spirit_congee", qty: 1, station: "stove",
    inputs: { rice: 2, spirit_grain: 1 }, qiCost: 0,
    label: "Spirit Congee", skillXp: { cooking: 12 },
  },
  fish_broth: {
    output: "fish_broth", qty: 1, station: "stove",
    inputs: { spirit_carp: 1, spirit_herb: 1 }, qiCost: 0,
    label: "Fish Broth", skillXp: { cooking: 18 },
  },
  pepper_dumplings: {
    output: "pepper_dumplings", qty: 2, station: "stove",
    inputs: { blood_pepper: 1, flour: 2 }, qiCost: 0,
    label: "Pepper Dumplings ×2", skillXp: { cooking: 22 },
  },
  moon_cake: {
    output: "moon_cake", qty: 1, station: "stove",
    inputs: { moon_carp: 1, flour: 2, qi_lotus: 1 }, qiCost: 5,
    label: "Moon Cake", skillXp: { cooking: 50 },
  },

  // -- Smithing (forge) --
  iron_sword: {
    output: "iron_sword", qty: 1, station: "forge",
    inputs: { iron_ore: 4 }, qiCost: 0,
    label: "Iron Sword", skillXp: { smithing: 30 },
  },
  spirit_sword: {
    output: "spirit_sword", qty: 1, station: "forge",
    inputs: { iron_ore: 6, beast_core: 2, jade_shard: 1 }, qiCost: 8,
    label: "Spirit Sword", skillXp: { smithing: 60 },
  },
  jade_pendant: {
    output: "jade_pendant", qty: 1, station: "forge",
    inputs: { jade_shard: 3, iron_ore: 1 }, qiCost: 5,
    label: "Jade Pendant", skillXp: { smithing: 40 },
  },
  spirit_ring: {
    output: "spirit_ring", qty: 1, station: "forge",
    inputs: { beast_core: 2, jade_shard: 1, iron_ore: 1 }, qiCost: 8,
    label: "Spirit Ring", skillXp: { smithing: 50 },
  },

  // -- Tailoring (loom) --
  linen_robe: {
    output: "linen_robe", qty: 1, station: "loom",
    inputs: { spirit_silk: 3 }, qiCost: 0,
    label: "Linen Robe", skillXp: { tailoring: 25 },
  },
  spirit_robe: {
    output: "spirit_robe", qty: 1, station: "loom",
    inputs: { spirit_silk: 5, qi_lotus: 1 }, qiCost: 5,
    label: "Spirit Robe", skillXp: { tailoring: 50 },
  },
  jade_robe: {
    output: "jade_robe", qty: 1, station: "loom",
    inputs: { spirit_silk: 8, jade_shard: 3, beast_core: 2 }, qiCost: 12,
    label: "Jade Robe", skillXp: { tailoring: 80 }, unlockRealm: 3,
  },

  // -- Misc rice → flour at stove --
  flour: {
    output: "flour", qty: 3, station: "stove",
    inputs: { rice: 2 }, qiCost: 0,
    label: "Mill Flour ×3", skillXp: { cooking: 4 },
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

// Beast definitions. tier roughly maps to player realm; minDay is an
// alternate gate so progression keeps escalating even if the player lingers.
// weight is the spawn weight when both gates are passed.
const BEASTS = {
  rabbit: {
    name: "Spirit Rabbit", spriteKey: "beast_rabbit",
    hp: 18, dmg: 4, speed: 1.4, xp: 8,
    drops: [{ id: "beast_hide", chance: 0.55 }],
    tier: 1, minRealm: 0, minDay: 1, weight: 5,
  },
  boar: {
    name: "Iron Tusk Boar", spriteKey: "beast_boar",
    hp: 50, dmg: 12, speed: 1.0, xp: 22,
    drops: [
      { id: "beast_hide", chance: 0.85 },
      { id: "beast_core", chance: 0.35 },
    ],
    tier: 2, minRealm: 1, minDay: 3, weight: 4,
  },
  gui: {
    name: "Hungry Ghost", spriteKey: "beast_gui",
    hp: 35, dmg: 9, speed: 1.3, xp: 28,
    drops: [
      { id: "ghost_essence", chance: 0.55 },
      { id: "beast_core", chance: 0.2 },
    ],
    drainsQi: 4,
    tier: 2, minRealm: 1, minDay: 6, weight: 3,
  },
  wolf: {
    name: "Frost Spirit Wolf", spriteKey: "beast_wolf",
    hp: 90, dmg: 22, speed: 1.7, xp: 55,
    drops: [
      { id: "beast_hide", chance: 0.7 },
      { id: "wolf_fang", chance: 0.6 },
      { id: "beast_core", chance: 0.7 },
    ],
    tier: 3, minRealm: 2, minDay: 10, weight: 4,
  },
  jiangshi: {
    name: "Jiangshi", spriteKey: "beast_jiangshi",
    hp: 160, dmg: 28, speed: 0.8, xp: 90,
    drops: [
      { id: "jade_seal", chance: 0.65 },
      { id: "beast_core", chance: 0.85 },
      { id: "talisman_paper", chance: 0.5 },
    ],
    tier: 3, minRealm: 2, minDay: 14, weight: 3,
  },
  huli_jing: {
    name: "Two-tail Fox Spirit", spriteKey: "beast_huli_jing",
    hp: 130, dmg: 24, speed: 2.0, xp: 110,
    drops: [
      { id: "fox_pearl", chance: 0.55 },
      { id: "beast_core", chance: 0.85 },
      { id: "spirit_herb", chance: 0.7 },
    ],
    weak: "purify_talisman",
    tier: 4, minRealm: 3, minDay: 20, weight: 3,
  },
  nine_tail_fox: {
    name: "Nine-tail Fox", spriteKey: "beast_nine_tail_fox",
    hp: 380, dmg: 48, speed: 2.0, xp: 320,
    drops: [
      { id: "nine_tail_fur", chance: 0.9 },
      { id: "fox_pearl", chance: 1.0 },
      { id: "beast_core", chance: 1.0 },
    ],
    weak: "purify_talisman",
    boss: true,
    tier: 5, minRealm: 4, minDay: 35, weight: 0.6,
  },
  qilin: {
    name: "Qilin", spriteKey: "beast_qilin",
    hp: 460, dmg: 42, speed: 1.4, xp: 360,
    drops: [
      { id: "qilin_horn", chance: 0.85 },
      { id: "beast_core", chance: 1.0 },
      { id: "spirit_herb", chance: 1.0 },
    ],
    boss: true,
    tier: 5, minRealm: 4, minDay: 30, weight: 0.5,
  },
  young_dragon: {
    name: "Young Dragon", spriteKey: "beast_young_dragon",
    hp: 800, dmg: 70, speed: 1.6, xp: 700,
    drops: [
      { id: "dragon_scale", chance: 1.0 },
      { id: "beast_core", chance: 1.0 },
      { id: "qilin_horn", chance: 0.2 },
    ],
    boss: true,
    tier: 6, minRealm: 5, minDay: 50, weight: 0.3,
  },
};

// Market prices: buying seeds and supplies.
const SHOP_BUY = [
  { id: "rice_seed",         label: "Rice Seed",            price: 8,   give: { _seed: "rice" } },
  { id: "spirit_grain_seed", label: "Spirit Grain Seed",    price: 30,  give: { _seed: "spirit_grain" }, unlockRealm: 1 },
  { id: "blood_pepper_seed", label: "Blood Pepper Seed",    price: 50,  give: { _seed: "blood_pepper" }, unlockRealm: 1 },
  { id: "qi_lotus_seed",     label: "Qi Lotus Seed",        price: 80,  give: { _seed: "qi_lotus" }, unlockRealm: 2 },
  { id: "talisman_paper",    label: "Talisman Paper ×5",    price: 25,  give: { talisman_paper: 5 } },
  { id: "cinnabar_ink",      label: "Cinnabar Ink ×3",      price: 25,  give: { cinnabar_ink: 3 } },
  { id: "flour",             label: "Flour ×5",             price: 18,  give: { flour: 5 } },
  { id: "rice_meal",         label: "Bowl of Rice (eat)",   price: 5,   give: { rice: 1 } },
  { id: "fishing_rod",       label: "Bamboo Fishing Rod",   price: 100, give: { _grant: "fishing_rod" } },
  { id: "linen_bolt",        label: "Linen Bolt — silk ×3", price: 75,  give: { spirit_silk: 3 } },
];

// House upgrade tiers — four pagoda silhouettes per the design deck.
const HOUSE_TIERS = [
  { tier: 0, name: "Bamboo Hut",         cost: 0,    qiRegenBonus: 0,   sleepHeal: 0.6,  desc: "Bamboo walls, single jade-tile roof. Modest but yours." },
  { tier: 1, name: "Cultivator Cottage", cost: 300,  qiRegenBonus: 0.3, sleepHeal: 0.85, desc: "Wood walls, paper windows, sect banner over the door." },
  { tier: 2, name: "Courtyard House",    cost: 1500, qiRegenBonus: 0.7, sleepHeal: 1.0,  hpBonus: 30, desc: "Two-tier pagoda, hanging lanterns, sakura at the eaves." },
  { tier: 3, name: "Immortal Estate",    cost: 5000, qiRegenBonus: 1.2, sleepHeal: 1.0,  hpBonus: 80, desc: "Three-tier pagoda, four lanterns, carved stone steps. A home worthy of an immortal." },
];

// Building / structure unlocks
const STRUCTURES = [
  { id: "mat",     name: "Meditation Mat", cost: 0,    built: true,  desc: "Already in your yard." },
  { id: "desk",    name: "Talisman Desk",  cost: 150,  built: false, desc: "Inscribe talismans here." },
  { id: "furnace", name: "Pill Furnace",   cost: 400,  built: false, desc: "Refine pills from herbs and beast materials." },
  { id: "stove",   name: "Clay Stove",     cost: 120,  built: false, desc: "Cook produce and fish into restorative meals." },
  { id: "forge",   name: "Smithy & Anvil", cost: 600,  built: false, desc: "Forge weapons and accessories from ore." },
  { id: "loom",    name: "Spirit Loom",    cost: 500,  built: false, desc: "Weave silk and jade into protective robes." },
];

// Drops added by skill — not included in BEAST.drops because they depend on
// foraging conditions. Spirit Silk is rolled separately for spirit rabbits.
const RABBIT_SILK_CHANCE = 0.18;

// Fish table: each entry has weight (luck-modified) and required time-of-day.
const FISH_TABLE = [
  { id: "minnow",       weight: 8,  minLuck: 0,  night: false, day: true  },
  { id: "minnow",       weight: 5,  minLuck: 0,  night: true,  day: true  },
  { id: "spirit_carp",  weight: 4,  minLuck: 0,  night: true,  day: true  },
  { id: "spirit_carp",  weight: 6,  minLuck: 3,  night: true,  day: true  },
  { id: "koi",          weight: 1,  minLuck: 5,  night: true,  day: true  },
  { id: "moon_carp",    weight: 2,  minLuck: 4,  night: true,  day: false },
];
