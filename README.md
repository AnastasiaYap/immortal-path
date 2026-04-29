# Immortal Path — A Xianxia Life Sim

A top-down chibi-style 2D life simulator set in a xianxia-flavored mountain
village. Start as a mortal child: till the soil, sell rice at the market,
forage spirit herbs, hunt low spirit beasts, meditate to gather qi, refine
pills, inscribe talismans, and slowly walk the path to immortality.

Pure HTML5 Canvas + vanilla JavaScript — no build step, no dependencies, no
external assets. All sprites are drawn procedurally to offscreen canvases at
boot.

## Play

```sh
open index.html         # macOS
# or
python3 -m http.server  # then visit http://localhost:8000
```

Any modern browser works.

## Controls

| Key | Action |
| --- | --- |
| **WASD** / arrows | Move |
| **E** | Interact (till, plant, water, harvest, forage, fish, mine, NPCs, signs, structures) |
| **F** | Melee attack |
| **Q** | Throw fire / purification talisman |
| **M** | Meditate (must stand on the meditation mat) |
| **R** | Attempt breakthrough (when cultivation full + qi >= 90%) |
| **I** | Inventory, seed pouch & equipment slots |
| **K** | Skills panel — see levels and active perks |
| **C** | Craft (near desk, furnace, stove, forge, or loom) |
| **B** | Build / upgrade |
| **1** | Sleep (must be near the bed inside the house) |
| **Tab** | Help |

## The Loop

1. **Farm** — till dirt with E, plant seeds (open pouch on a tilled plot),
   water at the well, harvest mature crops.
2. **Sell** — head east to the merchant. Sell produce, buy seeds, paper, ink,
   meals.
3. **Forage** — glowing spirit herbs in the forest are pill ingredients.
4. **Hunt** — slay spirit rabbits and iron-tusk boars first; later, hungry
   ghosts, jiangshi (hopping vampires), fox spirits, and finally boss-tier
   nine-tail foxes, qilin, and young dragons descend the mountain. **Every
   beast scales with the day** — rabbits on day 50 are not the same rabbits
   you fought on day 1. Bosses drop materials for the highest pills.
5. **Cultivate** — sit on the meditation mat (M). Qi rises, cultivation
   accumulates. When cultivation hits the realm threshold, press R to attempt
   a **breakthrough** into the next realm.
6. **Craft** — once you have built a Talisman Desk and a Pill Furnace, you
   can inscribe Fire/Ward Talismans and refine Qi/Body/Foundation Pills.
7. **Build** — upgrade your hut to a Timber House and then a Spirit Courtyard
   for better qi regen and bigger sleep restoration.

## Skills

Eleven skills level from doing the work, each granting a transparent passive
perk. Press **K** to see them.

| Skill | Source of XP | Perk per level (selected) |
| --- | --- | --- |
| Farming | till / water / harvest | +5% yield, double-harvest chance, less stamina cost |
| Foraging | picking spirit herbs | double-pick chance |
| Cooking | crafting at the **stove** | meals more potent, double-cook chance |
| Fishing | reeling fish at the pond | +1 luck, faster bites, rarer fish |
| Sword Mastery | melee attacks and kills | +1 sword damage |
| Cultivation | meditating, breakthroughs | +4% qi/cult gain, +qi/sec passive |
| Alchemy | crafting at the **furnace** | double-pill chance, ingredient refund |
| Talisman | crafting at the **desk** | double-talisman chance |
| Smithing | mining ore + crafting at the **forge** | flat damage on forged weapons, better ore yields |
| Tailoring | crafting at the **loom** | flat defense on woven robes |
| Mercantry | every buy/sell at the market | lower buy prices, higher sell prices |

**Synergies are material-based**: Farming feeds Cooking and Alchemy, Fishing
feeds Cooking, Smithing buffs Combat, Tailoring buffs Cultivation (qi regen),
Mercantry sweetens every coin.

## New Activities

- **Fishing** — buy a Bamboo Fishing Rod at the market (100 stones), face a
  water tile, press **E** to cast. Wait for the bobber to dance, then press
  **E** again within ~0.85s to reel in. Higher Fishing skill bites faster
  and unlocks Spirit Carp, Koi, and the night-only Moon Carp.
- **Mining** — face a stone tile in the south-east outcrop, press **E** to
  swing your hoe at the rock. Drops Iron Ore and (rarely) Jade Shard. Levels
  Smithing.
- **Cooking** at the Clay Stove turns rice/grain/peppers/fish into Spirit
  Congee, Fish Broth, Pepper Dumplings, and the prized Moon Cake.
- **Smithing** at the Forge produces the Iron Sword, Spirit Sword, Jade
  Pendant, and Spirit Ring (equippable weapons + accessories).
- **Tailoring** at the Spirit Loom weaves Linen / Spirit / Jade Robes
  (defense + qi regen + max HP bonuses).

## Equipment

Three slots — **weapon**, **robe**, **accessory** — managed from the
inventory pouch. Equipping an item mutates your stats: weaponDmg goes up,
robes raise defense and qi-regen, accessories raise max-HP/qi.

## Realms

Mortal → Body Refinement → Qi Gathering → Foundation Establishment →
Core Formation → Nascent Soul.

Each realm raises HP, Qi, attack, and defense — and unlocks new seeds, beast
spawns, and recipes.

## Bestiary

Beasts gate on **realm tier** AND **day count** — even if you linger in a low
realm, the wild keeps escalating around you, and a tier-weighted spawn pool
phases out the cute foes as new horrors arrive.

| Tier | Beast | Notes |
| --- | --- | --- |
| 1 | Spirit Rabbit | Day 1+. Easy XP, drops hides. |
| 2 | Iron Tusk Boar | Day 3+. Tanky, drops cores. |
| 2 | **Hungry Ghost** (gui) | Day 6+. Drains your qi on hit. Drops ghost essence. |
| 3 | Frost Spirit Wolf | Day 10+. Fast, hunts in daylight. |
| 3 | **Jiangshi** | Day 14+. Hopping vampire, slow but armored. Drops jade corpse seal. |
| 4 | **Two-tail Fox Spirit** (huli jing) | Day 20+. Fast and bewitching. Weak to **Purification Talismans** (2× damage). Drops fox pearl. |
| 5 | **Nine-tail Fox** *(boss)* | Day 35+. Aura, glowing eyes, fans of fire-tipped tails. |
| 5 | **Qilin** *(boss)* | Day 30+. Jade-scaled, golden-maned, single-horned. |
| 6 | **Young Dragon** *(boss)* | Day 50+. Coiled, scaled, breathing flame. |


## Save System

Auto-saves every 30 seconds and on tab close, to browser `localStorage`.

## Project Layout

```
index.html
css/style.css
js/
  sprites.js     procedural chibi sprite generator (tiles, beasts, structures)
  data.js        items, crops, recipes, realms, beasts, shop, build tiers, fish table
  skills.js      skill definitions, XP curve, level perks, equipment helpers
  world.js       map gen, tile rendering, plot state, structure layout
  entities.js    player / beast / projectile / fx structs and drawing
  systems.js     time, needs, AI, combat, farming, fishing, mining, cultivation, crafting
  ui.js          HUD, modals (inventory+equipment, skills, shop, craft, build, help), save/load
  game.js        main loop, input, interaction, scene composition
```

## License

MIT.
