// Procedural chibi sprite generator. Everything is drawn to offscreen canvases
// once and then blitted, so we never ship raster art.

const TILE = 32;
const SpriteCache = {};

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function pixel(ctx, x, y, color, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

// ---------- TILES ----------

function drawGrassTile(ctx) {
  ctx.fillStyle = "#7cb86a";
  ctx.fillRect(0, 0, TILE, TILE);
  // grass blades
  for (let i = 0; i < 14; i++) {
    const x = (i * 7 + 3) % TILE;
    const y = (i * 11 + 5) % TILE;
    pixel(ctx, x, y, "#5a9648");
    pixel(ctx, x, y - 1, "#9bd185");
  }
  // shadow border
  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
}

function drawDirtTile(ctx) {
  ctx.fillStyle = "#8a6a44";
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 18; i++) {
    const x = (i * 5 + 2) % TILE;
    const y = (i * 9 + 1) % TILE;
    pixel(ctx, x, y, i % 2 ? "#6e5230" : "#a88560");
  }
}

function drawTilledTile(ctx) {
  drawDirtTile(ctx);
  ctx.fillStyle = "#5a4220";
  for (let y = 4; y < TILE; y += 6) {
    ctx.fillRect(2, y, TILE - 4, 2);
  }
}

function drawWateredTile(ctx) {
  drawTilledTile(ctx);
  ctx.fillStyle = "rgba(60, 90, 160, 0.45)";
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = "rgba(120, 170, 230, 0.4)";
  for (let y = 4; y < TILE; y += 6) {
    ctx.fillRect(2, y, TILE - 4, 2);
  }
}

function drawPathTile(ctx) {
  ctx.fillStyle = "#b8a378";
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 14; i++) {
    const x = (i * 7 + 3) % TILE;
    const y = (i * 11 + 5) % TILE;
    pixel(ctx, x, y, i % 2 ? "#9a8560" : "#d4c098");
  }
}

function drawWaterTile(ctx) {
  ctx.fillStyle = "#3a78c2";
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = "#6aa5e5";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(3 + (i * 7) % 22, 5 + i * 7, 6, 1);
  }
  ctx.fillStyle = "#9bc8f0";
  ctx.fillRect(4, 12, 3, 1);
  ctx.fillRect(20, 22, 4, 1);
}

function drawStoneTile(ctx) {
  ctx.fillStyle = "#7a7670";
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.strokeStyle = "#5a5650";
  ctx.beginPath();
  ctx.moveTo(0, 12); ctx.lineTo(TILE, 12);
  ctx.moveTo(0, 22); ctx.lineTo(TILE, 22);
  ctx.moveTo(10, 0); ctx.lineTo(10, 12);
  ctx.moveTo(20, 12); ctx.lineTo(20, 22);
  ctx.moveTo(8, 22); ctx.lineTo(8, TILE);
  ctx.moveTo(22, 22); ctx.lineTo(22, TILE);
  ctx.stroke();
  ctx.fillStyle = "#9a948c";
  pixel(ctx, 4, 4, "#9a948c", 2);
  pixel(ctx, 24, 16, "#9a948c", 2);
}

function drawWoodFloorTile(ctx) {
  ctx.fillStyle = "#a87a48";
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.strokeStyle = "#704c25";
  ctx.beginPath();
  for (let y = 8; y < TILE; y += 8) {
    ctx.moveTo(0, y); ctx.lineTo(TILE, y);
  }
  ctx.stroke();
  ctx.fillStyle = "#c89868";
  ctx.fillRect(2, 2, 6, 1);
  ctx.fillRect(20, 18, 6, 1);
}

function drawWallTile(ctx) {
  ctx.fillStyle = "#6a4a2a";
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = "#8a6a3a";
  ctx.fillRect(0, 0, TILE, 6);
  ctx.fillStyle = "#4a2c12";
  ctx.fillRect(0, TILE - 4, TILE, 4);
}

