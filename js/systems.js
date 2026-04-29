// Game systems: time, needs, AI, combat, farming, cultivation, crafting.

// --- TIME ---
// 1 in-game day = 8 real minutes by default; we accelerate to 4 minutes for snappier loop.
const DAY_LENGTH = 240; // seconds per day

function timeOfDay(time) {
  const t = time / DAY_LENGTH; // 0..1
  if (t < 0.25) return "Morning";
  if (t < 0.55) return "Midday";
  if (t < 0.75) return "Afternoon";
  if (t < 0.9) return "Evening";
  return "Night";
}

function isNight(time) {
  const t = time / DAY_LENGTH;
  return t > 0.85 || t < 0.05;
}

function nightOverlay(time) {
  const t = time / DAY_LENGTH;
  // 0..1 darkness
  let d = 0;
  if (t < 0.1) d = (0.1 - t) / 0.1 * 0.55;
  else if (t < 0.18) d = 0;
  else if (t < 0.7) d = 0;
  else if (t < 0.85) d = (t - 0.7) / 0.15 * 0.35;
  else d = 0.35 + (t - 0.85) / 0.15 * 0.25;
  return d;
}

// --- NEEDS DECAY ---
function tickNeeds(player, dt) {
  player.hunger = Math.max(0, player.hunger - (20 / DAY_LENGTH) * dt);
  const baseRegen = 0.3 + player.realmIndex * 0.4;
  const houseBonus = HOUSE_TIERS[player.houseTier].qiRegenBonus;
  const cultivationBonus = cultivationRegenBonus(player);
  const equipBonus = player.bonusQiRegen || 0;
  player.qi = Math.min(player.qiMax, player.qi + (baseRegen + houseBonus + cultivationBonus + equipBonus) * dt);
  if (player.hunger > 30) {
    player.hp = Math.min(player.hpMax, player.hp + 0.5 * dt);
  } else if (player.hunger <= 0) {
    player.hp = Math.max(0, player.hp - 1 * dt);
  }
  if (player.wardTimer > 0) player.wardTimer = Math.max(0, player.wardTimer - dt);
}

// --- BEAST AI ---
function aiBeast(b, player, dt) {
  b.attackCooldown = Math.max(0, b.attackCooldown - dt);
  b.hitFlash = Math.max(0, b.hitFlash - dt);
  b.animTimer += dt;
  if (b.animTimer > 0.25) { b.animTimer = 0; b.animFrame = 1 - b.animFrame; }

  const dx = player.x - b.x;
  const dy = player.y - b.y;
  const dist = Math.hypot(dx, dy);

  if (dist < b.aggroRange) {
    b.state = "chase";
    if (dist > b.attackRange) {
      let speed = b.speed;
      if (player.wardTimer > 0) speed *= 0.4;
      b.vx = (dx / dist) * speed;
      b.vy = (dy / dist) * speed;
    } else {
      b.vx = 0; b.vy = 0;
      if (b.attackCooldown <= 0 && player.wardTimer <= 0) {
        const baseDmg = b.dmg ?? b.def.dmg;
        const totalDef = (REALMS[player.realmIndex].def || 0) + (player.bonusDef || 0);
        const dmg = Math.max(1, baseDmg - totalDef);
        player.hp = Math.max(0, player.hp - dmg);
        // ghosts drain qi with each strike
        if (b.drainsQi > 0) {
          player.qi = Math.max(0, player.qi - b.drainsQi);
        }
        b.attackCooldown = b.boss ? 0.7 : 0.9;
        return { hitPlayer: dmg };
      }
    }
  } else {
    // wander
    if (Math.random() < 0.01) {
      const a = Math.random() * Math.PI * 2;
      b.vx = Math.cos(a) * 30;
      b.vy = Math.sin(a) * 30;
    }
    // friction
    b.vx *= 0.98; b.vy *= 0.98;
  }

  // move with collision
  const nx = b.x + b.vx * dt;
  const ny = b.y + b.vy * dt;
  if (!isSolidAt(window.GAME.world, nx, b.y)) b.x = nx; else b.vx = 0;
  if (!isSolidAt(window.GAME.world, b.x, ny)) b.y = ny; else b.vy = 0;
  return null;
}

