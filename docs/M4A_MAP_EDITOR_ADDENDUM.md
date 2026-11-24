# Broceliande — M4a Addendum: Battle Map Files and the Map Editor

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2P`, `M3A`–`M3E`). Everything there still applies unless this document overrides it.
**Goal:** battle levels become **hand-authored map files**: lanes, the Druid, sectors, candidate spots, decoration, mire, palette and an optional background image are all fixed in a per-level file. Only **jitter** and the **distribution of roles** (turret slot, resource spot, empty) change from run to run, as now. A visual **map editor** creates and edits these files.

> Same conventions as before: **MUST** / **SHOULD**, **TUNING** marks starting guesses, ASCII CSV text, verification by reading the code, quick smoke check only (see `CLAUDE.md`). Ask rather than guess where this is silent.

---

## 0. What moves where

| Data | From | To |
|---|---|---|
| Lanes, Druid position, sector angles, near radius | Code (`LEVEL_GEOMETRY`, etc.) | Map file |
| Corridor width | `levels` tab | Map file |
| Candidate spots and zone labels | `candidates` tab | Map file (**the `candidates` tab retires**) |
| Zone quota overrides | Code (`zoneQuotaOverrides`) | Map file |
| Decoration and signature landmarks | Generated from `decorSeed` | Map file (each object stored) |
| Mire | Generated from `mireSeed` / `mireCoverage` | Map file (painted) |
| Level palette | `palettes` tab (level rows) | Map file |
| Per-level presentation (e.g. toll sound) | Code | Map file |

**Stays in the sheet:** all numbers about play: stats, waves and spawns, feature mixes, `enemyHpMult`, `stepBudget`, `stuckTime`, prices, and the **non-level palettes** (`mapCinderwood`, `mapHags`, `trader`, `traderHags`, `tinker`, `tinkerHags`). Region map backgrounds come later.

**The sheet afterwards:** delete (or ignore) the `candidates` tab; delete the level rows from `palettes`; delete the `corridorWidth` and `mireCoverage` columns from `levels`. Claude Code removes `candidates` from `data/sheet_sources.json` and the pull script, and lists exactly what to remove.

---

## 1. Map files

### 1.1 Location and format

- One JSON file per level: `data/maps/<levelId>.json` (e.g. `data/maps/tallowFen.json`), committed to Git like the CSVs.
- Pretty-printed, stable key order, so Git diffs are readable.
- Every level in the `levels` tab MUST have a map file; start-up validation reports any that's missing.

### 1.2 Schema (version 1)

```json
{
  "version": 1,
  "level": "tallowFen",
  "druid": { "x": 1010, "y": 600 },
  "corridorWidth": 110,
  "lanes": [
    { "id": "N", "waypoints": [[980, 60], [900, 200], [1050, 330]] }
  ],
  "sectors": { "angles": [200, 320, 80], "nearRadius": 380 },
  "zoneQuotaOverrides": {},
  "candidates": [
    { "x": 640, "y": 310, "zone": "fN", "zoneAuto": true }
  ],
  "decor": [
    { "type": "tree", "variant": 2, "x": 120, "y": 340, "scale": 1.0, "flip": false }
  ],
  "mire": { "cell": 16, "rows": ["...RLE-encoded rows..."] },
  "palette": { "floor": "#2f3b2a", "corridor": "#5a4632" },
  "presentation": { "tollSound": null },
  "backgroundImage": null,
  "notes": ""
}
```

- **Lanes:** 3 per level (sectors depend on it), each with an `id` and a waypoint list; smoothing and arc length work as now.
- **Candidates:** `zoneAuto: true` means the zone is worked out from the geometry; `false` means the stored `zone` is a manual override.
- **Decoration:** every object stored individually, including signature landmarks (e.g. `"type": "landmark:gallows"`). `variant` picks among that type's shape variants.
- **Mire:** a coarse grid of 16 px cells, painted or erased; stored run-length encoded per row. Rendering smooths the edges (rim, reeds, bubbles as now). Step costs measure the travel line's length inside mire cells.
- **Palette:** every colour key the level's drawing uses.
- **backgroundImage:** optional path under `data/maps/backgrounds/` (e.g. `"tallowFen.png"`). When set, it's drawn under everything and **replaces** the procedural ground, corridors' fill and floor decoration. Lane corridors still need to be readable on it (the editor shows them for tracing).

### 1.3 Loading

- The game loads every map file at start-up, along with the CSVs, and builds the same in-memory level structures it uses now.
- Run-to-run variation is unchanged: jitter, the zone-quota role distribution, feature types, and the layout constraints (lane coverage, route cost) with reroll and fallback.
- Decoration and mire are now fixed from the file; `decorSeed`, `mireSeed` and their generators are no longer used at runtime (the generators stay for the editor's "Generate draft", §6).
- `?live` mode still reads the sheet for numbers; map files always come from the project.
- All existing start-up validation runs on the loaded map data.

---

## 2. Baking existing levels (first step)

- Write a map file for **all 35 existing levels** from exactly what the game shows today: current lanes, Druid position, sectors, corridor width, candidates with zones, quota overrides, the decoration and mire as currently generated (each object written out), palette, and presentation settings.
- After baking, the game loads from the files and **must look and play the same** (check by reading the code and a smoke check; no automated comparison tests).

---

## 3. Code organisation

- Editor code lives in `editor/` (`editor.html` at the project root loads `editor/*.js`).
- **One-way rule:** the editor may import the game's modules (drawing, map loading, validation, layout generation); **the game never imports anything from `editor/`.**
- Shared code that both need (map loading, map validation, candidate rules, step cost, route check) lives in game modules, not in `editor/`.
- Add this rule to `CLAUDE.md`.

---

## 4. Saving

- `tools/serve.py` gets a save endpoint: `POST /api/save-map?level=<id>` with the map JSON as the body. It writes `data/maps/<id>.json`.
- Restrictions: accept requests from **localhost only**; the level id must match `^[A-Za-z0-9]+$`; it may only write inside `data/maps/`; the body must parse as JSON with `version` and `level` matching the id. Write atomically (temp file, then rename).
- The editor's **Save** (and `Ctrl+S`) calls it. If the endpoint isn't there (e.g. on GitHub Pages), Save is disabled with the message `Saving works when the editor is run locally with tools/serve.py.`
- Background images aren't uploaded through the editor: the designer copies them into `data/maps/backgrounds/` by hand. The editor lists that folder through a small `GET /api/backgrounds` on the local server, for the background picker.

---

## 5. The editor

### 5.1 Layout

- **Top bar:** level picker (all levels, grouped by region; levels without a map file marked), **Save**, unsaved-changes dot, **Undo** / **Redo** (`Ctrl+Z` / `Ctrl+Y`), **Preview a run**, **Play this level**, **Generate draft**.
- **Left toolbar:** the tools (§5.3).
- **Centre:** the 1920×1080 stage, scaled to fit, drawn with the game's own renderer, so it looks exactly as in game.
- **Right panel:** properties of the selection, **layer toggles** (ground, lanes, mire, decoration, spots, zones, checks), **snap to grid** (off, 10, 20 px), and the **checks list** (§5.4).

### 5.2 Selection basics

Click to select, drag to move, box-drag to multi-select, `Delete` to remove, arrow keys to nudge (Shift for 10 px), `Esc` to deselect. Every change is undoable.

### 5.3 Tools

- **Lanes:** drag waypoints; click on a lane to insert a waypoint; delete waypoints (a lane keeps at least 2). The smoothed centreline and corridor edges update live. A **corridor width** slider in the right panel.
- **Druid and sectors:** drag the Druid; drag the 3 sector boundary handles around him; drag the near-radius ring. Zones recolour live, and candidates with `zoneAuto` update their zone.
- **Spots:** click to add a candidate, drag to move, delete. Each shows its footprint and jitter rings. Right panel: its zone (auto, or pick a zone to override, which sets `zoneAuto` false).
- **Decoration, place:** a picker with thumbnails of every decoration type and variant, including landmarks. Click to place; selected objects can be flipped, scaled (±10% steps), cycled through variants and deleted.
- **Decoration, scatter:** a brush with radius and density, and a mix (e.g. trees 60%, bushes 30%, rocks 10%). Painting adds individual objects, which can then be edited one by one. An **erase** mode removes objects under the brush. By default it keeps clear of corridors and of candidate footprints + jitter + margin (a toggle allows overriding).
- **Mire:** paint and erase brushes with a radius. Mire can't be painted on corridors (it's clipped automatically).
- **Palette:** a colour picker for every palette key, with a live preview, and **Copy palette from…** another level.
- **Background:** pick an image from `data/maps/backgrounds/` (or none), and an **editor-only opacity** slider for tracing. When an image is set, the procedural ground is hidden, in the editor and in game.

### 5.4 Live checks

Updated as you edit, shown both on the map (red marks) and as a list (clicking an entry selects the object):

- Candidate rules: spacing, corridor clearance, lane reach, on screen, clear of the HUD strip, name label, wave preview and boss bar areas.
- Zones: candidates per zone against the quota (with overrides), e.g. `fN 4 / 5`.
- Lanes: length and unopposed travel time for the level's slowest and fastest ground enemies; corridor width against any mini-boss or boss in the level's waves.
- Prep: the feature route cost over about 50 quick trials, the failure rate at the level's `stepBudget`, and a **suggested budget** for about 10% failures (shown, not written; the budget lives in the sheet).
- Decoration overlapping corridors or candidate areas (warning, not error).

### 5.5 Preview a run

Rolls the level's layout with a seed, as the game would (jitter, roles, feature types), and draws it: turret slots, resource spots with their types, empty spots. **Next seed** and **Previous seed** buttons, and a count of how often the layout constraints failed for that seed. Purely a preview; nothing is saved.

### 5.6 Play this level

Opens the game in a new tab straight into that level's Prep (`index.html?level=<id>`), with default resources (and a URL option for debug resources). If there are unsaved changes, it asks to save first.

### 5.7 Generate draft

For a level **without** a map file, or for one layer of an existing level (lanes, spots, decoration or mire), run the existing generators to produce a starting point. Always asks for confirmation, and is undoable. This is how new levels start.

### 5.8 GitHub Pages

`editor.html` isn't linked from the game. Opened online, it works read-only (Save, background listing disabled with the message in §4).

---

## 6. Phases

1. **Bake and load:** map files for all levels, the game loading them, data moved out of code and the sheet (§0–3). No visible change.
2. **Editor viewer and saving:** the editor page, level picker, layers, live checks, the save endpoint (§4, §5.1, §5.4).
3. **Editing geometry:** lanes, Druid and sectors, spots, selection, undo/redo, snap (§5.2, §5.3 first three tools).
4. **Decoration, mire, palette and background** (§5.3 remaining tools).
5. **Preview a run, Play this level, Generate draft** (§5.5–5.7).

---

## 7. Acceptance criteria

### Map files
- [ ] Every level has `data/maps/<id>.json` in the §1.2 schema; the game loads all levels from them and looks and plays as before.
- [ ] The listed data has moved out of code and the sheet; the `candidates` tab and level palette rows are retired; the pull script no longer fetches `candidates`.
- [ ] Jitter and role distribution still vary per run; decoration and mire are fixed.
- [ ] `backgroundImage` replaces the procedural ground when set.

### Editor
- [ ] `editor.html` shows any level exactly as in game, with layer toggles and live checks.
- [ ] Save writes the map file through the local server only, with the restrictions in §4; read-only elsewhere.
- [ ] Lanes, Druid, sectors, spots, decoration (place and scatter), mire, palette and background can be edited, with undo/redo and snap.
- [ ] Checks match the game's start-up validation and show a suggested step budget.
- [ ] Preview a run, Play this level and Generate draft work.
- [ ] The game never imports from `editor/`; the rule is in `CLAUDE.md`.

### General
- [ ] The report lists every sheet change needed; the pull script wasn't run.
- [ ] Everything else still works.
