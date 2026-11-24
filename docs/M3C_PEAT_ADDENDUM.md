# Broceliande — M3c Addendum: Peat, Peat Bogs, Mire Ground and the Peatjaw

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2P`, `M3A`, `M3B`). Everything there still applies unless this document overrides it.
**Goal:** Hag's Causeway's regional resource, **Peat**, gathered from **Peat Bogs**; the third region twist, **mire ground** in Prep; the **Peatjaw** (Cinderjaw's regional version, fuelled by Peat); and new Peat patterns.

> Same conventions as M3a (data in the sheet, ASCII CSV text, verification by reading the code, quick smoke check only).

---

## 0. Data changes and the sheet

As in M2k §0. This addendum changes `resources`, `features`, `levels` (new columns), `turrets` (new rows and columns), `trade`, `items`, `recipes`, `stats`, `sounds` and `globals`. `items` has dropdowns: re-add them after re-importing.

---

## 1. Peat (sixth resource)

- ID `peat`, name **Peat**. **Order everywhere:** Pits, Reeds, Feathers, Boughs, Shells, Peat.
- **Icon:** a dark brown cut block of peat with fibrous edges and a wisp of moss on top, in the shared icon definition.
- **HUD:** a sixth counter, shown once the run has reached Hag's Causeway **or** the player has any Peat (so the Cinderwood HUD stays uncluttered).
- Chime: a soft, low, earthy thud-tone.
- Works everywhere resources do: floaters, drops, sweep, carry-over, the death penalty, cost rows (now up to six), `G` (+10), and the map's carried resources.
- **Trader:** a new `trade` row: `peat`, `baseValue` 2, `stockMin` 4, `stockMax` 8. **Traders in the Cinderwood don't stock Peat** (they still buy it if the player has some). Add a `trade` column `regions` (blank = all regions; `hags` = Hag's Causeway only) for this.

---

## 2. Peat Bog (new resource spot)

- `features` row `peatBog`, name **Peat Bog**: `peat_min` 2, `peat_max` 4, `shells_min` 0, `shells_max` 1, `mainResource` `peat`. New columns `peat_min`, `peat_max` (blank = 0 for other features).
- Look: a dark, wet patch of cut peat with stacked blocks, a cutting spade stuck in the ground, and a puddle with a sheen. Fits the spot footprint like the others.
- New `levels` column `mix_peatbog`. Peat Bogs only appear in Hag's Causeway levels (Cinderwood levels have 0). M3d sets each level's mix.

---

## 3. Twist: mire ground (Prep)

Active when the current region has `mireGround` TRUE.

### 3.1 Mire patches

- Each Hag's Causeway level has **mire patches**: soft ground on the battlefield, generated once per level from a fixed `mireSeed` (code-side, like decoration) as a handful of irregular blobs.
- New `levels` column `mireCoverage`: roughly what fraction of the battlefield is mire (e.g. 0.15). Blank or 0 = no mire.
- Mire **can't overlap corridors**, but it **can** cover candidate spots. Peat Bogs and other spots can sit in the mire.
- **Look:** dark, wet green-brown ground with a faint sheen, scattered reeds and the odd bubble. Clearly readable as different ground, and drawn under objects and decoration.

### 3.2 Step cost

The step cost formula (M1b §4) changes to count mire distance extra:

```
cost = ceil( (distanceOutsideMire + MIRE_STEP_MULT × distanceInsideMire) / STEP_PX )
```

- `MIRE_STEP_MULT` = 2 (globals, TUNING). The distance inside the mire is the length of the straight travel line that lies inside mire patches.
- This applies everywhere step costs are used: hover preview, the step bar, tooltips, and the layout route check and its calibration.
- **Footprint preview:** footprints still match the step cost one-to-one. Inside the mire they're spaced closer together and drawn darker and wetter-looking, so the extra cost is visible along the route.
- Items that change steps (e.g. Hare's Shoes) apply as now. The new **Bogwalker Boots** (§5) ignore the mire.

---

## 4. Peatjaw (regional Cinderjaw)

### 4.1 Turret variants per region

- New `turrets` columns `baseType` and `region`. A variant row inherits blank cells from its base type's row at the same level (as enemies do, M2l).
- In a region that has a variant of a turret, the build menu (Prep and Bough Double) offers the **variant instead of** the base turret.

### 4.2 Peatjaw

`peatjaw`, `baseType` `cinderjaw`, `region` `hags`. **Same stats as Cinderjaw** at every level; only names, costs and looks differ. Peat replaces Boughs as its fuel.

| Level | Name | Cost |
|---|---|---|
| 1 | Peatjaw | 2 Pits + 1 Feather + 2 Peat (build) |
| 2 | | 4 Pits + 1 Feather + 1 Peat |
| 3 | | 6 Pits + 2 Feathers + 2 Peat |
| 4 | **Smoulder Maw** | 8 Pits + 2 Feathers + 1 Bough + 2 Peat |
| 5 | **Bogfire Jaw** | 10 Pits + 2 Feathers + 1 Bough + 3 Peat |

All TUNING.

**Look:** the same Komodo head, re-coloured: darker, peat-brown and moss-flecked stone, with a deep red-orange flame and thicker, darker smoke. Its fire cone uses the same shapes with deeper red tones and dark smoke. Burning enemies look the same as with Cinderjaw.

Peatjaw is the key turret against **rising dead**: enemies killed while burning stay down (M3b §3).

---

## 5. New Peat items (craft-only)

Four new Crafted items (rarity 0) with recipes that use Peat. Their patterns join the pattern pool as usual. All TUNING.

| Slot | Item | Effect |
|---|---|---|
| Crown | **Peatsmoke Crown** | Vulture pecks set enemies burning (1 damage every 1.2 s for 4 s) |
| Necklace | **Ashen Censer** | The Druid's strike sets its target burning (1 damage every 1.2 s for 6 s) |
| Belt | **Peatcutter's Belt** | Peat Bogs yield +2 Peat, and drops sink 50% slower |
| Shoes | **Bogwalker Boots** | Mire ground costs no extra steps |

Burning from these items is the same burning status as Cinderjaw's (so it also stops the dead rising). New stat keys as needed (e.g. `vulture.burnOnHit`, `druid.strikeBurn`, `features.peatBonus`, `drops.sinkTimeMult`, `mire.stepMult`) go in `stats` and through the stats resolver.

Recipes (`recipes` tab):

| Item | Pits | Reeds | Feathers | Boughs | Shells | Peat |
|---|---|---|---|---|---|---|
| Peatsmoke Crown | 6 | | 4 | 1 | | 3 |
| Ashen Censer | 6 | | 2 | 1 | 1 | 4 |
| Peatcutter's Belt | 6 | 1 | 2 | 1 | | 3 |
| Bogwalker Boots | 7 | 1 | 3 | | 1 | 3 |

Add a `cost_peat` column to `recipes`, `turrets` and `summons`.

---

## 6. Debug

- `G` also grants +10 Peat.
- Overlay (`D`): mire patches outlined; along a hovered route, the part inside the mire highlighted.
- Panel: step cost of the hovered route split into normal and mire parts.

---

## 7. Acceptance criteria

- [ ] Peat is a sixth resource with its icon, HUD counter (shown from Hag's Causeway or when owned), chime, and works in every resource system.
- [ ] Traders in Hag's Causeway stock and trade Peat; Cinderwood traders don't stock it.
- [ ] Peat Bogs exist (2–4 Peat, 0–1 Shells) and only appear in Hag's Causeway levels.
- [ ] Mire patches per Hag's Causeway level, outside corridors, readable; travel through them costs double, everywhere step cost is used; footprints show it.
- [ ] Turret variants per region work; in Hag's Causeway, Peatjaw replaces Cinderjaw with the same stats, its own costs, names and colours.
- [ ] Four new Crafted Peat items with recipes; their effects work, and their burning stops rising.
- [ ] Debug additions work; the report lists changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