// --- BEAST SPAWNING ---

// Day-based scalar: gentle linear creep so even old foes stay relevant.
function dayScale(day) {
  return 1 + Math.max(0, day - 1) * 0.015; // ~1.7x by day 50
}

// Effective player tier — combines realm and elapsed days so a player who
// lingers in low realms still sees escalation.
function effectiveTier(player, day) {
  return player.realmIndex + 1 + day / 18;
}

// Build the spawn pool with weights. A beast must satisfy BOTH minRealm and
// minDay to spawn at all; once it's eligible, its weight scales with how
// close its tier is to the player's effective tier (so old beasts thin out
// and new beasts fill in as you progress).
function buildSpawnPool(player, day, night) {
  const pool = [];
  const eff = effectiveTier(player, day);
  for (const id in BEASTS) {
    const b = BEASTS[id];
    if (player.realmIndex < (b.minRealm ?? 0)) continue;
    if (day < (b.minDay ?? 0)) continue;
    let w = b.weight ?? 1;
    // proximity to effective tier — bell-ish
    const gap = Math.abs((b.tier ?? 1) - eff);
    if (gap < 0.8) w *= 1.4;
    else if (gap < 1.6) w *= 1.0;
    else if (gap < 2.5) w *= 0.45;
    else w *= 0.15; // way under-tier — rare nostalgic appearance
    // bosses are uncommon, slightly less so at night
    if (b.boss) w *= night ? 0.7 : 0.45;
    // night raises higher-tier beasts
    if (night && (b.tier ?? 1) >= 2) w *= 1.5;
    if (w > 0) pool.push({ id, w });
  }
  return pool;
}

function pickWeighted(pool) {
  let total = 0;
  for (const e of pool) total += e.w;
  let r = Math.random() * total;
  for (const e of pool) { r -= e.w; if (r <= 0) return e.id; }
  return pool[pool.length - 1]?.id;
}

function maybeSpawnBeast(state, dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  const night = isNight(state.time);
  // higher-tier players get more spawns — keeps the pressure on
  const tier = effectiveTier(state.player, state.day);
  state.spawnTimer = (night ? 5 : 12) / Math.max(1, tier * 0.5);

  const cap = 5 + Math.floor(tier);
  if (state.beasts.length >= cap) return;

  const pool = buildSpawnPool(state.player, state.day, night);
  if (!pool.length) return;
  const type = pickWeighted(pool);
  if (!type) return;

  // spawn at the forest edge or far from player
  for (let i = 0; i < 16; i++) {
    const tx = Math.floor(Math.random() * MAP_W);
    const ty = Math.floor(Math.random() * 14); // forest band
    const t = state.world.tiles[ty][tx];
    if (t !== T_GRASS && t !== T_HERB) continue;
    const wx = tx * TILE + 16;
    const wy = ty * TILE + 16;
    const dx = wx - state.player.x;
    const dy = wy - state.player.y;
    if (Math.hypot(dx, dy) < 240) continue;
    const beast = makeBeast(type, wx, wy, dayScale(state.day));
    state.beasts.push(beast);
    if (BEASTS[type].boss) {
      pushLog(state, `A ${BEASTS[type].name} stalks the mountain!`, "bad");
    }
    return;
  }
}

