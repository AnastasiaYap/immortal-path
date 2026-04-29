// Pixel-art sprite generator. Every sprite is drawn at boot to an offscreen
// canvas and cached in SpriteCache. The game's draw routines blit cached
// canvases by key — no external image assets are shipped.
//
// Style is driven by the project art bible (Stardew/Rune-Factory cozy xianxia):
//   * Soft palette — jade green, bamboo, warm wood, pale gold, peach blossom,
//     mist blue. No harsh neon.
//   * Chunky 2x2 "logical pixels" — every fillRect is on a 2-actual-pixel grid
//     so the result reads as crisp pixel art at native resolution.
//   * 1-pixel dark outlines around characters, beasts, and key props.
//   * Big-head chibi proportions for cultivators, with hair bun + ribbon
//     details visible at low res.

const TILE = 32;       // logical world tile = 32 actual px = 16 "pixel-art" cells.
const PXSCALE = 2;     // each pixel-art cell is 2x2 actual pixels.
const SpriteCache = {};

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// Single chunky pixel — 2x2 actual px at logical (x,y).
function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PXSCALE, y * PXSCALE, PXSCALE, PXSCALE);
}

// Filled rect on the logical 2x grid.
function pxRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PXSCALE, y * PXSCALE, w * PXSCALE, h * PXSCALE);
}

// Render a string-based sprite. `lines` is an array of strings (each char =
// one logical pixel); `palette` maps each char to a color. '.' is transparent.
function drawSprite(ctx, lines, palette, ox = 0, oy = 0, scale = PXSCALE) {
  for (let y = 0; y < lines.length; y++) {
    const row = lines[y];
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === "." || c === " ") continue;
      const color = palette[c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

// ===========================================================================
// PALETTES
// ===========================================================================

// Project-wide palette anchored to the design deck.
const PAL = {
  ink:        "#2a221b",
  inkSoft:    "#3a2e22",
  parchment:  "#f5ecd5",
  paper:      "#f1e3b6",

  jade:       "#7fbf95",
  jadeDark:   "#4d8c66",
  jadeDeep:   "#2f5f44",
  jadeLight:  "#b6e5b9",
  jadeMist:   "#dff0d4",

  bamboo:     "#8aae5a",
  bambooDark: "#4d7035",
  bambooLight:"#c2dc8a",

  woodMid:    "#a87a48",
  woodDark:   "#704c25",
  woodDeep:   "#3a2010",
  woodLight:  "#d4a675",

  goldMid:    "#d4a548",
  goldLight:  "#f0c878",
  goldDark:   "#a87b1f",

  peach:      "#f4b6c2",
  peachDeep:  "#e08aa0",
  peachWhite: "#fde4ea",

  mist:       "#c8d8e8",
  mistDeep:   "#7d9ab2",

  cream:      "#f5ecd5",
  white:      "#fbf6e8",
  shadow:     "rgba(36,28,20,0.32)",
};

// ===========================================================================
// TILES (16x16 logical → 32x32 actual)
// ===========================================================================

// Pseudo-random but stable per-tile, so each tile sprite has consistent
// texture rather than a one-time roll.
function tileNoise(seed) {
  return function(i) {
    const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
}

function drawGrassTile(ctx) {
  const rnd = tileNoise(7);
  pxRect(ctx, 0, 0, 16, 16, "#8fc46a"); // base mid-grass
  // dark blade clusters
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rnd(i) * 16);
    const y = Math.floor(rnd(i + 90) * 16);
    px(ctx, x, y, "#5e9442");
  }
  // light tip highlights
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd(i + 200) * 16);
    const y = Math.floor(rnd(i + 300) * 16);
    px(ctx, x, y, "#bbe190");
  }
  // occasional white blossom dot
  if (true) {
    px(ctx, 4, 11, "#fde4ea");
    px(ctx, 12, 4, "#fde4ea");
  }
}

function drawDirtTile(ctx) {
  const rnd = tileNoise(13);
  pxRect(ctx, 0, 0, 16, 16, "#a07550"); // mid earth
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rnd(i) * 16);
    const y = Math.floor(rnd(i + 50) * 16);
    px(ctx, x, y, "#6c4426");
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd(i + 90) * 16);
    const y = Math.floor(rnd(i + 130) * 16);
    px(ctx, x, y, "#c39570");
  }
}

function drawTilledTile(ctx) {
  pxRect(ctx, 0, 0, 16, 16, "#8b5a35"); // base
  // 3 dark furrows
  for (const fy of [3, 8, 13]) {
    pxRect(ctx, 0, fy, 16, 1, "#5a361a");
    pxRect(ctx, 0, fy + 1, 16, 1, "#7c4a26");
  }
  // tiny pebbles
  px(ctx, 5, 1, "#c39570");
  px(ctx, 11, 6, "#c39570");
  px(ctx, 2, 11, "#c39570");
}

function drawWateredTile(ctx) {
  pxRect(ctx, 0, 0, 16, 16, "#5a3a1f");
  for (const fy of [3, 8, 13]) {
    pxRect(ctx, 0, fy, 16, 1, "#34200e");
    pxRect(ctx, 0, fy + 1, 16, 1, "#4a2e16");
  }
  // damp shimmer dots
  px(ctx, 4, 5, "#7d9ab2");
  px(ctx, 11, 10, "#7d9ab2");
  px(ctx, 2, 14, "#7d9ab2");
}

function drawPathTile(ctx) {
  const rnd = tileNoise(21);
  pxRect(ctx, 0, 0, 16, 16, "#d4b885"); // sandy base
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rnd(i) * 16);
    const y = Math.floor(rnd(i + 70) * 16);
    px(ctx, x, y, "#a8895a");
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rnd(i + 200) * 16);
    const y = Math.floor(rnd(i + 250) * 16);
    px(ctx, x, y, "#ecd6a8");
  }
}

function drawWaterTile(ctx) {
  pxRect(ctx, 0, 0, 16, 16, "#5d96cf");
  // ripple lines
  pxRect(ctx, 2, 4, 5, 1, "#a4c8e8");
  pxRect(ctx, 10, 8, 4, 1, "#a4c8e8");
  pxRect(ctx, 1, 12, 3, 1, "#a4c8e8");
  pxRect(ctx, 9, 13, 5, 1, "#a4c8e8");
  // sparkle
  px(ctx, 6, 2, "#fbf6e8");
  px(ctx, 13, 6, "#fbf6e8");
  px(ctx, 3, 10, "#fbf6e8");
}

function drawStoneTile(ctx) {
  pxRect(ctx, 0, 0, 16, 16, "#9a948c");
  // crack divisions creating a 2x2 stone pattern
  pxRect(ctx, 0, 7, 16, 1, "#5a544c");
  pxRect(ctx, 7, 0, 1, 7, "#5a544c");
  pxRect(ctx, 9, 8, 1, 8, "#5a544c");
  // surface specks
  px(ctx, 3, 3, "#bdb6ad");
  px(ctx, 12, 4, "#bdb6ad");
  px(ctx, 4, 11, "#bdb6ad");
  px(ctx, 13, 12, "#bdb6ad");
  px(ctx, 2, 9, "#7a7670");
  px(ctx, 11, 14, "#7a7670");
}

function drawWoodFloorTile(ctx) {
  pxRect(ctx, 0, 0, 16, 16, "#b08458");
  // plank gaps
  pxRect(ctx, 0, 5, 16, 1, "#704c25");
  pxRect(ctx, 0, 10, 16, 1, "#704c25");
  // grain highlights
  pxRect(ctx, 2, 2, 4, 1, "#cea478");
  pxRect(ctx, 9, 7, 5, 1, "#cea478");
  pxRect(ctx, 3, 12, 3, 1, "#cea478");
  pxRect(ctx, 10, 13, 4, 1, "#cea478");
}

function drawWallTile(ctx) {
  // bamboo-clad wall, vertical
  pxRect(ctx, 0, 0, 16, 16, "#7e5837");
  for (let x = 1; x < 16; x += 3) {
    pxRect(ctx, x, 0, 1, 16, "#a87a48");
    pxRect(ctx, x + 1, 0, 1, 16, "#5a3a1a");
  }
  // joint bands
  pxRect(ctx, 0, 5, 16, 1, "#3a2010");
  pxRect(ctx, 0, 12, 16, 1, "#3a2010");
}

function drawForestTile(ctx) {
  drawGrassTile(ctx);
  // tree (chunky pixel pine/leaf-blob)
  const PAL_T = {
    o: "#1d3a1a",
    g: "#3a6826",
    G: "#5e9442",
    L: "#bbe190",
    t: "#5a3018",
    T: "#7a4828",
  };
  const tree = [
    "................",
    ".......oo.......",
    "......ogggo.....",
    ".....oggGGgo....",
    "....oggGGGGgo...",
    "....oggGLLGgo...",
    ".....oGGGGGo....",
    "......oGGGo.....",
    ".......oGo......",
    ".......TTT......",
    "......tTTTt.....",
    "......tTtTt.....",
    "................",
    "................",
    "................",
    "................",
  ];
  drawSprite(ctx, tree, PAL_T);
}

