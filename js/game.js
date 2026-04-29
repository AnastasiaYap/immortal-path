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
    spawnTimer: 8,
    logQueue: [],
    modalOpen: false,
    meditating: false,
    isAlive: true,
    started: false,
    autosaveTimer: 30,
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
    state.isAlive = true;
    state.started = true;
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
    state.beasts = [];
    state.projectiles = [];
    state.fx = [];
    state.isAlive = state.player.hp > 0;
    state.started = true;
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

    if (moving) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      // facing — prioritize horizontal if both
      if (Math.abs(dx) > Math.abs(dy)) p.facing = dx < 0 ? "left" : "right";
      else p.facing = dy < 0 ? "up" : "down";

      const nx = p.x + dx * p.speed * dt;
      const ny = p.y + dy * p.speed * dt;
      // collide on each axis separately
      if (!isSolidAt(state.world, nx, p.y) && !isSolidAt(state.world, nx, p.y + 8)) p.x = nx;
      if (!isSolidAt(state.world, p.x, ny) && !isSolidAt(state.world, p.x, ny + 8)) p.y = ny;

      p.animTimer += dt;
      if (p.animTimer > 0.18) { p.animTimer = 0; p.animFrame = 1 - p.animFrame; }
      // tiny stamina cost for sprinting (none for now)
    } else {
      p.animFrame = 0;
    }

    // stamina recovery while idle
    if (!moving) {
      p.stamina = Math.min(p.staminaMax, p.stamina + 4 * dt);
    }
  }

  // --- INTERACT (E) ---
  function interact() {
    const p = state.player;
    const tx = Math.floor((p.x + facingDx(p) * 16) / TILE);
    const ty = Math.floor((p.y + facingDy(p) * 16) / TILE);

    // check structure within 1.5 tiles
    let nearStruct = null;
    let nearStructDist = Infinity;
    for (const s of state.world.structures) {
      if (s.hidden) continue;
      if ((s.type === "desk" || s.type === "furnace") && !s.built) continue;
      const cx = (s.tx + s.w / 2) * TILE;
      const cy = (s.ty + s.h / 2) * TILE;
      const d = Math.hypot(cx - p.x, cy - p.y);
      if (d < TILE * 1.5 && d < nearStructDist) { nearStruct = s; nearStructDist = d; }
    }
    if (nearStruct) {
      switch (nearStruct.type) {
        case "merchant": openShop(state); return;
        case "desk": openCraft(state, "desk"); return;
        case "furnace": openCraft(state, "furnace"); return;
        case "well":
          {
            const r = tryWaterPlot(state);
            if (r) { pushLog(state, r.msg, r.kind); return; }
            // standing at well but no plot facing — maybe drink
            const wp = state.player;
            wp.hunger = Math.min(wp.hungerMax, wp.hunger + 4);
            pushLog(state, "You drink cool well water.", "good");
            return;
          }
        case "mat":
          state.meditating = !state.meditating;
          pushLog(state,
            state.meditating ? "You sit on the mat and steady your breath..." : "You rise from meditation.",
            "qi");
          return;
        case "house":
          // step on doorstep + E enters; but we conceptually treat sleep as "1" key on bed
          pushLog(state, "Press 1 inside (or near the bed) to sleep.", "");
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
      addItem(p, "spirit_herb", 1);
      state.world.tiles[ty][tx] = T_GRASS;
      p.cultProgress += 1;
      pushLog(state, "Foraged a Spirit Herb.", "good");
      return;
    }

    // farm plot
    const plot = plotAt(state.world, tx, ty);
    if (plot) {
      if (plot.crop && plot.growth >= 2) {
        const r = tryHarvestPlot(state);
        if (r) { pushLog(state, r.msg, r.kind); return; }
      } else if (plot.state === "tilled" || plot.state === "watered") {
        // open seed picker
        openInventory(state);
        return;
      } else if (plot.state === "dirt") {
        const r = tryTillPlot(state);
        if (r) { pushLog(state, r.msg, r.kind); return; }
      } else if (plot.state === "growing") {
        if (!plot.wateredToday) {
          // show hint
          pushLog(state, "Bring water from the well to nourish this crop.", "");
        } else {
          pushLog(state, `${CROPS[plot.crop].name} is growing. Water it tomorrow.`, "");
        }
        return;
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
    if (state.keysPressed["c"]) {
      const station = nearestCraftStation(state);
      if (station) openCraft(state, station);
      else pushLog(state, "Stand near a desk or furnace to craft.", "bad");
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

    // beasts
    for (const b of state.beasts) aiBeast(b, state.player, dt);
    // remove dead
    for (let i = state.beasts.length - 1; i >= 0; i--) {
      if (state.beasts[i].hp <= 0) {
        killBeast(state, state.beasts[i]);
        state.beasts.splice(i, 1);
      }
    }
    maybeSpawnBeast(state, dt);
    tickProjectiles(state, dt);

    // fx
    for (const f of state.fx) { f.t += dt; if (f.lifeMax === undefined) f.lifeMax = f.life; f.life -= dt; }
    state.fx = state.fx.filter((f) => f.life > 0);

    // camera follow
    state.cam.x = Math.max(0, Math.min(MAP_W * TILE - state.cam.w, state.player.x - state.cam.w / 2));
    state.cam.y = Math.max(0, Math.min(MAP_H * TILE - state.cam.h, state.player.y - state.cam.h / 2));

    checkDeath();

    // autosave
    state.autosaveTimer -= dt;
    if (state.autosaveTimer <= 0) {
      state.autosaveTimer = 30;
      saveGame(state);
    }
  }

  function isOnMat(state) {
    const mat = state.world.structures.find((s) => s.id === "mat");
    const cx = (mat.tx + 0.5) * TILE;
    const cy = (mat.ty + 0.5) * TILE;
    return Math.hypot(cx - state.player.x, cy - state.player.y) < TILE * 0.8;
  }

  function nearestCraftStation(state) {
    const desk = state.world.structures.find((s) => s.id === "desk");
    const furn = state.world.structures.find((s) => s.id === "furnace");
    const p = state.player;
    let best = null, bestD = TILE * 1.5;
    if (desk && desk.built) {
      const d = Math.hypot((desk.tx + 0.5) * TILE - p.x, (desk.ty + 0.5) * TILE - p.y);
      if (d < bestD) { best = "desk"; bestD = d; }
    }
    if (furn && furn.built) {
      const d = Math.hypot((furn.tx + 0.5) * TILE - p.x, (furn.ty + 0.5) * TILE - p.y);
      if (d < bestD) { best = "furnace"; bestD = d; }
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
    for (const b of state.beasts) drawables.push({ y: b.y, fn: () => drawBeast_(ctx, b, state.cam) });
    for (const s of state.world.structures) {
      if (s.hidden) continue;
      if ((s.type === "desk" || s.type === "furnace") && !s.built) continue;
      let baseY = (s.ty + s.h) * TILE;
      let key, sw = TILE, sh = TILE, ax, ay;
      switch (s.type) {
        case "house": key = s.tier > 0 ? "struct_house_upgraded" : "struct_house"; sw = 96; sh = 96; ax = (s.tx + s.w / 2) * TILE - sw / 2; ay = baseY - sh; break;
        case "mat": key = "struct_mat"; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "well": key = "struct_well"; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "desk": key = "struct_desk"; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "furnace": key = "struct_furnace"; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "merchant": key = "entity_merchant"; ax = s.tx * TILE; ay = s.ty * TILE; break;
        case "sign": key = "sign_" + s.label; ax = s.tx * TILE; ay = s.ty * TILE; break;
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
      if (s.hidden) continue;
      if ((s.type === "desk" || s.type === "furnace") && !s.built) continue;
      const cx = (s.tx + s.w / 2) * TILE;
      const cy = (s.ty + s.h / 2) * TILE;
      if (Math.hypot(cx - p.x, cy - p.y) < TILE * 1.5) {
        switch (s.type) {
          case "merchant": label = "E: Trade"; break;
          case "desk": label = "E: Inscribe"; break;
          case "furnace": label = "E: Refine"; break;
          case "well": label = "E: Water / Drink"; break;
          case "mat": label = "M: Meditate"; break;
          case "bed": label = "1: Sleep"; break;
          case "sign": label = "E: Read"; break;
        }
        if (label) { anchor = { x: cx, y: (s.ty) * TILE }; break; }
      }
    }
    if (!label) {
      const t = state.world.tiles[ty]?.[tx];
      if (t === T_HERB) { label = "E: Forage"; anchor = { x: tx * TILE + 16, y: ty * TILE }; }
      const plot = plotAt(state.world, tx, ty);
      if (plot) {
        if (plot.state === "dirt") label = "E: Till";
        else if (plot.state === "tilled" || plot.state === "watered") label = "E: Plant (opens pouch)";
        else if (plot.crop && plot.growth >= 2) label = "E: Harvest";
        else if (plot.state === "growing") label = "Growing...";
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
  function pushLogPublic(state, msg, kind) {
    state.logQueue.push({ msg, kind: kind || "" });
  }
  // expose for systems.js
  window.pushLogVisible = pushLogVisible;

  document.getElementById("btn-new").onclick = () => {
    document.getElementById("title-screen").classList.add("hidden");
    newGame();
  };
  document.getElementById("btn-load").onclick = () => {
    if (!hasSave()) { alert("No save found."); return; }
    document.getElementById("title-screen").classList.add("hidden");
    continueGame();
  };
  document.getElementById("btn-help").onclick = openHelp;

  if (!hasSave()) {
    document.getElementById("btn-load").disabled = true;
    document.getElementById("btn-load").style.opacity = 0.5;
  }

  requestAnimationFrame(frame);

  // periodic save before unload
  window.addEventListener("beforeunload", () => {
    if (state.started) saveGame(state);
  });
})();