// --- COMBAT ---
function playerAttack(state) {
  const p = state.player;
  if (p.stamina < 8) {
    return { msg: "Too tired to attack.", kind: "bad" };
  }
  p.stamina -= 6;
  // melee arc in front
  let ox = 0, oy = 0;
  switch (p.facing) {
    case "down": oy = 22; break;
    case "up":   oy = -22; break;
    case "left": ox = -22; break;
    case "right":ox = 22; break;
  }
  state.fx.push(makeFx(p.x + ox, p.y + oy - 8, "slash"));
  let hit = 0;
  for (const b of state.beasts) {
    const dx = b.x - (p.x + ox);
    const dy = b.y - (p.y + oy);
    if (Math.hypot(dx, dy) < 24) {
      const realmAtk = REALMS[p.realmIndex].atk;
      const dmg = p.weaponDmg + realmAtk + combatDmgBonus(p) + Math.floor(Math.random() * 3);
      b.hp -= dmg;
      gainSkill(p, "combat", 2);
      b.hitFlash = 0.15;
      // knockback
      const a = Math.atan2(dy, dx);
      b.vx += Math.cos(a) * 80;
      b.vy += Math.sin(a) * 80;
      const fx = makeFx(b.x, b.y - 12, "damage");
      fx.amount = dmg;
      fx.life = 0.6;
      state.fx.push(fx);
      hit++;
    }
  }
  return hit > 0 ? null : { msg: "Whiff!", kind: "" };
}

function throwTalisman(state) {
  const p = state.player;
  // Prefer purify talismans if available — they are stronger.
  let kind = null;
  if ((p.inventory.purify_talisman || 0) > 0) kind = "purify_talisman";
  else if ((p.inventory.fire_talisman || 0) > 0) kind = "fire_talisman";
  if (!kind) return { msg: "No talismans to throw.", kind: "bad" };
  p.inventory[kind]--;
  if (p.inventory[kind] <= 0) delete p.inventory[kind];
  let vx = 0, vy = 0;
  switch (p.facing) {
    case "down": vy = 280; break;
    case "up":   vy = -280; break;
    case "left": vx = -280; break;
    case "right":vx = 280; break;
  }
  const baseDmg = ITEMS[kind].dmg + p.realmIndex * 4;
  state.projectiles.push(makeProjectile(p.x, p.y - 8, vx, vy, baseDmg, kind));
  const label = kind === "purify_talisman" ? "purification talisman" : "fire talisman";
  return { msg: `You hurl a ${label}!`, kind: "qi" };
}

function tickProjectiles(state, dt) {
  for (const p of state.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (isSolidAt(state.world, p.x, p.y)) p.life = 0;
    for (const b of state.beasts) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 18) {
        let dmg = p.dmg;
        if (b.weak && b.weak === p.kind) dmg = Math.round(dmg * 2);
        b.hp -= dmg;
        b.hitFlash = 0.15;
        const fx = makeFx(b.x, b.y - 12, "damage");
        fx.amount = dmg;
        fx.life = 0.6;
        state.fx.push(fx);
        state.fx.push(makeFx(b.x, b.y - 6, "hit"));
        p.life = 0;
        break;
      }
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.life > 0);
}

function killBeast(state, b) {
  // drops
  for (const drop of b.def.drops) {
    if (Math.random() < drop.chance) {
      addItem(state.player, drop.id, 1);
      pushDropFx(state, b, drop.id);
    }
  }
  // spirit rabbits drop silk separately (a tailoring material)
  if (b.type === "rabbit" && Math.random() < RABBIT_SILK_CHANCE) {
    addItem(state.player, "spirit_silk", 1);
    pushDropFx(state, b, "spirit_silk");
  }
  // combat skill XP scales with the kill
  gainSkill(state.player, "combat", Math.max(2, Math.floor((b.xpReward ?? b.def.xp) / 4)));
  // cultivation xp scales with this spawn's day-scalar
  const xp = b.xpReward ?? b.def.xp;
  state.player.cultProgress += xp;
  const fx = makeFx(b.x, b.y - 16, "text");
  fx.text = `+${xp} cultivation`;
  fx.color = "120, 200, 255";
  fx.life = 1.4;
  fx.lifeMax = 1.4;
  state.fx.push(fx);
  if (b.boss) {
    pushLog(state, `You slew a ${b.def.name}! Your name will be remembered.`, "qi");
    state.player.money += 50; // boss bounty bonus
  }
}

