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
    if (item.decor) {
      const pb = document.createElement("button"); pb.textContent = "Place";
      pb.style.marginLeft = "4px";
      pb.onclick = () => {
        const r = placeDecoration(state, id);
        if (r) pushLog(state, r.msg, r.kind);
        openInventory(state);
      };
      actions.appendChild(pb);
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
    const flavor = t.desc ? `<br/><i style="opacity:0.55">${t.desc}</i>` : "";
    const stats = `sleep heal ×${t.sleepHeal}, +${t.qiRegenBonus.toFixed(1)} qi/sec`;
    row.innerHTML = `<span><b>${t.name}</b> <i style="opacity:0.6">— ${stats}</i>${flavor}</span>`;
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

// --- QUESTS ---
function openQuests(state) {
  const p = state.player;
  if (!p.activeQuests) p.activeQuests = [];
  if (!p.completedQuests) p.completedQuests = [];
  if (!p.questCounters) p.questCounters = {};
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 8px";
  intro.innerHTML = `<i>Visit the elder at the market to take new quests.</i> · Reputation: <b>${p.reputation || 0}</b>`;
  wrap.appendChild(intro);

  const aH = document.createElement("h3"); aH.textContent = "Active"; aH.style.marginTop = "0";
  wrap.appendChild(aH);
  if (!p.activeQuests.length) wrap.appendChild(textRow("(none)"));
  for (const qid of p.activeQuests) {
    const q = QUESTS[qid];
    if (!q) continue;
    const row = document.createElement("div"); row.className = "item-row";
    const progress = questProgressString(p, qid);
    row.innerHTML = `<span><b>${q.name}</b> <i style="opacity:0.6">— ${q.desc}</i><br/><span style="color:#5fae8a">${progress}</span></span>`;
    if (isQuestComplete(p, qid)) {
      const btn = document.createElement("button");
      btn.textContent = "Turn In";
      btn.onclick = () => {
        const r = turnInQuest(state, qid);
        pushLog(state, r.msg, r.kind);
        openQuests(state);
      };
      row.appendChild(btn);
    }
    wrap.appendChild(row);
  }

  const cH = document.createElement("h3"); cH.textContent = "Completed"; cH.style.marginTop = "12px";
  wrap.appendChild(cH);
  if (!p.completedQuests.length) wrap.appendChild(textRow("(none)"));
  for (const qid of p.completedQuests) {
    const q = QUESTS[qid];
    if (!q) continue;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span style="opacity:0.7"><b>${q.name}</b> <i>— ${q.desc}</i></span>`;
    wrap.appendChild(row);
  }

  openModal("Quest Log", wrap);
}

function questProgressString(p, qid) {
  const q = QUESTS[qid];
  if (!q) return "";
  if (q.type === "kill" || q.type === "gather") {
    return `Progress: ${p.questCounters[qid] || 0} / ${q.count}`;
  }
  if (q.type === "kill_set") {
    const sub = p.questCounters[qid] || {};
    return Object.entries(q.target).map(([id, n]) => `${BEASTS[id]?.name || id}: ${sub[id] || 0}/${n}`).join(", ");
  }
  if (q.type === "deliver") {
    return `${ITEMS[q.target].name}: ${p.inventory[q.target] || 0} / ${q.count}`;
  }
  return "";
}

function openTournamentLobby(state) {
  const p = state.player;
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 8px";
  intro.innerHTML = `<i>The arena master sizes you up. "Three rounds. The crowd loves bloodshed. Entry: ${TOURNAMENT.entryFee} stones."</i>`;
  if (p.title) intro.innerHTML += `<br/><b>Current title:</b> ${p.title}`;
  wrap.appendChild(intro);
  const btn = document.createElement("button");
  btn.textContent = `Enter (${TOURNAMENT.entryFee} stones)`;
  btn.style.cssText = "background:#c43a31; color:white; border:none; padding:8px 14px; border-radius:3px; cursor:pointer; font-family:inherit; font-size:14px;";
  btn.disabled = p.money < TOURNAMENT.entryFee || state.tournament || state.dungeon;
  btn.onclick = () => {
    if (p.money < TOURNAMENT.entryFee) return;
    p.money -= TOURNAMENT.entryFee;
    closeModal();
    startTournament(state);
  };
  wrap.appendChild(btn);
  openModal("Sect Tournament", wrap);
}

function openMerchantHub(state) {
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 12px";
  intro.innerHTML = `<i>The merchant gestures at the stalls and the elder's quest board. "What does the day bring?"</i>`;
  wrap.appendChild(intro);
  const row = (label, fn) => {
    const r = document.createElement("div"); r.className = "item-row";
    r.innerHTML = `<span><b>${label}</b></span>`;
    const btn = document.createElement("button");
    btn.textContent = "Open";
    btn.onclick = () => { closeModal(); fn(); };
    r.appendChild(btn);
    wrap.appendChild(r);
  };
  row("Trade — buy seeds, supplies, and tools",      () => openShop(state));
  row("Quest Board — speak to the elder",            () => openQuestBoard(state));
  row("Sect Tournament — fight in the arena",        () => openTournamentLobby(state));
  openModal("Eastern Market", wrap);
}

function openQuestBoard(state) {
  const p = state.player;
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 8px";
  intro.innerHTML = `<i>The village elder strokes his beard. "Tasks for the brave, friend."</i>`;
  wrap.appendChild(intro);
  let any = false;
  for (const qid of QUEST_ORDER) {
    const q = QUESTS[qid];
    if (!q) continue;
    if (p.activeQuests.includes(qid)) continue;
    if (p.completedQuests.includes(qid)) continue;
    if ((q.minRealm ?? 0) > p.realmIndex) continue;
    any = true;
    const row = document.createElement("div"); row.className = "item-row";
    row.innerHTML = `<span><b>${q.name}</b> <i style="opacity:0.6">— ${q.desc}</i></span>`;
    const btn = document.createElement("button");
    btn.textContent = "Accept";
    btn.onclick = () => {
      const r = acceptQuest(state, qid);
      pushLog(state, r.msg, r.kind);
      openQuestBoard(state);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }
  if (!any) wrap.appendChild(textRow("(no new quests for your realm)"));
  openModal("Quest Board", wrap);
}

// --- HEART-MERIDIAN (stat points) ---
function openHeartMeridian(state) {
  const p = state.player;
  if (p.statPoints == null) p.statPoints = 0;
  if (!p.statSpent) p.statSpent = { hp: 0, qi: 0, atk: 0, def: 0 };
  const wrap = document.createElement("div");
  const intro = document.createElement("p");
  intro.style.margin = "0 0 8px";
  intro.innerHTML = `<i>Allocate your inner meridians. Each breakthrough grants 3 points.</i> · Available: <b>${p.statPoints}</b>`;
  wrap.appendChild(intro);

  const opts = [
    { id: "hp",  label: "+5 max HP",   apply: () => { p.bonusHpMax = (p.bonusHpMax || 0) + 5; p.hpMax += 5; p.hp += 5; } },
    { id: "qi",  label: "+3 max Qi",   apply: () => { p.bonusQiMax = (p.bonusQiMax || 0) + 3; p.qiMax += 3; p.qi += 3; } },
    { id: "atk", label: "+1 attack",   apply: () => { p.bonusAtk = (p.bonusAtk || 0) + 1; p.weaponDmg += 1; } },
    { id: "def", label: "+1 defense",  apply: () => { p.bonusDef = (p.bonusDef || 0) + 1; } },
  ];
  for (const o of opts) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `<span><b>${o.label}</b> <i style="opacity:0.6">(spent: ${p.statSpent[o.id]})</i></span>`;
    const btn = document.createElement("button");
    btn.textContent = "Allocate";
    btn.disabled = p.statPoints <= 0;
    btn.onclick = () => {
      if (p.statPoints <= 0) return;
      o.apply();
      p.statPoints--;
      p.statSpent[o.id]++;
      pushLog(state, `Meridians strengthened: ${o.label}.`, "qi");
      openHeartMeridian(state);
    };
    row.appendChild(btn);
    wrap.appendChild(row);
  }

  // Reset
  const totalSpent = Object.values(p.statSpent).reduce((a, b) => a + b, 0);
  if (totalSpent > 0) {
    const resetRow = document.createElement("div");
    resetRow.className = "item-row";
    resetRow.style.marginTop = "12px";
    resetRow.innerHTML = `<span><b>Reset Meridians</b> <i style="opacity:0.6">— costs 1 Qi Recovery Pill, refunds all ${totalSpent} points</i></span>`;
    const btn = document.createElement("button");
    btn.textContent = "Reset";
    btn.disabled = (p.inventory.qi_pill || 0) <= 0;
    btn.onclick = () => {
      if (!takeItem(p, "qi_pill", 1)) return;
      // Reverse all bonuses
      p.hpMax -= (p.bonusHpMax || 0);
      p.hp = Math.min(p.hp, p.hpMax);
      p.qiMax -= (p.bonusQiMax || 0);
      p.qi = Math.min(p.qi, p.qiMax);
      p.weaponDmg -= (p.bonusAtk || 0);
      p.bonusHpMax = 0; p.bonusQiMax = 0; p.bonusAtk = 0; p.bonusDef = 0;
      p.statPoints += totalSpent;
      p.statSpent = { hp: 0, qi: 0, atk: 0, def: 0 };
      pushLog(state, "Meridians cleared. All points refunded.", "qi");
      openHeartMeridian(state);
    };
    resetRow.appendChild(btn);
    wrap.appendChild(resetRow);
  }

  openModal("Heart-Meridian Map", wrap);
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
const SAVE_PREFIX = "immortal_path_save_v2_";
const NUM_SLOTS = 3;
let activeSaveSlot = 1;

function slotKey(slot) { return SAVE_PREFIX + slot; }

function saveGame(state, slot = activeSaveSlot) {
  // Don't autosave inside instanced encounters — would persist arena/dungeon
  // state on top of the real world and lose progress.
  if (state.dungeon || state.tournament || state.interior) return false;
  try {
    const data = {
      day: state.day,
      time: state.time,
      weather: state.weather,
      player: state.player,
      world: {
        tiles: state.world.tiles,
        plots: state.world.plots,
        structures: state.world.structures,
        spawn: state.world.spawn,
      },
      _meta: {
        day: state.day,
        realm: REALMS[state.player.realmIndex].name,
        money: state.player.money,
        savedAt: new Date().toISOString(),
      },
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

function loadGame(slot = activeSaveSlot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function deleteSave(slot) {
  localStorage.removeItem(slotKey(slot));
}

function getSlotMeta(slot) {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data._meta || { day: data.day, realm: REALMS[data.player.realmIndex].name, money: data.player.money };
  } catch (e) {
    return null;
  }
}

function hasSave(slot = activeSaveSlot) {
  return localStorage.getItem(slotKey(slot)) !== null;
}

function setActiveSlot(slot) { activeSaveSlot = slot; }