function drawForestTile(ctx) {
  drawGrassTile(ctx);
  // tree trunk
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(13, 18, 6, 10);
  // canopy
  ctx.fillStyle = "#2f6b2a";
  ctx.beginPath();
  ctx.arc(16, 14, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a8d3a";
  ctx.beginPath();
  ctx.arc(13, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a4a18";
  ctx.beginPath();
  ctx.arc(20, 17, 4, 0, Math.PI * 2);
  ctx.fill();
}

// Crop growth stages
function drawCrop(ctx, stage, color) {
  drawTilledTile(ctx);
  if (stage === 0) {
    // seedling sprout
    ctx.fillStyle = "#7cb050";
    ctx.fillRect(15, 22, 2, 6);
    pixel(ctx, 13, 22, "#9bd075", 2);
    pixel(ctx, 17, 22, "#9bd075", 2);
  } else if (stage === 1) {
    // young plant
    ctx.fillStyle = "#5a9030";
    ctx.fillRect(15, 14, 2, 14);
    ctx.fillStyle = "#7cb850";
    ctx.fillRect(11, 14, 4, 4);
    ctx.fillRect(17, 14, 4, 4);
    ctx.fillRect(13, 8, 6, 6);
  } else {
    // mature
    ctx.fillStyle = "#4a7028";
    ctx.fillRect(15, 14, 2, 14);
    ctx.fillStyle = "#6ca040";
    ctx.fillRect(9, 14, 4, 4);
    ctx.fillRect(19, 14, 4, 4);
    // fruit
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(12, 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(16, 6, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    pixel(ctx, 11, 9, "rgba(255,255,255,0.6)");
    pixel(ctx, 19, 9, "rgba(255,255,255,0.6)");
  }
}

// ---------- ENTITIES ----------

// Generic chibi: huge head, tiny body. Top-down 3/4 view.
function drawChibi(ctx, opts) {
  const {
    skin = "#f0d2a8",
    robe = "#c43a31",
    sash = "#d4a548",
    hair = "#1a1410",
    accent = "#7a1f1a",
    bob = 0,
    facing = "down",
  } = opts;

  const cx = 16;
  const cy = 22 + bob;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(cx, 28, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // robe / body (small, oval)
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // sash
  ctx.fillStyle = sash;
  ctx.fillRect(cx - 6, cy - 1, 12, 2);

  // arms
  ctx.fillStyle = robe;
  ctx.fillRect(cx - 8, cy - 2, 2, 4);
  ctx.fillRect(cx + 6, cy - 2, 2, 4);
  ctx.fillStyle = skin;
  pixel(ctx, cx - 8, cy + 2, skin, 2);
  pixel(ctx, cx + 7, cy + 2, skin, 2);

  // head (huge, chibi style)
  const hy = cy - 11;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(cx, hy, 8, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = hair;
  if (facing === "up") {
    ctx.beginPath();
    ctx.arc(cx, hy, 8.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, hy - 2, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    // top knot
    ctx.beginPath();
    ctx.arc(cx, hy - 8, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 1, hy - 11, 2, 3);
  }

  // face
  if (facing !== "up") {
    ctx.fillStyle = "#1a1410";
    if (facing === "left") {
      pixel(ctx, cx - 4, hy, "#1a1410", 2);
    } else if (facing === "right") {
      pixel(ctx, cx + 2, hy, "#1a1410", 2);
    } else {
      pixel(ctx, cx - 4, hy, "#1a1410", 2);
      pixel(ctx, cx + 2, hy, "#1a1410", 2);
    }
    // mouth
    ctx.fillStyle = "#a85040";
    ctx.fillRect(cx - 1, hy + 3, 2, 1);
  }
}

function drawPlayer(ctx, frame, facing) {
  drawChibi(ctx, {
    robe: "#3a78c2",
    sash: "#d4a548",
    skin: "#f0d2a8",
    hair: "#1a1410",
    accent: "#c43a31",
    bob: frame ? -1 : 0,
    facing,
  });
}

function drawBeastRabbit(ctx, frame) {
  const bob = frame ? -1 : 0;
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(16, 28, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = "#b8b0a0";
  ctx.beginPath(); ctx.ellipse(16, 22 + bob, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = "#c8c0b0";
  ctx.beginPath(); ctx.arc(16, 14 + bob, 6, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = "#a8a090";
  ctx.fillRect(12, 4 + bob, 2, 8);
  ctx.fillRect(18, 4 + bob, 2, 8);
  ctx.fillStyle = "#e8b8c8";
  ctx.fillRect(12, 6 + bob, 2, 4);
  ctx.fillRect(18, 6 + bob, 2, 4);
  // glowing red eyes (spirit beast)
  ctx.fillStyle = "#ff3030";
  pixel(ctx, 13, 14 + bob, "#ff3030", 2);
  pixel(ctx, 17, 14 + bob, "#ff3030", 2);
  // qi aura
  ctx.fillStyle = "rgba(255, 100, 100, 0.15)";
  ctx.beginPath(); ctx.arc(16, 18 + bob, 12, 0, Math.PI * 2); ctx.fill();
}

function drawBeastBoar(ctx, frame) {
  const bob = frame ? -1 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 28, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = "#5a4a30";
  ctx.beginPath(); ctx.ellipse(16, 20 + bob, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = "#6a5a40";
  ctx.beginPath(); ctx.arc(16, 11 + bob, 6, 0, Math.PI * 2); ctx.fill();
  // tusks
  ctx.fillStyle = "#f0e8d0";
  ctx.fillRect(11, 14 + bob, 2, 3);
  ctx.fillRect(19, 14 + bob, 2, 3);
  // eyes
  ctx.fillStyle = "#ff8030";
  pixel(ctx, 13, 10 + bob, "#ff8030", 2);
  pixel(ctx, 17, 10 + bob, "#ff8030", 2);
  // bristles
  ctx.fillStyle = "#3a2a18";
  ctx.fillRect(10, 14 + bob, 1, 3);
  ctx.fillRect(13, 13 + bob, 1, 3);
  ctx.fillRect(18, 13 + bob, 1, 3);
  ctx.fillRect(21, 14 + bob, 1, 3);
}

function drawBeastWolf(ctx, frame) {
  const bob = frame ? -1 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 28, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = "#3a3a4a";
  ctx.beginPath(); ctx.ellipse(16, 20 + bob, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = "#4a4a5a";
  ctx.beginPath(); ctx.arc(16, 11 + bob, 6, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = "#2a2a3a";
  ctx.beginPath();
  ctx.moveTo(11, 7 + bob); ctx.lineTo(13, 3 + bob); ctx.lineTo(15, 7 + bob); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, 7 + bob); ctx.lineTo(19, 3 + bob); ctx.lineTo(21, 7 + bob); ctx.fill();
  // glowing blue spirit eyes
  ctx.fillStyle = "#7afaff";
  pixel(ctx, 13, 10 + bob, "#7afaff", 2);
  pixel(ctx, 17, 10 + bob, "#7afaff", 2);
  // qi aura
  ctx.fillStyle = "rgba(120, 200, 255, 0.18)";
  ctx.beginPath(); ctx.arc(16, 18 + bob, 13, 0, Math.PI * 2); ctx.fill();
  // fangs
  ctx.fillStyle = "#fff";
  pixel(ctx, 14, 14 + bob, "#fff");
  pixel(ctx, 18, 14 + bob, "#fff");
}

function drawBeastGui(ctx, frame) {
  // Hungry ghost: pale wisp body, no legs, hollow eyes
  const bob = frame ? -2 : 0;
  ctx.fillStyle = "rgba(140, 200, 230, 0.25)";
  ctx.beginPath(); ctx.arc(16, 18 + bob, 13, 0, Math.PI * 2); ctx.fill();
  // wispy tail (instead of legs)
  ctx.fillStyle = "rgba(200, 220, 240, 0.85)";
  ctx.beginPath();
  ctx.moveTo(8, 18 + bob);
  ctx.quadraticCurveTo(11, 30, 16, 28);
  ctx.quadraticCurveTo(21, 30, 24, 18 + bob);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = "#d8e8f0";
  ctx.beginPath(); ctx.ellipse(16, 18 + bob, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  // head (chibi big)
  ctx.fillStyle = "#c8dce8";
  ctx.beginPath(); ctx.arc(16, 10 + bob, 7, 0, Math.PI * 2); ctx.fill();
  // hollow eyes
  ctx.fillStyle = "#0a0a14";
  ctx.beginPath(); ctx.arc(13, 10 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19, 10 + bob, 2, 0, Math.PI * 2); ctx.fill();
  // eye glow
  ctx.fillStyle = "#4ad0ff";
  pixel(ctx, 13, 10 + bob, "#4ad0ff");
  pixel(ctx, 19, 10 + bob, "#4ad0ff");
  // gaping mouth
  ctx.fillStyle = "#1a0a14";
  ctx.beginPath(); ctx.ellipse(16, 14 + bob, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  // floating dots
  ctx.fillStyle = "rgba(180, 220, 255, 0.7)";
  pixel(ctx, 4, 6, "rgba(180, 220, 255, 0.7)", 2);
  pixel(ctx, 26, 9, "rgba(180, 220, 255, 0.7)", 2);
}

function drawBeastJiangshi(ctx, frame) {
  // Hopping vampire: green face, Qing hat, yellow forehead talisman, stiff arms
  const bob = frame ? -3 : 0; // hops higher
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 28 + (bob ? 1 : 0), 8, 2, 0, 0, Math.PI * 2); ctx.fill();
  // robe (Qing dynasty dark blue)
  ctx.fillStyle = "#243a78";
  ctx.fillRect(10, 18 + bob, 12, 10);
  ctx.fillStyle = "#3a528a";
  ctx.fillRect(10, 18 + bob, 12, 1);
  // sash / sleeves
  ctx.fillStyle = "#d4a548";
  ctx.fillRect(10, 22 + bob, 12, 1);
  // outstretched stiff arms
  ctx.fillStyle = "#243a78";
  ctx.fillRect(2, 17 + bob, 8, 3);
  ctx.fillRect(22, 17 + bob, 8, 3);
  ctx.fillStyle = "#9bc28a"; // green hands
  ctx.fillRect(0, 16 + bob, 3, 4);
  ctx.fillRect(29, 16 + bob, 3, 4);
  // head — green
  ctx.fillStyle = "#9bc28a";
  ctx.beginPath(); ctx.arc(16, 10 + bob, 7, 0, Math.PI * 2); ctx.fill();
  // qing dynasty hat
  ctx.fillStyle = "#1a1410";
  ctx.beginPath(); ctx.ellipse(16, 4 + bob, 8, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(13, 1 + bob, 6, 4);
  ctx.fillStyle = "#d4a548";
  pixel(ctx, 15, 1 + bob, "#d4a548", 2);
  // forehead talisman (yellow paper, red sigil)
  ctx.fillStyle = "#f3e7c9";
  ctx.fillRect(13, 7 + bob, 6, 4);
  ctx.fillStyle = "#c43a31";
  ctx.fillRect(15, 8 + bob, 1, 2);
  ctx.fillRect(14, 9 + bob, 4, 1);
  // eyes (dead, white pupils on black)
  ctx.fillStyle = "#0a0a0a";
  pixel(ctx, 13, 12 + bob, "#0a0a0a", 2);
  pixel(ctx, 17, 12 + bob, "#0a0a0a", 2);
  ctx.fillStyle = "#fff";
  pixel(ctx, 13, 12 + bob, "#fff");
  pixel(ctx, 17, 12 + bob, "#fff");
  // grim mouth
  ctx.fillStyle = "#3a1410";
  ctx.fillRect(13, 14 + bob, 6, 1);
}

function drawBeastHuliJing(ctx, frame) {
  // Two-tail fox spirit, orange/red with hairpin
  const bob = frame ? -1 : 0;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 28, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  // tails (drawn behind body)
  ctx.fillStyle = "#e87a40";
  ctx.beginPath(); ctx.ellipse(8, 19 + bob, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(24, 19 + bob, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  // tail tips white
  ctx.fillStyle = "#f8e4c0";
  ctx.beginPath(); ctx.arc(5, 18 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(27, 18 + bob, 2, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = "#e87a40";
  ctx.beginPath(); ctx.ellipse(16, 22 + bob, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  // belly white
  ctx.fillStyle = "#f8e4c0";
  ctx.beginPath(); ctx.ellipse(16, 24 + bob, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = "#e87a40";
  ctx.beginPath(); ctx.arc(16, 12 + bob, 7, 0, Math.PI * 2); ctx.fill();
  // muzzle white
  ctx.fillStyle = "#f8e4c0";
  ctx.beginPath(); ctx.ellipse(16, 14 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = "#e87a40";
  ctx.beginPath();
  ctx.moveTo(11, 7 + bob); ctx.lineTo(13, 3 + bob); ctx.lineTo(15, 7 + bob); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, 7 + bob); ctx.lineTo(19, 3 + bob); ctx.lineTo(21, 7 + bob); ctx.fill();
  ctx.fillStyle = "#1a1410";
  ctx.beginPath();
  ctx.moveTo(12, 6 + bob); ctx.lineTo(13, 4 + bob); ctx.lineTo(14, 6 + bob); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, 6 + bob); ctx.lineTo(19, 4 + bob); ctx.lineTo(20, 6 + bob); ctx.fill();
  // jade hairpin
  ctx.fillStyle = "#5fae8a";
  pixel(ctx, 16, 4 + bob, "#5fae8a", 2);
  ctx.fillStyle = "#d4a548";
  pixel(ctx, 17, 3 + bob, "#d4a548");
  // almond eyes (yellow with red eyeshadow)
  ctx.fillStyle = "#c43a31";
  ctx.fillRect(11, 11 + bob, 3, 1);
  ctx.fillRect(18, 11 + bob, 3, 1);
  ctx.fillStyle = "#ffd048";
  pixel(ctx, 12, 12 + bob, "#ffd048", 2);
  pixel(ctx, 18, 12 + bob, "#ffd048", 2);
  ctx.fillStyle = "#1a1410";
  pixel(ctx, 13, 12 + bob, "#1a1410");
  pixel(ctx, 19, 12 + bob, "#1a1410");
  // nose
  ctx.fillStyle = "#1a1410";
  pixel(ctx, 16, 14 + bob, "#1a1410");
}

function drawBeastNineTailFox(ctx, frame) {
  // Boss-tier fox with 5 visible tails fanning out, golden
  const bob = frame ? -1 : 0;
  ctx.fillStyle = "rgba(180, 60, 60, 0.2)";
  ctx.beginPath(); ctx.arc(16, 18 + bob, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(16, 29, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
  // five tails fanning out from rear (top of sprite, since top-down)
  const tailColors = ["#ffb84a", "#f8a838", "#ffb84a", "#f8a838", "#ffb84a"];
  for (let i = 0; i < 5; i++) {
    const a = (-Math.PI / 2) + (i - 2) * 0.45;
    const tx = 16 + Math.cos(a) * 11;
    const ty = 18 + bob + Math.sin(a) * 11;
    ctx.fillStyle = tailColors[i];
    ctx.beginPath(); ctx.ellipse(tx, ty, 3, 5, a, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff8e0";
    pixel(ctx, Math.round(tx + Math.cos(a) * 3), Math.round(ty + Math.sin(a) * 3), "#fff8e0", 2);
  }
  // body
  ctx.fillStyle = "#f8a838";
  ctx.beginPath(); ctx.ellipse(16, 22 + bob, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd884";
  ctx.beginPath(); ctx.ellipse(16, 24 + bob, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = "#f8a838";
  ctx.beginPath(); ctx.arc(16, 11 + bob, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd884";
  ctx.beginPath(); ctx.ellipse(16, 14 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  // ears
  ctx.fillStyle = "#f8a838";
  ctx.beginPath();
  ctx.moveTo(10, 7 + bob); ctx.lineTo(12, 1 + bob); ctx.lineTo(15, 7 + bob); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, 7 + bob); ctx.lineTo(20, 1 + bob); ctx.lineTo(22, 7 + bob); ctx.fill();
  // glowing red eyes
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(10, 10 + bob, 4, 2);
  ctx.fillRect(18, 10 + bob, 4, 2);
  ctx.fillStyle = "#ff3030";
  pixel(ctx, 11, 11 + bob, "#ff3030", 2);
  pixel(ctx, 19, 11 + bob, "#ff3030", 2);
  ctx.fillStyle = "#fff8a0";
  pixel(ctx, 12, 11 + bob, "#fff8a0");
  pixel(ctx, 20, 11 + bob, "#fff8a0");
  // crown gem on forehead
  ctx.fillStyle = "#c43a31";
  ctx.beginPath(); ctx.arc(16, 7 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  pixel(ctx, 15, 6 + bob, "#fff");
}

function drawBeastQilin(ctx, frame) {
  // Mythical chimera: scaled body, flame mane, single horn
  const bob = frame ? -1 : 0;
  // aura
  ctx.fillStyle = "rgba(255, 200, 80, 0.18)";
  ctx.beginPath(); ctx.arc(16, 18 + bob, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 29, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
  // body — green-jade scaled
  ctx.fillStyle = "#3f8a5a";
  ctx.beginPath(); ctx.ellipse(16, 22 + bob, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5fae8a";
  ctx.beginPath(); ctx.ellipse(16, 24 + bob, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  // scale dots
  ctx.fillStyle = "#2f6b51";
  pixel(ctx, 11, 21 + bob, "#2f6b51");
  pixel(ctx, 14, 23 + bob, "#2f6b51");
  pixel(ctx, 18, 21 + bob, "#2f6b51");
  pixel(ctx, 21, 23 + bob, "#2f6b51");
  // hooves
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(9, 26 + bob, 3, 3);
  ctx.fillRect(20, 26 + bob, 3, 3);
  // flame mane (around neck/head)
  ctx.fillStyle = "#ff8030";
  ctx.beginPath(); ctx.arc(16, 14 + bob, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffd048";
  ctx.beginPath(); ctx.arc(16, 14 + bob, 5, 0, Math.PI * 2); ctx.fill();
  // head
  ctx.fillStyle = "#3f8a5a";
  ctx.beginPath(); ctx.arc(16, 11 + bob, 5, 0, Math.PI * 2); ctx.fill();
  // single horn
  ctx.fillStyle = "#d4a548";
  ctx.beginPath();
  ctx.moveTo(15, 7 + bob);
  ctx.lineTo(16, 1 + bob);
  ctx.lineTo(17, 7 + bob);
  ctx.fill();
  // eyes
  ctx.fillStyle = "#fff";
  pixel(ctx, 13, 11 + bob, "#fff", 2);
  pixel(ctx, 17, 11 + bob, "#fff", 2);
  ctx.fillStyle = "#1a1410";
  pixel(ctx, 14, 12 + bob, "#1a1410");
  pixel(ctx, 18, 12 + bob, "#1a1410");
  // flame wisps
  ctx.fillStyle = "rgba(255, 200, 80, 0.7)";
  ctx.beginPath(); ctx.arc(8, 12 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(24, 12 + bob, 2, 0, Math.PI * 2); ctx.fill();
}

function drawBeastDragon(ctx, frame) {
  // Young dragon: serpentine, gold/red, whiskers
  const bob = frame ? -1 : 0;
  // aura
  ctx.fillStyle = "rgba(255, 60, 60, 0.2)";
  ctx.beginPath(); ctx.arc(16, 16 + bob, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath(); ctx.ellipse(16, 30, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  // long coiled body (drawn as overlapping scales going from rear to front)
  ctx.fillStyle = "#a82828";
  ctx.beginPath();
  ctx.moveTo(2, 26 + bob);
  ctx.quadraticCurveTo(6, 18 + bob, 12, 22 + bob);
  ctx.quadraticCurveTo(20, 26 + bob, 26, 16 + bob);
  ctx.quadraticCurveTo(28, 12 + bob, 24, 8 + bob);
  ctx.quadraticCurveTo(22, 16 + bob, 16, 18 + bob);
  ctx.quadraticCurveTo(8, 20 + bob, 2, 30 + bob);
  ctx.closePath();
  ctx.fill();
  // gold scales highlights
  ctx.fillStyle = "#d4a548";
  pixel(ctx, 6, 22 + bob, "#d4a548", 2);
  pixel(ctx, 12, 20 + bob, "#d4a548", 2);
  pixel(ctx, 18, 17 + bob, "#d4a548", 2);
  pixel(ctx, 22, 13 + bob, "#d4a548", 2);
  // mane along spine
  ctx.fillStyle = "#ffd048";
  ctx.fillRect(8, 17 + bob, 1, 3);
  ctx.fillRect(14, 14 + bob, 1, 3);
  ctx.fillRect(20, 11 + bob, 1, 3);
  // claws
  ctx.fillStyle = "#1a1410";
  pixel(ctx, 9, 25 + bob, "#1a1410");
  pixel(ctx, 11, 25 + bob, "#1a1410");
  pixel(ctx, 17, 21 + bob, "#1a1410");
  pixel(ctx, 19, 21 + bob, "#1a1410");
  // head (front)
  ctx.fillStyle = "#a82828";
  ctx.beginPath(); ctx.ellipse(24, 8 + bob, 6, 5, -0.3, 0, Math.PI * 2); ctx.fill();
  // gold horns
  ctx.fillStyle = "#d4a548";
  ctx.beginPath();
  ctx.moveTo(22, 4 + bob); ctx.lineTo(20, 0 + bob); ctx.lineTo(24, 3 + bob); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, 4 + bob); ctx.lineTo(28, 0 + bob); ctx.lineTo(28, 5 + bob); ctx.fill();
  // glowing eye
  ctx.fillStyle = "#ffd048";
  pixel(ctx, 24, 8 + bob, "#ffd048", 2);
  ctx.fillStyle = "#1a1410";
  pixel(ctx, 25, 8 + bob, "#1a1410");
  // whiskers (long)
  ctx.strokeStyle = "#ffd048";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 9 + bob); ctx.quadraticCurveTo(31, 12 + bob, 30, 16 + bob);
  ctx.moveTo(28, 11 + bob); ctx.quadraticCurveTo(32, 14 + bob, 31, 18 + bob);
  ctx.stroke();
  // little flames at mouth
  ctx.fillStyle = "rgba(255, 100, 30, 0.9)";
  ctx.beginPath(); ctx.arc(30, 6 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255, 200, 80, 0.9)";
  pixel(ctx, 31, 5 + bob, "rgba(255, 220, 100, 0.9)");
}

function drawMerchant(ctx) {
  drawChibi(ctx, {
    robe: "#7a4a18",
    sash: "#d4a548",
    hair: "#3a2a18",
    accent: "#d4a548",
    skin: "#e8c898",
    facing: "down",
  });
  // gold coin halo
  ctx.fillStyle = "#d4a548";
  pixel(ctx, 6, 6, "#d4a548", 2);
  pixel(ctx, 24, 6, "#d4a548", 2);
}

// ---------- STRUCTURES (32x64 tall, drawn with feet at y=32) ----------

function drawHouse(ctx) {
  // 96x96 (3x3 tiles)
  ctx.fillStyle = "#a87a48";
  ctx.fillRect(8, 30, 80, 50);
  ctx.fillStyle = "#704c25";
  ctx.fillRect(8, 30, 80, 4);
  // roof
  ctx.fillStyle = "#7a1f1a";
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(48, 4);
  ctx.lineTo(96, 36);
  ctx.lineTo(88, 36);
  ctx.lineTo(48, 12);
  ctx.lineTo(8, 36);
  ctx.closePath();
  ctx.fill();
  // upturned eaves (xianxia)
  ctx.fillStyle = "#5a1410";
  ctx.beginPath();
  ctx.moveTo(0, 36); ctx.lineTo(-6, 32); ctx.lineTo(8, 36);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(96, 36); ctx.lineTo(102, 32); ctx.lineTo(88, 36);
  ctx.closePath(); ctx.fill();
  // door
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(40, 50, 16, 30);
  ctx.fillStyle = "#d4a548";
  pixel(ctx, 52, 65, "#d4a548", 2);
  // windows
  ctx.fillStyle = "#3a78c2";
  ctx.fillRect(16, 44, 12, 12);
  ctx.fillRect(68, 44, 12, 12);
  ctx.strokeStyle = "#d4a548";
  ctx.strokeRect(16, 44, 12, 12);
  ctx.strokeRect(68, 44, 12, 12);
  ctx.beginPath();
  ctx.moveTo(22, 44); ctx.lineTo(22, 56);
  ctx.moveTo(16, 50); ctx.lineTo(28, 50);
  ctx.moveTo(74, 44); ctx.lineTo(74, 56);
  ctx.moveTo(68, 50); ctx.lineTo(80, 50);
  ctx.stroke();
  // banner / sign
  ctx.fillStyle = "#c43a31";
  ctx.fillRect(43, 36, 10, 8);
  ctx.fillStyle = "#d4a548";
  ctx.fillRect(45, 38, 6, 4);
}

function drawHouseUpgraded(ctx) {
  drawHouse(ctx);
  // gold trim
  ctx.fillStyle = "#d4a548";
  ctx.fillRect(8, 28, 80, 2);
  ctx.fillRect(0, 36, 96, 2);
  // jade tiles on roof
  ctx.fillStyle = "#5fae8a";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(20 + i * 12, 22, 6, 2);
  }
}

function drawMeditationMat(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(16, 26, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c43a31";
  ctx.beginPath(); ctx.ellipse(16, 22, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d4a548";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(16, 22, 11, 5, 0, 0, Math.PI * 2); ctx.stroke();
  // taiji symbol
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(16, 22, 4, 0, Math.PI, true); ctx.fill();
  ctx.fillStyle = "#1a1410";
  ctx.beginPath(); ctx.arc(16, 22, 4, 0, Math.PI, false); ctx.fill();
  pixel(ctx, 14, 21, "#1a1410");
  pixel(ctx, 18, 23, "#fff");
}

function drawFurnace(ctx) {
  // pill furnace
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath(); ctx.ellipse(16, 24, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3018";
  ctx.fillRect(8, 12, 16, 14);
  ctx.fillStyle = "#7a4028";
  ctx.fillRect(10, 14, 12, 2);
  // mouth
  ctx.fillStyle = "#ff7028";
  ctx.fillRect(13, 18, 6, 6);
  ctx.fillStyle = "#ffd070";
  ctx.fillRect(14, 19, 4, 3);
  // top
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath(); ctx.ellipse(16, 12, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
  // smoke
  ctx.fillStyle = "rgba(180, 180, 180, 0.6)";
  ctx.beginPath(); ctx.arc(14, 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(18, 5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, 2, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawTalismanDesk(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
  // desk legs
  ctx.fillStyle = "#5a3018";
  ctx.fillRect(4, 18, 3, 12);
  ctx.fillRect(25, 18, 3, 12);
  // top
  ctx.fillStyle = "#a87a48";
  ctx.fillRect(2, 14, 28, 6);
  ctx.fillStyle = "#704c25";
  ctx.fillRect(2, 14, 28, 1);
  // talisman papers
  ctx.fillStyle = "#f3e7c9";
  ctx.fillRect(6, 8, 6, 8);
  ctx.fillRect(14, 6, 6, 9);
  ctx.fillRect(22, 9, 6, 7);
  // ink/runes on papers
  ctx.fillStyle = "#c43a31";
  pixel(ctx, 8, 11, "#c43a31", 2);
  pixel(ctx, 16, 9, "#c43a31", 2);
  pixel(ctx, 24, 12, "#c43a31", 2);
  // brush
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(20, 16, 8, 1);
  ctx.fillStyle = "#704c25";
  ctx.fillRect(28, 15, 3, 3);
}

function drawBed(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 13, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3018";
  ctx.fillRect(4, 12, 24, 18);
  ctx.fillStyle = "#c43a31";
  ctx.fillRect(6, 14, 20, 14);
  ctx.fillStyle = "#f0e0c0";
  ctx.fillRect(7, 14, 8, 5);
  // gold trim
  ctx.fillStyle = "#d4a548";
  ctx.fillRect(4, 12, 24, 1);
  ctx.fillRect(4, 28, 24, 1);
}

function drawWell(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#7a7670";
  ctx.beginPath(); ctx.ellipse(16, 22, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a78c2";
  ctx.beginPath(); ctx.ellipse(16, 20, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a5650";
  ctx.fillRect(4, 8, 2, 14);
  ctx.fillRect(26, 8, 2, 14);
  ctx.fillRect(4, 6, 24, 2);
  // bucket
  ctx.fillStyle = "#704c25";
  ctx.fillRect(13, 8, 6, 5);
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(13, 8, 6, 1);
}

function drawHerb(ctx) {
  // foragable herb on grass
  drawGrassTile(ctx);
  ctx.fillStyle = "#3a8a4a";
  ctx.fillRect(15, 18, 2, 10);
  ctx.fillStyle = "#5fae8a";
  ctx.beginPath(); ctx.arc(13, 16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(19, 16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(16, 12, 4, 0, Math.PI * 2); ctx.fill();
  // glowing flower (spirit herb)
  ctx.fillStyle = "#d4a548";
  ctx.beginPath(); ctx.arc(16, 10, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(212, 165, 72, 0.3)";
  ctx.beginPath(); ctx.arc(16, 10, 5, 0, Math.PI * 2); ctx.fill();
}

function drawStove(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  // brick body
  ctx.fillStyle = "#8a4a28";
  ctx.fillRect(6, 12, 20, 16);
  ctx.strokeStyle = "#5a2a18";
  for (let y = 14; y <= 24; y += 4) {
    ctx.beginPath();
    ctx.moveTo(6, y);
    ctx.lineTo(26, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(y % 8 === 0 ? 11 : 16, y);
    ctx.lineTo(y % 8 === 0 ? 11 : 16, y + 4);
    ctx.stroke();
  }
  // wok on top
  ctx.fillStyle = "#3a3a3a";
  ctx.beginPath(); ctx.ellipse(16, 12, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(7, 11, 18, 1);
  // mouth (fire)
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(11, 17, 10, 7);
  ctx.fillStyle = "#ff7028";
  ctx.fillRect(13, 19, 6, 4);
  ctx.fillStyle = "#ffd070";
  ctx.fillRect(14, 20, 4, 2);
  // smoke wisps
  ctx.fillStyle = "rgba(180,180,180,0.6)";
  ctx.beginPath(); ctx.arc(15, 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(18, 5, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawForge(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(16, 30, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  // hearth box behind anvil
  ctx.fillStyle = "#5a3018";
  ctx.fillRect(7, 4, 18, 14);
  ctx.fillStyle = "#7a4028";
  ctx.fillRect(7, 4, 18, 2);
  // chimney
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(13, -1, 6, 6);
  ctx.fillStyle = "rgba(180,180,180,0.6)";
  ctx.beginPath(); ctx.arc(16, -2, 2, 0, Math.PI * 2); ctx.fill();
  // fire inside hearth
  ctx.fillStyle = "#ff7028";
  ctx.fillRect(10, 8, 12, 7);
  ctx.fillStyle = "#ffd070";
  ctx.fillRect(12, 10, 8, 4);
  ctx.fillStyle = "#fff5c0";
  ctx.fillRect(14, 11, 4, 2);
  // anvil
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(8, 20, 16, 4);
  ctx.fillStyle = "#7a7a7a";
  ctx.fillRect(4, 18, 24, 3);
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(10, 24, 12, 4);
  // hammer resting on anvil
  ctx.fillStyle = "#704c25";
  ctx.fillRect(20, 12, 1, 7);
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(18, 12, 5, 2);
  // sparks
  ctx.fillStyle = "rgba(255, 240, 100, 0.8)";
  pixel(ctx, 12, 17, "rgba(255, 240, 100, 0.8)");
  pixel(ctx, 22, 16, "rgba(255, 240, 100, 0.8)");
}

function drawLoom(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
  // wooden frame
  ctx.fillStyle = "#704c25";
  ctx.fillRect(4, 4, 3, 24);
  ctx.fillRect(25, 4, 3, 24);
  ctx.fillRect(4, 4, 24, 3);
  ctx.fillRect(4, 25, 24, 3);
  // vertical warp threads
  ctx.strokeStyle = "#f3e7c9";
  ctx.lineWidth = 1;
  for (let x = 9; x <= 23; x += 2) {
    ctx.beginPath();
    ctx.moveTo(x, 7);
    ctx.lineTo(x, 25);
    ctx.stroke();
  }
  // partial purple fabric at bottom (woven)
  ctx.fillStyle = "#a85ac0";
  ctx.fillRect(7, 17, 18, 8);
  ctx.fillStyle = "#c890e0";
  for (let y = 17; y < 25; y += 2) {
    ctx.fillRect(7, y, 18, 1);
  }
  // shuttle
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(20, 15, 6, 2);
  ctx.fillStyle = "#d4a548";
  pixel(ctx, 25, 15, "#d4a548");
  // thread spools at top
  ctx.fillStyle = "#c890e0";
  ctx.beginPath(); ctx.arc(11, 6, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5fae8a";
  ctx.beginPath(); ctx.arc(21, 6, 2, 0, Math.PI * 2); ctx.fill();
}

function drawFishingBobber(ctx) {
  // 16x16 — a small red-and-white float
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.arc(8, 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#c43a31";
  ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f3e7c9";
  ctx.beginPath(); ctx.arc(8, 8, 4, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#1a1410";
  ctx.fillRect(7, 4, 2, 1);
}

function drawSignpost(ctx, label) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.ellipse(16, 30, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#5a3018";
  ctx.fillRect(15, 14, 2, 16);
  ctx.fillStyle = "#a87a48";
  ctx.fillRect(4, 6, 24, 10);
  ctx.fillStyle = "#704c25";
  ctx.fillRect(4, 6, 24, 1);
  ctx.fillRect(4, 15, 24, 1);
  ctx.fillStyle = "#1a1410";
  ctx.font = "bold 7px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 16, 11);
}

// ---------- PROJECTILES / EFFECTS ----------

function drawTalismanProjectile(ctx) {
  ctx.fillStyle = "#f3e7c9";
  ctx.fillRect(2, 4, 12, 8);
  ctx.fillStyle = "#c43a31";
  ctx.fillRect(4, 5, 8, 1);
  ctx.fillRect(4, 7, 8, 1);
  ctx.fillRect(4, 9, 8, 1);
  ctx.fillStyle = "rgba(255, 200, 100, 0.6)";
  ctx.fillRect(0, 2, 16, 12);
}

function drawSlash(ctx) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(8, 8, 7, -Math.PI / 4, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(120, 200, 255, 0.5)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(8, 8, 7, -Math.PI / 4, Math.PI / 2);
  ctx.stroke();
}

// ---------- BUILD ALL ----------

function buildSprites() {
  const tiles = {
    grass: drawGrassTile,
    dirt: drawDirtTile,
    tilled: drawTilledTile,
    watered: drawWateredTile,
    path: drawPathTile,
    water: drawWaterTile,
    stone: drawStoneTile,
    wood: drawWoodFloorTile,
    wall: drawWallTile,
    forest: drawForestTile,
    herb: drawHerb,
  };
  for (const name in tiles) {
    const c = makeCanvas(TILE, TILE);
    tiles[name](c.getContext("2d"));
    SpriteCache["tile_" + name] = c;
  }

  // crops
  const cropFruits = {
    rice: "#e8d878",
    spirit_grain: "#7afaff",
    qi_lotus: "#c890e0",
    blood_pepper: "#c43a31",
  };
  for (const name in cropFruits) {
    for (let s = 0; s < 3; s++) {
      const c = makeCanvas(TILE, TILE);
      drawCrop(c.getContext("2d"), s, cropFruits[name]);
      SpriteCache[`crop_${name}_${s}`] = c;
    }
  }

  // entities (32x32)
  const entities = {
    beast_rabbit_0: (cx) => drawBeastRabbit(cx, 0),
    beast_rabbit_1: (cx) => drawBeastRabbit(cx, 1),
    beast_boar_0: (cx) => drawBeastBoar(cx, 0),
    beast_boar_1: (cx) => drawBeastBoar(cx, 1),
    beast_wolf_0: (cx) => drawBeastWolf(cx, 0),
    beast_wolf_1: (cx) => drawBeastWolf(cx, 1),
    beast_gui_0: (cx) => drawBeastGui(cx, 0),
    beast_gui_1: (cx) => drawBeastGui(cx, 1),
    beast_jiangshi_0: (cx) => drawBeastJiangshi(cx, 0),
    beast_jiangshi_1: (cx) => drawBeastJiangshi(cx, 1),
    beast_huli_jing_0: (cx) => drawBeastHuliJing(cx, 0),
    beast_huli_jing_1: (cx) => drawBeastHuliJing(cx, 1),
    beast_nine_tail_fox_0: (cx) => drawBeastNineTailFox(cx, 0),
    beast_nine_tail_fox_1: (cx) => drawBeastNineTailFox(cx, 1),
    beast_qilin_0: (cx) => drawBeastQilin(cx, 0),
    beast_qilin_1: (cx) => drawBeastQilin(cx, 1),
    beast_young_dragon_0: (cx) => drawBeastDragon(cx, 0),
    beast_young_dragon_1: (cx) => drawBeastDragon(cx, 1),
    merchant: drawMerchant,
  };
  for (const name in entities) {
    const c = makeCanvas(TILE, TILE);
    entities[name](c.getContext("2d"));
    SpriteCache["entity_" + name] = c;
  }

  // player frames
  for (const facing of ["down", "up", "left", "right"]) {
    for (let f = 0; f < 2; f++) {
      const c = makeCanvas(TILE, TILE);
      drawPlayer(c.getContext("2d"), f, facing);
      SpriteCache[`player_${facing}_${f}`] = c;
    }
  }

  // structures
  const houseC = makeCanvas(96, 96);
  drawHouse(houseC.getContext("2d"));
  SpriteCache["struct_house"] = houseC;

  const houseUC = makeCanvas(96, 96);
  drawHouseUpgraded(houseUC.getContext("2d"));
  SpriteCache["struct_house_upgraded"] = houseUC;

  const matC = makeCanvas(TILE, TILE);
  drawMeditationMat(matC.getContext("2d"));
  SpriteCache["struct_mat"] = matC;

  const furnC = makeCanvas(TILE, TILE);
  drawFurnace(furnC.getContext("2d"));
  SpriteCache["struct_furnace"] = furnC;

  const deskC = makeCanvas(TILE, TILE);
  drawTalismanDesk(deskC.getContext("2d"));
  SpriteCache["struct_desk"] = deskC;

  const stoveC = makeCanvas(TILE, TILE);
  drawStove(stoveC.getContext("2d"));
  SpriteCache["struct_stove"] = stoveC;

  const forgeC = makeCanvas(TILE, TILE);
  drawForge(forgeC.getContext("2d"));
  SpriteCache["struct_forge"] = forgeC;

  const loomC = makeCanvas(TILE, TILE);
  drawLoom(loomC.getContext("2d"));
  SpriteCache["struct_loom"] = loomC;

  const bobberC = makeCanvas(16, 16);
  drawFishingBobber(bobberC.getContext("2d"));
  SpriteCache["fx_bobber"] = bobberC;

  const bedC = makeCanvas(TILE, TILE);
  drawBed(bedC.getContext("2d"));
  SpriteCache["struct_bed"] = bedC;

  const wellC = makeCanvas(TILE, TILE);
  drawWell(wellC.getContext("2d"));
  SpriteCache["struct_well"] = wellC;

  // signposts
  for (const lbl of ["Farm", "Forest", "Market", "Home"]) {
    const c = makeCanvas(TILE, TILE);
    drawSignpost(c.getContext("2d"), lbl);
    SpriteCache["sign_" + lbl] = c;
  }

  // projectiles
  const tProj = makeCanvas(16, 16);
  drawTalismanProjectile(tProj.getContext("2d"));
  SpriteCache["proj_talisman"] = tProj;

  const slashC = makeCanvas(16, 16);
  drawSlash(slashC.getContext("2d"));
  SpriteCache["fx_slash"] = slashC;
}

function getSprite(key) {
  return SpriteCache[key];
}
