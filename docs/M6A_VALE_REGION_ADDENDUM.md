# Broceliande — M6a Addendum: The Lost Vale (Region, Map and Rootkeeper Grove)

**Status:** addendum to the existing specs in `docs/`. Everything there still applies unless this document overrides it. First of five Lost Vale addenda (M6a–M6e).
**Goal:** a third region, **The Lost Vale**, after Hag's Causeway: its map of 19 battle nodes plus the fixed **Rootkeeper Grove** (a village that's both a shop and a crafting station), the crossing into it, its death penalty and its look. Enemies, twists, the new resource and turret, and the levels follow in M6b–M6e.

> Same conventions as before: **MUST** / **SHOULD**, **TUNING** marks starting guesses, data in the sheets, ASCII CSV text, verification by reading the code, quick smoke check only (see `CLAUDE.md`). Ask rather than guess where this is silent.

---

## 0. Data changes and the sheets

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed or are new**, and **MUST NOT run the pull script** until the designer confirms the sheets are updated.

---

## 1. The region

**Theme:** one of the places where the Elders' ruins still hide, under thick ferns and towering rainforest (think New Zealand's ancient forests: tree ferns, moss, mist, waterfalls). It's guarded by a tribal reptilian people whose shamans draw power from Elder relics. The only other people here are the **Rootkeepers**, craftsmen the tribe tolerates because they never dig into the Elders' mysteries.

`regions` tab, new row:

| Column | Value |
|---|---|
| `id` | `vale` |
| `name` | The Lost Vale |
| `order` | 3 |
| `deathLossPct` | 0.55 |
| `traders` | 1 (plus Rootkeeper Grove) |
| `tinkers` | 1 (plus Rootkeeper Grove) |
| `tinkerMinRow` | 4 |
| `risingDead`, `sinkingDrops`, `mireGround` | FALSE |
| `hiddenSpots`, `camouflage` | TRUE (new columns, M6c; FALSE for the other regions) |
| `introTitle` | The Lost Vale |
| `introText` | See §4 |
| `finalLine` | `The Iron Oracle falls silent. Beyond the Ironspan, the Vale waits.` |

Also: **Hag's Causeway's `deathLossPct` becomes 0.5** (the designer may already have changed it).

The run now completes after the **last region by order** (the Lost Vale). Winning Bog King's Rest shows **Continue** and the crossing dialog into the Vale, as The Heartwood does for Hag's Causeway.

---

## 2. The map

### 2.1 Rows and nodes

Rows of **1-3-2-3-3-3-3-1** (19 battle nodes), plus Rootkeeper Grove in row 5, plus the generated Trader and Tinker's Rest.

| Row | Nodes |
|---|---|
| 1 | Emerald Gully |
| 2 | Serpent's Rest, Fernbound Court, The Whispering Canopy |
| 3 | The Blackstone Steps, **Broodmother's Hollow** (Fell) |
| 4 | Sunken Atrium, The Moss-Crowned Gate, Glasswater Basin |
| 5 | **The Scale-Shrine** (Fell), The Drowned Observatory, The Coilstone Circle, **Rootkeeper Grove** (village) |
| 6 | The Fallen Colossus, The Fernsea, **Broodmother's Den** (Fell) |
| 7 | The Saurian Crossing, The Hollow Ziggurat, The Ironspan |
| 8 | **The Shaman's Perch** (Boss) |

IDs in lower camelCase without "The" (e.g. `emeraldGully`, `broodmothersHollow`, `scaleShrine`, `rootkeeperGrove`, `shamansPerch`).