function drawHerbTile(ctx) {
  drawGrassTile(ctx);
  const palH = {
    s: "#3a6826",
    g: "#5e9442",
    L: "#bbe190",
    f: "#f0c878",
    F: "#fde4ea",
  };
  const herb = [
    "................",
    "................",
    "................",
    ".......f........",
    "......fFf.......",
    ".....fFFFf......",
    "......LfL.......",
    "......sgs.......",
    ".....gGgGg......",
    ".....gLgLg......",
    "......gsg.......",
    "......sgs.......",
    "................",
    "................",
    "................",
    "................",
  ];
  drawSprite(ctx, herb, palH);
}

// ===========================================================================
// CROPS (transparent overlay; tilled tile shows through)
// ===========================================================================

function buildCropSprite(stage, fruitColor, fruitGlow) {
  const c = makeCanvas(TILE, TILE);
  const ctx = c.getContext("2d");
  const palette = {
    s: "#3a6826",        // stem dark
    g: "#5e9442",        // leaf mid
    L: "#bbe190",        // leaf highlight
    o: "#1d3a1a",        // outline
    f: fruitColor,
    F: fruitGlow,
  };
  let lines;
  if (stage === 0) {
    lines = [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "......oLo.......",
      "......oso.......",
      ".......o........",
      "................",
      "................",
    ];
  } else if (stage === 1) {
    lines = [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".....oLo........",
      "....oLgLo.......",
      ".....oso........",
      ".....oso..oLo...",
      "....oLgLooLgLo..",
      ".....oso..oso...",
      "......o....s....",
      ".......os.so....",
      "................",
      "................",
    ];
  } else {
    lines = [
      "................",
      "................",
      "................",
      "....offo..offo..",
      "...offFffooffFf.",
      "....offo..offo..",
      ".......offo.....",
      "......offFf.....",
      ".......offo.....",
      ".....oLgLo......",
      ".....oggLo......",
      "....oLgGgLo.....",
      ".....oso........",
      "......oso.......",
      ".......o........",
      "................",
    ];
  }
  drawSprite(ctx, lines, palette);
  return c;
}

// ===========================================================================
// PLAYER — chibi jade-hanfu cultivator (per design deck)
// ===========================================================================

const PLAYER_PAL = {
  o: "#2a221b",        // outline / hair
  H: "#1a120c",        // dark hair
  h: "#2a1f15",        // mid hair
  s: "#f5d4a8",        // skin
  S: "#dab488",        // skin shade
  e: "#2a221b",        // eye
  m: "#a85040",        // mouth
  r: "#7fbf95",        // jade robe mid
  R: "#4d8c66",        // jade robe shadow
  l: "#b6e5b9",        // jade robe highlight
  W: "#fbf6e8",        // sash white
  w: "#dac8a4",        // sash shade
  y: "#d4a548",        // gold trim
  p: "#3a2818",        // pants
  k: "#1a1410",        // shoes
  d: "rgba(36,28,20,0.3)", // ground shadow
};

// 16x16 logical body; feet near row 13.
const PLAYER_DOWN_0 = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHo....",
  "...oHHhhhHhHo...",
  "...ohssssssho...",
  "...osseesseeso..",
  "...osssssssso...",
  "....osssmsso....",
  ".....osssso.....",
  "....orrrwrro....",
  "...orrwwWwwrro..",
  "...orrwwwwwrro..",
  "...orrrrrrrrro..",
  "....opp..ppo....",
  "....okk..kko....",
  "....dddddddd....",
];
const PLAYER_DOWN_1 = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHo....",
  "...oHHhhhHhHo...",
  "...ohssssssho...",
  "...osseesseeso..",
  "...osssssssso...",
  "....osssmsso....",
  ".....osssso.....",
  "....orrrwrro....",
  "...orrwwWwwrro..",
  "...orrwwwwwrro..",
  "...orrrrrrrrro..",
  "....opp...ppo...",
  "....okk....kko..",
  "....dddddddd....",
];

const PLAYER_UP_0 = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHo....",
  "...oHHHHHHHHo...",
  "...oHHhhhhHHo...",
  "...oHHHHHHHHo...",
  "...oHHHHHHHHo...",
  "....oHHHHHHo....",
  ".....osssso.....",
  "....orrwwrro....",
  "...orrwwWwwrro..",
  "...orrwwwwwrro..",
  "...orrrrrrrrro..",
  "....opp..ppo....",
  "....okk..kko....",
  "....dddddddd....",
];
const PLAYER_UP_1 = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHo....",
  "...oHHHHHHHHo...",
  "...oHHhhhhHHo...",
  "...oHHHHHHHHo...",
  "...oHHHHHHHHo...",
  "....oHHHHHHo....",
  ".....osssso.....",
  "....orrwwrro....",
  "...orrwwWwwrro..",
  "...orrwwwwwrro..",
  "...orrrrrrrrro..",
  "....opp...ppo...",
  "....okk....kko..",
  "....dddddddd....",
];

const PLAYER_RIGHT_0 = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHHo...",
  "...oHHhhhhHHo...",
  "...ohssssHHHo...",
  "...osssseeHHo...",
  "...osssssHHHo...",
  "....osssmsso....",
  ".....osssso.....",
  "....orrwwrro....",
  "...orrwWwwrrro..",
  "...orrwwwwwrro..",
  "...orrrrrrrrro..",
  "....opppppo.....",
  "....okkkko......",
  "....dddddddd....",
];
const PLAYER_RIGHT_1 = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHHo...",
  "...oHHhhhhHHo...",
  "...ohssssHHHo...",
  "...osssseeHHo...",
  "...osssssHHHo...",
  "....osssmsso....",
  ".....osssso.....",
  "....orrwwrro....",
  "...orrwWwwrrro..",
  "...orrwwwwwrro..",
  "...orrrrrrrrro..",
  ".....opppppo....",
  ".....okkkko.....",
  "....dddddddd....",
];

// Mirror for left/right done at draw-time would be cleaner but our renderer
// doesn't flip. We keep symmetric data.
const PLAYER_LEFT_0 = PLAYER_RIGHT_0.map(row =>
  row.split("").reverse().join("")
);
const PLAYER_LEFT_1 = PLAYER_RIGHT_1.map(row =>
  row.split("").reverse().join("")
);

function buildPlayerSprite(lines) {
  const c = makeCanvas(TILE, TILE);
  drawSprite(c.getContext("2d"), lines, PLAYER_PAL);
  return c;
}

// ===========================================================================
// BEASTS
// ===========================================================================

const BEAST_BASE_PAL = {
  o: "#2a221b",
  d: "rgba(36,28,20,0.32)",
};

// Build a beast sprite from a per-creature palette + bitmap.
function buildBeastFrame(palette, lines) {
  const c = makeCanvas(TILE, TILE);
  drawSprite(c.getContext("2d"), lines, palette);
  return c;
}

// Spirit Rabbit — soft grey-white with red eyes.
const RABBIT_PAL = {
  o: "#2a221b",
  W: "#f3ede0",
  w: "#cbc4b0",
  p: "#f4b6c2",
  R: "#c43a31",
  d: "rgba(36,28,20,0.3)",
};
const RABBIT_0 = [
  "................",
  "................",
  "................",
  "....op....po....",
  "...oWpo..oWpo...",
  "...oWpo..oWpo...",
  "....oWooooWo....",
  "...oWWWwwWWWo...",
  "...oWRwwwwRWo...",
  "...oWWwwwwWWo...",
  "....oWWWWWWo....",
  ".....oWWWWo.....",
  "....oWoooWo.....",
  "....do..do......",
  "....dddddddd....",
  "................",
];
const RABBIT_1 = [
  "................",
  "................",
  "....op....po....",
  "...oWpo..oWpo...",
  "...oWpo..oWpo...",
  "....oWooooWo....",
  "...oWWWwwWWWo...",
  "...oWRwwwwRWo...",
  "...oWWwwwwWWo...",
  "....oWWWWWWo....",
  ".....oWWWWo.....",
  "....oWoooWo.....",
  "................",
  "....do..do......",
  "....dddddddd....",
  "................",
];

