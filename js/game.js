// Main loop, input, interaction, save state.

(function () {
  buildSprites();

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const state = {
    world: null,
    player: null,
    beasts: [],
    projectiles: [],
    fx: [],
    cam: { x: 0, y: 0, w: canvas.width, h: canvas.height },
    keys: {},
    keysPressed: {},
    time: 30, // start at morning-ish
    day: 1,
    weather: "clear",
    spawnTimer: 8,
    logQueue: [],
    modalOpen: false,
    meditating: false,
    isAlive: true,
    started: false,
    autosaveTimer: 30,
    fishing: null,
    weatherParticles: [],
    dungeon: null,             // active dungeon instance, if any
    tournament: null,          // active tournament state
  };
  window.GAME = state;

  function newGame() {
    state.world = makeWorld();
    state.player = makePlayer(state.world.spawn);
    state.beasts = [];
    state.projectiles = [];
    state.fx = [];
    state.day = 1;
    state.time = 30;
    state.weather = "clear";
    state.isAlive = true;
    state.started = true;
    state.dungeon = null;
    state.tournament = null;
    state.companion = null;
    refreshDungeonEntrance(state);
    applyDecorationStanding(state.player, state);
    pushLog(state, "A new life begins. Walk well, child of the mountain.", "qi");
    pushLog(state, "Press Tab for help. Try tilling (E) the dirt plots near your hut.", "");
  }

  function continueGame() {
    const data = loadGame();
    if (!data) { newGame(); return; }
    state.world = makeWorld(); // rebuild structure refs
    // overlay saved tiles & plots
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (data.world.tiles[y] && data.world.tiles[y][x] !== undefined) {
          state.world.tiles[y][x] = data.world.tiles[y][x];
        }
      }
    }
    state.world.plots = data.world.plots;
    // merge structure built flags / tier
    for (const s of state.world.structures) {
      const saved = data.world.structures.find((x) => x.id === s.id);
      if (saved) Object.assign(s, saved);
    }
    state.player = data.player;
    state.day = data.day;
    state.time = data.time;
    state.weather = data.weather || "clear";
    state.beasts = [];
    state.projectiles = [];
    state.fx = [];
    state.dungeon = null;
    state.tournament = null;
    state.companion = null;
    state.isAlive = state.player.hp > 0;
    state.started = true;
    refreshDungeonEntrance(state);
    applyDecorationStanding(state.player, state);
    pushLog(state, "Save loaded. Welcome back.", "good");
  }

  // --- INPUT ---
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (state.modalOpen) { closeModal(); e.preventDefault(); return; }
    }
    if (state.modalOpen) {
      // allow modal interactions but prevent player movement
      if (["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      return;
    }
    state.keys[e.key.toLowerCase()] = true;
    if (!e.repeat) state.keysPressed[e.key.toLowerCase()] = true;
    if (["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Tab"].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  // --- MOVEMENT ---
  function updatePlayer(dt) {
    const p = state.player;
    if (!state.isAlive) return;

    let dx = 0, dy = 0;
    if (state.keys["w"] || state.keys["arrowup"]) dy -= 1;
    if (state.keys["s"] || state.keys["arrowdown"]) dy += 1;
    if (state.keys["a"] || state.keys["arrowleft"]) dx -= 1;
    if (state.keys["d"] || state.keys["arrowright"]) dx += 1;

    const moving = (dx !== 0 || dy !== 0);
    p.moving = moving;

    // Flight: drain qi, ignore collisions, 1.8x speed.
    if (p.flying) {
      p.qi -= 4 * dt;
      if (p.qi <= 0) {
        p.qi = 0;
        p.flying = false;
        pushLog(state, "Qi exhausted — you drop from flight.", "bad");
      }
    }
    const speedMul = p.flying ? 1.8 : 1;

    if (moving) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      if (Math.abs(dx) > Math.abs(dy)) p.facing = dx < 0 ? "left" : "right";
      else p.facing = dy < 0 ? "up" : "down";

      const nx = p.x + dx * p.speed * speedMul * dt;
      const ny = p.y + dy * p.speed * speedMul * dt;
      if (p.flying) {
        // Bound to map only.
        p.x = Math.max(8, Math.min(MAP_W * TILE - 8, nx));
        p.y = Math.max(8, Math.min(MAP_H * TILE - 8, ny));
      } else {
        if (!isSolidAt(state.world, nx, p.y) && !isSolidAt(state.world, nx, p.y + 8)) p.x = nx;
        if (!isSolidAt(state.world, p.x, ny) && !isSolidAt(state.world, p.x, ny + 8)) p.y = ny;
      }

      p.animTimer += dt;
      if (p.animTimer > 0.18) { p.animTimer = 0; p.animFrame = 1 - p.animFrame; }
    } else {
      p.animFrame = 0;
    }

    if (!moving) {
      p.stamina = Math.min(p.staminaMax, p.stamina + 4 * dt);
    }
  }

  // --- INTERACT (E) ---
  function interact() {
    const p = state.player;
    const tx = Math.floor((p.x + facingDx(p) * 16) / TILE);
    const ty = Math.floor((p.y + facingDy(p) * 16) / TILE);

    // check structure within 1.5 tiles (nodraw structures like the bed are
    // still interactable — they just don't render).
    let nearStruct = null;
    let nearStructDist = Infinity;
    for (const s of state.world.structures) {
      if (s.built === false) continue;
      const cx = (s.tx + s.w / 2) * TILE;
      const cy = (s.ty + s.h / 2) * TILE;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < TILE * 1.5 && d < nearStructDist) { nearStruct = s; nearStructDist = d; }
    }
    if (nearStruct) {
      switch (nearStruct.type) {
        case "merchant": openMerchantHub(state); return;
        case "cave":
          enterDungeon(state, nearStruct.dungeonId);
          return;
        case "decor":
          pushLog(state, `${ITEMS[nearStruct.decor].name} — ${ITEMS[nearStruct.decor].desc}`, "");
          return;
        case "chest":
          openDungeonChest(state);
          return;
        case "desk":    openCraft(state, "desk"); return;
        case "furnace": openCraft(state, "furnace"); return;
        case "stove":   openCraft(state, "stove"); return;
        case "forge":   openCraft(state, "forge"); return;
        case "loom":    openCraft(state, "loom"); return;
        case "well":
          state.player.hunger = Math.min(state.player.hungerMax, state.player.hunger + 4);
          pushLog(state, "You drink cool well water.", "good");
          return;
        case "mat":
          state.meditating = !state.meditating;
          pushLog(state,
            state.meditating ? "You sit on the mat and steady your breath..." : "You rise from meditation.",
            "qi");
          return;
        case "house":
          pushLog(state, "Press 1 near your bed to sleep.", "");
          return;
        case "sign":
          pushLog(state, signMessage(nearStruct.label), "");
          return;
        case "bed":
          sleepInBed();
          return;
      }
    }

    // tile at facing
    const t = state.world.tiles[ty]?.[tx];

    // herb forage
    if (t === T_HERB) {
      const r = tryForageHerb(state, tx, ty);
      if (r) { pushLog(state, r.msg, r.kind); return; }
    }

    // fishing
    if (t === T_WATER) {
      if (state.fishing && state.fishing.bit) {
        const r = reelFish(state);
        if (r) pushLog(state, r.msg, r.kind);
        return;
      }
      if (state.fishing) {
        pushLog(state, "Wait for a bite...", "");
        return;
      }
      const r = tryStartFishing(state);
      if (r) pushLog(state, r.msg, r.kind);
      return;
    }

    // mining
    if (t === T_STONE) {
      const r = tryMineStone(state);
      if (r) pushLog(state, r.msg, r.kind);
      return;
    }

    // farm plot
    const plot = plotAt(state.world, tx, ty);
    if (plot) {
      if (plot.crop && plot.growth >= 2) {
        const r = tryHarvestPlot(state);
        if (r) { pushLog(state, r.msg, r.kind); return; }
      } else if (plot.crop && !plot.wateredToday) {
        const r = tryWaterPlot(state);
        if (r) { pushLog(state, r.msg, r.kind); return; }
      } else if (plot.crop) {
        pushLog(state, `${CROPS[plot.crop].name} is growing. Water it tomorrow.`, "");
        return;
      } else if (plot.state === "tilled" || plot.state === "watered") {
        // open seed picker
        openInventory(state);
        return;
      } else if (plot.state === "dirt") {
        const r = tryTillPlot(state);
        if (r) { pushLog(state, r.msg, r.kind); return; }
      }
    }

    pushLog(state, "Nothing to do here.", "");
  }

  function signMessage(label) {
    if (label === "Farm") return "Sign: <Farm Plots> — till the soil, plant your future.";
    if (label === "Forest") return "Sign: <Forest of the Hungry Wood> — herbs and beasts within.";
    if (label === "Market") return "Sign: <Eastern Market> — coin and seed exchanged.";
    return "An old wooden sign.";
  }

  function sleepInBed() {
    const p = state.player;
    const tier = HOUSE_TIERS[p.houseTier];
    p.hp = Math.min(p.hpMax, p.hp + p.hpMax * tier.sleepHeal);
    p.qi = p.qiMax;
    p.stamina = p.staminaMax;
    p.hunger = Math.max(0, p.hunger - 25);
    pushLog(state, "You sleep. A new dawn rises.", "qi");
    nextDay(state);
  }

  // --- DEATH / NIGHT ---
  function checkDeath() {
    const p = state.player;
    if (state.isAlive && p.hp <= 0) {
      state.isAlive = false;
      pushLog(state, "You collapse. The mountain takes you back...", "bad");
      setTimeout(() => {
        // soft death: revive at house, lose half money & some cultivation
        p.hp = Math.floor(p.hpMax * 0.5);
        p.qi = Math.floor(p.qiMax * 0.3);
        p.stamina = p.staminaMax * 0.6;
        p.money = Math.floor(p.money / 2);
        p.cultProgress = Math.max(0, p.cultProgress - REALMS[p.realmIndex].qiToBreakthrough * 0.15);
        p.x = state.world.spawn.x;
        p.y = state.world.spawn.y;
        state.beasts = [];
        state.isAlive = true;
        pushLog(state, "An elder revives you at home. Half your spirit stones are gone.", "bad");
      }, 1800);
    }
  }

  // --- UPDATE / DRAW ---
  let lastTs = performance.now();
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state.started && !state.modalOpen) {
      tick(dt);
    }
    draw();

    // log queue → DOM
    while (state.logQueue.length) {
      const e = state.logQueue.shift();
      pushLogVisible(state, e.msg, e.kind);
    }
    updateHUD(state);
    requestAnimationFrame(frame);
  }

  function tick(dt) {
    state.time += dt;
    if (state.time >= DAY_LENGTH) {
      // forced day rollover (e.g. all-night staying up)
      pushLog(state, "Dawn breaks. You haven't slept...", "bad");
      state.player.stamina = Math.max(10, state.player.stamina * 0.4);
      state.player.hunger = Math.max(0, state.player.hunger - 30);
      nextDay(state);
    }

    tickNeeds(state.player, dt);
    tickFishing(state, dt);
    updatePlayer(dt);

    // meditation
    if (state.meditating) {
      const onMat = isOnMat(state);
      if (!onMat) {
        state.meditating = false;
      } else {
        meditate(state, dt);
      }
    }

    // single-press hotkeys
    if (state.keysPressed["e"]) interact();
    if (state.keysPressed["f"]) {
      const r = playerAttack(state);
      if (r) pushLog(state, r.msg, r.kind);
    }
    if (state.keysPressed["q"]) {
      const r = throwTalisman(state);
      if (r) pushLog(state, r.msg, r.kind);
    }
    if (state.keysPressed["m"]) {
      if (isOnMat(state)) {
        state.meditating = !state.meditating;
        pushLog(state, state.meditating ? "Meditating..." : "Meditation ended.", "qi");
      } else {
        pushLog(state, "Stand on the meditation mat first.", "");
      }
    }
    if (state.keysPressed["r"]) {
      const r = attemptBreakthrough(state);
      pushLog(state, r.msg, r.kind);
      if (r.big) {
        // FX
        for (let i = 0; i < 24; i++) state.fx.push(makeFx(
          state.player.x + (Math.random() - 0.5) * 40,
          state.player.y - 8 + (Math.random() - 0.5) * 30, "qi"));
      }
    }
    if (state.keysPressed["i"]) openInventory(state);
    if (state.keysPressed["k"]) openSkills(state);
    if (state.keysPressed["j"]) openQuests(state);
    if (state.keysPressed["p"]) openHeartMeridian(state);
    if (state.keysPressed["t"]) {
      // tame attempt
      if (state.player.hasPartnerUnlock && !state.companion) {
        // First T after partner unlock summons the partner
        state.companion = makeCompanion("partner", state.player.x - 30, state.player.y);
        state.player.hasPartnerUnlock = false;
        pushLog(state, `${state.companion.def.name} arrives at your side.`, "qi");
      } else {
        const r = tryTameBeast(state);
        if (r) pushLog(state, r.msg, r.kind);
        else pushLog(state, "Wound a tameable beast (rabbit/boar/wolf) below 25% HP, then face it and press T.", "");
      }
    }
    if (state.keysPressed["v"]) {
      const p = state.player;
      if (p.realmIndex < 3) {
        pushLog(state, "Sword-flight requires Foundation Establishment.", "bad");
      } else if (p.flying) {
        p.flying = false;
        pushLog(state, "You alight on the ground.", "qi");
      } else if (p.qi < 10) {
        pushLog(state, "Not enough qi to take flight.", "bad");
      } else {
        p.flying = true;
        pushLog(state, "Sword-flight engaged. Qi drains while aloft.", "qi");
      }
    }
    if (state.keysPressed["c"]) {
      const station = nearestCraftStation(state);
      if (station) openCraft(state, station);
      else pushLog(state, "Stand near a desk, furnace, stove, forge, or loom to craft.", "bad");
    }
    if (state.keysPressed["b"]) openBuild(state);
    if (state.keysPressed["1"]) {
      // sleep if near bed
      const bed = state.world.structures.find((s) => s.id === "bed");
      const dx = (bed.tx + 0.5) * TILE - state.player.x;
      const dy = (bed.ty + 0.5) * TILE - state.player.y;
      if (Math.hypot(dx, dy) < TILE * 1.4) sleepInBed();
      else pushLog(state, "Walk inside the house and find your bed.", "");
    }
    if (state.keysPressed["tab"]) openHelp();
    state.keysPressed = {};

    // companion AI
    tickCompanion(state, dt);

    // beasts
    for (const b of state.beasts) aiBeast(b, state.player, dt);
    // remove dead
    for (let i = state.beasts.length - 1; i >= 0; i--) {
      if (state.beasts[i].hp <= 0) {
        killBeast(state, state.beasts[i]);
        state.beasts.splice(i, 1);
      }
    }
    if (!state.dungeon && !state.tournament) maybeSpawnBeast(state, dt);
    tickDungeon(state, dt);
    tickTournament(state, dt);
    tickProjectiles(state, dt);

    // fx
    for (const f of state.fx) { f.t += dt; if (f.lifeMax === undefined) f.lifeMax = f.life; f.life -= dt; }
    state.fx = state.fx.filter((f) => f.life > 0);

    // camera follow
    const wpx = (state.world.width || MAP_W) * TILE;
    const hpx = (state.world.height || MAP_H) * TILE;
    state.cam.x = Math.max(0, Math.min(wpx - state.cam.w, state.player.x - state.cam.w / 2));
    state.cam.y = Math.max(0, Math.min(hpx - state.cam.h, state.player.y - state.cam.h / 2));

    checkDeath();

    // autosave
    state.autosaveTimer -= dt;
    if (state.autosaveTimer <= 0) {
      state.autosaveTimer = 30;
      saveGame(state);
    }
  }

  function drawWeatherParticles() {
    const w = state.weather;
    if (!w || w === "clear") return;
    // Lazy-init particle pool sized by weather kind
    let need = 0;
    switch (w) {
      case "rain":  need = 80; break;
      case "storm": need = 160; break;
      case "snow":  need = 60; break;
      case "mist":  need = 40; break;
    }
    while (state.weatherParticles.length < need) {
      state.weatherParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        seed: Math.random() * 1000,
      });
    }
    while (state.weatherParticles.length > need) state.weatherParticles.pop();

    const t = performance.now() / 1000;
    if (w === "rain" || w === "storm") {
      ctx.strokeStyle = w === "storm" ? "rgba(180, 200, 240, 0.6)" : "rgba(160, 180, 220, 0.5)";
      ctx.lineWidth = 1;
      for (const p of state.weatherParticles) {
        p.y += 460 * (1 / 60);
        p.x += 40 * (1 / 60);
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width) p.x -= canvas.width;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y - 14);
        ctx.stroke();
      }
      // occasional lightning flash for storm
      if (w === "storm" && Math.random() < 0.005) {
        ctx.fillStyle = "rgba(255, 255, 240, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else if (w === "snow") {
      ctx.fillStyle = "rgba(245, 250, 255, 0.85)";
      for (const p of state.weatherParticles) {
        p.y += 25 * (1 / 60);
        p.x += Math.sin(t + p.seed) * 0.6;
        if (p.y > canvas.height) { p.y = -6; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (w === "mist") {
      ctx.fillStyle = "rgba(220, 230, 240, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(220, 230, 240, 0.2)";
      for (const p of state.weatherParticles) {
        p.x += 12 * (1 / 60);
        if (p.x > canvas.width + 80) p.x = -80;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 60, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function isOnMat(state) {
    const mat = state.world.structures.find((s) => s.id === "mat");
    const cx = (mat.tx + 0.5) * TILE;
    const cy = (mat.ty + 0.5) * TILE;
    return Math.hypot(cx - state.player.x, cy - state.player.y) < TILE * 0.8;
  }

  function nearestCraftStation(state) {
    const p = state.player;
    let best = null, bestD = TILE * 1.5;
    for (const sid of ["desk", "furnace", "stove", "forge", "loom"]) {
      const s = state.world.structures.find((x) => x.id === sid);
      if (!s || !s.built) continue;
      const d = Math.hypot((s.tx + 0.5) * TILE - p.x, (s.ty + 0.5) * TILE - p.y);
      if (d < bestD) { best = sid; bestD = d; }
    }
    return best;
  }

  function draw() {
    if (!state.started) return;

    ctx.fillStyle = "#0a0a08";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawWorld(ctx, state.world, state.cam);

    // depth-sorted entities
    const drawables = [];
    drawables.push({ y: state.player.y, fn: () => drawPlayer_(ctx, state.player, state.cam) });
    if (state.companion) drawables.push({ y: state.companion.y, fn: () => drawCompanion(ctx, state.companion, state.cam) });
    for (const b of state.beasts) drawables.push({ y: b.y, fn: () => drawBeast_(ctx, b, state.cam) });
    for (const s of state.world.structures) {
      if (s.nodraw) continue;
      if (s.built === false) continue;  // unbuilt craft stations
      let baseY = (s.ty + s.h) * TILE;
      let key, sw = TILE, sh = TILE, ax, ay;
      switch (s.type) {
        case "house": key = s.tier > 0 ? "struct_house_upgraded" : "struct_house"; sw = 96; sh = 96; ax = (s.tx + s.w / 2) * TILE - sw / 2; ay = baseY - sh; break;
        case "mat":     key = "struct_mat";     ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "well":    key = "struct_well";    ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "desk":    key = "struct_desk";    ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "furnace": key = "struct_furnace"; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "stove":   key = "struct_stove";   ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "forge":   key = "struct_forge";   ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "loom":    key = "struct_loom";    ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "merchant":key = "entity_merchant";ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "sign":    key = "sign_" + s.label; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "cave":    key = "struct_cave";    ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "chest":   key = "struct_chest";   ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "decor":   key = "struct_" + DECORATIONS[s.decor].spriteKey; ax = s.tx * TILE; ay = s.ty * TILE; break;
        default: continue;
      }
      drawables.push({
        y: baseY,
        fn: () => {
          const spr = SpriteCache[key];
          if (spr) ctx.drawImage(spr, ax - state.cam.x, ay - state.cam.y);
        }
      });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

    // projectiles
    for (const p of state.projectiles) drawProjectile_(ctx, p, state.cam);
    // fx
    for (const f of state.fx) drawFx_(ctx, f, state.cam);

    // fishing bobber
    if (state.fishing) {
      const f = state.fishing;
      const bob = f.bit ? Math.sin(performance.now() / 60) * 3 : Math.sin(performance.now() / 200);
      const bobber = SpriteCache["fx_bobber"];
      if (bobber) ctx.drawImage(bobber, f.bobberX - state.cam.x - 8, f.bobberY - state.cam.y - 8 + bob);
      if (f.bit) {
        ctx.fillStyle = "#ffd048";
        ctx.font = "bold 14px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("!", f.bobberX - state.cam.x, f.bobberY - state.cam.y - 14);
      }
      // line from player to bobber
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.moveTo(state.player.x - state.cam.x, state.player.y - state.cam.y - 12);
      ctx.lineTo(f.bobberX - state.cam.x, f.bobberY - state.cam.y);
      ctx.stroke();
    }

    // weather particles
    drawWeatherParticles();

    // night overlay
    const dark = nightOverlay(state.time);
    if (dark > 0) {
      ctx.fillStyle = `rgba(20, 30, 60, ${dark})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // interaction prompt
    drawInteractPrompt();

    // death veil
    if (!state.isAlive) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#c43a31";
      ctx.font = "bold 36px Georgia";
      ctx.textAlign = "center";
      ctx.fillText("Your dao falters...", canvas.width / 2, canvas.height / 2);
    }
  }

  function drawInteractPrompt() {
    const p = state.player;
    const tx = Math.floor((p.x + facingDx(p) * 16) / TILE);
    const ty = Math.floor((p.y + facingDy(p) * 16) / TILE);

    let label = null;
    let anchor = null;

    // structure
    for (const s of state.world.structures) {
      if (s.built === false) continue;
      const cx = (s.tx + s.w / 2) * TILE;
      const cy = (s.ty + s.h / 2) * TILE;
      if (Math.hypot(cx - p.x, cy - p.y) < TILE * 1.5) {
        switch (s.type) {
          case "merchant": label = "E: Trade"; break;
          case "desk":    label = "E: Inscribe"; break;
          case "furnace": label = "E: Refine"; break;
          case "stove":   label = "E: Cook"; break;
          case "forge":   label = "E: Forge"; break;
          case "loom":    label = "E: Weave"; break;
          case "well":    label = "E: Drink"; break;
          case "mat":     label = "M: Meditate"; break;
          case "bed":     label = "1: Sleep"; break;
          case "sign":    label = "E: Read"; break;
        }
        if (label) { anchor = { x: cx, y: (s.ty) * TILE }; break; }
      }
    }
    if (!label) {
      const t = state.world.tiles[ty]?.[tx];
      if (t === T_HERB)  { label = "E: Forage";  anchor = { x: tx * TILE + 16, y: ty * TILE }; }
      else if (t === T_WATER) { label = state.fishing && state.fishing.bit ? "E: Reel!" : (state.fishing ? "Waiting..." : "E: Fish"); anchor = { x: tx * TILE + 16, y: ty * TILE }; }
      else if (t === T_STONE) { label = "E: Mine"; anchor = { x: tx * TILE + 16, y: ty * TILE }; }
      const plot = plotAt(state.world, tx, ty);
      if (plot) {
        if (plot.crop && plot.growth >= 2) label = "E: Harvest";
        else if (plot.crop && !plot.wateredToday) label = "E: Water";
        else if (plot.crop) label = "Growing...";
        else if (plot.state === "tilled" || plot.state === "watered") label = "E: Plant (opens pouch)";
        else if (plot.state === "dirt") label = "E: Till";
        anchor = { x: tx * TILE + 16, y: ty * TILE };
      }
    }

    if (label && anchor) {
      ctx.font = "bold 11px Georgia";
      ctx.textAlign = "center";
      const pad = 4;
      const w = ctx.measureText(label).width + pad * 2;
      const x = anchor.x - state.cam.x;
      const y = anchor.y - state.cam.y - 6;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(x - w / 2, y - 14, w, 16);
      ctx.fillStyle = "#d4a548";
      ctx.fillText(label, x, y - 2);
    }
  }

  // --- BOOT ---
  function renderTitleSlots() {
    const root = document.getElementById("save-slots");
    root.innerHTML = "";
    for (let i = 1; i <= NUM_SLOTS; i++) {
      const meta = getSlotMeta(i);
      const slotEl = document.createElement("div");
      slotEl.className = "save-slot";
      const title = document.createElement("div");
      title.className = "slot-title";
      title.textContent = `Life ${i}`;
      slotEl.appendChild(title);
      const metaEl = document.createElement("div");
      if (meta) {
        metaEl.className = "slot-meta";
        metaEl.textContent = `Day ${meta.day} · ${meta.realm} · ${meta.money} stones`;
      } else {
        metaEl.className = "slot-empty";
        metaEl.textContent = "(empty mortal coil)";
      }
      slotEl.appendChild(metaEl);
      const actions = document.createElement("div");
      actions.className = "slot-actions";
      if (meta) {
        const cont = document.createElement("button");
        cont.textContent = "Continue";
        cont.onclick = () => {
          setActiveSlot(i);
          document.getElementById("title-screen").classList.add("hidden");
          continueGame();
        };
        actions.appendChild(cont);
        const newB = document.createElement("button");
        newB.textContent = "Restart";
        newB.onclick = () => {
          if (!confirm(`Begin a new life, overwriting Life ${i}?`)) return;
          setActiveSlot(i);
          deleteSave(i);
          document.getElementById("title-screen").classList.add("hidden");
          newGame();
        };
        actions.appendChild(newB);
        const del = document.createElement("button");
        del.className = "delete";
        del.textContent = "✕";
        del.title = "Delete";
        del.onclick = () => {
          if (!confirm(`Delete Life ${i}? This cannot be undone.`)) return;
          deleteSave(i);
          renderTitleSlots();
        };
        actions.appendChild(del);
      } else {
        const newB = document.createElement("button");
        newB.textContent = "New Life";
        newB.onclick = () => {
          setActiveSlot(i);
          document.getElementById("title-screen").classList.add("hidden");
          newGame();
        };
        actions.appendChild(newB);
      }
      slotEl.appendChild(actions);
      root.appendChild(slotEl);
    }
  }
  renderTitleSlots();

  document.getElementById("btn-help").onclick = openHelp;

  requestAnimationFrame(frame);

  // periodic save before unload
  window.addEventListener("beforeunload", () => {
    if (state.started) saveGame(state);
  });
})();
