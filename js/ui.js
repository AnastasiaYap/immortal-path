// HUD updates and modal dialogs.

function updateHUD(state) {
  if (!state.player) return;
  const p = state.player;
  const realm = REALMS[p.realmIndex];
  document.getElementById("bar-hp").style.width = (100 * p.hp / p.hpMax) + "%";
  document.getElementById("bar-qi").style.width = (100 * p.qi / p.qiMax) + "%";
  document.getElementById("bar-stamina").style.width = (100 * p.stamina / p.staminaMax) + "%";
  document.getElementById("bar-hunger").style.width = (100 * p.hunger / p.hungerMax) + "%";
  document.getElementById("realm-name").textContent = realm.name;
  document.getElementById("realm-stage").textContent = "";
  document.getElementById("cult-progress").textContent =
    Math.floor(p.cultProgress) + " / " + (realm.qiToBreakthrough === Infinity ? "∞" : realm.qiToBreakthrough);
  document.getElementById("day-num").textContent = state.day;
  document.getElementById("time-of-day").textContent = timeOfDay(state.time);
  document.getElementById("money").textContent = p.money;
}

function pushLogVisible(state, msg, kind = "") {
  const logDiv = document.getElementById("log");
  const el = document.createElement("div");
  el.className = "log-entry " + kind;
  el.textContent = msg;
  logDiv.appendChild(el);
  setTimeout(() => el.remove(), 5000);
  while (logDiv.children.length > 6) logDiv.removeChild(logDiv.firstChild);
}

// --- MODAL ---
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalActions = document.getElementById("modal-actions");
const modalClose = document.getElementById("modal-close");

modalClose.onclick = () => closeModal();

function closeModal() {
  modal.classList.add("hidden");
  if (window.GAME) window.GAME.modalOpen = false;
}

function openModal(title, contentEl, actions = []) {
  modalTitle.textContent = title;
  modalBody.innerHTML = "";
  if (contentEl instanceof Node) modalBody.appendChild(contentEl);
  else if (typeof contentEl === "string") modalBody.innerHTML = contentEl;
  modalActions.innerHTML = "";
  for (const a of actions) {
    const btn = document.createElement("button");
    btn.textContent = a.label;
    btn.onclick = a.onClick;
    if (a.disabled) btn.disabled = true;
    modalActions.appendChild(btn);
  }
  modal.classList.remove("hidden");
  if (window.GAME) window.GAME.modalOpen = true;
}

// --- INVENTORY MODAL ---
function openInventory(state) {
  const p = state.player;
  const wrap = document.createElement("div");
  // seeds
  const sH = document.createElement("h3"); sH.textContent = "Seeds"; sH.style.marginTop = "0";
  wrap.appendChild(sH);
  let any = false;
  for (const id in p.seeds) {
    if ((p.seeds[id] || 0) <= 0) continue;
    any = true;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${CROPS[id].name} Seed</b> × ${p.seeds[id]} <i style="opacity:0.6">— stand on a tilled plot, then click Plant</i></span>`;
    const btn = document.createElement("button"); btn.textContent = "Plant";
    btn.onclick = () => {
      const r = tryPlantPlot(state, id);
      pushLog(state, r.msg, r.kind);
      closeModal();
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }
  if (!any) wrap.appendChild(textRow("(no seeds)"));

  // items
  const iH = document.createElement("h3"); iH.textContent = "Items";
  wrap.appendChild(iH);
  let anyItem = false;
  for (const id in p.inventory) {
    const qty = p.inventory[id];
    if (qty <= 0) continue;
    anyItem = true;
    const item = ITEMS[id];
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${item.name}</b> × ${qty} <i style="opacity:0.6">— ${item.desc}</i></span>`;
    const actions = document.createElement("span");
    if (item.edible || item.qiRestore || item.hpRestore || item.bodyBoost || item.breakthroughBoost) {
      const useBtn = document.createElement("button"); useBtn.textContent = "Use";
      useBtn.onclick = () => {
        useItem(state, id);
        openInventory(state); // refresh
      };
      actions.appendChild(useBtn);
    }
    if (item.useable === "ward") {
      const wb = document.createElement("button"); wb.textContent = "Activate";
      wb.onclick = () => {
        if (takeItem(p, id, 1)) {
          p.wardTimer = 18;
          pushLog(state, "Ward talisman activated — beasts move slowly for 18s.", "qi");
          openInventory(state);
        }
      };
      actions.appendChild(wb);
    }
    if (item.value > 0 && id !== "fire_talisman" && id !== "ward_talisman") {
      const sb = document.createElement("button"); sb.textContent = `Sell (${item.value})`;
      sb.style.marginLeft = "4px";
      sb.style.background = "#7a1f1a";
      sb.onclick = () => {
        if (takeItem(p, id, 1)) {
          p.money += item.value;
          pushLog(state, `Sold 1 ${item.name} for ${item.value} stones.`, "good");
          openInventory(state);
        }
      };
      actions.appendChild(sb);
    }
    row.appendChild(actions);
    wrap.appendChild(row);
  }
  if (!anyItem) wrap.appendChild(textRow("(empty)"));

  openModal("Storage Pouch", wrap, []);
}