const BOAR_PAL = {
  o: "#2a221b",
  D: "#5a3a1a",
  M: "#7a5530",
  L: "#a47a4a",
  W: "#fbf6e8",
  R: "#ff8030",
  d: "rgba(36,28,20,0.32)",
};
const BOAR_0 = [
  "................",
  "................",
  "................",
  "....oooo........",
  "...oDMMDo.......",
  "...oMRRMo.......",
  "...oMMMMooooo...",
  "..oWoMDDMMMMMo..",
  "..oDoMMMMLLMMo..",
  "...oMMMMMMMMo...",
  "...oMMMLMMMo....",
  "....oMMLMMo.....",
  "....oo.oo.......",
  "....DD.DD.......",
  "....dddddddd....",
  "................",
];
const BOAR_1 = [
  "................",
  "................",
  "....oooo........",
  "...oDMMDo.......",
  "...oMRRMo.......",
  "...oMMMMooooo...",
  "..oWoMDDMMMMMo..",
  "..oDoMMMMLLMMo..",
  "...oMMMMMMMMo...",
  "...oMMMLMMMo....",
  "....oMMLMMo.....",
  "....oo.oo.......",
  "....DD.DD.......",
  "................",
  "....dddddddd....",
  "................",
];

const WOLF_PAL = {
  o: "#2a221b",
  D: "#3b3a4d",
  M: "#5a596d",
  L: "#7a7a90",
  C: "#9adfee",
  W: "#fbf6e8",
  d: "rgba(36,28,20,0.32)",
};
const WOLF_0 = [
  "................",
  "................",
  ".....oo..oo.....",
  "....oDDooDDo....",
  "....oDMooMDo....",
  "....oMMMMMMo....",
  "....oCMooMCo....",
  "...oWoMMMMoWo...",
  "...oDoMMMMoDo...",
  "..oMMMMLLMMMMo..",
  "..oMMMMMMMMMMo..",
  "...oMMMMMMMMo...",
  "....ooo..ooo....",
  "....DD....DD....",
  "....dddddddd....",
  "................",
];
const WOLF_1 = [
  "................",
  ".....oo..oo.....",
  "....oDDooDDo....",
  "....oDMooMDo....",
  "....oMMMMMMo....",
  "....oCMooMCo....",
  "...oWoMMMMoWo...",
  "...oDoMMMMoDo...",
  "..oMMMMLLMMMMo..",
  "..oMMMMMMMMMMo..",
  "...oMMMMMMMMo...",
  "....ooo..ooo....",
  "....DD....DD....",
  "................",
  "....dddddddd....",
  "................",
];

// Hungry Ghost (gui) — pale wisp, hollow eyes.
const GUI_PAL = {
  o: "#2a221b",
  W: "#dbe6ee",
  w: "#9eb3c0",
  E: "#000000",
  C: "#7afaff",
  G: "rgba(120, 200, 255, 0.18)",
  d: "rgba(36,28,20,0.25)",
};
const GUI_0 = [
  "................",
  ".......GG.......",
  "......GGGG......",
  ".....oWWWWo.....",
  "....oWWwwWWo....",
  "....oWEEEEWo....",
  "....oWCEECWo....",
  "....oWwwwwWo....",
  "....oWWEEWWo....",
  "....oWWWWWWo....",
  ".....oWwwWo.....",
  "....oWoooWo.....",
  "....oWoooWo.....",
  ".....oooo.......",
  "................",
  "................",
];
const GUI_1 = [
  "................",
  "................",
  ".......GG.......",
  "......GGGG......",
  ".....oWWWWo.....",
  "....oWWwwWWo....",
  "....oWEEEEWo....",
  "....oWCEECWo....",
  "....oWwwwwWo....",
  "....oWWEEWWo....",
  "....oWWWWWWo....",
  ".....oWwwWo.....",
  "....oWoooWo.....",
  "....oWoooWo.....",
  ".....oooo.......",
  "................",
];

// Jiangshi — green face, Qing hat, yellow forehead seal, blue robe.
const JIANGSHI_PAL = {
  o: "#2a221b",
  S: "#9bc28a",          // skin green
  s: "#7ca870",          // skin shadow
  H: "#1a1410",          // hat black
  Y: "#f3e7c9",          // talisman paper
  y: "#c43a31",          // talisman ink
  R: "#243a78",          // robe blue
  r: "#3a528a",          // robe highlight
  G: "#d4a548",          // gold trim
  W: "#fbf6e8",
  d: "rgba(36,28,20,0.32)",
};
const JIANGSHI_0 = [
  "................",
  "....HHHHHH......",
  "...HHGGGGHH.....",
  "....HHHHHH......",
  "....oSYYSo......",
  "....oSyySo......",
  "....oSYYSo......",
  "...oSooooSo.....",
  "...oSeoeeoSo....",
  "...oRRRRRRRo....",
  "..oWGRRrrRGWo...",
  "..oWoRRRRRoWo...",
  "...oRRRRRRRo....",
  "....oo..oo......",
  "....HH..HH......",
  "....dddddddd....",
];
const JIANGSHI_1 = [
  "....HHHHHH......",
  "...HHGGGGHH.....",
  "....HHHHHH......",
  "....oSYYSo......",
  "....oSyySo......",
  "....oSYYSo......",
  "...oSooooSo.....",
  "...oSeoeeoSo....",
  "...oRRRRRRRo....",
  "..oWGRRrrRGWo...",
  "..oWoRRRRRoWo...",
  "...oRRRRRRRo....",
  "....oo..oo......",
  "....HH..HH......",
  "................",
  "....dddddddd....",
];

// Huli Jing — orange-and-white two-tail fox spirit.
const HULI_PAL = {
  o: "#2a221b",
  O: "#e07a30",
  M: "#bd5a18",
  W: "#f7e0c8",
  D: "#7a3a10",
  Y: "#ffd048",
  J: "#7fbf95",
  R: "#c43a31",
  d: "rgba(36,28,20,0.32)",
};
const HULI_0 = [
  "................",
  "................",
  "....oo....oo....",
  "...oOMo..oOMo...",
  "...oOOoooOOo....",
  "....oOJJOOo.....",   // jade hairpin J
  "...oOOYOOOOo....",
  "...oOWoooWOo....",
  "...oOWeeeWOo....",   // amber eyes
  "....oOWOOWOo....",
  "...oOOWWWWOo....",
  "..oOOOOOOOOOo...",
  ".oOMOMMOMMOMOo..",   // body with belly
  "..oWWWWWWWWWWo..",
  ".oOoO....OoOo...",
  "....dddddddd....",
];
const HULI_1 = [
  "................",
  "....oo....oo....",
  "...oOMo..oOMo...",
  "...oOOoooOOo....",
  "....oOJJOOo.....",
  "...oOOYOOOOo....",
  "...oOWoooWOo....",
  "...oOWeeeWOo....",
  "....oOWOOWOo....",
  "...oOOWWWWOo....",
  "..oOOOOOOOOOo...",
  ".oOMOMMOMMOMOo..",
  "..oWWWWWWWWWWo..",
  ".oOoO....OoOo...",
  "................",
  "....dddddddd....",
];

// Nine-tail fox boss — golden, multi-tail aura.
const NINE_PAL = {
  o: "#2a221b",
  G: "#f3a838",
  M: "#d48330",
  W: "#fff5d8",
  D: "#7a3a10",
  R: "#ff3030",
  Y: "#fff8a0",
  A: "rgba(212,165,72,0.18)",
  d: "rgba(36,28,20,0.4)",
};
const NINE_0 = [
  "................",
  "..GGAGAGAGAGGGG.",
  ".AGoGoooGoGoGoA.",
  "..GGAGoooooAGGG.",
  "....oo....oo....",
  "...oGMo..oGMo...",
  "...oGGooooGGo...",
  "...oGGRoooRGGo..",
  "..oGGGYRRYGGGo..",
  "..oGGGGGGGGGGo..",
  ".oGWWWGGGGWWWGo.",
  "..oGGGGGGGGGGo..",
  "...oGGoo..ooGGo.",
  "....DD....DD....",
  "................",
  "....dddddddd....",
];
const NINE_1 = [
  "..GGAGAGAGAGGGG.",
  ".AGoGoooGoGoGoA.",
  "..GGAGoooooAGGG.",
  "....oo....oo....",
  "...oGMo..oGMo...",
  "...oGGooooGGo...",
  "...oGGRoooRGGo..",
  "..oGGGYRRYGGGo..",
  "..oGGGGGGGGGGo..",
  ".oGWWWGGGGWWWGo.",
  "..oGGGGGGGGGGo..",
  "...oGGoo..ooGGo.",
  "....DD....DD....",
  "................",
  "................",
  "....dddddddd....",
];

// Qilin — jade-scaled chimera with golden flame mane and single horn.
const QILIN_PAL = {
  o: "#2a221b",
  J: "#3f8a5a",
  j: "#5fae8a",
  L: "#b6e5b9",
  G: "#d4a548",
  F: "#ff8030",
  Y: "#ffd070",
  W: "#fbf6e8",
  d: "rgba(36,28,20,0.36)",
};
const QILIN_0 = [
  "................",
  "......G.........",
  "......G.........",
  ".....FYF........",
  "....FFYFF.......",
  "...FYJJYF.......",
  "..FYJWoWJF......",
  "..FYJJoJJF......",
  "...oJjjjJo......",
  "..oJJjLLjJJo....",
  ".oLJjjjLJjjJLo..",
  ".oJjLjjjjLjjJo..",
  "..oJJjLjLjJJo...",
  "....oo....oo....",
  "....HH....HH....",
  "....dddddddd....",
];
const QILIN_1 = [
  "......G.........",
  "......G.........",
  ".....FYF........",
  "....FFYFF.......",
  "...FYJJYF.......",
  "..FYJWoWJF......",
  "..FYJJoJJF......",
  "...oJjjjJo......",
  "..oJJjLLjJJo....",
  ".oLJjjjLJjjJLo..",
  ".oJjLjjjjLjjJo..",
  "..oJJjLjLjJJo...",
  "....oo....oo....",
  "....HH....HH....",
  "................",
  "....dddddddd....",
];

