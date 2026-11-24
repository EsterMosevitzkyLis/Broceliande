# Broceliande — M4b Addendum: Hand Controls in the Map Editor

**Status:** addendum to the existing specs in `docs/`, building on `M4A_MAP_EDITOR_ADDENDUM.md`. Everything there still applies unless this document overrides it. Built as **Phase 6**, after M4A's Phase 5.
**Goal:** give the designer direct control over things that are currently rolled or global: pinned spot roles, per-spot jitter, zone and level rules, plus two comfort features (lane labels with coverage lines, and a read-only level data panel).

> Same conventions as before: **MUST** / **SHOULD**, **TUNING** marks starting guesses, verification by reading the code, quick smoke check only (see `CLAUDE.md`). Ask rather than guess where this is silent.

---

## 1. Pinned spot roles

### 1.1 Data

New optional candidate field `pin` in the map file (blank or missing = `auto`):

| `pin` | Meaning |
|---|---|
| `auto` | Rolled each run, as now |
| `turret` | Always a turret slot |
| `feature` | Always a resource spot (type rolled from the mix) |
| `feature:<typeId>` | Always a resource spot of that type, e.g. `feature:pond` |
| `notVacant` | Always used: turret slot or resource spot, rolled |
| `vacant` | Always empty |

### 1.2 Layout generation

Per zone, each run:

1. Pinned `turret` spots count towards the zone's turret quota; pinned `feature` / `feature:<type>` spots towards its feature quota; pinned `vacant` spots are empty.
2. The remaining quota is filled from the zone's unpinned spots (and `notVacant` spots, which must end up in one of the two roles), as now.
3. **Feature types:** pinned types are taken from the level's feature mix first; the rest of the mix is shuffled over the other resource spots.
4. The layout constraints (lane coverage, route band) still apply. Rerolls only reshuffle what isn't pinned.

### 1.3 Validation

Errors (in the editor's checks and at game start-up):

- A zone's pinned turrets exceed its turret quota, or its pinned features exceed its feature quota.
- A zone's `notVacant` spots can't all be used within its quotas.
- Pinned feature types exceed the level's feature mix (e.g. 3 spots pinned to `pond` with only 2 Ponds in the mix).

### 1.4 Editor

- Spots tool, right panel: a **Role** picker with the six options (and the feature type list for `feature:<type>`).
- Pinned spots show a small badge on the map: `T`, `R`, `R:Pond`, `≠∅` or `∅`.
- **Preview a run** shows pins as fixed and everything else rolled.

---

## 2. Per-spot jitter

- New optional candidate field `jitter` (px). Missing = the global `LOCATION_JITTER`.
- Every rule that uses jitter uses each spot's own value: corridor clearance (`LOCATION_RADIUS + jitter`), screen and UI-area clearance, and spacing between two spots (`(R + jitterA) + (R + jitterB) + LOCATION_GAP`). Decoration clearance too.
- Editor: a **Jitter** slider (0 to 40 px) in the spot's panel, with a "default" button. The jitter ring updates live.

---

## 3. Zone and level rules in the editor

### 3.1 Zone rules panel

A **Zone rules** section in the right panel (visible with the Druid tool or the Spots tool):

- One row per zone: the zone ID, its candidates, pinned counts, and its **turret** and **feature** quotas.
- Quotas show the global default (`ZONE_NEAR_*`, `ZONE_FAR_*`) in grey; typing a value creates an override for that zone (stored in the map file's `zoneQuotaOverrides`), and a reset button removes it.
- The level's totals (turret slots, resource spots) are shown underneath, with a warning if resource spots don't match the feature mix total.

### 3.2 Per-level rules

New optional map-file object `rules`:

| Key | Default (from globals) | Meaning |
|---|---|---|
| `laneMinTurretSlots` | `LANE_MIN_TURRET_SLOTS` | Turret slots that must cover each lane |
| `routeMinFactor` | `FEATURE_ROUTE_MIN_FACTOR` | Prep route band, lower edge |
| `routeMaxFactor` | `FEATURE_ROUTE_MAX_FACTOR` | Prep route band, upper edge |

- Shown in a **Level rules** section, default in grey, typing overrides, reset removes. The game and the checks use the level's value when set.
- Changing a rule reruns the affected checks (the Prep trials after the usual pause).

---

## 4. Lane labels and coverage lines

- Each lane's **entrance** shows its ID in a small label (e.g. `N`, `SW`), the name `spawns` rows use. Shown with the Lanes tool, and as a layer toggle (**Lane labels**) otherwise.
- **Coverage:** when one spot is selected, draw thin lines from it to the nearest point of each lane its base turret range reaches, and list them in its panel: `Covers: N, SW`.
- The checks list adds, per lane, how many candidates cover it and how many turret slots typically end up covering it (from the Preview / Prep trials).

---

## 5. Level data panel (read-only)

A **Level data** section in the right panel, showing what the sheet data (as loaded from `data/*.csv`) says about the open level:

- Name, region, row and node type.
- `enemyHpMult`, `stuckTime`.
- `stepBudget`, with the editor's suggested budget next to it.
- Feature mix, with the number of spots pinned to each type.
- One line per wave from the waves and spawns data, e.g. `W3: 14T 6S 1B (gap 15)`.

It's read-only: the numbers are edited in the sheet. A small note says so.

---

## 6. Acceptance criteria

- [ ] Spots can be pinned to the six roles; generation respects pins, quotas and the feature mix; validation catches impossible pins; badges and Preview show them.
- [ ] Per-spot jitter works in every rule that uses jitter, with a slider and default.
- [ ] Zone quotas and per-level rules can be overridden and reset in the editor; the game and checks use them.
- [ ] Lane entrances are labelled; a selected spot shows its coverage lines and list; checks show per-lane coverage.
- [ ] The Level data panel shows the sheet's values for the open level, including wave summaries.
- [ ] Map files stay readable and stable; saving an unchanged level still changes nothing.
- [ ] Everything else still works.
