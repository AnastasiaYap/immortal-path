// Asset loader — replaces specific SpriteCache entries with the
// hand-painted PNGs in /assets/ from the clean transparent sprite pack.
// Procedural drawings remain as the boot-time fallback so the game runs
// even if assets fail to load (e.g. when opened via file:// in browsers
// that block local image loads).
//
// IMPORTANT: this pack ships single-pose "turnaround" frames per character
// rather than 4-direction walk cycles. We map the same painted image to
// every facing direction. Game logic still rotates the player's facing,
// but the visual stays the painted hero pose.

// Each entry can optionally override the default scale. The pack ships at
// 4x the source resolution, and the world is built around 32px tiles, so
// we scale down at load time into a fresh canvas (so the rest of the game
// can keep treating SpriteCache entries as drawable surfaces).
const SCALE_DEFAULT  = 0.42;   // characters, beasts, decorations
const SCALE_HOUSE    = 0.55;   // houses are visually big — but not overwhelming
const SCALE_VFX      = 0.32;
const SCALE_TINY     = 0.30;

const ASSET_MAP = [
  { key: "struct_house_tier_0", path: "buildings/player_house_lv1_bamboo_hut.png",      scale: SCALE_HOUSE },
  { key: "struct_house_tier_1", path: "buildings/player_house_lv2_jade_cottage.png",    scale: SCALE_HOUSE },
  { key: "struct_house_tier_2", path: "buildings/player_house_lv3_courtyard_house.png", scale: SCALE_HOUSE },
  { key: "struct_house_tier_3", path: "buildings/player_house_lv4_spirit_manor.png",    scale: SCALE_HOUSE },

  { key: "player_down_0",  path: "characters_creatures/player_cultivator_turnaround_01.png" },
  { key: "player_down_1",  path: "characters_creatures/player_cultivator_turnaround_02.png" },
  { key: "player_up_0",    path: "characters_creatures/player_cultivator_turnaround_01.png" },
  { key: "player_up_1",    path: "characters_creatures/player_cultivator_turnaround_02.png" },
  { key: "player_left_0",  path: "characters_creatures/player_cultivator_turnaround_01.png" },
  { key: "player_left_1",  path: "characters_creatures/player_cultivator_turnaround_02.png" },
  { key: "player_right_0", path: "characters_creatures/player_cultivator_turnaround_01.png" },
  { key: "player_right_1", path: "characters_creatures/player_cultivator_turnaround_02.png" },

  { key: "entity_companion_partner_0", path: "characters_creatures/alchemist_turnaround_01.png" },
  { key: "entity_companion_partner_1", path: "characters_creatures/alchemist_turnaround_02.png" },
  { key: "entity_companion_fox_0",     path: "characters_creatures/spirit_fox_turnaround_01.png" },
  { key: "entity_companion_fox_1",     path: "characters_creatures/spirit_fox_turnaround_01.png" },

  { key: "entity_merchant", path: "characters_creatures/farmer_villager_turnaround_01.png" },

  { key: "entity_beast_young_dragon_0", path: "characters_creatures/baby_dragon_turnaround_a_01.png" },
  { key: "entity_beast_young_dragon_1", path: "characters_creatures/baby_dragon_turnaround_a_02.png" },

  { key: "struct_decor_lantern", path: "environment_props/environment_props_row_lanterns_plants_crystals_03.png", scale: SCALE_TINY },
  { key: "struct_decor_jade",    path: "environment_props/environment_props_row_lanterns_plants_crystals_13.png", scale: SCALE_TINY },

  { key: "proj_talisman", path: "vfx/vfx_talismans_wind_petals_01.png", scale: SCALE_VFX },
];

let assetsLoaded = false;
let assetsLoadStarted = false;

function loadAssets() {
  if (assetsLoadStarted) return Promise.resolve();
  assetsLoadStarted = true;
  return new Promise((resolve) => {
    let remaining = ASSET_MAP.length;
    if (remaining === 0) { assetsLoaded = true; resolve(); return; }
    for (const m of ASSET_MAP) {
      const img = new Image();
      img.onload = () => {
        SpriteCache[m.key] = scaleSprite(img, m.scale ?? SCALE_DEFAULT);
        remaining--;
        if (remaining === 0) { applyAssetAliases(); assetsLoaded = true; resolve(); }
      };
      img.onerror = () => {
        console.warn("asset failed:", m.path);
        remaining--;
        if (remaining === 0) { applyAssetAliases(); assetsLoaded = true; resolve(); }
      };
      img.src = "assets/" + m.path;
    }
  });
}

// Scale a loaded HTMLImageElement into a fresh canvas at `s` of native size.
// Returns the canvas, which has the same drawImage interface as Image.
function scaleSprite(img, s) {
  const w = Math.max(1, Math.round(img.width  * s));
  const h = Math.max(1, Math.round(img.height * s));
  const c = document.createElement("canvas");
  c.width  = w;
  c.height = h;
  const cx = c.getContext("2d");
  cx.imageSmoothingEnabled = false;
  cx.drawImage(img, 0, 0, w, h);
  return c;
}

function applyAssetAliases() {
  if (SpriteCache["struct_house_tier_0"]) SpriteCache["struct_house"]          = SpriteCache["struct_house_tier_0"];
  if (SpriteCache["struct_house_tier_1"]) SpriteCache["struct_house_upgraded"] = SpriteCache["struct_house_tier_1"];
}