// Young Dragon — coiled red-gold with whiskers.
const DRAGON_PAL = {
  o: "#2a221b",
  R: "#a82828",
  M: "#7e1a1a",
  G: "#d4a548",
  Y: "#ffd048",
  W: "#fbf6e8",
  A: "rgba(212,40,40,0.18)",
  d: "rgba(36,28,20,0.4)",
};
const DRAGON_0 = [
  "AAAAAAAAAAAAAAAA",
  "A...........GGAA",
  "A.........oRRRGA",
  "A........oRMRYRG",
  "A.......oRRYoRRA",
  "A.....oRRMRYRRoY",  // whiskers tail-end
  "A....oRRMMMRRoYY",
  "A...oRRMRRMRRoYA",
  "A...oRRRMRMRRoYA",
  "A....oRRMMMMRoAA",
  "A.....oRRRRRRoAA",
  "A.....oRRMMRMoAA",
  "A...oRRMRMRMRoAA",
  "A..oRRRMRMRMRoAA",
  "A...oo....oo.AAA",
  "....dddddddd....",
];
const DRAGON_1 = [
  "AAAAAAAAAAAAAAAA",
  "A...........GGAA",
  "A.........oRRRGA",
  "A........oRMRYRG",
  "A.......oRRYoRRA",
  "A.....oRRMRYRRoY",
  "A....oRRMMMRRoYY",
  "A...oRRMRRMRRoYA",
  "A...oRRRMRMRRoYA",
  "A....oRRMMMMRoAA",
  "A.....oRRRRRRoAA",
  "A.....oRRMMRMoAA",
  "A...oRRMRMRMRoAA",
  "A..oRRRMRMRMRoAA",
  "A....oo....oo.AA",
  "....dddddddd....",
];

// ===========================================================================
// MERCHANT (chibi in warm wood-brown hanfu)
// ===========================================================================
const MERCHANT_PAL = {
  o: "#2a221b",
  H: "#1a120c",
  h: "#3a2818",
  s: "#f3d4a0",
  e: "#2a221b",
  m: "#a85040",
  R: "#7e5837",        // wooden-brown robe
  r: "#5a3a1a",
  L: "#d4b577",
  W: "#fbf6e8",
  Y: "#d4a548",
  k: "#1a1410",
  d: "rgba(36,28,20,0.32)",
};
const MERCHANT = [
  "................",
  ".....oooooo.....",
  "....oHHHHHHo....",
  "...oHHhhhhHo....",
  "...ohsssssho....",
  "...osseesseso...",
  "...osssssssso...",
  "....osssmsso....",
  ".....osssso.....",
  "....oRRRWRRo....",
  "...oRrLWWWLrRo..",
  "...oRrYWWWYrRo..",
  "...oRRRRRRRRRo..",
  "....okk..kko....",
  "....okk..kko....",
  "....dddddddd....",
];

// ===========================================================================
// COMPANION PARTNER (chibi in peach-blossom hanfu)
// ===========================================================================
// Cute fox companion — orange/white chibi fox with fluffy tail and sparkle.
const FOX_PAL = {
  o: "#2a221b",
  O: "#e07a30",
  M: "#bd5a18",
  W: "#fde4ea",       // pink-tinged white belly
  w: "#f4b6c2",       // pink cheek
  E: "#1a1410",
  Y: "#fff8a0",       // sparkle
  d: "rgba(36,28,20,0.32)",
};
const FOX_0 = [
  "................",
  "................",
  "....oo....oo....",
  "...oOMo..oOMo...",
  "...oOWooooOWo...",
  "...oOOOOOOOOOoY.",   // ears done, sparkle Y to the right
  "..oOOWWWWWWOOoO.",
  "..oOOWEooEWOOoO.",   // eyes
  "..oOWwoowwwOOOO.",   // muzzle/cheek
  "..oOOWoooWOOOOM.",   // tail extends right
  "..oOOOOOOOOOMOO.",
  "..oOWWWWWWWWOMO.",   // belly
  "..oOWooooooWOOM.",
  "...oOoO..OoOoOo.",
  "................",
  "....dddddddd....",
];
const FOX_1 = [
  "................",
  "....oo....oo....",
  "...oOMo..oOMo...",
  "...oOWooooOWo...",
  "...oOOOOOOOOOoY.",
  "..oOOWWWWWWOOoO.",
  "..oOOWEooEWOOoO.",
  "..oOWwoowwwOOOO.",
  "..oOOWoooWOOOOM.",
  "..oOOOOOOOOOMOO.",
  "..oOWWWWWWWWOMO.",
  "..oOWooooooWOOM.",
  "...oOoO..OoOoOo.",
  "................",
  "................",
  "....dddddddd....",
];

const PARTNER_PAL = {
  o: "#2a221b",
  H: "#1a120c",
  h: "#3a2818",
  s: "#f5d4a8",
  e: "#2a221b",
  m: "#c43a31",
  R: "#f4b6c2",        // peach blossom robe
  r: "#e08aa0",
  L: "#fde4ea",
  W: "#fbf6e8",
  Y: "#d4a548",
  J: "#7fbf95",        // jade hairpin
  k: "#1a1410",
  d: "rgba(36,28,20,0.32)",
};
const PARTNER_0 = [
  "................",
  ".....oooooo.....",
  "....oHJHHHHo....",
  "...oHHhhhhHo....",
  "...ohsssssho....",
  "...osseesseso...",
  "...osssssssso...",
  "....osssmsso....",
  ".....osssso.....",
  "....oRRRWRRo....",
  "...oRrLWWWLrRo..",
  "...oRrYWWWYrRo..",
  "...oRRRRRRRRRo..",
  "....opp..ppo....",
  "....okk..kko....",
  "....dddddddd....",
];
const PARTNER_1 = [
  "................",
  ".....oooooo.....",
  "....oHJHHHHo....",
  "...oHHhhhhHo....",
  "...ohsssssho....",
  "...osseesseso...",
  "...osssssssso...",
  "....osssmsso....",
  ".....osssso.....",
  "....oRRRWRRo....",
  "...oRrLWWWLrRo..",
  "...oRrYWWWYrRo..",
  "...oRRRRRRRRRo..",
  "....opp...ppo...",
  "....okk....kko..",
  "....dddddddd....",
];
PARTNER_PAL.p = "#3a2818";

// ===========================================================================
// STRUCTURES (variable size — each builds its own canvas)
// ===========================================================================

// Helper: build a fresh canvas of the given logical size and run drawer.
function buildStruct(logicalW, logicalH, drawer) {
  const c = makeCanvas(logicalW * PXSCALE, logicalH * PXSCALE);
  drawer(c.getContext("2d"));
  return c;
}

// (HOUSE_PAL removed — replaced by procedural drawHousePagoda below.)
const _HOUSE_DEAD_PAL = {
  o: "#2a221b",
  J: "#5e9070",      // jade tile mid
  j: "#3a6b51",      // jade tile shadow
  L: "#a8d6b0",      // jade tile highlight
  W: "#a87a48",      // wood wall
  w: "#7e5837",      // wood shadow
  X: "#d4a675",      // wood highlight
  D: "#3a2010",      // door
  Y: "#d4a548",      // gold trim / banner
  R: "#c43a31",      // banner red
  G: "#7fbf95",      // jade accent
  P: "#fbf6e8",      // paper window
  B: "#5d96cf",      // window blue
  s: "rgba(36,28,20,0.3)", // shadow
};
const HOUSE = [
  "................................................",
  "................................................",
  "................oo..............oo..............",
  "...............oJJoo..........ooJJo..............",
  "............ooJjjJJoo........ooJJjjJoo...........",
  "..........ooJjjLLjJJoooooooooJJjLLjjJoo..........",
  ".........oJJjjLLjjJJjjjjjjjjJJjjLLjjJJo..........",
  "........oJJLLJjjJJjLjLjLjLjLJJjjjJLLJJo..........",
  ".......ooJJjjJJjjJJjjjjjjjjJJjjJJjjJJoo..........",
  "......ooJJjjjjJJJJJJJJJJJJJJJJJJjjjjJJoo.........",
  ".....ooooooooooooooooooooooooooooooooooooo.......",
  ".....oYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYo.......",
  ".....oWWWWWWWWWWWWRRRRRRRRRWWWWWWWWWWWWWWo.......",
  ".....oWXXWWWWXWWWWRYYYYYYRWWWWXWXWWWWXXWWo.......",
  ".....oWWWBBWWWWWWWRYYYYYYRWWWWWWWBBWWWWWWo.......",
  ".....oWXBBBBWWWWWWRYRYRYRRWWWWWWWBBBBXWWWo.......",
  ".....oWWBBPBWWWWWWRYYYYYYRWWWWWWWBBPBWWWWo.......",
  ".....oWWBBBBWWWWWWWWDDDDDWWWWWWWWBBBBWWWWo.......",
  ".....oWWWWWWWWWWWWWWDDDDDWWWWWWWWWWWWWWWWo.......",
  ".....oWXWWWXWWWWWWWWDDYDDWWWWWWWWWXWWWXWWo.......",
  ".....oWWWWWWWWWWWWWWDDDDDWWWWWWWWWWWWWWWWo.......",
  ".....oWXWWWWWWWWWWWWDDDDDWWWWWWWWWWWWWXWWo.......",
  ".....ooooooooooooooooooooooooooooooooooooo.......",
  ".....sssssssssssssssssssssssssssssssssssss.......",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
  "................................................",
];

