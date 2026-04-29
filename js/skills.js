// Skill system: XP, levels, passive perks, equipment helpers.

const SKILLS = {
  farming:     { name: "Farming",       desc: "Tilling, watering, harvesting. Levels boost yield and growth speed." },
  foraging:    { name: "Foraging",      desc: "Picking herbs in the wild. Levels grant double-pick chance." },
  cooking:     { name: "Cooking",       desc: "Refine produce and fish into restorative meals at the stove." },
  fishing:     { name: "Fishing",       desc: "Cast at the pond. Higher levels lure rarer spirit fish." },
  combat:      { name: "Sword Mastery", desc: "Each level adds a flat point to your melee damage." },
  cultivation: { name: "Cultivation",   desc: "Meditation discipline. Levels accelerate qi gathering." },
  alchemy:     { name: "Alchemy",       desc: "Pill refinement. Levels grant ingredient-refund and double-craft chances." },
  talisman:    { name: "Talisman",      desc: "Talisman inscription. Levels grant double-craft chance." },
  smithing:    { name: "Smithing",      desc: "Mine ore and forge weapons + accessories. Levels add flat damage to forged blades." },
  tailoring:   { name: "Tailoring",     desc: "Spin spirit silk into robes. Levels grant flat defense." },
  mercantry:   { name: "Mercantry",     desc: "Trading at the market. Levels lower buy and raise sell prices." },
};

const SKILL_ORDER = [
  "farming", "foraging", "cooking", "fishing",
  "combat", "cultivation", "alchemy", "talisman",
  "smithing", "tailoring", "mercantry",
];

// Cumulative XP needed to reach a given level.
function xpForLevel(level) {
  return Math.floor(40 * Math.pow(level, 1.7));
}

function xpToNext(skill) {
  return Math.max(0, xpForLevel(skill.level + 1) - skill.xp);
}

function gainSkill(player, id, amount) {
  if (!SKILLS[id]) return;
  if (!player.skills) player.skills = makeFreshSkillBlock();
  if (!player.skills[id]) player.skills[id] = { xp: 0, level: 0 };
  const s = player.skills[id];
  s.xp += amount;
  while (s.level < 99 && s.xp >= xpForLevel(s.level + 1)) {
    s.level++;
    if (window.GAME && window.GAME.logQueue) {
      window.GAME.logQueue.push({ msg: `${SKILLS[id].name} reached level ${s.level}.`, kind: "qi" });
    }
  }
}

function makeFreshSkillBlock() {
  const out = {};
  for (const id of SKILL_ORDER) out[id] = { xp: 0, level: 0 };
  return out;
}

// --- Skill perks (bonuses derived from level) -----------------------------

function skillLv(p, id) { return (p.skills && p.skills[id]) ? p.skills[id].level : 0; }

function farmingYieldMul(p)      { return 1 + skillLv(p, "farming") * 0.05; }            // +5%/lv produce
function farmingDoubleChance(p)  { return Math.min(0.45, skillLv(p, "farming") * 0.025); }
function farmingStaminaMul(p)    { return Math.max(0.5, 1 - skillLv(p, "farming") * 0.04); }
function foragingDoubleChance(p) { return Math.min(0.5, skillLv(p, "foraging") * 0.04); }
function cookingPotency(p)       { return 1 + skillLv(p, "cooking") * 0.05; }            // restored amounts
function cookingDoubleChance(p)  { return Math.min(0.4, skillLv(p, "cooking") * 0.03); }
function fishingLuck(p)          { return skillLv(p, "fishing"); }
function fishingTimeMul(p)       { return Math.max(0.4, 1 - skillLv(p, "fishing") * 0.04); }
function combatDmgBonus(p)       { return skillLv(p, "combat"); }                        // +1 dmg/lv
function cultivationGainMul(p)   { return 1 + skillLv(p, "cultivation") * 0.04; }
function cultivationRegenBonus(p){ return skillLv(p, "cultivation") * 0.05; }            // qi/sec passive
function alchemyDoubleChance(p)  { return Math.min(0.35, skillLv(p, "alchemy") * 0.03); }
function alchemyRefundChance(p)  { return Math.min(0.3, skillLv(p, "alchemy") * 0.03); }
function talismanDoubleChance(p) { return Math.min(0.4, skillLv(p, "talisman") * 0.04); }
function smithingDmgBonus(p)     { return Math.floor(skillLv(p, "smithing") * 0.5); }
function smithingDoubleChance(p) { return Math.min(0.3, skillLv(p, "smithing") * 0.025); }
function tailoringDefBonus(p)    { return Math.floor(skillLv(p, "tailoring") * 0.4); }
function mercantryBuyMul(p)      { return Math.max(0.5, 1 - skillLv(p, "mercantry") * 0.02); }
function mercantrySellMul(p)     { return 1 + skillLv(p, "mercantry") * 0.03; }

// --- Equipment ------------------------------------------------------------

// Equipment items live in the regular ITEMS table with `equip: "weapon" | "robe" | "accessory"`.
// We mutate player stats on equip/unequip so that the rest of the game (regen
// caps, attack damage, beast defense) keeps using its existing helpers.

function equipItem(player, id) {
  const item = ITEMS[id];
  if (!item || !item.equip) return { ok: false, msg: "Not equippable." };
  if ((player.inventory[id] || 0) <= 0) return { ok: false, msg: "Not in pouch." };
  const slot = item.equip;
  // unequip whatever is in the slot
  if (player.equipped && player.equipped[slot]) unequipItem(player, slot);
  // remove one from inventory
  player.inventory[id]--;
  if (player.inventory[id] <= 0) delete player.inventory[id];
  player.equipped = player.equipped || { weapon: null, robe: null, accessory: null };
  player.equipped[slot] = id;
  applyEquipmentBonuses(player, item, +1);
  return { ok: true, msg: `Equipped ${item.name}.` };
}

function unequipItem(player, slot) {
  player.equipped = player.equipped || { weapon: null, robe: null, accessory: null };
  const id = player.equipped[slot];
  if (!id) return { ok: false };
  const item = ITEMS[id];
  applyEquipmentBonuses(player, item, -1);
  player.equipped[slot] = null;
  player.inventory[id] = (player.inventory[id] || 0) + 1;
  return { ok: true, msg: `Unequipped ${item.name}.` };
}

function applyEquipmentBonuses(player, item, sign) {
  if (item.dmg)         player.weaponDmg = (player.weaponDmg || 0) + sign * item.dmg;
  if (item.def)         player.bonusDef  = (player.bonusDef  || 0) + sign * item.def;
  if (item.qiRegen)     player.bonusQiRegen = (player.bonusQiRegen || 0) + sign * item.qiRegen;
  if (item.hpMaxBonus) {
    player.hpMax += sign * item.hpMaxBonus;
    if (sign < 0) player.hp = Math.min(player.hp, player.hpMax);
  }
  if (item.qiMaxBonus) {
    player.qiMax += sign * item.qiMaxBonus;
    if (sign < 0) player.qi = Math.min(player.qi, player.qiMax);
  }
}