function useItem(state, id) {
  const p = state.player;
  const item = ITEMS[id];
  if (!takeItem(p, id, 1)) return;
  let parts = [];
  if (item.edible) {
    p.hunger = Math.min(p.hungerMax, p.hunger + item.edible);
    parts.push(`+${item.edible} hunger`);
  }
  if (item.qiRestore) {
    p.qi = Math.min(p.qiMax, p.qi + item.qiRestore);
    parts.push(`+${item.qiRestore} qi`);
  }
  if (item.hpRestore) {
    p.hp = Math.min(p.hpMax, p.hp + item.hpRestore);
    parts.push(`+${item.hpRestore} HP`);
  }
  if (item.bodyBoost) {
    p.bodyBoost += item.bodyBoost;
    parts.push(`+${item.bodyBoost} max HP at dawn`);
  }
  if (item.breakthroughBoost) {
    p.breakthroughBoost += item.breakthroughBoost;
    parts.push(`+${Math.round(item.breakthroughBoost * 100)}% breakthrough`);
  }
  pushLog(state, `Consumed ${item.name}. ${parts.join(", ")}.`, "good");
}

function textRow(text) {
  const row = document.createElement("div");
  row.style.padding = "6px 8px";
  row.style.opacity = "0.7";
  row.textContent = text;
  return row;
}