// Upgraded house — adds a second roof tier + pink lanterns.
const HOUSE_UPGRADED = HOUSE.map((row, y) => {
  // No-op: we'll patch it post-build for the upgraded look.
  return row;
});

// Procedural pagoda house — 4 silhouette tiers per the design deck.
// Canvas is 96x96 actual (48x48 logical).
const HOUSE_C = {
  o: "#2a221b",
  J: "#5e9070", j: "#3a6b51", L: "#a8d6b0",   // jade tiles
  W: "#a87a48", w: "#7e5837", X: "#d4a675",   // wood
  Wd: "#5a3a1a",
  D: "#3a2010", P: "#fbf6e8", B: "#7d9ab2",
  Y: "#d4a548", Yd: "#a87b1f",
  R: "#c43a31", Rd: "#7a1f1a",
  S: "#9a948c", Sd: "#5a544c",
  Lt: "#fde4ea", Ls: "#f4b6c2", Ld: "#e08aa0",
  Sk: "#f4b6c2", Skd: "#e08aa0",
  Bm: "#8aae5a", Bmd: "#4d7035",
};

function drawJadeRoof(ctx, cx, baseY, halfSpan, height) {
  const C = HOUSE_C;
  for (let dy = 0; dy < height; dy++) {
    const t = dy / Math.max(1, height - 1);
    const w = Math.max(2, Math.round(halfSpan * (0.20 + 0.80 * t)));
    const y = baseY - height + dy;
    pxRect(ctx, cx - w - 1, y, 1, 1, C.o);
    pxRect(ctx, cx + w, y, 1, 1, C.o);
    pxRect(ctx, cx - w, y, w * 2, 1, C.J);
    if (dy % 2 === 0) {
      for (let x = cx - w + 1; x < cx + w; x += 4) px(ctx, x, y, C.j);
    }
    if (dy === 0) pxRect(ctx, cx - w, y, w * 2, 1, C.L);
    if (dy === height - 1) pxRect(ctx, cx - w, y, w * 2, 1, C.j);
  }
  const eaveY = baseY - 1;
  pxRect(ctx, cx - halfSpan - 2, eaveY, 1, 1, C.j);
  pxRect(ctx, cx - halfSpan - 3, eaveY - 1, 1, 1, C.J);
  pxRect(ctx, cx - halfSpan - 2, eaveY - 2, 1, 1, C.L);
  pxRect(ctx, cx + halfSpan + 1, eaveY, 1, 1, C.j);
  pxRect(ctx, cx + halfSpan + 2, eaveY - 1, 1, 1, C.J);
  pxRect(ctx, cx + halfSpan + 1, eaveY - 2, 1, 1, C.L);
  pxRect(ctx, cx, baseY - height - 1, 1, 1, C.Yd);
  pxRect(ctx, cx - 1, baseY - height - 2, 2, 1, C.Y);
}

function drawHangingLantern(ctx, x, y) {
  const C = HOUSE_C;
  pxRect(ctx, x, y, 1, 2, C.Wd);
  pxRect(ctx, x - 1, y + 2, 3, 1, C.Yd);
  pxRect(ctx, x - 1, y + 3, 3, 3, C.Ls);
  pxRect(ctx, x - 1, y + 3, 1, 3, C.Ld);
  pxRect(ctx, x - 1, y + 3, 3, 1, C.Lt);
  pxRect(ctx, x - 1, y + 6, 3, 1, C.Yd);
  pxRect(ctx, x, y + 7, 1, 1, C.Y);
}

function drawSakuraTuft(ctx, x, y) {
  const C = HOUSE_C;
  pxRect(ctx, x, y, 1, 1, C.Skd);
  pxRect(ctx, x + 1, y - 1, 2, 1, C.Sk);
  pxRect(ctx, x - 1, y, 1, 1, C.Sk);
  pxRect(ctx, x + 2, y + 1, 1, 1, C.Sk);
  pxRect(ctx, x, y + 1, 1, 1, C.Skd);
}

function drawStonePlinth(ctx, cx, y, half, depth) {
  const C = HOUSE_C;
  for (let i = 0; i < depth; i++) {
    pxRect(ctx, cx - half - 1, y + i, 1, 1, C.o);
    pxRect(ctx, cx + half, y + i, 1, 1, C.o);
    pxRect(ctx, cx - half, y + i, half * 2, 1, i === 0 ? C.S : C.Sd);
    if (i === 0) {
      for (let x = cx - half + 2; x < cx + half; x += 4) px(ctx, x, y, C.Sd);
    }
  }
}

function drawHouseWalls(ctx, cx, top, halfSpan, height, opts = {}) {
  const C = HOUSE_C;
  const left = cx - halfSpan;
  const right = cx + halfSpan;
  pxRect(ctx, left - 1, top, 1, height, C.o);
  pxRect(ctx, right, top, 1, height, C.o);
  pxRect(ctx, left, top, halfSpan * 2, height, C.W);
  pxRect(ctx, left, top, halfSpan * 2, 1, C.w);
  pxRect(ctx, left - 1, top + height, halfSpan * 2 + 2, 1, C.o);
  for (let x = left + 1; x < right; x += 5) {
    pxRect(ctx, x, top + 1, 1, height - 2, C.X);
  }
  const doorW = opts.doorW || 4;
  const doorH = opts.doorH || 6;
  const doorX = cx - Math.floor(doorW / 2);
  const doorY = top + height - doorH;
  pxRect(ctx, doorX - 1, doorY, doorW + 2, doorH, C.o);
  pxRect(ctx, doorX, doorY, doorW, doorH, C.D);
  pxRect(ctx, doorX, doorY, doorW, 1, C.Yd);
  pxRect(ctx, cx, doorY + Math.floor(doorH / 2), 1, 1, C.Y);
  if (opts.windows !== false) {
    const winY = top + 2;
    const winXs = [cx - halfSpan + 3, cx + halfSpan - 5];
    for (const wx of winXs) {
      pxRect(ctx, wx - 1, winY - 1, 5, 1, C.o);
      pxRect(ctx, wx - 1, winY + 3, 5, 1, C.o);
      pxRect(ctx, wx - 1, winY, 1, 3, C.o);
      pxRect(ctx, wx + 3, winY, 1, 3, C.o);
      pxRect(ctx, wx, winY, 3, 3, C.B);
      pxRect(ctx, wx + 1, winY, 1, 3, C.P);
      pxRect(ctx, wx, winY + 1, 3, 1, C.P);
    }
  }
  if (opts.banner) {
    const bx = cx - 2;
    const by = top - 2;
    pxRect(ctx, bx, by, 4, 5, C.R);
    pxRect(ctx, bx, by, 4, 1, C.Rd);
    pxRect(ctx, bx + 1, by + 2, 2, 1, C.Y);
  }
}