function pushDropFx(state, b, id) {
  const fx = makeFx(b.x, b.y - 14, "text");
  fx.text = "+" + ITEMS[id].name;
  fx.color = "212, 165, 72";
  fx.life = 1.4;
  fx.lifeMax = 1.4;
  state.fx.push(fx);
}

// --- INVENTORY ---
function addItem(player, id, qty = 1) {
  player.inventory[id] = (player.inventory[id] || 0) + qty;
}

function takeItem(player, id, qty = 1) {
  if ((player.inventory[id] || 0) < qty) return false;
  player.inventory[id] -= qty;
  if (player.inventory[id] <= 0) delete player.inventory[id];
  return true;
}

function hasItems(player, inputs) {
  for (const id in inputs) {
    if ((player.inventory[id] || 0) < inputs[id]) return false;
  }
  return true;
}

// --- FARMING ---
function tryTillPlot(state) {
  const p = state.player;
  const tx = Math.floor((p.x + facingDx(p) * TILE * 0.5) / TILE);
  const ty = Math.floor((p.y + facingDy(p) * TILE * 0.5) / TILE);
  const plot = plotAt(state.world, tx, ty);
  if (!plot) return null;
  if (plot.state === "dirt") {
    const baseCost = p.hoeTier ? 4 : 8;
    const cost = Math.max(1, Math.floor(baseCost * farmingStaminaMul(p)));
    if (p.stamina < cost) return { msg: "Too tired to till.", kind: "bad" };
    p.stamina -= cost;
    plot.state = "tilled";
    state.world.tiles[ty][tx] = T_TILLED;
    gainSkill(p, "farming", 4);
    return { msg: "You till the soil.", kind: "good" };
  }
  return null;
}

function tryWaterPlot(state) {
  const p = state.player;
  const tx = Math.floor((p.x + facingDx(p) * TILE * 0.5) / TILE);
  const ty = Math.floor((p.y + facingDy(p) * TILE * 0.5) / TILE);
  const plot = plotAt(state.world, tx, ty);
  if (!plot) return null;
  if ((plot.state === "tilled" || plot.state === "growing") && !plot.wateredToday) {
    plot.wateredToday = true;
    if (plot.state === "tilled") {
      plot.state = "watered";
      state.world.tiles[ty][tx] = T_WATERED;
    } else {
      state.world.tiles[ty][tx] = T_WATERED;
    }
    gainSkill(p, "farming", 2);
    return { msg: "You water the plot.", kind: "good" };
  }
  return null;
}

function tryPlantPlot(state, cropId) {
  const p = state.player;
  const tx = Math.floor((p.x + facingDx(p) * TILE * 0.5) / TILE);
  const ty = Math.floor((p.y + facingDy(p) * TILE * 0.5) / TILE);
  const plot = plotAt(state.world, tx, ty);
  if (!plot) return { msg: "No plot here.", kind: "bad" };
  if (plot.state !== "tilled" && plot.state !== "watered") {
    return { msg: "Till the soil first.", kind: "bad" };
  }
  if ((p.seeds[cropId] || 0) <= 0) return { msg: "No seeds for that.", kind: "bad" };
  p.seeds[cropId]--;
  plot.crop = cropId;
  plot.growth = 0;
  plot.state = "growing";
  return { msg: `You plant ${CROPS[cropId].name}.`, kind: "good" };
}

function tryHarvestPlot(state) {
  const p = state.player;
  const tx = Math.floor((p.x + facingDx(p) * TILE * 0.5) / TILE);
  const ty = Math.floor((p.y + facingDy(p) * TILE * 0.5) / TILE);
  const plot = plotAt(state.world, tx, ty);
  if (!plot || !plot.crop || plot.growth < 2) return null;
  const crop = CROPS[plot.crop];
  let qty = Math.max(1, Math.round(crop.qty * farmingYieldMul(p)));
  if (Math.random() < farmingDoubleChance(p)) qty *= 2;
  addItem(p, crop.yields, qty);
  p.cultProgress += 2;
  gainSkill(p, "farming", 12);
  plot.crop = null;
  plot.growth = 0;
  plot.state = "dirt";
  plot.wateredToday = false;
  state.world.tiles[ty][tx] = T_DIRT;
  return { msg: `Harvested ${qty}× ${ITEMS[crop.yields].name}.`, kind: "good" };
}

