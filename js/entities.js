// Player, beasts, projectiles, FX.

function makePlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    vx: 0, vy: 0,
    speed: 110, // px/sec
    facing: "down",
    animFrame: 0,
    animTimer: 0,
    moving: false,

    // Stats
    realmIndex: 0,
    stage: 0,
    cultProgress: 0,
    hp: 60, hpMax: 60,
    qi: 30, qiMax: 30,
    stamina: 100, staminaMax: 100,
    hunger: 100, hungerMax: 100,

    money: 30,
    inventory: { rice: 0 },
    seeds: { rice: 5 },

    weaponDmg: 8,
    bodyBoost: 0,           // bonus hpMax that activates next dawn
    breakthroughBoost: 0,   // bonus % chance for next breakthrough attempt
    wardTimer: 0,           // active ward duration in seconds

    hasWateringCan: true,
    hoeTier: 0,             // 0 = wood, 1 = iron
    houseTier: 0,
  };
}

function makeBeast(type, x, y, scale = 1) {
  const def = BEASTS[type];
  const hp = Math.round(def.hp * scale);
  const dmg = Math.round(def.dmg * scale);
  return {
    type,
    def,
    x, y,
    vx: 0, vy: 0,
    hp,
    hpMax: hp,
    dmg,                // scaled per-spawn damage (overrides def.dmg)
    xpReward: Math.round(def.xp * scale),
    drainsQi: def.drainsQi || 0,
    weak: def.weak || null,
    boss: !!def.boss,
    speed: def.speed * 50,
    state: "idle",
    aggroRange: def.boss ? 200 : 130,
    attackRange: 22,
    attackCooldown: 0,
    animFrame: 0,
    animTimer: 0,
    hitFlash: 0,
    scale,
  };
}

function makeProjectile(x, y, vx, vy, dmg, kind = "talisman") {
  return { x, y, vx, vy, dmg, kind, life: 1.6 };
}

function makeFx(x, y, kind) {
  return { x, y, kind, life: 0.3, t: 0 };
}

function drawPlayer_(ctx, player, cam) {
  const key = `player_${player.facing}_${player.animFrame}`;
  const spr = SpriteCache[key];
  if (spr) ctx.drawImage(spr, player.x - cam.x - 16, player.y - cam.y - 24);
  if (player.wardTimer > 0) {
    ctx.strokeStyle = `rgba(120, 200, 255, ${0.4 + 0.3 * Math.sin(performance.now() / 80)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x - cam.x, player.y - cam.y - 8, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBeast_(ctx, b, cam) {
  const key = `entity_${b.def.spriteKey}_${b.animFrame}`;
  const spr = SpriteCache[key];
  if (spr) {
    ctx.save();
    if (b.hitFlash > 0) {
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "brightness(2)";
    }
    ctx.drawImage(spr, b.x - cam.x - 16, b.y - cam.y - 22);
    ctx.restore();
  }
  // hp bar
  if (b.hp < b.hpMax) {
    const w = 24;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(b.x - cam.x - w / 2, b.y - cam.y - 28, w, 3);
    ctx.fillStyle = "#d33";
    ctx.fillRect(b.x - cam.x - w / 2, b.y - cam.y - 28, w * (b.hp / b.hpMax), 3);
  }
}

function drawProjectile_(ctx, p, cam) {
  const spr = SpriteCache["proj_talisman"];
  if (spr) {
    ctx.save();
    ctx.translate(p.x - cam.x, p.y - cam.y);
    ctx.rotate(Math.atan2(p.vy, p.vx));
    ctx.drawImage(spr, -8, -8);
    ctx.restore();
  }
}

function drawFx_(ctx, fx, cam) {
  if (fx.kind === "slash") {
    const spr = SpriteCache["fx_slash"];
    if (spr) {
      ctx.save();
      ctx.globalAlpha = 1 - fx.t / 0.3;
      ctx.translate(fx.x - cam.x, fx.y - cam.y);
      ctx.scale(2, 2);
      ctx.drawImage(spr, -8, -8);
      ctx.restore();
    }
  } else if (fx.kind === "hit") {
    ctx.fillStyle = `rgba(255, 220, 120, ${1 - fx.t / 0.3})`;
    ctx.beginPath();
    ctx.arc(fx.x - cam.x, fx.y - cam.y, 6 + fx.t * 30, 0, Math.PI * 2);
    ctx.fill();
  } else if (fx.kind === "qi") {
    ctx.fillStyle = `rgba(120, 200, 255, ${1 - fx.t / 0.6})`;
    ctx.beginPath();
    ctx.arc(fx.x - cam.x, fx.y - cam.y - fx.t * 30, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (fx.kind === "damage") {
    ctx.fillStyle = `rgba(255, 80, 80, ${1 - fx.t / 0.6})`;
    ctx.font = "bold 14px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("-" + fx.amount, fx.x - cam.x, fx.y - cam.y - 30 - fx.t * 30);
  } else if (fx.kind === "text") {
    ctx.fillStyle = `rgba(${fx.color || "212, 165, 72"}, ${1 - fx.t / fx.lifeMax})`;
    ctx.font = "bold 12px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(fx.text, fx.x - cam.x, fx.y - cam.y - 20 - fx.t * 20);
  }
}