function drawHousePagoda(ctx, tier) {
  const C = HOUSE_C;
  ctx.clearRect(0, 0, 96, 96);
  pxRect(ctx, 8, 44, 32, 1, "rgba(36,28,20,0.32)"); // ground shadow

  if (tier === 0) {
    // Bamboo Hut
    drawJadeRoof(ctx, 24, 22, 12, 8);
    drawHouseWalls(ctx, 24, 22, 9, 18, { doorW: 4, doorH: 6, windows: true, banner: false });
    drawStonePlinth(ctx, 24, 40, 11, 3);
    pxRect(ctx, 9, 28, 1, 12, C.Bmd);
    pxRect(ctx, 10, 28, 1, 12, C.Bm);
    pxRect(ctx, 38, 28, 1, 12, C.Bm);
    pxRect(ctx, 39, 28, 1, 12, C.Bmd);
    pxRect(ctx, 8, 27, 3, 1, C.Bm);
    pxRect(ctx, 38, 27, 3, 1, C.Bm);
  } else if (tier === 1) {
    // Cultivator Cottage
    drawJadeRoof(ctx, 24, 21, 16, 11);
    drawHouseWalls(ctx, 24, 21, 13, 18, { doorW: 5, doorH: 7, windows: true, banner: true });
    drawStonePlinth(ctx, 24, 39, 14, 4);
    pxRect(ctx, 8, 21, 32, 1, C.Yd);
  } else if (tier === 2) {
    // Courtyard House
    drawJadeRoof(ctx, 24, 12, 9, 6);
    drawJadeRoof(ctx, 24, 22, 18, 10);
    drawHouseWalls(ctx, 24, 22, 15, 17, { doorW: 5, doorH: 7, windows: true, banner: true });
    drawStonePlinth(ctx, 24, 39, 17, 4);
    drawHangingLantern(ctx, 6, 22);
    drawHangingLantern(ctx, 41, 22);
    drawSakuraTuft(ctx, 4, 20);
    drawSakuraTuft(ctx, 43, 20);
    pxRect(ctx, 6, 22, 36, 1, C.Yd);
    pxRect(ctx, 21, 39, 6, 1, C.S);
    pxRect(ctx, 20, 40, 8, 1, C.S);
  } else {
    // Immortal Estate
    drawJadeRoof(ctx, 24, 8, 6, 5);
    drawJadeRoof(ctx, 24, 17, 12, 7);
    drawJadeRoof(ctx, 24, 27, 20, 9);
    drawHouseWalls(ctx, 24, 27, 17, 13, { doorW: 6, doorH: 8, windows: true, banner: true });
    drawStonePlinth(ctx, 24, 40, 19, 3);
    drawHangingLantern(ctx, 5, 27);
    drawHangingLantern(ctx, 12, 22);
    drawHangingLantern(ctx, 35, 22);
    drawHangingLantern(ctx, 42, 27);
    drawSakuraTuft(ctx, 3, 25);
    drawSakuraTuft(ctx, 6, 30);
    drawSakuraTuft(ctx, 41, 25);
    drawSakuraTuft(ctx, 44, 30);
    for (let x = 12; x < 36; x += 2) px(ctx, x, 17, C.L);
    pxRect(ctx, 19, 40, 10, 1, C.S);
    pxRect(ctx, 17, 41, 14, 1, C.S);
    pxRect(ctx, 15, 42, 18, 1, C.S);
    pxRect(ctx, 4, 27, 40, 1, C.Y);
  }
}

// Meditation mat — round red mat with taiji symbol.
const MAT_PAL = {
  o: "#2a221b",
  R: "#c43a31",
  M: "#7a1f1a",
  Y: "#d4a548",
  W: "#fbf6e8",
  K: "#1a1410",
  d: "rgba(36,28,20,0.32)",
};
const MAT = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "....ooooooooo...",
  "...oRMMRMMMMRo..",
  "..oRYYYYYYYYYRo.",
  "..oMYWWoooKKYMo.",
  "..oMYWooooKKYMo.",
  "..oRYYYYYYYYYRo.",
  "...oMRRRRRRRMo..",
  "....ooooooooo...",
  ".....dddddd.....",
  "................",
  "................",
];

// Well — stone rim, water, wooden bucket.
const WELL_PAL = {
  o: "#2a221b",
  S: "#9a948c",
  s: "#5a544c",
  L: "#bdb6ad",
  B: "#5d96cf",
  W: "#a4c8e8",
  D: "#3a2010",
  M: "#7e5837",
  X: "#d4a675",
  d: "rgba(36,28,20,0.32)",
};
const WELL = [
  "................",
  "....DDDDDDDD....",
  "...oM......Mo...",
  "..oMo......oMo..",
  "..oMo.MMMM.oMo..",
  "..oMo.MXXM.oMo..",
  "..oMo......oMo..",
  "...oMooooooMo...",
  "...oSSSSSSSo....",
  "..oSLsSSsLSo....",
  "..oSBBBWBBBSo...",
  "..oSWBBBBBWSo...",
  "..oSBWBBBBWSo...",
  "...oSSSSSSSo....",
  ".....ssssss.....",
  "....dddddddd....",
];

// Bed (only seen if standing where it'd render — we mark it nodraw but still
// produce a sprite for completeness).
const BED_PAL = {
  o: "#2a221b",
  W: "#7e5837",
  w: "#3a2010",
  R: "#c43a31",
  L: "#fde4ea",
  Y: "#d4a548",
  d: "rgba(36,28,20,0.32)",
};
const BED = [
  "................",
  "....wwwwwwww....",
  "...wWWWWWWWWw...",
  "..wWYYYYYYYYWw..",
  "..wWRRRRRRRRWw..",
  "..wWRLLLLRRRWw..",
  "..wWRLLLLRRRWw..",
  "..wWRRRRRRRRWw..",
  "..wWYYYYYYYYWw..",
  "...wWWWWWWWWw...",
  "....wwwwwwww....",
  "....w......w....",
  "................",
  "................",
  "................",
  "................",
];

// Talisman desk
const DESK_PAL = {
  o: "#2a221b",
  W: "#a87a48",
  w: "#704c25",
  Y: "#f3e7c9",
  R: "#c43a31",
  K: "#1a1410",
  X: "#d4a675",
  d: "rgba(36,28,20,0.32)",
};
const DESK = [
  "................",
  "................",
  "....YYY..YYY....",
  "...YRYRYYRYRY...",
  "...YYYY..YYYYK..",
  "................",
  "..oWWWWWWWWWWo..",
  "..oWXXWWWWXWWo..",
  "..oWWWWWWWWWWo..",
  "..o.WWWWWWWW.o..",
  "..o.W......W.o..",
  "..o.w......w.o..",
  "..o.w......w.o..",
  "..oww......wwo..",
  "................",
  "....dddddddd....",
];

// Pill furnace
const FURNACE_PAL = {
  o: "#2a221b",
  D: "#5a544c",
  S: "#9a948c",
  L: "#bdb6ad",
  F: "#ff7028",
  f: "#ffb84a",
  Y: "#fff5c0",
  W: "rgba(180,180,180,0.6)",
  d: "rgba(36,28,20,0.32)",
};
const FURNACE = [
  "................",
  "......WW........",
  ".....WWWW.......",
  "....WWWWWW......",
  "..oDDDDDDDDo....",
  "..oDSSSSSSDo....",
  "..oDFFffffFDo...",
  "..oDFfYYYYfDo...",
  "..oDFffYffFDo...",
  "..oDFFffffFDo...",
  "..oDSSSSSSSDo...",
  "..oDDDDDDDDDo...",
  "...oLLLLLLLo....",
  "....SSSSSSSS....",
  "................",
  "....dddddddd....",
];

// Clay stove
const STOVE_PAL = {
  o: "#2a221b",
  W: "#8a4a28",
  X: "#5a2a18",
  D: "#3a3a3a",
  s: "#7a7a82",
  F: "#ff7028",
  f: "#ffd070",
  K: "#1a1410",
  Y: "#fff5c0",
  M: "rgba(180,180,180,0.6)",
  d: "rgba(36,28,20,0.32)",
};
const STOVE = [
  "................",
  "......MM........",
  ".....MMMM.......",
  "..oDDsssssDDo...",
  "..oDsssssss Do..",
  "..oWWWWWWWWWo...",
  "..oWXWXWXWXWo...",
  "..oWXKKKKKKWo...",
  "..oWXKFffYFKo...",
  "..oWXKFYffFKo...",
  "..oWXKFffffKo...",
  "..oWXKKKKKKWo...",
  "..oWXWXWXWXWo...",
  "..oWWWWWWWWWo...",
  "................",
  "....dddddddd....",
];

// Forge
const FORGE_PAL = {
  o: "#2a221b",
  D: "#3a3a3a",
  S: "#7a7a82",
  L: "#bdb6ad",
  W: "#7a4828",
  X: "#5a3018",
  H: "#3a2010",
  F: "#ff7028",
  f: "#ffd070",
  Y: "#fff5c0",
  K: "#1a1410",
  M: "rgba(180,180,180,0.6)",
  d: "rgba(36,28,20,0.32)",
};
const FORGE = [
  ".......H........",
  "......HMM.......",
  ".....HMMM.......",
  ".....HHHH.......",
  "...oXXXXXXXXo...",
  "...oXXFFFFFXo...",
  "...oXFffYffXo...",
  "...oXFfYYffXo...",
  "...oXXFFFFFXo...",
  "...oXKKKKKKXo...",
  "..oSSSSSSSSSSo..",
  "..oSLLLLLLLLLo..",
  "...oDDDDDDDDo...",
  "....DDDDDDDD....",
  "................",
  "....dddddddd....",
];