// --- DAY ROLLOVER ---
function nextDay(state) {
  state.day++;
  state.time = 0;
  // grow crops that were watered yesterday
  for (const plot of state.world.plots) {
    if (plot.state === "growing" && plot.wateredToday) {
      plot.growth = Math.min(2, plot.growth + 1);
    }
    plot.wateredToday = false;
    // reset visual to tilled if growing & water faded
    if (plot.state === "growing") {
      state.world.tiles[plot.ty][plot.tx] = T_TILLED;
    }
  }
  // refresh herbs (slow)
  if (state.day % 3 === 0) regrowHerbs(state.world, 4);
  // body pill bonus
  if (state.player.bodyBoost > 0) {
    state.player.hpMax += state.player.bodyBoost;
    state.player.hp = Math.min(state.player.hpMax, state.player.hp + state.player.bodyBoost);
    pushLog(state, `Body Refining Pill takes effect: +${state.player.bodyBoost} max HP.`, "good");
    state.player.bodyBoost = 0;
  }
}

function regrowHerbs(world, n) {
  for (let i = 0; i < n; i++) {
    let tries = 0;
    while (tries++ < 30) {
      const x = 2 + Math.floor(Math.random() * (MAP_W - 4));
      const y = 2 + Math.floor(Math.random() * 12);
      if (world.tiles[y][x] === T_GRASS) {
        world.tiles[y][x] = T_HERB;
        break;
      }
    }
  }
}

// --- CULTIVATION ---
function meditate(state, dt) {
  const p = state.player;
  if (p.stamina <= 0) return { ok: false, reason: "Exhausted." };
  if (p.qi >= p.qiMax && p.cultProgress >= REALMS[p.realmIndex].qiToBreakthrough) {
    return { ok: false, reason: "Try a breakthrough." };
  }
  const cultMul = cultivationGainMul(p);
  const qiGain = (1.4 + p.realmIndex * 0.7) * cultMul * dt;
  const cultGain = (0.6 + p.realmIndex * 0.4) * cultMul * dt;
  p.qi = Math.min(p.qiMax, p.qi + qiGain);
  p.cultProgress += cultGain;
  p.stamina = Math.max(0, p.stamina - 2 * dt);
  gainSkill(p, "cultivation", 1.5 * dt);
  // qi puffs
  if (Math.random() < 0.15) {
    state.fx.push(makeFx(p.x + (Math.random() - 0.5) * 20, p.y - 8, "qi"));
  }
  return { ok: true };
}

function attemptBreakthrough(state) {
  const p = state.player;
  const realm = REALMS[p.realmIndex];
  if (p.cultProgress < realm.qiToBreakthrough) {
    return { msg: `Need ${Math.ceil(realm.qiToBreakthrough - p.cultProgress)} more cultivation.`, kind: "bad" };
  }
  if (p.qi < p.qiMax * 0.9) {
    return { msg: "Qi reserves too low — meditate first.", kind: "bad" };
  }
  // success chance
  let chance = 0.55 + p.breakthroughBoost;
  // higher realms harder
  chance -= p.realmIndex * 0.05;
  // stage progression
  if (p.realmIndex + 1 >= REALMS.length) {
    return { msg: "You are at the apex — Nascent Soul awaits no further breakthrough.", kind: "bad" };
  }
  const success = Math.random() < chance;
  p.breakthroughBoost = 0;
  if (success) {
    p.realmIndex++;
    p.stage = 0;
    p.cultProgress = 0;
    const newRealm = REALMS[p.realmIndex];
    p.hpMax = newRealm.hpMax;
    p.qiMax = newRealm.qiMax;
    p.hp = p.hpMax;
    p.qi = p.qiMax;
    p.weaponDmg = 8 + p.realmIndex * 4;
    return { msg: `Breakthrough! You ascend to ${newRealm.name}!`, kind: "qi", big: true };
  } else {
    p.qi = Math.max(0, p.qi - p.qiMax * 0.5);
    p.cultProgress = Math.max(0, p.cultProgress - realm.qiToBreakthrough * 0.25);
    p.hp = Math.max(1, p.hp - 10);
    return { msg: "Breakthrough failed — qi meridians scrambled. Try again later.", kind: "bad" };
  }
}

