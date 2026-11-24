# Broceliande — M2p Addendum: Rarity, Patterns and the Tinker's Rest

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2O`). Everything there still applies unless this document overrides it. Overrides parts of M2e §3 (finding items) and adds the game's first **permanent** progression.
**Goal:** items get a rarity; 12 new items (some craft-only); **patterns** (recipes) can be found and are **remembered forever**; a new map node, the **Tinker's Rest**, where the Druid crafts items from patterns and resources.

> Same conventions: **MUST** / **SHOULD**, **TUNING** marks starting guesses. Balancing data lives in `data/*.csv` (edited in the Google Sheet, M2j). CSV text uses plain ASCII only (see `CLAUDE.md`). Ask rather than guess where this is silent.
>
> **Verification:** the designer tests by playing. Check the acceptance criteria by reading the code, not with automated or headless-browser tests (see `CLAUDE.md`).

---

## 0. Data changes and the sheet

As in M2k §0: Claude Code edits the CSVs, lists **exactly which tabs changed or are new**, and **MUST NOT run the pull script** until the designer confirms the sheet is updated.

- **New tab:** `recipes`. Add it to the sheet with File → Import → Upload → **Insert new sheet(s)**; its gid goes into `data/sheet_sources.json`.
- **Changed tabs:** `items` (new column and rows), `stats` (new rows), `globals` (new keys), `palettes` (new `tinker` row), `sounds` (new rows).
- `items` has dropdowns on its effect-stat columns: re-add them after re-importing.

---

## 1. Rarity

### 1.1 Tiers

New `items` column `rarity`:

| `rarity` | Label | Found when searching? | Frame colour |
|---|---|---|---|
| 0 | **Crafted** | Never: craft-only | Purple |
| 1 | **Common** | Often | Bronze |
| 2 | **Uncommon** | Sometimes | Green |
| 3 | **Rare** | Seldom | Gold |

- Rarity sets how likely an item is to be the hidden find (§3.2).
- Every item icon (equipment slots, popovers, Victory overlay, recipe book) gets a thin frame in its rarity colour, and tooltips show the label.

### 1.2 Existing items

| Slot | Common (1) | Uncommon (2) |
|---|---|---|
| Crown | Hawkfeather Crown | Talon Crown |
| Grip | Nutwood Grip | Quickpaw Grip |
| Ferrule | Mossheart Ferrule | Twin-root Ferrule |
| Necklace | Oakheart Amulet | Sap Pendant |
| Belt | Wright's Belt | Forager's Belt |
| Shoes | Fernstep Boots | Hare's Shoes |

### 1.3 New items

One Rare and one Crafted item per slot. All values TUNING.

| Slot | Item | Rarity | Effect |
|---|---|---|---|
| Crown | **Eyrie Crown** | 3 | +1 Vulture at a time |
| Crown | **Stormfeather Crown** | 0 | Vultures last +5 s and deal +4 damage |
| Grip | **Hoarder's Grip** | 3 | Squirrel pickups have a 25% chance to collect the item twice |
| Grip | **Thornwood Grip** | 0 | Squirrels have +15 HP and +2 counter-attack damage |
| Ferrule | **Swiftroot Ferrule** | 3 | Bough Double jobs 30% faster |
| Ferrule | **Heartroot Ferrule** | 0 | +1 Bough Double at a time, and jobs 20% faster |
| Necklace | **Ward Torc** | 3 | The Druid takes 15% less damage |
| Necklace | **Heartwood Amulet** | 0 | +30 max HP, and regenerate 1 HP every 3 s in Combat |
| Belt | **Gleaner's Belt** | 3 | Enemy drop chances ×1.25 |
| Belt | **Wildwright's Belt** | 0 | Building and upgrading 35% faster, and every search yields +1 of the spot's main resource |
| Shoes | **Strider Boots** | 3 | +25 steps |
| Shoes | **Pathfinder's Shoes** | 0 | +15 steps, and travel costs 20% fewer steps |

- New effects need new stat keys (e.g. `druid.damageTakenMult`, `drops.chanceMult`, `squirrel.doublePickupChance`, `vulture.max`). Add them to `stats` and wire them through the stats resolver (M2e §2.2).
- Staff charms still only affect their own summon, and personal equipment only passive properties (M2e §1).

---

## 2. Patterns (permanent)

### 2.1 What a pattern is

- A **pattern** is a scroll with the schematics for one item. Knowing it lets the Druid craft that item at a Tinker's Rest.
- **Every item has a pattern**, including Common, Uncommon and Rare ones, so a player can craft something they never found.
- Each item's recipe lives in the new `recipes` tab (§5).

### 2.2 Permanence

- Known patterns are **permanent**: they survive Start again, defeat, page reloads and closing the browser.
- Save them in `localStorage` under a versioned key (e.g. `broceliande.patterns.v1`), as a list of item IDs. Wrap every read and write in try/catch. If storage isn't available, patterns last for the session only, without errors.
- Items themselves stay per run, as now.
- Note: progress is per browser and device. GitHub Pages players keep their own patterns.

### 2.3 Seeing known patterns

On the map's equipment panel, under carried resources: `Patterns known: 5 / 24`. Hovering shows the list of known patterns, grouped by slot, with rarity colours. Newly learned patterns are marked **New** until hovered.

---

## 3. Finding things (overrides M2e §3.1)

### 3.1 One hidden find per battle

Each battle still hides **one** find in one random resource spot (seeded), but it's now either an **item** or a **pattern**:

1. Roll `FIND_PATTERN_CHANCE` (0.4): on success it's a pattern, otherwise an item.
2. **Item:** a random item the player doesn't own this run, with rarity 1–3 (never 0), weighted by `RARITY_WEIGHT_1/2/3` (6 / 3 / 1).
3. **Pattern:** a random pattern the player doesn't know yet, weighted by its `patternWeight` (§5).
4. If the chosen pool is empty, use the other pool. If both are empty, nothing is hidden.

### 3.2 Finding it

- Item: unchanged (M2e §3.2): "You found a Crown Charm!", the slot type only.
- Pattern: "**You found a Pattern!**", with a rolled-scroll icon. The item it's for isn't named yet.
- Same floater, sound and HUD reminder as for items (the reminder shows the scroll icon for patterns).

### 3.3 Revealing it

- On **Victory**, the overlay shows `Found: a Pattern` (or the item's slot type, as before).
- On the map afterwards, a short message names it: `Pattern learned: Stormfeather Crown`. It's added to the permanent pattern list and marked **New** (§2.3).
- On **Defeat**, a pattern found in that battle is lost, like items.

---

## 4. The Tinker's Rest

### 4.1 On the map

- `TINKERS_PER_RUN` (2) Tinker's Rest nodes are **added** each run, like Traders (M2n §2.1): extra nodes, no combat level removed, connected by the road generator with all its rules.
- Rows: from row 4 onward (`TINKER_MIN_ROW` = 4). One goes in rows 4–5 and one in rows 6–7, at most one per row, picking rows evenly. Prefer rows without a Trader; share a row with one only if no other row works.
- **Icon:** an anvil silhouette in a warm circle with a **copper** rim (distinct from the Trader's amber lantern). **Completed:** a small hammer mark.
- **Tooltip:** `Tinker's Rest — Craft equipment from your patterns.` plus `Patterns known: N · Craftable now: M` (M computed from current resources when hovered).
- Visiting it means not fighting in that row.

### 4.2 The scene

A full-screen scene on the shared scene template (M2n §1), new game state `TINKER`, with a fade transition in and out. The HUD strip shows resources; the phase label reads `TINKER'S REST`.

```
┌───────────────────────────────────────────────────────────────┐
│  Tinker's Rest           (crumbling stone ruins: broken arches,│
│                           pillars, ivy; an old forge with      │
│                           glowing embers, anvil, hanging tools)│
│                                                               │
│      🔥 forge + anvil              ┌──────── open book ───────┐│
│   🧙 Druid                         │ [All][Crown][Grip]...     ││
│                                   │ Hawkfeather Crown  ✓      ││
│                                   │ Stormfeather Crown ✓      ││
│                                   │ ???  (Crown)              ││
│                                   │ ...                       ││
│                                   │ ───────────────────────── ││
│                                   │ [icon] Stormfeather Crown ││
│                                   │ Crafted · Crown           ││
│                                   │ Vultures last +5 s, +4 dmg││
│                                   │ [pit]×8 [feather]×5 [bough]×2│
│                                   │          [ CRAFT ]         ││
│                                   └───────────────────────────┘│
│  [Undo last craft]                         [Back to the road]  │
└───────────────────────────────────────────────────────────────┘
```

- **Background:** a forest clearing with **crumbling stone ruins** (broken arches, pillars, ivy) around an **old forge** with softly glowing embers, an anvil, and tools hanging from a beam. Dedicated `tinker` palette (cool stone with warm forge light). Placeholder art with clear zones (background, forge, Druid, book) for sprites later.
- **Druid:** on the left by the forge, using his existing draw function at a larger scale.
- **The book:** the main interface, open on a workbench on the right.
  - **Slot tabs** along the top (All + one per slot, with slot icons).
  - **Recipe list:** every item in that tab. Known patterns show the item's name and rarity colour, with a tick if craftable now. **Unknown patterns** show as greyed `???` with the slot icon, so players can see how much there is to discover.
  - **Detail page** for the selected known recipe: item icon with rarity frame, name, rarity label and slot, effect text, ingredients as cost rows (red where short, M1f §3), and **Craft**.

### 4.3 Crafting

- **Craft** is enabled when the pattern is known, all ingredients are in hand, and the player **doesn't already own that item this run** (otherwise show `Already owned`).
- Crafting deducts the resources, adds the item to the run (it appears in its slot's list on the map, marked **New**), and plays a short animation: the forge flares, the hammer strikes the anvil a couple of times, and the item appears in a burst of sparks.
- Craft as many items as you can afford.
- **Undo last craft** reverses the most recent craft (item removed, resources returned). It can be pressed repeatedly until you leave.
- **Back to the road:** returns to the map; the node is completed; equip new items on the map as usual.

### 4.4 Sound

New `sounds` rows: `forgeAmbience` (very quiet crackle loop while in the scene), `craftHammer` (two metallic clangs), `craftComplete` (bright shimmer), `patternFound` (paper rustle with a soft chime).

---

## 5. Recipes

### 5.1 `recipes` tab

Columns: `item`, `cost_pits`, `cost_reeds`, `cost_feathers`, `cost_boughs`, `cost_shells`, `patternWeight`, `notes`.

- `patternWeight` defaults by rarity: 3 for rarity 1 and 2, 2 for rarity 3 and rarity 0.
- Costs follow the trade values (Pits 1, Feathers 1.5, Shells 2, Reeds 3, Boughs 4): about 7 for Common, 11 for Uncommon, 16 for Rare and 24 for Crafted items.

### 5.2 Starter recipes

All TUNING.

| Item | Rarity | Pits | Reeds | Feathers | Boughs | Shells |
|---|---|---|---|---|---|---|
| Hawkfeather Crown | 1 | 4 | | 2 | | |
| Talon Crown | 2 | 5 | | 3 | | 1 |
| Eyrie Crown | 3 | 6 | | 4 | 1 | |
| Stormfeather Crown | 0 | 8 | | 5 | 2 | |
| Nutwood Grip | 1 | 4 | | 1 | | 1 |
| Quickpaw Grip | 2 | 6 | | 2 | | 1 |
| Hoarder's Grip | 3 | 8 | | | 1 | 2 |
| Thornwood Grip | 0 | 8 | 1 | 2 | 2 | 1 |
| Mossheart Ferrule | 1 | 3 | | | 1 | |
| Twin-root Ferrule | 2 | 5 | | 1 | 1 | |
| Swiftroot Ferrule | 3 | 6 | | 2 | 2 | |
| Heartroot Ferrule | 0 | 8 | | 2 | 3 | 1 |
| Oakheart Amulet | 1 | 5 | | | | 1 |
| Sap Pendant | 2 | 4 | 2 | 1 | | |
| Ward Torc | 3 | 6 | | 2 | 1 | 2 |
| Heartwood Amulet | 0 | 8 | 2 | | 2 | 2 |
| Wright's Belt | 1 | 5 | | 1 | | |
| Forager's Belt | 2 | 6 | 1 | | | 1 |
| Gleaner's Belt | 3 | 7 | 1 | 2 | 1 | |
| Wildwright's Belt | 0 | 9 | 1 | 2 | 2 | 1 |
| Fernstep Boots | 1 | 4 | | 2 | | |
| Hare's Shoes | 2 | 5 | | 2 | | 1 |
| Strider Boots | 3 | 7 | | 3 | 1 | |
| Pathfinder's Shoes | 0 | 9 | | 3 | 2 | 1 |

### 5.3 Globals

| Key | Value |
|---|---|
| `FIND_PATTERN_CHANCE` | 0.4 |
| `RARITY_WEIGHT_1` | 6 |
| `RARITY_WEIGHT_2` | 3 |
| `RARITY_WEIGHT_3` | 1 |
| `TINKERS_PER_RUN` | 2 |
| `TINKER_MIN_ROW` | 4 |

---

## 6. Debug

| Key / control | Action |
|---|---|
| `Shift+P` (on the map) | Learn a random unknown pattern |
| `Shift+K` (on the map) | Open a Tinker's Rest scene immediately (doesn't change map progress) |
| Debug panel button **Forget all patterns** | Clear the saved pattern list (asks for confirmation inside the panel, no browser dialog) |
| Debug panel button **Learn all patterns** | Learn every pattern |

Panel: known patterns count; the hidden find this battle (item or pattern, and which).

---

## 7. Acceptance criteria

### Rarity and items
- [ ] `rarity` on every item; existing items tagged as §1.2; 12 new items as §1.3, with their effects wired through the stats resolver.
- [ ] Rarity frames and labels appear wherever item icons show.

### Patterns
- [ ] Each battle hides one item or pattern (40% pattern), weighted as §3.1; known patterns and owned items are excluded; Crafted items are never found.
- [ ] "You found a Pattern!" without naming the item; revealed on the map after Victory; lost on Defeat.
- [ ] Known patterns persist across runs and reloads via `localStorage`, safely.
- [ ] Map panel shows `Patterns known: N / total` with a hover list and New marks.

### Tinker's Rest
- [ ] Two per run, one in rows 4–5 and one in rows 6–7, connected by the generator; copper anvil icon, hammer mark when completed; tooltip with known and craftable counts.
- [ ] Full-screen scene with ruins, an old forge with embers, anvil and tools, the Druid, and the book.
- [ ] Book shows slot tabs, known recipes (craftable ticked), unknown ones as `???`, and a detail page with cost rows.
- [ ] Crafting needs the pattern and the resources, blocks items already owned this run, adds the item, and animates; undo works repeatedly; leaving completes the node.

### General
- [ ] Debug keys and panel buttons work.
- [ ] The report lists new and changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