// Spirit loom
const LOOM_PAL = {
  o: "#2a221b",
  W: "#704c25",
  w: "#3a2010",
  X: "#a87a48",
  P: "#f4b6c2",
  Q: "#e08aa0",
  J: "#7fbf95",
  Y: "#d4a548",
  T: "#fbf6e8",
  d: "rgba(36,28,20,0.32)",
};
const LOOM = [
  "................",
  "..oXXXXXXXXXXXo.",
  "..oWoTToToToooo.",
  "..oWoTToToToWWo.",
  "..oWWPWWWWWWPWo.",   // spools
  "..oWXTTTTTTTXWo.",
  "..oWXTTTTTTTXWo.",
  "..oWXTPPPPPTXWo.",
  "..oWXPQQQQQPXWo.",
  "..oWXPPQQQPPXWo.",
  "..oWXPPPPPPPXWo.",
  "..oWXJJYJJYJJXWo",
  "..oWXXXXXXXXXXWo",
  "..oWWWWWWWWWWWWo",
  "................",
  "....dddddddd....",
];

// Chest
const CHEST_PAL = {
  o: "#2a221b",
  W: "#7a4a18",
  X: "#a87a48",
  D: "#3a2010",
  Y: "#d4a548",
  L: "#f0c878",
  G: "rgba(212,165,72,0.25)",
  d: "rgba(36,28,20,0.36)",
};
const CHEST = [
  "................",
  "................",
  "..oXXXXXXXXXXo..",
  "..oXLLLLLLLLXo..",
  "..oXLLLLLLLLXo..",
  "..oWWWWWWWWWWo..",
  "..oWDWWWWWWDWo..",
  "..oWDWYYYYWDWo..",
  "..oWDWYDDLWDWo..",
  "..oWDWYDDLWDWo..",
  "..oWDWYYYYWDWo..",
  "..oWWWWWWWWWWo..",
  "..oWXXXXXXXXWo..",
  "..oWWWWWWWWWWo..",
  "................",
  "....dddddddd....",
];

// Cave entrance
const CAVE_PAL = {
  o: "#2a221b",
  S: "#5a544c",
  s: "#3a342c",
  L: "#9a948c",
  K: "#1a1410",
  R: "#ff5050",
  G: "#5e9442",
  d: "rgba(36,28,20,0.4)",
};
const CAVE = [
  "................",
  "................",
  ".....oSSSo......",
  "....oSLLLSo.....",
  "...oSLSLLLSo....",
  "..oSSSLSSSSSo...",
  "..oSLSSSsSLSo...",
  "..oSSsKKKsSSo...",
  "..oSSKKRKKSSo...",
  "..oSsKKRKKsSo...",
  "..oSsKKKKKsSo...",
  "..oSSsKKKsSSo...",
  "..oSSSsKsSSSo...",
  "...oSSSSSSSo....",
  "....G..G..G.....",
  "....dddddddd....",
];

// Decorations
const DECOR_LANTERN_PAL = {
  o: "#2a221b",
  W: "#3a2010",
  R: "#c43a31",
  r: "#e85a48",
  L: "#fde4ea",
  Y: "#d4a548",
  G: "rgba(255,200,100,0.28)",
  d: "rgba(36,28,20,0.32)",
};
const DECOR_LANTERN = [
  "................",
  "......WW........",
  "......WW........",
  "......YY........",
  ".....GGGGG......",
  "....GoRRRRoG....",
  "....oRrLLrRo....",
  "....oRrLLrRo....",
  "....oRRRRRRo....",
  "....oYYYYYYo....",
  "....oRRRRRRo....",
  ".....oYYYYo.....",
  "......YY........",
  "......WW........",
  "......WW........",
  "....dddddddd....",
];

const DECOR_BANNER_PAL = {
  o: "#2a221b",
  W: "#3a2010",
  R: "#c43a31",
  r: "#7a1f1a",
  Y: "#d4a548",
  K: "#1a1410",
  d: "rgba(36,28,20,0.32)",
};
const DECOR_BANNER = [
  "................",
  "......YYY.......",
  ".......W........",
  ".......W..oooo..",
  ".......W.oRRRRo.",
  ".......W.oRrYRo.",
  ".......W.oRYYRo.",
  ".......W.oRrYRo.",
  ".......W.oRRRRo.",
  ".......W.oRRRRo.",
  ".......W..oRRo..",
  ".......W..rrrr..",
  ".......W........",
  ".......W........",
  ".......W........",
  ".....dddddd.....",
];

const DECOR_POND_PAL = {
  o: "#2a221b",
  S: "#9a948c",
  s: "#5a544c",
  B: "#5d96cf",
  W: "#a4c8e8",
  O: "#ff8030",
  Y: "#d4a548",
  P: "#f4b6c2",
  G: "#5e9442",
  d: "rgba(36,28,20,0.32)",
};
const DECOR_POND = [
  "................",
  "................",
  "....SSSSSSSS....",
  "...sSLSSSSLSs...",
  "..sSBBWBBBBBSs..",
  "..sSBBBOBBYBSs..",
  "..sSBOBBBBBBSs..",
  "..sSBBBBBPBBSs..",
  "..sSBYBBBOBBSs..",
  "..sSBBBBBBBBSs..",
  "...sSWBBBBBSs...",
  "....SSSSSSSS....",
  ".....G.GG.G.....",
  "................",
  "................",
  "....dddddddd....",
];

const DECOR_JADE_PAL = {
  o: "#2a221b",
  J: "#3f8a5a",
  j: "#5fae8a",
  L: "#a8d6b0",
  Y: "#d4a548",
  G: "rgba(95,174,138,0.22)",
  d: "rgba(36,28,20,0.4)",
};
const DECOR_JADE = [
  "................",
  ".......GGG......",
  "......GjjJG....",
  ".....oJjjjJo....",
  "....oJjLLjJJo...",
  "...oJjLjLjJJo...",
  "..oJjLLjjjJjJo..",
  "..oJjjjLLjjjJo..",
  "..oJjLjjjjLjJo..",
  "..oJjLjjjjLjJo..",
  "..oJjjjLjjjjJo..",
  "..oJjLjjjjLjJo..",
  "..oJJJjjjjJJJo..",
  "...oJJJJJJJo....",
  "................",
  "....dddddddd....",
];

// Signpost
function buildSignpost(label) {
  const c = makeCanvas(TILE, TILE);
  const ctx = c.getContext("2d");
  // post
  pxRect(ctx, 7, 6, 2, 9, PAL.woodDeep);
  // board
  pxRect(ctx, 2, 2, 12, 6, PAL.woodMid);
  pxRect(ctx, 2, 2, 12, 1, PAL.woodLight);
  pxRect(ctx, 2, 7, 12, 1, PAL.woodDeep);
  pxRect(ctx, 2, 2, 1, 6, PAL.woodDark);
  pxRect(ctx, 13, 2, 1, 6, PAL.woodDark);
  // shadow
  pxRect(ctx, 5, 15, 6, 1, PAL.shadow);
  // text
  ctx.fillStyle = PAL.ink;
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, TILE / 2, 11);
  return c;
}

// Fishing bobber
const BOBBER_PAL = {
  o: "#2a221b",
  R: "#c43a31",
  r: "#7a1f1a",
  W: "#fbf6e8",
};
function buildBobber() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext("2d");
  drawSprite(ctx, [
    "................",
    "................",
    "................",
    ".....oooo.......",
    "....oWWWWo......",
    "....oWWWWo......",
    "....oRRRRo......",
    "....oRrrRo......",
    ".....oRRo.......",
    "......oo........",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], BOBBER_PAL, 0, 0, 1);
  return c;
}

// Slash FX
function buildSlash() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fbf6e8";
  ctx.fillRect(2, 8, 1, 1);
  ctx.fillRect(3, 6, 1, 1);
  ctx.fillRect(4, 4, 1, 1);
  ctx.fillRect(6, 3, 1, 1);
  ctx.fillRect(8, 2, 1, 1);
  ctx.fillStyle = "rgba(120, 200, 255, 0.7)";
  ctx.fillRect(2, 9, 1, 1);
  ctx.fillRect(3, 7, 1, 1);
  ctx.fillRect(4, 5, 1, 1);
  ctx.fillRect(6, 4, 1, 1);
  ctx.fillRect(8, 3, 1, 1);
  ctx.fillStyle = "rgba(120, 200, 255, 0.4)";
  for (let i = 0; i < 9; i++) ctx.fillRect(2 + i, 10 - Math.floor(i / 2), 1, 1);
  return c;
}

// Talisman projectile (paper rectangle with red runes).
function buildTalismanProj() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext("2d");
  // glow
  ctx.fillStyle = "rgba(255, 200, 100, 0.5)";
  ctx.fillRect(0, 4, 16, 8);
  // paper
  ctx.fillStyle = "#f3e7c9";
  ctx.fillRect(2, 5, 12, 6);
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(2, 5, 12, 1);
  ctx.fillRect(2, 10, 12, 1);
  // red runes
  ctx.fillStyle = "#c43a31";
  ctx.fillRect(4, 7, 8, 1);
  ctx.fillRect(4, 9, 8, 1);
  return c;
}

