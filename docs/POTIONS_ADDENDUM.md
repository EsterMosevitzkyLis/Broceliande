# Potions Addendum

Adds potions: consumables the Druid carries on his belt and drinks (or throws) in battle.
"Potion" covers every consumable here, flasks included. This addendum overrides earlier
documents where they differ. Built in five phases; **do one phase at a time and stop after
each**, as CLAUDE.md says.

Balancing values live in a new `potions` data tab (section 9). Every number below that also
appears there is a starting guess: read it from the data, never hard-code it.

---

## 1. Potions and tiers

- 18 potions, each in four tiers: **Faint, Potent, Sublime, Sovereign** (rank 1-4).
  One row per potion per tier in the `potions` tab.
- A potion-tier is the unit everywhere: inventory, belt slots, recipes, trader stock.
  Its display name is "<Tier> <Potion>", e.g. "Faint Potion of Healing".
- `use` column: `drink` (self, any time), `prepOnly` (self, Prep only), `throw` (targeted),
  `auto` (never clicked: triggers by itself).
- Tier look: Faint small clear vial, Potent round green flask, Sublime tall blue bottle,
  Sovereign ornate gold decanter. Each potion's liquid colour tells potions apart. Drawn in
  code like every other visual.
- **Swiftfoot Draught is not in this addendum.** The Druid stands at his home position in
  Combat, so a move-speed potion has nothing to do. (Designer to confirm or rework.)

## 2. Owning potions: inventory

- The run holds a **potion inventory**: potion-tier -> count. Inventory stacks; the belt
  does not.
- Sources: bought from Traders (section 7), crafted at the Tinker (section 7), debug key.
- Potions survive between battles. On Defeat they follow whatever the run already does with
  owned things on Defeat (check the existing rules and say what you did).

## 3. The belt

### 3.1 Slots
- Belt slots hold **one potion each, no stacks**.
- Before the first potion is ever obtained in a run, there is no belt UI at all.
- Once the run owns its first potion: with no equipment belt equipped, the Druid has **2**
  slots. With an equipment belt equipped, its **rolled slot count** replaces that.
- Every equipment belt rolls its potion slot count **once, when the run gets it** (found,
  bought or crafted), and keeps it for the run. Odds by item rarity:

  | Rarity | Slots |
  |---|---|
  | 0 Common | 2 |
  | 1 Uncommon | 2 (80%) or 3 (20%) |
  | 2 Rare | 2 (50%) or 3 (50%) |
  | 3 Very Rare | 3 (80%) or 4 (20%) |

  The odds live in data (globals or a small tab), not code. 5 slots is reserved for future
  belts: the UI must support 5.
- The belt's tooltip (equipment panel, Tinker, Trader) shows its potion slots, e.g.
  "Potion slots: 3". Before it is rolled (a Trader's or Tinker's offer) show the odds.
- Changing to a belt with fewer slots: potions in slots that no longer exist go back to the
  inventory, last slots first.
- Uses the seeded RNG.

### 3.2 Belt and inventory UI (map screen and other between-battle screens)
- The belt is drawn on the belt area of the Druid image in the equipment panel, with one
  socket per slot.
- Clicking the belt opens the **potion inventory panel** under it: every owned potion-tier
  with its count, its icon, and a tooltip (name, tier, what it does with this tier's
  numbers).
- Left-click a potion in the inventory: equip it into the first free slot (nothing if full).
  Left-click a potion in a slot: unequip it back to the inventory.
- Right-click a potion (inventory or slot): small menu with **Equip / Unequip** (whichever
  applies) and **Consume**. Consume outside battle only works for potions whose effect is
  instant and makes sense there: **Healing** only. Others show Consume greyed with the
  reason in its tooltip.
- Drag and drop: not in this addendum.

### 3.3 Belt UI in battle (the wilds screen)
- Shown bottom right, one socket per slot, each with its potion icon and the hotkey number.
  It must not cover build spots or the level name label (same checks as other HUD pieces).
- Click a socket or press **1-5** to use that slot.
- A used potion leaves its slot empty for the rest of the battle. The inventory is not used
  to refill it mid-battle.
- Greyed sockets: on the shared cooldown (show a cooldown sweep), a `prepOnly` potion in
  Combat, or any potion while the game state does not allow it (Ending, Victory, Defeat).