// --- CRAFTING ---
function craft(state, recipeId) {
  const recipe = RECIPES[recipeId];
  const p = state.player;
  if (recipe.unlockRealm && p.realmIndex < recipe.unlockRealm) {
    return { msg: "Realm too low for this recipe.", kind: "bad" };
  }
  if (!hasItems(p, recipe.inputs)) {
    return { msg: "Missing ingredients.", kind: "bad" };
  }
  if (p.qi < recipe.qiCost) {
    return { msg: "Not enough qi.", kind: "bad" };
  }

  // Per-station double-craft and refund chances.
  let doubleChance = 0, refundChance = 0;
  if (recipe.station === "furnace")    { doubleChance = alchemyDoubleChance(p); refundChance = alchemyRefundChance(p); }
  else if (recipe.station === "desk")  { doubleChance = talismanDoubleChance(p); }
  else if (recipe.station === "stove") { doubleChance = cookingDoubleChance(p); }
  else if (recipe.station === "forge") { doubleChance = smithingDoubleChance(p); }

  // Consume inputs (with refund chance per ingredient stack).
  let refunded = false;
  for (const id in recipe.inputs) {
    const qty = recipe.inputs[id];
    let consume = qty;
    if (refundChance > 0 && Math.random() < refundChance) {
      consume = Math.max(0, qty - 1);
      refunded = true;
    }
    if (consume > 0) takeItem(p, id, consume);
  }
  p.qi -= recipe.qiCost;

  let outQty = recipe.qty;
  if (doubleChance > 0 && Math.random() < doubleChance) outQty *= 2;
  addItem(p, recipe.output, outQty);

  // Skill XP: explicit per-recipe, falls back to station defaults.
  const xpMap = recipe.skillXp || {};
  if (!Object.keys(xpMap).length) {
    if (recipe.station === "furnace")      xpMap.alchemy  = 12 + recipe.qiCost * 0.4;
    else if (recipe.station === "desk")    xpMap.talisman = 8 + recipe.qiCost * 0.4;
  }
  for (const sid in xpMap) gainSkill(p, sid, xpMap[sid]);
  p.cultProgress += 3;

  let msg = `Crafted ${outQty}× ${ITEMS[recipe.output].name}.`;
  if (outQty > recipe.qty) msg += " (Skill bonus: doubled!)";
  if (refunded) msg += " Some materials were saved.";
  return { msg, kind: "good" };
}

// --- FORAGING ---
function tryForageHerb(state, tx, ty) {
  const p = state.player;
  if (state.world.tiles[ty][tx] !== T_HERB) return null;
  let qty = 1;
  if (Math.random() < foragingDoubleChance(p)) qty = 2;
  addItem(p, "spirit_herb", qty);
  state.world.tiles[ty][tx] = T_GRASS;
  p.cultProgress += 1;
  gainSkill(p, "foraging", 6);
  const msg = qty > 1 ? `Foraged ${qty} Spirit Herbs.` : "Foraged a Spirit Herb.";
  return { msg, kind: "good" };
}

