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
  // hunger drops ~20 / day; stamina depletes only on actions; both restore on sleep
  player.hunger = Math.max(0, player.hunger - (20 / DAY_LENGTH) * dt);
  // qi regen tiny passive based on house/realm
  const baseRegen = 0.3 + player.realmIndex * 0.4;
  const houseBonus = HOUSE_TIERS[player.houseTier].qiRegenBonus;
  player.qi = Math.min(player.qiMax, player.qi + (baseRegen + houseBonus) * dt);
  // hp slow regen if hunger > 30
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
        const dmg = Math.max(1, b.def.dmg - (REALMS[player.realmIndex].def || 0));
        player.hp = Math.max(0, player.hp - dmg);
        b.attackCooldown = 0.9;
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
function maybeSpawnBeast(state, dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = isNight(state.time) ? 6 : 14;

  if (state.beasts.length >= 6) return;

  // pick beast type by realm
  const rolls = [];
  if (state.player.realmIndex >= 0) rolls.push("rabbit", "rabbit");
  if (state.player.realmIndex >= 1) rolls.push("boar");
  if (state.player.realmIndex >= 2) rolls.push("wolf");
  // night escalates
  if (isNight(state.time)) rolls.push("boar", "wolf");

  const type = rolls[Math.floor(Math.random() * rolls.length)];
  if (BEASTS[type].minRealm > state.player.realmIndex + (isNight(state.time) ? 1 : 0)) return;

  // spawn at the forest edge or far from player
  for (let i = 0; i < 12; i++) {
    const tx = Math.floor(Math.random() * MAP_W);
    const ty = Math.floor(Math.random() * 14); // forest
    const t = state.world.tiles[ty][tx];
    if (t === T_GRASS || t === T_HERB) {
      const wx = tx * TILE + 16;
      const wy = ty * TILE + 16;
      const dx = wx - state.player.x;
      const dy = wy - state.player.y;
      if (Math.hypot(dx, dy) < 250) continue;
      state.beasts.push(makeBeast(type, wx, wy));
      return;
    }
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
      const dmg = p.weaponDmg + realmAtk + Math.floor(Math.random() * 3);
      b.hp -= dmg;
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
  if ((p.inventory.fire_talisman || 0) <= 0) {
    return { msg: "No fire talismans.", kind: "bad" };
  }
  p.inventory.fire_talisman--;
  let vx = 0, vy = 0;
  switch (p.facing) {
    case "down": vy = 280; break;
    case "up":   vy = -280; break;
    case "left": vx = -280; break;
    case "right":vx = 280; break;
  }
  state.projectiles.push(makeProjectile(p.x, p.y - 8, vx, vy, ITEMS.fire_talisman.dmg + p.realmIndex * 4));
  return { msg: "You hurl a fire talisman!", kind: "qi" };
}

function tickProjectiles(state, dt) {
  for (const p of state.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (isSolidAt(state.world, p.x, p.y)) p.life = 0;
    for (const b of state.beasts) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 18) {
        b.hp -= p.dmg;
        b.hitFlash = 0.15;
        const fx = makeFx(b.x, b.y - 12, "damage");
        fx.amount = p.dmg;
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
      const fx = makeFx(b.x, b.y - 14, "text");
      fx.text = "+" + ITEMS[drop.id].name;
      fx.color = "212, 165, 72";
      fx.life = 1.4;
      fx.lifeMax = 1.4;
      state.fx.push(fx);
    }
  }
  // cultivation xp
  state.player.cultProgress += b.def.xp;
  const fx = makeFx(b.x, b.y - 16, "text");
  fx.text = `+${b.def.xp} cultivation`;
  fx.color = "120, 200, 255";
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
    if (p.stamina < (p.hoeTier ? 4 : 8)) return { msg: "Too tired to till.", kind: "bad" };
    p.stamina -= p.hoeTier ? 4 : 8;
    plot.state = "tilled";
    state.world.tiles[ty][tx] = T_TILLED;
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
      // growing — recolor
      state.world.tiles[ty][tx] = T_WATERED;
    }
    return { msg: "You water the plot.", kind: "good" };
  }
  return null;
}

function tryHarvestOrPlant(state) {
  // E was pressed near a plot — handled by interact() based on context.
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
  addItem(p, crop.yields, crop.qty);
  p.cultProgress += 2;
  plot.crop = null;
  plot.growth = 0;
  plot.state = "dirt";
  plot.wateredToday = false;
  state.world.tiles[ty][tx] = T_DIRT;
  return { msg: `Harvested ${crop.qty}× ${ITEMS[crop.yields].name}.`, kind: "good" };
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
  // gain qi + cultivation xp
  const qiGain = (1.4 + p.realmIndex * 0.7) * dt;
  const cultGain = (0.6 + p.realmIndex * 0.4) * dt;
  p.qi = Math.min(p.qiMax, p.qi + qiGain);
  p.cultProgress = p.cultProgress + cultGain;
  p.stamina = Math.max(0, p.stamina - 2 * dt);
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
  for (const id in recipe.inputs) takeItem(p, id, recipe.inputs[id]);
  p.qi -= recipe.qiCost;
  addItem(p, recipe.output, recipe.qty);
  p.cultProgress += 3;
  return { msg: `Crafted ${ITEMS[recipe.output].name}.`, kind: "good" };
}

// --- HELPERS ---
function facingDx(p) { return p.facing === "left" ? -1 : p.facing === "right" ? 1 : 0; }
function facingDy(p) { return p.facing === "up" ? -1 : p.facing === "down" ? 1 : 0; }

function pushLog(state, msg, kind = "") {
  state.logQueue.push({ msg, kind });
}