// --- SHOP ---
function openShop(state) {
  const p = state.player;
  const wrap = document.createElement("div");
  const h = document.createElement("p");
  h.style.margin = "0 0 8px";
  h.innerHTML = `<i>The merchant smiles. "Spirit Stones, friend?"</i> · You have <b>${p.money}</b>.`;
  wrap.appendChild(h);

  for (const offer of SHOP_BUY) {
    if (offer.unlockRealm && p.realmIndex < offer.unlockRealm) continue;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${offer.label}</b></span>`;
    const btn = document.createElement("button");
    btn.textContent = `Buy (${offer.price})`;
    btn.disabled = p.money < offer.price;
    btn.onclick = () => {
      if (p.money < offer.price) return;
      p.money -= offer.price;
      for (const k in offer.give) {
        if (k === "_seed") {
          p.seeds[offer.give._seed] = (p.seeds[offer.give._seed] || 0) + 1;
        } else {
          addItem(p, k, offer.give[k]);
        }
      }
      pushLog(state, `Purchased ${offer.label}.`, "good");
      openShop(state);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }

  // sell-all-produce convenience
  const sH = document.createElement("h3"); sH.textContent = "Sell Produce"; sH.style.marginTop = "12px";
  wrap.appendChild(sH);
  let total = 0;
  for (const id in p.inventory) {
    const item = ITEMS[id];
    if (!item.value || id === "fire_talisman" || id === "ward_talisman") continue;
    const qty = p.inventory[id];
    if (qty <= 0) continue;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${item.name}</b> × ${qty} @ ${item.value}</span>`;
    const btn = document.createElement("button");
    btn.textContent = `Sell all (+${item.value * qty})`;
    btn.onclick = () => {
      const v = item.value * qty;
      delete p.inventory[id];
      p.money += v;
      pushLog(state, `Sold ${qty} ${item.name} for ${v} stones.`, "good");
      openShop(state);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
    total += item.value * qty;
  }
  if (total === 0) wrap.appendChild(textRow("(nothing sellable in pouch)"));

  openModal("Eastern Market", wrap);
}

// --- CRAFT ---
function openCraft(state, station) {
  const p = state.player;
  const wrap = document.createElement("div");
  const h = document.createElement("p");
  h.style.margin = "0 0 8px";
  h.innerHTML = station === "desk"
    ? `<i>The talisman desk hums with latent qi. Inscribe with brush and ink.</i>`
    : `<i>The pill furnace glows. Combine herbs and beast cores.</i>`;
  wrap.appendChild(h);

  for (const recipeId in RECIPES) {
    const r = RECIPES[recipeId];
    if (r.station !== station) continue;
    if (r.unlockRealm && p.realmIndex < r.unlockRealm) continue;
    const row = document.createElement("div"); row.className = "item-row";
    const inputs = Object.entries(r.inputs)
      .map(([k, v]) => `${ITEMS[k].name} ×${v}`).join(", ");
    row.innerHTML = `<span><b>${r.label}</b> <i style="opacity:0.6">— needs ${inputs}, ${r.qiCost} qi</i></span>`;
    const btn = document.createElement("button");
    btn.textContent = "Craft";
    btn.disabled = !hasItems(p, r.inputs) || p.qi < r.qiCost;
    btn.onclick = () => {
      const res = craft(state, recipeId);
      pushLog(state, res.msg, res.kind);
      openCraft(state, station);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }
  openModal(station === "desk" ? "Talisman Inscription" : "Pill Refinement", wrap);
}

// --- BUILD ---
function openBuild(state) {
  const p = state.player;
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 8px";
  intro.innerHTML = `<i>The local craftsman can build for you — for a price.</i> · You have <b>${p.money}</b> spirit stones.`;
  wrap.appendChild(intro);

  // Structures
  const sH = document.createElement("h3"); sH.textContent = "Structures"; sH.style.marginTop = "0";
  wrap.appendChild(sH);
  for (const def of STRUCTURES) {
    const struct = state.world.structures.find((s) => s.id === def.id);
    const row = document.createElement("div"); row.className = "item-row";
    const built = (struct && struct.built) || (def.id === "mat");
    row.innerHTML = `<span><b>${def.name}</b> <i style="opacity:0.6">— ${def.desc}</i></span>`;
    const btn = document.createElement("button");
    if (built) {
      btn.textContent = "Built"; btn.disabled = true;
    } else {
      btn.textContent = `Build (${def.cost})`;
      btn.disabled = p.money < def.cost;
      btn.onclick = () => {
        if (p.money < def.cost) return;
        p.money -= def.cost;
        struct.built = true;
        pushLog(state, `${def.name} constructed!`, "good");
        openBuild(state);
      };
    }
    row.appendChild(btn);
    wrap.appendChild(row);
  }

  // House upgrade
  const hH = document.createElement("h3"); hH.textContent = "House"; hH.style.marginTop = "12px";
  wrap.appendChild(hH);
  for (let i = 0; i < HOUSE_TIERS.length; i++) {
    const t = HOUSE_TIERS[i];
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${t.name}</b> <i style="opacity:0.6">— sleep heal ×${t.sleepHeal}, +${t.qiRegenBonus.toFixed(1)} qi/sec passive</i></span>`;
    const btn = document.createElement("button");
    if (i <= p.houseTier) { btn.textContent = "Owned"; btn.disabled = true; }
    else if (i > p.houseTier + 1) { btn.textContent = "Locked"; btn.disabled = true; }
    else {
      btn.textContent = `Upgrade (${t.cost})`;
      btn.disabled = p.money < t.cost;
      btn.onclick = () => {
        if (p.money < t.cost) return;
        p.money -= t.cost;
        p.houseTier = i;
        const houseStruct = state.world.structures.find((s) => s.id === "house");
        houseStruct.tier = i;
        if (t.hpBonus) {
          p.hpMax += t.hpBonus;
          p.hp += t.hpBonus;
        }
        pushLog(state, `House upgraded to ${t.name}!`, "good");
        openBuild(state);
      };
    }
    row.appendChild(btn);
    wrap.appendChild(row);
  }

  // Tools
  const tH = document.createElement("h3"); tH.textContent = "Tools"; tH.style.marginTop = "12px";
  wrap.appendChild(tH);
  const ironRow = document.createElement("div"); ironRow.className = "item-row";
  ironRow.innerHTML = `<span><b>Iron Hoe</b> <i style="opacity:0.6">— halves stamina cost of tilling</i></span>`;
  const ironBtn = document.createElement("button");
  if (p.hoeTier >= 1) { ironBtn.textContent = "Owned"; ironBtn.disabled = true; }
  else {
    ironBtn.textContent = `Buy (200)`;
    ironBtn.disabled = p.money < 200;
    ironBtn.onclick = () => {
      if (p.money < 200) return;
      p.money -= 200;
      p.hoeTier = 1;
      pushLog(state, "Iron Hoe acquired!", "good");
      openBuild(state);
    };
  }
  ironRow.appendChild(ironBtn);
  wrap.appendChild(ironRow);

  openModal("Build & Upgrade", wrap);
}

// --- HELP ---
function openHelp() {
  const html = `
<p>You are a mortal child sent to the spirit-touched mountains. Walk the immortal path: <b>farm, work, hunt, cultivate, ascend</b>.</p>
<h3>Controls</h3>
<ul>
  <li><b>WASD</b> / arrows — move</li>
  <li><b>E</b> — interact (till, water, plant, harvest, NPCs, signs, doors, mat, desk, furnace, well, bed)</li>
  <li><b>F</b> — attack (melee). Hold to spam.</li>
  <li><b>Q</b> — throw a Fire Talisman (if you have any)</li>
  <li><b>M</b> — meditate (must stand on the meditation mat)</li>
  <li><b>R</b> — attempt a breakthrough (when ready)</li>
  <li><b>I</b> — inventory · <b>C</b> — craft (at desk/furnace) · <b>B</b> — build (anywhere)</li>
  <li><b>1</b> — sleep (must be on bed inside house) · <b>Tab</b> — this help</li>
</ul>
<h3>Loop</h3>
<ol>
  <li>Till plots with E, plant seeds (open inventory near a tilled plot), water at the well's edge.</li>
  <li>Crops grow when watered. Harvest mature crops; sell at the market.</li>
  <li>Forage spirit herbs in the forest (E on glowing plants).</li>
  <li>Hunt low beasts for hides and cores. Be careful at night — stronger beasts roam.</li>
  <li>Meditate on the mat to gather qi and accumulate cultivation.</li>
  <li>When ready, press R to attempt a breakthrough into the next realm.</li>
  <li>Build a desk to inscribe talismans, a furnace to refine pills, upgrade your house.</li>
</ol>
<h3>Realms</h3>
<p>Mortal → Body Refinement → Qi Gathering → Foundation Establishment → Core Formation → Nascent Soul.</p>
`;
  openModal("Walking the Immortal Path", html);
}

// --- SAVE ---
const SAVE_KEY = "immortal_path_save_v1";

function saveGame(state) {
  try {
    const data = {
      day: state.day,
      time: state.time,
      player: state.player,
      world: {
        tiles: state.world.tiles,
        plots: state.world.plots,
        structures: state.world.structures,
        spawn: state.world.spawn,
      },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}