// --- MINING ---
function tryMineStone(state) {
  const p = state.player;
  const tx = Math.floor((p.x + facingDx(p) * TILE * 0.5) / TILE);
  const ty = Math.floor((p.y + facingDy(p) * TILE * 0.5) / TILE);
  if (state.world.tiles[ty]?.[tx] !== T_STONE) return null;
  const cost = 6;
  if (p.stamina < cost) return { msg: "Too tired to mine.", kind: "bad" };
  p.stamina -= cost;
  const lvl = skillLv(p, "smithing");
  // higher smithing → better ore yield + jade chance
  let oreQty = 1 + (Math.random() < 0.15 + lvl * 0.02 ? 1 : 0);
  addItem(p, "iron_ore", oreQty);
  let extra = "";
  if (Math.random() < 0.04 + lvl * 0.01) {
    addItem(p, "jade_shard", 1);
    extra = " A jade shard glints among the rubble!";
  }
  // small chance the stone tile depletes
  if (Math.random() < 0.18) {
    state.world.tiles[ty][tx] = T_DIRT;
  }
  gainSkill(p, "smithing", 5);
  return { msg: `You mine ${oreQty}× iron ore.${extra}`, kind: "good" };
}

// --- FISHING ---
// Fishing is a small minigame:
//   1. Cast on E at a water tile (requires fishing rod).
//   2. After 1.5–3.5 seconds, a bite happens — log "A bite! Press E!"
//      and the bobber bobs.
//   3. Press E within ~0.8s to reel in. Otherwise the fish escapes.
function tryStartFishing(state) {
  const p = state.player;
  if (!p.hasFishingRod) return { msg: "You need a fishing rod (buy one at the market).", kind: "bad" };
  const tx = Math.floor((p.x + facingDx(p) * TILE * 0.5) / TILE);
  const ty = Math.floor((p.y + facingDy(p) * TILE * 0.5) / TILE);
  if (state.world.tiles[ty]?.[tx] !== T_WATER) return null;
  if (p.stamina < 4) return { msg: "Too tired to cast.", kind: "bad" };
  p.stamina -= 4;
  const baseTime = (1.5 + Math.random() * 2.5) * fishingTimeMul(p);
  state.fishing = {
    bobberX: tx * TILE + 16,
    bobberY: ty * TILE + 16,
    biteAt: baseTime,
    t: 0,
    bit: false,
    biteTimeout: 0,
  };
  return { msg: "You cast your line into the pond...", kind: "qi" };
}

function tickFishing(state, dt) {
  const f = state.fishing;
  if (!f) return;
  f.t += dt;
  if (!f.bit && f.t >= f.biteAt) {
    f.bit = true;
    f.biteTimeout = 0.85;
    pushLog(state, "A bite! Press E to reel it in!", "qi");
  } else if (f.bit) {
    f.biteTimeout -= dt;
    if (f.biteTimeout <= 0) {
      pushLog(state, "The fish slips away.", "");
      state.fishing = null;
    }
  }
}

function reelFish(state) {
  const f = state.fishing;
  if (!f) return null;
  if (!f.bit) {
    pushLog(state, "Patience — wait for a bite.", "");
    state.fishing = null;
    return null;
  }
  const p = state.player;
  state.fishing = null;
  const luck = fishingLuck(p);
  const night = isNight(state.time);
  const candidates = [];
  for (const e of FISH_TABLE) {
    if (e.minLuck > luck) continue;
    if (night && !e.night) continue;
    if (!night && !e.day) continue;
    candidates.push(e);
  }
  let total = 0;
  for (const e of candidates) total += e.weight;
  let r = Math.random() * total;
  let pick = candidates[0];
  for (const e of candidates) { r -= e.weight; if (r <= 0) { pick = e; break; } }
  addItem(p, pick.id, 1);
  gainSkill(p, "fishing", 8);
  return { msg: `Reeled in a ${ITEMS[pick.id].name}!`, kind: "good" };
}

// --- HELPERS ---
function facingDx(p) { return p.facing === "left" ? -1 : p.facing === "right" ? 1 : 0; }
function facingDy(p) { return p.facing === "up" ? -1 : p.facing === "down" ? 1 : 0; }

function pushLog(state, msg, kind = "") {
  state.logQueue.push({ msg, kind });
}
