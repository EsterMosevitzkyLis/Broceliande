# Broceliande — M3a Addendum: Regions (The Cinderwood and Hag's Causeway)

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2P`). Everything there still applies unless this document overrides it. First of four region addenda (M3a–M3d).
**Goal:** a run now crosses **two regions** in sequence: **The Cinderwood** (the existing map), then **Hag's Causeway**. This addendum adds the region structure, the crossing, the region death penalty, per-region map looks, and a skeleton Hag's Causeway map. Its enemies, twists, resources and levels come in M3b–M3d.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). CSV text uses plain ASCII only, never starts with `+ - = @`, and has no semicolons (see `CLAUDE.md`). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed or are new**, and **MUST NOT run the pull script** until the designer confirms the sheet is updated. New tabs are added with File → Import → Upload → **Insert new sheet(s)** (Separator type: **Comma**), and their gids go into `data/sheet_sources.json`.

This addendum: new tab `regions`; changed tabs `levels` (new `region` column, new rows), `palettes`, `globals`, `sounds`.

---

## 1. The two regions

| | The Cinderwood | Hag's Causeway |
|---|---|---|
| Order | 1 | 2 |
| Theme | Destruction has already happened. The fire has passed, but its traces remain: scars, memory, arrested recovery. | Destruction is still happening, slowly. Water consumes buildings, graves sink, roots break into forgotten structures, and the dead refuse to disappear. |
| Difficulty | As now | Harder |
| Map rows | 1-2-3-2-3-2-3-1 (as now) | 1-3-2-3-2-3-3-1 (18 battle nodes) |
| Fell Wilds | 2 (as now) | 3 |
| Traders / Tinker's Rests | 2 / 2 | 2 / 2 |
| Death penalty | Lose everything (run ends) | Lose 70% (§4) |

### 1.1 `regions` tab

One row per region:

| Column | Cinderwood | Hag's Causeway | Notes |
|---|---|---|---|
| `id` | `cinderwood` | `hags` | |
| `name` | The Cinderwood | Hag's Causeway | |
| `order` | 1 | 2 | |
| `deathLossPct` | 1.0 | 0.7 | Fraction lost on death (§4) |
| `traders` | 2 | 2 | Replaces the global `TRADERS_PER_RUN` |
| `tinkers` | 2 | 2 | Replaces `TINKERS_PER_RUN` |
| `tinkerMinRow` | 4 | 4 | Replaces `TINKER_MIN_ROW` |
| `risingDead` | FALSE | TRUE | Twist, M3b |
| `sinkingDrops` | FALSE | TRUE | Twist, M3b |
| `mireGround` | FALSE | TRUE | Twist, M3c |
| `introTitle` | (blank) | Hag's Causeway | Crossing dialog (§3) |
| `introText` | (blank) | See §3 | |

Remove the three replaced globals once the region values are used.

### 1.2 Levels belong to regions

- New `levels` column `region`. All 17 existing levels are `cinderwood`.
- The map for each region is built only from that region's levels, using their `row` and `nodeType`. The road generator (M2g) runs per region with its usual constraints, plus that region's Traders and Tinker's Rests.
- The first node of a region is its row 1 node.

### 1.3 Skeleton Hag's Causeway map

Until M3d adds the real levels, add 18 **placeholder** level rows for Hag's Causeway, using the names and rows below, each pointing at an existing Cinderwood level's layout and waves (so the map and crossing can be tested). M3d replaces them.

| Row | Nodes |
|---|---|
| 1 | Tallow Fen |
| 2 | The Lantern Fen, The Rotting Ford, Bonewhite Willows |
| 3 | The Corpse Reedbeds, The Drowned Gallows (Fell) |
| 4 | The Leechwater Pools, Wormwood Hollow, The Sallow Mere |
| 5 | The Drowned Tannery, The Sunken Ossuary (Fell) |
| 6 | The Widow's Mire, The Plague Carts, The Weeping Sluice |
| 7 | Carrion Orchard, The Drowned Bell Tower (Fell), The Blackwater Shrine |
| 8 | Bog King's Rest (Boss) |

IDs: lower camelCase without "The" (e.g. `tallowFen`, `lanternFen`, `drownedGallows`, `bogKingsRest`).

---

## 2. Renamed Cinderwood levels

Three Cinderwood levels have watery or duplicate themes that now belong to Hag's Causeway. Rename and re-theme them so the Cinderwood reads as burnt country. **Level IDs, layouts and waves stay the same**; only name, description, palette and decoration change.

| ID | Old name | New name | New description | Re-theme |
|---|---|---|---|---|
| `drowned` | The Drowned Hamlet | **The Burnt Hamlet** | "Blackened beams and narrow lanes between fallen houses." | Water patches become ash pits; sunken roofs become charred, collapsed roofs; cool grey-brown palette with soot. |
| `causeway` | Sunken Causeway | **The Ember Road** | "A raised road between pits that still smoulder." | Dark water becomes ash pits with a faint ember glow; causeway stones become scorched road stones. |
| `widows` | Widow's Orchard | **Blackbark Orchard** | "Fire-blackened fruit trees, still standing." | Orchard trees become charred, leafless and dark-barked; palette shifts from autumn gold to soot and dull ochre. |

---

## 3. Crossing into Hag's Causeway

- Winning the Cinderwood boss (The Heartwood) no longer completes the run. Its Victory overlay shows **Continue** (as for other nodes) instead of Start again.
- **Continue** opens the **crossing dialog**: a window over the darkened Cinderwood map, with a title, the text below, and one button, **Enter Hag's Causeway**. No other way to close it.
- Clicking the button fades to the **Hag's Causeway map**, newly generated (seeded from the run seed), with the Druid at Tallow Fen.
- **Everything carries over:** resources, items and equipment. Druid HP is full on arrival (as between Wilds now).
- The run is complete after winning **Bog King's Rest**: that Victory overlay shows **Start again** and a line such as `The Bog King sinks for the last time. The Causeway falls quiet.`

`introText` for Hag's Causeway (in the `regions` tab; designer may rewrite):

```
Beyond the last of the burnt trees, the ground turns soft. The old road
sinks into black water, and the water does not give things back.
They call this place Hag's Causeway, though no one living has seen her.
Here the dead do not stay buried.
```

(Line breaks are for readability here; store it as one cell. The dialog wraps text.)

---

## 4. Dying, by region

- **In the Cinderwood** (`deathLossPct` 1.0): as now. The run ends; Start again begins a new run in the Cinderwood.
- **In Hag's Causeway** (`deathLossPct` 0.7): the run **doesn't end**. The player restarts at the **beginning of Hag's Causeway**, on a newly generated Hag's Causeway map, keeping part of what they had:
  - **Resources:** each resource is reduced to `floor(amount × (1 − deathLossPct))`, i.e. 30% kept, rounded down.
  - **Items:** each owned item (equipped or not) is lost with probability `deathLossPct`, rolled separately (seeded). Kept items stay equipped where they were.
  - Anything found in the battle that was lost is gone, as before.
  - **Patterns** are permanent and never lost.
- **Defeat overlay in Hag's Causeway** lists what was lost (resource rows and item names) and offers two buttons:
  - **Return to Hag's Causeway**: restart there with what was kept.
  - **Abandon the run**: start a new run in the Cinderwood.
- Generalise: any region with `deathLossPct` < 1 behaves like Hag's Causeway; 1.0 behaves like the Cinderwood.

---

## 5. Map looks per region

### 5.1 Region title

The map shows the current region's name at the top of the map area, in large storybook type: **THE CINDERWOOD** or **HAG'S CAUSEWAY**.

### 5.2 Backgrounds

Each region has its own procedural map background (new `palettes` rows `mapCinderwood` and `mapHags`, plus code-side shapes):

- **The Cinderwood:** the current dark forest, re-themed as burnt country: ash-grey and dark umber ground, charred tree clusters (dark trunks, sparse dull foliage), a few faint ember glows, a little drifting ash.
- **Hag's Causeway:** dark teal and murky green marsh: pools of still black water with a faint sheen, reed clumps, dead and drooping willows, a few broken stone causeway fragments, and slow drifting mist wisps.

Nodes, roads, labels, tooltips, the equipment panel and the Druid token are unchanged in function. Make sure label backings and roads stay readable on both backgrounds.

### 5.3 Battle scenes

Unchanged: each level still uses its own palette and decoration. The trader and Tinker's Rest scenes SHOULD use the current region's tone (a cooler, damper clearing in Hag's Causeway).

---

## 6. Sound

New `sounds` rows: `regionCrossing` (a low, wet, rising chord when entering Hag's Causeway), and optionally a quiet regional map ambience for each region (`mapAmbienceCinderwood`: faint wind and crackle; `mapAmbienceHags`: water drips and frogs).

---

## 7. Debug

| Key | Action |
|---|---|
| `Shift+H` (on the map) | Jump straight to the Hag's Causeway map (as if the Heartwood was just won), keeping current resources and items |

`[` / `]` cycle through all levels of both regions. Debug panel: current region, `deathLossPct`, and what a death would remove right now.

---

## 8. Acceptance criteria

- [ ] `regions` tab exists with both regions; region values replace the old global trader and tinker settings.
- [ ] Levels have a `region`; each region's map is built from its own levels with its own row layout and node counts.
- [ ] 18 placeholder Hag's Causeway levels exist with the right names, rows and Fell/Boss types.
- [ ] The Burnt Hamlet, The Ember Road and Blackbark Orchard are renamed and re-themed; IDs, layouts and waves unchanged.
- [ ] Winning The Heartwood shows Continue, then the crossing dialog, then the Hag's Causeway map with everything carried over and full HP.
- [ ] Winning Bog King's Rest completes the run.
- [ ] Death in the Cinderwood ends the run; death in Hag's Causeway keeps 30% of resources and each item with a 30% chance, with Return and Abandon options; patterns are kept.
- [ ] Each region has its own map background and title.
- [ ] Debug additions work; the report lists new and changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
