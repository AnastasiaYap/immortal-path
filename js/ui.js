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
  p.equipped = p.equipped || { weapon: null, robe: null, accessory: null };
  const wrap = document.createElement("div");

  // -- Equipment row --
  const eH = document.createElement("h3");
  eH.textContent = "Equipment";
  eH.style.marginTop = "0";
  wrap.appendChild(eH);
  for (const slot of ["weapon", "robe", "accessory"]) {
    const id = p.equipped[slot];
    const row = document.createElement("div"); row.className = "item-row";
    if (id) {
      row.innerHTML = `<span><b>${slot[0].toUpperCase() + slot.slice(1)}</b>: ${ITEMS[id].name} <i style="opacity:0.6">— ${ITEMS[id].desc}</i></span>`;
      const btn = document.createElement("button");
      btn.textContent = "Unequip";
      btn.onclick = () => {
        const r = unequipItem(p, slot);
        if (r.msg) pushLog(state, r.msg, "");
        openInventory(state);
      };
      row.appendChild(btn);
    } else {
      row.innerHTML = `<span><b>${slot[0].toUpperCase() + slot.slice(1)}</b>: <i style="opacity:0.6">empty</i></span>`;
    }
    wrap.appendChild(row);
  }

  // -- Seeds --
  const sH = document.createElement("h3");
  sH.textContent = "Seeds"; sH.style.marginTop = "12px";
  wrap.appendChild(sH);
  let any = false;
  for (const id in p.seeds) {
    if ((p.seeds[id] || 0) <= 0) { delete p.seeds[id]; continue; }
    any = true;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${CROPS[id].name} Seed</b> × ${p.seeds[id]} <i style="opacity:0.6">— face a tilled plot, then click Plant</i></span>`;
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

  // -- Items --
  const iH = document.createElement("h3"); iH.textContent = "Items"; iH.style.marginTop = "12px";
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
    if (item.equip) {
      const eb = document.createElement("button"); eb.textContent = "Equip";
      eb.onclick = () => {
        const r = equipItem(p, id);
        if (r.msg) pushLog(state, r.msg, r.ok ? "good" : "bad");
        openInventory(state);
      };
      actions.appendChild(eb);
    }
    if (item.edible || item.qiRestore || item.hpRestore || item.bodyBoost || item.breakthroughBoost || item.staminaRestore) {
      const useBtn = document.createElement("button"); useBtn.textContent = "Use";
      useBtn.style.marginLeft = "4px";
      useBtn.onclick = () => {
        useItem(state, id);
        openInventory(state);
      };
      actions.appendChild(useBtn);
    }
    if (item.useable === "ward") {
      const wb = document.createElement("button"); wb.textContent = "Activate";
      wb.style.marginLeft = "4px";
      wb.onclick = () => {
        if (takeItem(p, id, 1)) {
          p.wardTimer = 18;
          pushLog(state, "Ward talisman activated — beasts move slowly for 18s.", "qi");
          openInventory(state);
        }
      };
      actions.appendChild(wb);
    }
    const nonsellable = new Set(["fire_talisman", "ward_talisman", "purify_talisman", "fishing_rod"]);
    if (item.value > 0 && !nonsellable.has(id)) {
      const sellPrice = Math.floor(item.value * mercantrySellMul(p));
      const sb = document.createElement("button");
      sb.textContent = `Sell (${sellPrice})`;
      sb.style.marginLeft = "4px";
      sb.style.background = "#7a1f1a";
      sb.onclick = () => {
        if (takeItem(p, id, 1)) {
          p.money += sellPrice;
          gainSkill(p, "mercantry", Math.max(1, Math.floor(sellPrice / 4)));
          pushLog(state, `Sold 1 ${item.name} for ${sellPrice} stones.`, "good");
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
  // Cooked food gets a cooking-skill potency multiplier.
  const cookedIds = new Set(["spirit_congee", "fish_broth", "pepper_dumplings", "moon_cake"]);
  const mul = cookedIds.has(id) ? cookingPotency(p) : 1;
  let parts = [];
  if (item.edible) {
    const v = Math.round(item.edible * mul);
    p.hunger = Math.min(p.hungerMax, p.hunger + v);
    parts.push(`+${v} hunger`);
  }
  if (item.qiRestore) {
    const v = Math.round(item.qiRestore * mul);
    p.qi = Math.min(p.qiMax, p.qi + v);
    parts.push(`+${v} qi`);
  }
  if (item.hpRestore) {
    const v = Math.round(item.hpRestore * mul);
    p.hp = Math.min(p.hpMax, p.hp + v);
    parts.push(`+${v} HP`);
  }
  if (item.staminaRestore) {
    const v = Math.round(item.staminaRestore * mul);
    p.stamina = Math.min(p.staminaMax, p.stamina + v);
    parts.push(`+${v} stamina`);
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
  const buyMul = mercantryBuyMul(p);
  const sellMul = mercantrySellMul(p);
  const wrap = document.createElement("div");
  const h = document.createElement("p");
  h.style.margin = "0 0 8px";
  const lvl = skillLv(p, "mercantry");
  const merchantHint = lvl > 0 ? ` · Mercantry lv${lvl}: prices ×${buyMul.toFixed(2)} / sell ×${sellMul.toFixed(2)}` : "";
  h.innerHTML = `<i>The merchant smiles. "Spirit Stones, friend?"</i> · You have <b>${p.money}</b>.${merchantHint}`;
  wrap.appendChild(h);

  for (const offer of SHOP_BUY) {
    if (offer.unlockRealm && p.realmIndex < offer.unlockRealm) continue;
    const isTool = offer.give && offer.give._grant === "fishing_rod";
    if (isTool && p.hasFishingRod) continue;
    const price = Math.max(1, Math.floor(offer.price * buyMul));
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${offer.label}</b></span>`;
    const btn = document.createElement("button");
    btn.textContent = `Buy (${price})`;
    btn.disabled = p.money < price;
    btn.onclick = () => {
      if (p.money < price) return;
      p.money -= price;
      for (const k in offer.give) {
        if (k === "_seed") {
          p.seeds[offer.give._seed] = (p.seeds[offer.give._seed] || 0) + 1;
        } else if (k === "_grant") {
          if (offer.give._grant === "fishing_rod") p.hasFishingRod = true;
        } else {
          addItem(p, k, offer.give[k]);
        }
      }
      gainSkill(p, "mercantry", Math.max(1, Math.floor(price / 8)));
      pushLog(state, `Purchased ${offer.label}.`, "good");
      openShop(state);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }

  const sH = document.createElement("h3"); sH.textContent = "Sell Produce"; sH.style.marginTop = "12px";
  wrap.appendChild(sH);
  let total = 0;
  const nonsellable = new Set(["fire_talisman", "ward_talisman", "purify_talisman", "fishing_rod"]);
  for (const id in p.inventory) {
    const item = ITEMS[id];
    if (!item.value || nonsellable.has(id)) continue;
    const qty = p.inventory[id];
    if (qty <= 0) continue;
    const unit = Math.floor(item.value * sellMul);
    const tot = unit * qty;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${item.name}</b> × ${qty} @ ${unit}</span>`;
    const btn = document.createElement("button");
    btn.textContent = `Sell all (+${tot})`;
    btn.onclick = () => {
      delete p.inventory[id];
      p.money += tot;
      gainSkill(p, "mercantry", Math.max(1, Math.floor(tot / 8)));
      pushLog(state, `Sold ${qty} ${item.name} for ${tot} stones.`, "good");
      openShop(state);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
    total += tot;
  }
  if (total === 0) wrap.appendChild(textRow("(nothing sellable in pouch)"));

  openModal("Eastern Market", wrap);
}

// --- CRAFT ---
const STATION_INFO = {
  desk:    { title: "Talisman Inscription", flavor: "The talisman desk hums with latent qi. Brush and ink await.", skill: "talisman" },
  furnace: { title: "Pill Refinement",      flavor: "The pill furnace glows. Combine herbs and beast cores.",       skill: "alchemy" },
  stove:   { title: "Cooking Pot",           flavor: "The clay stove crackles. Produce becomes restorative meals.",  skill: "cooking" },
  forge:   { title: "Forge",                 flavor: "Bellows hiss. Iron and jade yield to hammer and qi.",          skill: "smithing" },
  loom:    { title: "Spirit Loom",           flavor: "Warp threads taut. Spin silk and jade into protective robes.", skill: "tailoring" },
};

function openCraft(state, station) {
  const p = state.player;
  const info = STATION_INFO[station] || { title: "Workstation", flavor: "" };
  const wrap = document.createElement("div");
  const h = document.createElement("p");
  h.style.margin = "0 0 8px";
  const lvl = info.skill ? skillLv(p, info.skill) : 0;
  const lvlBit = info.skill ? ` · ${SKILLS[info.skill].name} lv${lvl}` : "";
  h.innerHTML = `<i>${info.flavor}</i>${lvlBit}`;
  wrap.appendChild(h);

  let any = false;
  for (const recipeId in RECIPES) {
    const r = RECIPES[recipeId];
    if (r.station !== station) continue;
    if (r.unlockRealm && p.realmIndex < r.unlockRealm) continue;
    any = true;
    const row = document.createElement("div"); row.className = "item-row";
    const inputs = Object.entries(r.inputs)
      .map(([k, v]) => `${ITEMS[k].name} ×${v}`).join(", ");
    const qiBit = r.qiCost > 0 ? `, ${r.qiCost} qi` : "";
    row.innerHTML = `<span><b>${r.label}</b> <i style="opacity:0.6">— needs ${inputs}${qiBit}</i></span>`;
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
  if (!any) wrap.appendChild(textRow("(no recipes available at your realm yet)"));
  openModal(info.title, wrap);
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

// --- SKILLS ---
function openSkills(state) {
  const p = state.player;
  if (!p.skills) p.skills = makeFreshSkillBlock();
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 8px";
  intro.innerHTML = `<i>Each skill levels from doing the work, and grants its own passive perks. Materials and recipes cross over — Farming feeds Cooking and Alchemy, Smithing buffs Combat, Tailoring buffs Cultivation, Mercantry sweetens every coin.</i>`;
  wrap.appendChild(intro);

  for (const id of SKILL_ORDER) {
    const s = p.skills[id] || { xp: 0, level: 0 };
    const def = SKILLS[id];
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.flexDirection = "column";
    row.style.alignItems = "stretch";

    const head = document.createElement("div");
    head.style.display = "flex";
    head.style.justifyContent = "space-between";
    head.innerHTML = `<span><b>${def.name}</b> <span style="opacity:0.6">— lv ${s.level}</span></span><span style="opacity:0.6">${Math.floor(s.xp)} / ${xpForLevel(s.level + 1)} XP</span>`;
    row.appendChild(head);

    // progress bar
    const bar = document.createElement("div");
    bar.style.cssText = "height:6px; background:#c9b994; border:1px solid #8a7a55; border-radius:2px; margin:4px 0; position:relative; overflow:hidden;";
    const prevReq = xpForLevel(s.level);
    const nextReq = xpForLevel(s.level + 1);
    const pct = nextReq > prevReq ? Math.max(0, Math.min(1, (s.xp - prevReq) / (nextReq - prevReq))) : 0;
    const fill = document.createElement("div");
    fill.style.cssText = `height:100%; width:${(pct * 100).toFixed(1)}%; background:linear-gradient(90deg,#5fae8a,#9bd185);`;
    bar.appendChild(fill);
    row.appendChild(bar);

    const desc = document.createElement("div");
    desc.style.cssText = "font-size:12px; opacity:0.8;";
    desc.innerHTML = `${def.desc}<br/>${skillPerkLine(p, id)}`;
    row.appendChild(desc);

    wrap.appendChild(row);
  }
  openModal("Skills & Cultivation Arts", wrap);
}

function skillPerkLine(p, id) {
  const lvl = skillLv(p, id);
  switch (id) {
    case "farming":     return `<b>Now:</b> +${(farmingYieldMul(p)*100-100).toFixed(0)}% yield, ${(farmingDoubleChance(p)*100).toFixed(0)}% double-harvest, ${((1-farmingStaminaMul(p))*100).toFixed(0)}% less stamina cost.`;
    case "foraging":    return `<b>Now:</b> ${(foragingDoubleChance(p)*100).toFixed(0)}% double-pick chance.`;
    case "cooking":     return `<b>Now:</b> meals are ${(cookingPotency(p)*100-100).toFixed(0)}% more potent, ${(cookingDoubleChance(p)*100).toFixed(0)}% double-cook.`;
    case "fishing":     return `<b>Now:</b> +${lvl} luck (rarer fish unlock at higher levels), bites come ${((1-fishingTimeMul(p))*100).toFixed(0)}% sooner.`;
    case "combat":      return `<b>Now:</b> +${combatDmgBonus(p)} sword damage.`;
    case "cultivation": return `<b>Now:</b> +${(cultivationGainMul(p)*100-100).toFixed(0)}% qi/cult gain, +${cultivationRegenBonus(p).toFixed(2)} qi/sec passive.`;
    case "alchemy":     return `<b>Now:</b> ${(alchemyDoubleChance(p)*100).toFixed(0)}% double-pill, ${(alchemyRefundChance(p)*100).toFixed(0)}% material refund.`;
    case "talisman":    return `<b>Now:</b> ${(talismanDoubleChance(p)*100).toFixed(0)}% double-talisman.`;
    case "smithing":    return `<b>Now:</b> +${smithingDmgBonus(p)} damage on forged weapons, ${(smithingDoubleChance(p)*100).toFixed(0)}% double-forge, better mining yields.`;
    case "tailoring":   return `<b>Now:</b> +${tailoringDefBonus(p)} defense on woven robes.`;
    case "mercantry":   return `<b>Now:</b> buy at ×${mercantryBuyMul(p).toFixed(2)}, sell at ×${mercantrySellMul(p).toFixed(2)}.`;
    default: return "";
  }
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
  <li><b>I</b> — inventory & equipment · <b>K</b> — skills · <b>C</b> — craft (near desk/furnace/stove/forge/loom) · <b>B</b> — build (anywhere)</li>
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
<h3>Beasts of the Mountain</h3>
<p>Each day the wild grows hungrier. New foes appear as your dao deepens:</p>
<ul>
  <li><b>Spirit Rabbit</b>, <b>Iron Tusk Boar</b> — early game.</li>
  <li><b>Hungry Ghost</b> (gui) — drains your qi on contact.</li>
  <li><b>Frost Spirit Wolf</b> — fast, hunts in daylight.</li>
  <li><b>Jiangshi</b> — hopping vampire, slow but armored.</li>
  <li><b>Two-tail Fox Spirit</b> (huli jing) — quick and bewitching. Weak to <b>Purification Talismans</b>.</li>
  <li><b>Nine-tail Fox</b>, <b>Qilin</b>, <b>Young Dragon</b> — boss-tier. Their drops feed the highest pills.</li>
</ul>
<p>All beasts grow stronger every day — even the rabbits.</p>
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
