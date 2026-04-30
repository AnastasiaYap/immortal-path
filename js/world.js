// World: map generation, tiles, structures, plot state, region helpers.

const MAP_W = 60;
const MAP_H = 44;

// Tile ids
const T_GRASS = 0;
const T_DIRT = 1;
const T_TILLED = 2;
const T_WATERED = 3;
const T_PATH = 4;
const T_WATER = 5;
const T_STONE = 6;
const T_WOOD = 7;
const T_WALL = 8;
const T_FOREST = 9;
const T_HERB = 10;

// Trees render on top of grass but the player walks through — otherwise the
// forest noise pattern blocks paths to herbs and beasts.
const SOLID_TILES = new Set([T_WATER, T_WALL]);

function tileSpriteKey(t) {
  switch (t) {
    case T_GRASS: return "tile_grass";
    case T_DIRT: return "tile_dirt";
    case T_TILLED: return "tile_tilled";
    case T_WATERED: return "tile_watered";
    case T_PATH: return "tile_path";
    case T_WATER: return "tile_water";
    case T_STONE: return "tile_stone";
    case T_WOOD: return "tile_wood";
    case T_WALL: return "tile_wall";
    case T_FOREST: return "tile_forest";
    case T_HERB: return "tile_herb";
    default: return "tile_grass";
  }
}

function makeWorld() {
  // 2D tile array
  const tiles = [];
  for (let y = 0; y < MAP_H; y++) {
    tiles.push(new Array(MAP_W).fill(T_GRASS));
  }

  // North band: forest with clearing
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const noise = (Math.sin(x * 0.6) + Math.cos(y * 0.7)) * 0.5;
      const dense = y < 4 || (y < 10 && Math.random() < 0.5 + noise * 0.2);
      if (dense) tiles[y][x] = T_FOREST;
      // small clearings
      if (y === 8 && x > 18 && x < 24) tiles[y][x] = T_GRASS;
      if (y === 6 && x > 30 && x < 36) tiles[y][x] = T_GRASS;
    }
  }
  // path through forest to the home plot
  for (let y = 14; y >= 4; y--) {
    tiles[y][29] = T_PATH;
    tiles[y][30] = T_PATH;
  }
  // home plot center: rows ~16-26, cols 22-38
  for (let y = 14; y < 30; y++) {
    for (let x = 18; x < 42; x++) {
      // ensure grass
      if (tiles[y][x] === T_FOREST) tiles[y][x] = T_GRASS;
    }
  }

  // Pond in lower-left
  for (let y = 30; y < 38; y++) {
    for (let x = 4; x < 16; x++) {
      const dx = x - 10, dy = y - 33;
      if (dx * dx + dy * dy * 1.2 < 28) tiles[y][x] = T_WATER;
    }
  }

  // Stone outcrop south-east
  for (let y = 33; y < 41; y++) {
    for (let x = 44; x < 56; x++) {
      const dx = x - 50, dy = y - 37;
      if (dx * dx + dy * dy < 22 && Math.random() < 0.7) tiles[y][x] = T_STONE;
    }
  }
  // Carve a path tile under the mine entrance so the player can stand on it.
  tiles[35][50] = T_PATH;
  tiles[36][50] = T_PATH;

  // Path from home east to market
  for (let x = 38; x < 50; x++) {
    tiles[20][x] = T_PATH;
    tiles[21][x] = T_PATH;
  }

  // Market plaza (east)
  for (let y = 18; y < 24; y++) {
    for (let x = 48; x < 56; x++) {
      tiles[y][x] = T_PATH;
    }
  }

  // Sprinkle herbs in forest clearings + grass near forest edge
  for (let i = 0; i < 18; i++) {
    let x, y, tries = 0;
    do {
      x = 2 + Math.floor(Math.random() * (MAP_W - 4));
      y = 2 + Math.floor(Math.random() * 14);
      tries++;
    } while (tries < 10 && tiles[y][x] !== T_GRASS);
    if (tiles[y][x] === T_GRASS) tiles[y][x] = T_HERB;
  }

  // Farm plot region: 6x4 starting at (24, 22)
  const plots = [];
  const FARM_X0 = 24, FARM_Y0 = 22;
  const FARM_W = 6, FARM_H = 4;
  for (let py = 0; py < FARM_H; py++) {
    for (let px = 0; px < FARM_W; px++) {
      const tx = FARM_X0 + px;
      const ty = FARM_Y0 + py;
      tiles[ty][tx] = T_DIRT;
      plots.push({
        tx, ty,
        state: "dirt", // dirt | tilled | watered | growing | mature
        crop: null,
        growth: 0,         // 0..3
        wateredToday: false,
      });
    }
  }

  // Structures (anchor at tile coords; rendered at proper screen pixel).
  // The house is 3x3 tiles, rendered as a 96x96 sprite anchored bottom-center.
  const structures = [
    { id: "house",   tx: 32, ty: 17, w: 3, h: 3, type: "house",   solid: true,
      interactRect: { x: 33, y: 19, w: 1, h: 1 } /* doorstep tile */,
      tier: 0,
    },
    { id: "mat",     tx: 28, ty: 18, w: 1, h: 1, type: "mat",     solid: false },
    { id: "well",    tx: 35, ty: 21, w: 1, h: 1, type: "well",    solid: true },
    // Bed is logically inside the house — the house roof obscures it visually,
    // so we mark it nodraw. solid:false so player can stand close enough
    // (from the doorstep) to interact with it.
    { id: "bed",     tx: 33, ty: 18, w: 1, h: 1, type: "bed",     solid: false, nodraw: true },
    { id: "desk",    tx: 30, ty: 25, w: 1, h: 1, type: "desk",    solid: false, built: false },
    { id: "furnace", tx: 32, ty: 25, w: 1, h: 1, type: "furnace", solid: false, built: false },
    // New stations sit south of the farm row at y=27 (farm spans y=22..25)
    { id: "stove",   tx: 28, ty: 27, w: 1, h: 1, type: "stove",   solid: false, built: false },
    { id: "forge",   tx: 30, ty: 27, w: 1, h: 1, type: "forge",   solid: false, built: false },
    { id: "loom",    tx: 32, ty: 27, w: 1, h: 1, type: "loom",    solid: false, built: false },
    { id: "merchant",tx: 51, ty: 20, w: 1, h: 1, type: "merchant",solid: false },
    // Permanent mine entrance at the stone outcrop (south-east cluster).
    { id: "mine",    tx: 50, ty: 35, w: 1, h: 1, type: "mine_entrance", solid: false },
    { id: "sign_farm",   tx: 23, ty: 21, w: 1, h: 1, type: "sign", label: "Farm" },
    { id: "sign_forest", tx: 30, ty: 14, w: 1, h: 1, type: "sign", label: "Forest" },
    { id: "sign_market", tx: 47, ty: 20, w: 1, h: 1, type: "sign", label: "Market" },
  ];

  // Spawn / safe zone: just below the house door
  const spawn = { x: 33 * TILE + 8, y: 21 * TILE };

  return { tiles, plots, structures, spawn };
}