## 4. Using potions

### 4.1 Shared cooldown
- After any potion is used, no other can be used for `POTION_COOLDOWN` s (data, start 4).
- Counts in Combat time only (fixed timestep, game speed applies). There is no cooldown in
  Prep. `auto` potions ignore it and don't start it.

### 4.2 Drinking in Prep
- Instant effects happen at once (Healing, Foresight's extra steps).
- Timed effects are queued and **start their timer when Combat starts**.

### 4.3 Repeats and stacking
- Using a potion whose effect is already active **restarts its timer** and keeps the higher
  tier's numbers; it never stacks with itself.
- Effects of different potions stack.

### 4.4 Throwing
- Click a `throw` potion: the game enters **aiming**: a ring of the flask's radius follows
  the cursor. Click anywhere on the battlefield to throw; **no range limit**. Right-click or
  Esc cancels and the potion stays in its slot.
- The flask flies from the Druid to the spot as a short arc (visual only; the effect lands
  when it arrives) and breaks there.
- Aiming does not pause the game.

## 5. Effects

Amount, duration and radius come from the potion-tier's row. Durations in s of Combat time.

| Potion | Effect |
|---|---|
| Healing | Restores `amount` HP at once, up to max HP. |
| Regeneration | Restores `amount` HP per s for `duration` s (ticks once a second, like venom). |
| Cleansing | Removes the Druid's venom at once, and ignores new venom for `amount` s. |
| Phoenix (auto) | When the Druid's HP would reach 0 in Combat, the first Phoenix in a belt slot is used instead: he stays at `amount` HP, is immune to damage for 2 s, and a burst of flame shows it. One per battle. |
| Ward of Bark | `druid.damageTakenMult` x (1 - amount/100) for `duration` s. 100 = immune. |
| Ward of Venom | `druid.venomTakenMult` x (1 - amount/100) for `duration` s. 100 = immune. |
| Fury | The Druid's strike damage x `amount` for `duration` s. |
| Quickening | The Druid's strike interval / `amount` for `duration` s. |
| Foresight (prepOnly) | Adds `amount` steps to this Prep's step budget. |
| Mire Aura | Every enemy within `radius` of the Druid is Slowed by `amount` % while inside, for `duration` s. |
| Rootgrip Aura | Every 4 s, every enemy within `radius` is rooted for `amount` s, for `duration` s. |
| Bewildering Aura | An enemy entering `radius` is Confused for `amount` s; each enemy at most once per 6 s. Lasts `duration` s. |
| Thorn Aura | Every enemy within `radius` takes `amount` damage per s for `duration` s. |
| Burrowcall | Squirrels summoned while it lasts are **Elder Squirrels**: `amount` % faster, larger, with a visibly different look. Lasts `duration` s; Elder Squirrels keep their bonus until they expire. |
| Firebomb | A patch of fire of `radius` for `duration` s. Enemies inside burn: `amount` damage per s. |
| Acid | Enemies in `radius` when it breaks are Corroded (existing status) at x(1 + amount/100) damage taken for `duration` s. |
| Sporecap | A spore cloud of `radius` for `duration` s; enemies inside are Confused for `amount` s (refreshing while inside). |
| Tanglevine | Enemies in `radius` when it breaks are rooted for `amount` s. Lasts `duration` = vine visual. |

Rules for all of them:
- Self effects are **timed stat modifiers** where a stat exists (stats.js / stats tab). Add
  stats that are missing (e.g. `druid.strikeDamageMult`, `druid.strikeIntervalMult`)
  rather than special cases.
- **Rooted** = Slowed to 0 (reuse applySlow; slowResist still applies). **Confused** is a new
  enemy status: the enemy turns and walks back along its lane at its normal speed, stops
  attacking, then resumes. Bosses ignore Confused and Root.
- Damage from potions goes through damageEnemy with sources `potion:<id>` so damageStats
  show it. Kills and drops work as usual.
- Auras are drawn as a soft ring round the Druid in the potion's colour, fading in the last
  3 s. Active self effects show as small icons with a timer by the HUD HP bar.
- All effects end when the battle ends.

## 6. HP carries over (phase 2)

- The Druid's HP no longer resets to max between battles. It carries over in the run.
- Before each battle starts, he regains `HP_BETWEEN_BATTLES_PCT` of his max HP (data, start
  10%), up to max.
- Healing potions can be consumed on the map screen (section 3.2).
- No safety net: a run can spiral down. That's intended; balancing handles it.
- Any existing full-heal moments (villages, rests, region changes) keep working. List the ones
  you find and what they do now.

## 7. Getting potions (phase 2)

- **Traders** sell potions (Faint and Potent only) and potion **recipes**. Reuse the
  existing stock system: add potion rows to the trader tables the same way item and pattern
  rarities work, with potion tier in place of rarity. Each trader profile decides whether it
  sells potions.
- **Recipes** are patterns: a potion-tier's recipe is learned once and then crafted at the
  Tinker for its cost columns, as many times as the player can pay. `patternWeight` and
  `patternPrice` work as they do for items. Sovereign recipes have weight 0: never in trader
  stock, found only (hidden finds or boss loot; propose which fits the existing systems).
- **Faint Potion of Healing's recipe is known from the start of every run.**
- The Tinker's book gets a Potions section after the items.

## 8. Phases

1. **Belt, inventory and Healing.** potions data tab (all 72 rows), belt slots and rolls,
   inventory panel, battle belt UI, hotkeys, shared cooldown, Prep rules, Healing potion.
   A debug key that adds one of each Faint potion so it can be tested. Only Healing does
   anything yet; the others can sit in slots, greyed, "not yet".
2. **HP carry-over and getting potions** (sections 6 and 7).
3. **Self potions:** Regeneration, Cleansing, Phoenix, both Wards, Fury, Quickening,
   Foresight, Burrowcall, plus active-effect icons.
4. **Auras:** Mire, Rootgrip, Bewildering, Thorn, plus the Confused status.
5. **Thrown flasks:** aiming, the throw, Firebomb, Acid, Sporecap, Tanglevine.

## 9. Data

New tab `potions`, one row per potion-tier. `data/potions.csv` starts as below.
`recipes`-style cost columns; add `cost_scales` (Lizard Scales) since some recipes need it.
New globals: `POTION_COOLDOWN` (4), `HP_BETWEEN_BATTLES_PCT` (0.1), and the belt slot odds.
Tell the designer exactly which tabs, columns and rows to add to the Google Sheet.

```csv
id,potion,tier,rank,category,use,amount,unit,duration,radius,price,cost_pits,cost_reeds,cost_feathers,cost_boughs,cost_shells,cost_peat,cost_scales,patternWeight,patternPrice,notes
healing,"Potion of Healing",faint,1,restoration,drink,20,"HP restored at once",,,30,2,1,,,,,,3,45,TUNING - first pass
healing,"Potion of Healing",potent,2,restoration,drink,45,"HP restored at once",,,75,4,2,,,,,,3,113,
healing,"Potion of Healing",sublime,3,restoration,drink,80,"HP restored at once",,,180,8,4,,,,,,2,270,
healing,"Potion of Healing",sovereign,4,restoration,drink,140,"HP restored at once",,,450,16,8,,,,,,0,675,
regeneration,"Draught of Regeneration",faint,1,restoration,drink,1.5,"HP per s",15,,25,,1,,2,,,,3,38,
regeneration,"Draught of Regeneration",potent,2,restoration,drink,3,"HP per s",18,,63,,2,,4,,,,3,95,
regeneration,"Draught of Regeneration",sublime,3,restoration,drink,5,"HP per s",20,,150,,4,,8,,,,2,225,
regeneration,"Draught of Regeneration",sovereign,4,restoration,drink,8,"HP per s",22,,375,,8,,16,,,,0,563,
cleansing,"Cleansing Tonic",faint,1,restoration,drink,0,"s of venom immunity after cleansing",,,25,,2,,,1,,,3,38,
cleansing,"Cleansing Tonic",potent,2,restoration,drink,3,"s of venom immunity after cleansing",,,63,,4,,,2,,,3,95,
cleansing,"Cleansing Tonic",sublime,3,restoration,drink,6,"s of venom immunity after cleansing",,,150,,8,,,4,,,2,225,
cleansing,"Cleansing Tonic",sovereign,4,restoration,drink,10,"s of venom immunity after cleansing",,,375,,16,,,8,,,0,563,
phoenix,"Phoenix Draught",faint,1,restoration,auto,20,"HP on revive",,,120,,,3,,,2,1,3,180,
phoenix,"Phoenix Draught",potent,2,restoration,auto,40,"HP on revive",,,300,,,6,,,4,2,3,450,
phoenix,"Phoenix Draught",sublime,3,restoration,auto,70,"HP on revive",,,720,,,12,,,8,4,2,1080,
phoenix,"Phoenix Draught",sovereign,4,restoration,auto,120,"HP on revive",,,1800,,,24,,,16,8,0,2700,
wardBark,"Ward of Bark",faint,1,protection,drink,20,"percent less damage taken",20,,25,,,,2,1,,,3,38,
wardBark,"Ward of Bark",potent,2,protection,drink,35,"percent less damage taken",25,,63,,,,4,2,,,3,95,
wardBark,"Ward of Bark",sublime,3,protection,drink,50,"percent less damage taken",30,,150,,,,8,4,,,2,225,
wardBark,"Ward of Bark",sovereign,4,protection,drink,100,"percent less damage taken",12,,375,,,,16,8,,,0,563,
wardVenom,"Ward of Venom",faint,1,protection,drink,20,"percent less venom damage taken",20,,25,,1,,,,,2,3,38,
wardVenom,"Ward of Venom",potent,2,protection,drink,35,"percent less venom damage taken",25,,63,,2,,,,,4,3,95,
wardVenom,"Ward of Venom",sublime,3,protection,drink,50,"percent less venom damage taken",30,,150,,4,,,,,8,2,225,
wardVenom,"Ward of Venom",sovereign,4,protection,drink,100,"percent less venom damage taken",12,,375,,8,,,,,16,0,563,
fury,"Fury Draught",faint,1,power,drink,2,"x strike damage",20,,35,2,,1,,,,,3,53,
fury,"Fury Draught",potent,2,power,drink,3,"x strike damage",25,,88,4,,2,,,,,3,132,
fury,"Fury Draught",sublime,3,power,drink,5,"x strike damage",30,,210,8,,4,,,,,2,315,
fury,"Fury Draught",sovereign,4,power,drink,8,"x strike damage",30,,525,16,,8,,,,,0,788,
quickening,"Quickening Draught",faint,1,power,drink,1.5,"x strike speed",20,,35,,1,2,,,,,3,53,
quickening,"Quickening Draught",potent,2,power,drink,2,"x strike speed",25,,88,,2,4,,,,,3,132,
quickening,"Quickening Draught",sublime,3,power,drink,2.5,"x strike speed",30,,210,,4,8,,,,,2,315,
quickening,"Quickening Draught",sovereign,4,power,drink,3,"x strike speed",30,,525,,8,16,,,,,0,788,
foresight,"Foresight Draught",faint,1,prep,prepOnly,1,"extra prep steps",,,40,,,2,,,1,,3,60,
foresight,"Foresight Draught",potent,2,prep,prepOnly,2,"extra prep steps",,,100,,,4,,,2,,3,150,
foresight,"Foresight Draught",sublime,3,prep,prepOnly,3,"extra prep steps",,,240,,,8,,,4,,2,360,
foresight,"Foresight Draught",sovereign,4,prep,prepOnly,5,"extra prep steps",,,600,,,16,,,8,,0,900,
mireAura,"Mire Aura",faint,1,aura,drink,20,"percent slow",15,80,30,,1,,,,2,,3,45,
mireAura,"Mire Aura",potent,2,aura,drink,30,"percent slow",20,100,75,,2,,,,4,,3,113,
mireAura,"Mire Aura",sublime,3,aura,drink,40,"percent slow",25,130,180,,4,,,,8,,2,270,
mireAura,"Mire Aura",sovereign,4,aura,drink,55,"percent slow",30,160,450,,8,,,,16,,0,675,
rootgripAura,"Rootgrip Aura",faint,1,aura,drink,0.75,"s root every 4 s",15,70,40,,,,2,,1,,3,60,
rootgripAura,"Rootgrip Aura",potent,2,aura,drink,1,"s root every 4 s",20,90,100,,,,4,,2,,3,150,
rootgripAura,"Rootgrip Aura",sublime,3,aura,drink,1.5,"s root every 4 s",25,110,240,,,,8,,4,,2,360,
rootgripAura,"Rootgrip Aura",sovereign,4,aura,drink,2,"s root every 4 s",30,140,600,,,,16,,8,,0,900,
bewilderAura,"Bewildering Aura",faint,1,aura,drink,1.5,"s confused",15,80,40,,,2,,1,,,3,60,
bewilderAura,"Bewildering Aura",potent,2,aura,drink,2,"s confused",20,100,100,,,4,,2,,,3,150,
bewilderAura,"Bewildering Aura",sublime,3,aura,drink,2.5,"s confused",25,130,240,,,8,,4,,,2,360,
bewilderAura,"Bewildering Aura",sovereign,4,aura,drink,3.5,"s confused",30,160,600,,,16,,8,,,0,900,
thornAura,"Thorn Aura",faint,1,aura,drink,4,"damage per s",15,80,35,,,,2,,,1,3,53,
thornAura,"Thorn Aura",potent,2,aura,drink,8,"damage per s",20,100,88,,,,4,,,2,3,132,
thornAura,"Thorn Aura",sublime,3,aura,drink,14,"damage per s",25,130,210,,,,8,,,4,2,315,
thornAura,"Thorn Aura",sovereign,4,aura,drink,24,"damage per s",30,160,525,,,,16,,,8,0,788,
burrowcall,"Burrowcall Draught",faint,1,summoning,drink,30,"percent Elder Squirrel speed",30,,30,3,,,,,,,3,45,
burrowcall,"Burrowcall Draught",potent,2,summoning,drink,50,"percent Elder Squirrel speed",45,,75,6,,,,,,,3,113,
burrowcall,"Burrowcall Draught",sublime,3,summoning,drink,75,"percent Elder Squirrel speed",60,,180,12,,,,,,,2,270,
burrowcall,"Burrowcall Draught",sovereign,4,summoning,drink,100,"percent Elder Squirrel speed",90,,450,24,,,,,,,0,675,
firebomb,"Firebomb Flask",faint,1,thrown,throw,6,"burn damage per s",4,40,30,,1,,,,2,,3,45,
firebomb,"Firebomb Flask",potent,2,thrown,throw,12,"burn damage per s",5,50,75,,2,,,,4,,3,113,
firebomb,"Firebomb Flask",sublime,3,thrown,throw,20,"burn damage per s",6,60,180,,4,,,,8,,2,270,
firebomb,"Firebomb Flask",sovereign,4,thrown,throw,32,"burn damage per s",7,75,450,,8,,,,16,,0,675,
acidFlask,"Acid Flask",faint,1,thrown,throw,20,"percent more damage taken (Corroded)",6,40,30,,,,,2,1,,3,45,
acidFlask,"Acid Flask",potent,2,thrown,throw,30,"percent more damage taken (Corroded)",8,50,75,,,,,4,2,,3,113,
acidFlask,"Acid Flask",sublime,3,thrown,throw,45,"percent more damage taken (Corroded)",10,60,180,,,,,8,4,,2,270,
acidFlask,"Acid Flask",sovereign,4,thrown,throw,60,"percent more damage taken (Corroded)",12,75,450,,,,,16,8,,0,675,
sporecapFlask,"Sporecap Flask",faint,1,thrown,throw,1.5,"s confused",4,45,35,,,1,,,2,,3,53,
sporecapFlask,"Sporecap Flask",potent,2,thrown,throw,2,"s confused",5,55,88,,,2,,,4,,3,132,
sporecapFlask,"Sporecap Flask",sublime,3,thrown,throw,2.5,"s confused",6,65,210,,,4,,,8,,2,315,
sporecapFlask,"Sporecap Flask",sovereign,4,thrown,throw,3.5,"s confused",7,80,525,,,8,,,16,,0,788,
tanglevineFlask,"Tanglevine Flask",faint,1,thrown,throw,1,"s root",4,40,35,,2,,1,,,,3,53,
tanglevineFlask,"Tanglevine Flask",potent,2,thrown,throw,1.5,"s root",5,50,88,,4,,2,,,,3,132,
tanglevineFlask,"Tanglevine Flask",sublime,3,thrown,throw,2,"s root",6,60,210,,8,,4,,,,2,315,
tanglevineFlask,"Tanglevine Flask",sovereign,4,thrown,throw,3,"s root",7,75,525,,16,,8,,,,0,788,
```