Until M6e adds the real levels, the 19 battle nodes are **placeholders** (each borrowing an existing level's map file and waves, as M3a did), so the map, crossing and village can be tested.

### 2.2 Rootkeeper Grove (fixed village node)

- New node type `village`: a `levels` row with `nodeType` `village`, `region` `vale`, `row` 5. It has no battle, map file or waves (validation exempts `village` rows).
- **Always present**, unlike the generated Traders and Tinker's Rests. The road generator places it in row 5 and connects it like any node (row 5 then has 4 nodes).
- **Icon:** a timber hut under a broad tree, in a warm wood-and-green circle. Completed: the coin mark.
- **Tooltip:** `Rootkeeper Grove — Village. Trade and craft.` plus the shop hints (M3e §5.3) and `Patterns known: N · Craftable now: M`.

### 2.3 The village scene

A full-screen scene on the shared scene template:

- **Background:** a settlement of timber dwellings and workshops built around living trees, with rope walkways, hanging lanterns, wood shavings and half-finished carvings; tree ferns and mist behind. Palette `village` (warm wood, deep green, soft gold light).
- **The Druid** on the left, and a **Rootkeeper craftsman** on the right (a new procedural figure: wood-brown robes, a leather apron, tools at the belt, carved wooden beads).
- **Two tabs** at the top: **Trade** and **Craft**.
  - **Trade:** the gold shop (M3e §5), using a new trader profile `rootkeepers` (§2.4).
  - **Craft:** the Tinker's Rest book (M2p §4.2–4.3).
- One **Undo** stack covers both tabs, until you leave. **Back to the road** completes the node.

### 2.4 The `rootkeepers` trader profile

Add to `traderProfiles`, `traderTables` and `traderStock` (all TUNING):

- Profile: `rootkeepers`, name **The Rootkeepers**, regions `vale`, `itemPriceMult` 1.0, `patternPriceMult` 1.0, `itemBuyMult` 1.2 (they appreciate good work).
- Tables: itemCount 1:6, 2:5 · itemRarity 2:5, 3:4 · patternCount 1:6, 2:4 · patternRarity 1:2, 2:4, 3:3, 0:3.
- Stock: woodworkers' goods are cheap: **Boughs** 3–6 at 0.6–0.8, Pits and Reeds 8–14 at 0.8–1.0, Feathers 4–8 at 0.9–1.1, Scales (M6d) 2–4 at 1.0–1.2.
- Dialogue lines (`traders` tab, trader `rootkeepers`): 2 per kind, quiet and practical, with a craftsman's pride.

---

## 3. Looks

- **Map background (`mapVale`):** deep rainforest greens with gold-tinged light, crowns of tree ferns, bands of drifting mist, a river with small waterfalls, moss-covered ruin fragments, and the dark silhouette of the **Ironspan** bridge near the top (the boss end).
- Region title on the map: **THE LOST VALE**.
- The Trader and Tinker's Rest scenes in the Vale use a lush, misty variant (`traderVale`, `tinkerVale` palettes).
- Map ambience (optional): `mapAmbienceVale`, distant birds, dripping and a far-off waterfall.

---

## 4. Crossing text

`introText` for the Lost Vale (designer may rewrite):

```
The road out of the Causeway climbs, and the air turns warm and green.
Ferns taller than houses close over the path, and old stone steps
lead down into the mist. Somewhere ahead, something is watching.
This is the Lost Vale. Its people do not welcome strangers.
```

(Stored as one cell; the dialog wraps the text.)

---

## 5. Debug

- Debug panel: a **Jump to region…** dropdown (any region, keeping resources and items), and a **Spawn enemy…** dropdown (type, count, lane) for testing every enemy without new keys.
- `Shift+R` and `[` / `]` work for the new levels.

---

## 6. Acceptance criteria

- [ ] The Lost Vale is region 3, with its regions row, death penalty 0.55, and Hag's Causeway at 0.5.
- [ ] Winning Bog King's Rest leads, through Continue and the crossing dialog, to the Lost Vale; the run completes after The Shaman's Perch.
- [ ] The map has rows 1-3-2-3-3-3-3-1 with the names, Fell and Boss types in §2.1, plus Rootkeeper Grove in row 5 and one generated Trader and Tinker's Rest.
- [ ] Rootkeeper Grove's scene offers Trade and Craft tabs, with the `rootkeepers` profile and dialogue, one undo stack, and completes on leaving.
- [ ] The Vale's map background, title and scene palettes.
- [ ] Debug Jump to region and Spawn enemy work.
- [ ] The report lists every changed tab; the pull script wasn't run.
- [ ] Everything else still works.