// ===========================================================================
// REGISTRY
// ===========================================================================

function buildSprites() {
  // tiles
  const tileFns = {
    grass: drawGrassTile, dirt: drawDirtTile, tilled: drawTilledTile,
    watered: drawWateredTile, path: drawPathTile, water: drawWaterTile,
    stone: drawStoneTile, wood: drawWoodFloorTile, wall: drawWallTile,
    forest: drawForestTile, herb: drawHerbTile,
  };
  for (const id in tileFns) {
    const c = makeCanvas(TILE, TILE);
    tileFns[id](c.getContext("2d"));
    SpriteCache["tile_" + id] = c;
  }

  // crops
  const cropFruits = {
    rice:         { f: "#e8d878", F: "#fff5b6" },
    spirit_grain: { f: "#7afaff", F: "#d8feff" },
    qi_lotus:     { f: "#c890e0", F: "#f0d0ff" },
    blood_pepper: { f: "#c43a31", F: "#f08070" },
  };
  for (const id in cropFruits) {
    const { f, F } = cropFruits[id];
    for (let s = 0; s < 3; s++) {
      SpriteCache[`crop_${id}_${s}`] = buildCropSprite(s, f, F);
    }
  }

  // player
  SpriteCache["player_down_0"]  = buildPlayerSprite(PLAYER_DOWN_0);
  SpriteCache["player_down_1"]  = buildPlayerSprite(PLAYER_DOWN_1);
  SpriteCache["player_up_0"]    = buildPlayerSprite(PLAYER_UP_0);
  SpriteCache["player_up_1"]    = buildPlayerSprite(PLAYER_UP_1);
  SpriteCache["player_left_0"]  = buildPlayerSprite(PLAYER_LEFT_0);
  SpriteCache["player_left_1"]  = buildPlayerSprite(PLAYER_LEFT_1);
  SpriteCache["player_right_0"] = buildPlayerSprite(PLAYER_RIGHT_0);
  SpriteCache["player_right_1"] = buildPlayerSprite(PLAYER_RIGHT_1);

  // beasts
  SpriteCache["entity_beast_rabbit_0"] = buildBeastFrame(RABBIT_PAL, RABBIT_0);
  SpriteCache["entity_beast_rabbit_1"] = buildBeastFrame(RABBIT_PAL, RABBIT_1);
  SpriteCache["entity_beast_boar_0"] = buildBeastFrame(BOAR_PAL, BOAR_0);
  SpriteCache["entity_beast_boar_1"] = buildBeastFrame(BOAR_PAL, BOAR_1);
  SpriteCache["entity_beast_wolf_0"] = buildBeastFrame(WOLF_PAL, WOLF_0);
  SpriteCache["entity_beast_wolf_1"] = buildBeastFrame(WOLF_PAL, WOLF_1);
  SpriteCache["entity_beast_gui_0"] = buildBeastFrame(GUI_PAL, GUI_0);
  SpriteCache["entity_beast_gui_1"] = buildBeastFrame(GUI_PAL, GUI_1);
  SpriteCache["entity_beast_jiangshi_0"] = buildBeastFrame(JIANGSHI_PAL, JIANGSHI_0);
  SpriteCache["entity_beast_jiangshi_1"] = buildBeastFrame(JIANGSHI_PAL, JIANGSHI_1);
  SpriteCache["entity_beast_huli_jing_0"] = buildBeastFrame(HULI_PAL, HULI_0);
  SpriteCache["entity_beast_huli_jing_1"] = buildBeastFrame(HULI_PAL, HULI_1);
  SpriteCache["entity_beast_nine_tail_fox_0"] = buildBeastFrame(NINE_PAL, NINE_0);
  SpriteCache["entity_beast_nine_tail_fox_1"] = buildBeastFrame(NINE_PAL, NINE_1);
  SpriteCache["entity_beast_qilin_0"] = buildBeastFrame(QILIN_PAL, QILIN_0);
  SpriteCache["entity_beast_qilin_1"] = buildBeastFrame(QILIN_PAL, QILIN_1);
  SpriteCache["entity_beast_young_dragon_0"] = buildBeastFrame(DRAGON_PAL, DRAGON_0);
  SpriteCache["entity_beast_young_dragon_1"] = buildBeastFrame(DRAGON_PAL, DRAGON_1);

  SpriteCache["entity_merchant"] = buildBeastFrame(MERCHANT_PAL, MERCHANT);
  SpriteCache["entity_companion_partner_0"] = buildBeastFrame(PARTNER_PAL, PARTNER_0);
  SpriteCache["entity_companion_partner_1"] = buildBeastFrame(PARTNER_PAL, PARTNER_1);
  SpriteCache["entity_companion_fox_0"] = buildBeastFrame(FOX_PAL, FOX_0);
  SpriteCache["entity_companion_fox_1"] = buildBeastFrame(FOX_PAL, FOX_1);

  // structures — 4 house tiers from the design deck.
  for (let tier = 0; tier < 4; tier++) {
    const c = makeCanvas(96, 96);
    drawHousePagoda(c.getContext("2d"), tier);
    SpriteCache[`struct_house_tier_${tier}`] = c;
  }
  // Backwards-compat aliases used by older save data + draw paths.
  SpriteCache["struct_house"] = SpriteCache["struct_house_tier_0"];
  SpriteCache["struct_house_upgraded"] = SpriteCache["struct_house_tier_1"];

  const matC = makeCanvas(TILE, TILE);
  drawSprite(matC.getContext("2d"), MAT, MAT_PAL);
  SpriteCache["struct_mat"] = matC;

  const wellC = makeCanvas(TILE, TILE);
  drawSprite(wellC.getContext("2d"), WELL, WELL_PAL);
  SpriteCache["struct_well"] = wellC;

  const bedC = makeCanvas(TILE, TILE);
  drawSprite(bedC.getContext("2d"), BED, BED_PAL);
  SpriteCache["struct_bed"] = bedC;

  const deskC = makeCanvas(TILE, TILE);
  drawSprite(deskC.getContext("2d"), DESK, DESK_PAL);
  SpriteCache["struct_desk"] = deskC;

  const furnaceC = makeCanvas(TILE, TILE);
  drawSprite(furnaceC.getContext("2d"), FURNACE, FURNACE_PAL);
  SpriteCache["struct_furnace"] = furnaceC;

  const stoveC = makeCanvas(TILE, TILE);
  drawSprite(stoveC.getContext("2d"), STOVE, STOVE_PAL);
  SpriteCache["struct_stove"] = stoveC;

  const forgeC = makeCanvas(TILE, TILE);
  drawSprite(forgeC.getContext("2d"), FORGE, FORGE_PAL);
  SpriteCache["struct_forge"] = forgeC;

  const loomC = makeCanvas(TILE, TILE);
  drawSprite(loomC.getContext("2d"), LOOM, LOOM_PAL);
  SpriteCache["struct_loom"] = loomC;

  const chestC = makeCanvas(TILE, TILE);
  drawSprite(chestC.getContext("2d"), CHEST, CHEST_PAL);
  SpriteCache["struct_chest"] = chestC;

  const caveC = makeCanvas(TILE, TILE);
  drawSprite(caveC.getContext("2d"), CAVE, CAVE_PAL);
  SpriteCache["struct_cave"] = caveC;

  // Decorations — keys match world.js: "struct_" + DECORATIONS[id].spriteKey.
  const lanternC = makeCanvas(TILE, TILE);
  drawSprite(lanternC.getContext("2d"), DECOR_LANTERN, DECOR_LANTERN_PAL);
  SpriteCache["struct_decor_lantern"] = lanternC;

  const bannerC = makeCanvas(TILE, TILE);
  drawSprite(bannerC.getContext("2d"), DECOR_BANNER, DECOR_BANNER_PAL);
  SpriteCache["struct_decor_banner"] = bannerC;

  const pondC = makeCanvas(TILE, TILE);
  drawSprite(pondC.getContext("2d"), DECOR_POND, DECOR_POND_PAL);
  SpriteCache["struct_decor_pond"] = pondC;

  const jadeC = makeCanvas(TILE, TILE);
  drawSprite(jadeC.getContext("2d"), DECOR_JADE, DECOR_JADE_PAL);
  SpriteCache["struct_decor_jade"] = jadeC;

  // Signposts
  for (const lbl of ["Farm", "Forest", "Market", "Home"]) {
    SpriteCache["sign_" + lbl] = buildSignpost(lbl);
  }

  // FX
  SpriteCache["fx_bobber"]   = buildBobber();
  SpriteCache["fx_slash"]    = buildSlash();
  SpriteCache["proj_talisman"] = buildTalismanProj();
}

function getSprite(key) {
  return SpriteCache[key];
}