function isSolidAt(world, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  const w = world.width || MAP_W;
  const h = world.height || MAP_H;
  if (tx < 0 || ty < 0 || tx >= w || ty >= h) return true;
  if (SOLID_TILES.has(world.tiles[ty][tx])) return true;
  for (const s of world.structures) {
    if (!s.solid) continue;
    if (tx >= s.tx && tx < s.tx + s.w && ty >= s.ty && ty < s.ty + s.h) {
      if (s.type === "house" && tx === 33 && ty === 19) return false; // doorstep
      return true;
    }
  }
  return false;
}

function plotAt(world, tx, ty) {
  return world.plots.find((p) => p.tx === tx && p.ty === ty);
}

function drawTile(ctx, t, sx, sy) {
  const sprite = SpriteCache[tileSpriteKey(t)];
  if (sprite) ctx.drawImage(sprite, sx, sy);
}

function drawWorld(ctx, world, cam) {
  const w = world.width || MAP_W;
  const h = world.height || MAP_H;
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(w, Math.ceil((cam.x + cam.w) / TILE) + 1);
  const y1 = Math.min(h, Math.ceil((cam.y + cam.h) / TILE) + 1);

  // base tiles
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      drawTile(ctx, world.tiles[y][x], x * TILE - cam.x, y * TILE - cam.y);
    }
  }

  // crops on top of plots
  for (const p of world.plots) {
    if (!p.crop) continue;
    const stage = Math.min(2, p.growth);
    if (stage < 0) continue;
    const sprite = SpriteCache[`crop_${p.crop}_${stage}`];
    if (sprite) ctx.drawImage(sprite, p.tx * TILE - cam.x, p.ty * TILE - cam.y);
  }
}

