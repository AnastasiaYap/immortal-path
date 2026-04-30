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
    inventory: {},
    seeds: { rice: 5 },

    weaponDmg: 8,
    bonusDef: 0,            // from equipped robes
    bonusQiRegen: 0,        // from robes / accessories
    bodyBoost: 0,           // bonus hpMax that activates next dawn
    breakthroughBoost: 0,   // bonus % chance for next breakthrough attempt
    wardTimer: 0,           // active ward duration in seconds

    hasWateringCan: true,
    hasFishingRod: false,
    hoeTier: 0,             // 0 = wood, 1 = iron
    houseTier: 0,

    skills: makeFreshSkillBlock(),
    equipped: { weapon: null, robe: null, accessory: null },

    // Heart-meridian / stat points
    statPoints: 0,
    bonusHpMax: 0, bonusQiMax: 0, bonusAtk: 0, // bonusDef already exists
    statSpent: { hp: 0, qi: 0, atk: 0, def: 0 },

    // Sword-flight
    flying: false,

    // Quests
    activeQuests: [],
    completedQuests: [],
    questCounters: {}, // { rabbit_kills: 5, ... }
    reputation: 0,

    // Companion (single slot — partner OR pet)
    hasPartnerUnlock: false,
    title: null,

    // Tournament titles ("Champion of the Outer Court")
  };
}

function makeCompanion(type, x, y) {
  const def = COMPANIONS[type];
  return {
    type,
    def,
    x, y, vx: 0, vy: 0,
    hp: def.hp, hpMax: def.hp,
    speed: def.speed,
    dmg: def.dmg,
    attackCooldown: 0,
    animFrame: 0, animTimer: 0,
    hitFlash: 0,
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

// Trigger a one-shot or looped action animation on a player or beast. The
// 4-frame loop runs for `frames * ANIM_FRAME_DURATION` seconds; once it
// expires, the renderer falls back to walk/idle.
function startAction(entity, anim, frames = 4, looped = false) {
  entity.actionAnim = anim;
  entity.actionClock = 0;
  entity.actionDuration = frames * ANIM_FRAME_DURATION;
  entity.actionLooped = looped;
}

function tickAction(entity, dt) {
  if (!entity.actionAnim) return;
  entity.actionClock += dt;
  if (!entity.actionLooped && entity.actionClock >= entity.actionDuration) {
    entity.actionAnim = null;
    entity.actionClock = 0;
  }
}

function makeFx(x, y, kind) {
  return { x, y, kind, life: 0.3, t: 0 };
}

function drawPlayer_(ctx, player, cam) {
  // Animation priority:
  //   1) explicit one-shot/looped action (sword_slash, tool_swing, interact,
  //      gift, hurt, meditate, sleep, sword_flight)
  //   2) walking → walk
  //   3) standing → idle
  let anim, animDir = player.facing;
  if (player.actionAnim) {
    anim = player.actionAnim;
  } else if (player.flying) {
    anim = "sword_flight";
  } else {
    anim = player.moving ? "walk" : "idle";
  }
  // The action's own clock if running, else the global walk clock.
  const clock = player.actionAnim ? player.actionClock : (player.animClock || 0);
  const animFrame = Math.floor(clock / ANIM_FRAME_DURATION) % ANIM_FRAMES_PER_LOOP;
  const animKey = `anim_player_cultivator_${anim}_${animDir}_${animFrame}`;
  const fallbackKey = `player_${player.facing}_${player.animFrame}`;
  const spr = SpriteCache[animKey] || SpriteCache[fallbackKey];
  const liftY = player.flying ? -8 - Math.sin(performance.now() / 200) * 2 : 0;
  if (player.flying) {
    ctx.fillStyle = "rgba(120, 200, 255, 0.5)";
    ctx.beginPath();
    ctx.ellipse(player.x - cam.x, player.y - cam.y - 2, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(120, 200, 255, 0.25)";
    ctx.beginPath();
    ctx.ellipse(player.x - cam.x, player.y - cam.y + 2, 16, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (spr) {
    const w = spr.width, h = spr.height;
    // Anchor feet near the bottom of the painted sprite (small footroom).
    ctx.drawImage(spr, player.x - cam.x - w / 2, player.y - cam.y - h + 6 + liftY);
  }
  if (player.wardTimer > 0) {
    ctx.strokeStyle = `rgba(120, 200, 255, ${0.4 + 0.3 * Math.sin(performance.now() / 80)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x - cam.x, player.y - cam.y - 8, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBeast_(ctx, b, cam) {
  const actor = BEAST_ACTOR[b.type];
  const moving = (Math.abs(b.vx) + Math.abs(b.vy)) > 4;
  let anim;
  if (b.actionAnim) anim = b.actionAnim;
  else anim = moving ? "walk" : "idle";
  const clock = b.actionAnim ? b.actionClock : (b.animClock || 0);
  const animFrame = Math.floor(clock / ANIM_FRAME_DURATION) % ANIM_FRAMES_PER_LOOP;
  const facing = b.facing || "down";
  const animKey = actor ? `anim_${actor}_${anim}_${facing}_${animFrame}` : null;
  const fallbackKey = `entity_${b.def.spriteKey}_${b.animFrame}`;
  const spr = (animKey && SpriteCache[animKey]) || SpriteCache[fallbackKey];
  let drawTopY = b.y - cam.y - 22;
  if (spr) {
    ctx.save();
    if (b.hitFlash > 0) {
      ctx.globalCompositeOperation = "source-over";
      ctx.filter = "brightness(2)";
    }
    const w = spr.width, h = spr.height;
    drawTopY = b.y - cam.y - h + 4;
    ctx.drawImage(spr, b.x - cam.x - w / 2, drawTopY);
    ctx.restore();
  }
  if (b.hp < b.hpMax) {
    const bw = 24;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(b.x - cam.x - bw / 2, drawTopY - 6, bw, 3);
    ctx.fillStyle = "#d33";
    ctx.fillRect(b.x - cam.x - bw / 2, drawTopY - 6, bw * (b.hp / b.hpMax), 3);
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
