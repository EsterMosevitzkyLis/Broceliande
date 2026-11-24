# Broceliande — M6c Addendum: Hidden Spots and Camouflage

**Status:** addendum to the existing specs in `docs/`, building on M6a and M6b.
**Goal:** the Lost Vale's two region twists: **hidden spots** in Prep (ferns hide what a spot holds until the Druid comes near) and **camouflage** in Combat (lizard hunters are invisible until revealed).

> Same conventions as M6a.

---

## 1. Hidden spots (Prep)

Active when the current region has `hiddenSpots` TRUE.

### 1.1 Which spots are hidden

- Each run, after the layout is rolled, a share of spots is **hidden** (seeded): `hiddenShareNear` (0.25) of near-zone spots and `hiddenShareFar` (0.5) of far-zone spots, rounded per zone. New `regions` columns; a level can override them with the same columns in the `levels` tab (blank = the region's value).
- Hidden spots are picked from **all** roles: turret slots, resource spots **and empty spots**. Empty spots that are hidden are drawn too, so a fern clump may hold nothing.
- **Designer control:** a new optional candidate field `hide` in the map file: `auto` (default), `always` or `never`. The editor's Spots panel gets a **Hidden** picker (auto / always / never), and Preview a run shows which spots are hidden.

### 1.2 How hidden spots look

- Every hidden spot is drawn as the **same clump of tall ferns**, fitting the spot footprint. A slight sway, nothing more. No badge, no type.
- **Tooltip:** `Ferns — something may be hidden here.` plus the travel cost.
- The footprint route preview works as usual.

### 1.3 Revealing

- At the start of Prep and **after every move**, every hidden spot within `REVEAL_RADIUS` (180 px, about 7 steps, TUNING) of the Druid's current position is **revealed**: the ferns part (a short rustle and a little fade) and the spot shows what it is. Revealed spots stay revealed for the battle.
- **Clicking a hidden spot** travels there (costing steps as usual). On arrival it's revealed, then:
  - **resource spot:** searched straight away, as when clicking a known one;
  - **turret slot:** its build menu opens (no extra travel);
  - **empty:** a small floater, `Only ferns`.

### 1.4 Combat

- When Combat starts, **all ferns clear** (a quick sway-and-fade).
- Turret slots that were never found become visible and buildable through Bough Doubles, as any Combat build.
- Resource spots that were never reached are simply missed (searching is Prep-only anyway). A hidden find in one of them is lost.

### 1.5 Debug

Overlay: hidden spots marked with their true role; the reveal radius around the Druid. Panel: hidden / revealed counts.

---

## 2. Camouflage (Combat)

Active when the current region has `camouflage` TRUE, for enemies with `camouflage` TRUE (lizard hunters and Grim hunters).

### 2.1 Being camouflaged

- A camouflaged enemy is drawn as a **faint shimmer** (very low opacity, with a slight wobble), and has no HP bar.
- It **can't be targeted** by turrets, summons or the Druid's strike, and isn't counted in the turret's target choice.
- It still walks, stops and throws spears normally. Its spears are visible.
- Area effects still hit it (Toader clouds, burn already on it, Slow Wisp bursts, Cinderjaw cones, Vulture splash if any).

### 2.2 Being revealed

A camouflaged enemy is **revealed** (drawn normally, targetable, HP bar shown) while any of these holds, and for `REVEAL_LINGER` (2 s, TUNING) after:

- it's within the current range of any turret;
- it's inside a poison cloud, or burning;
- it was hit by a Slow Wisp burst (reveals for 4 s).

And briefly, for `THROW_REVEAL` (1 s), each time it throws a spear (a short shimmer-flash), so the player sees where shots come from.

### 2.3 Look and sound

- Revealing: the shimmer resolves into the full hunter with a soft "shiver" effect; hiding again fades it back to the shimmer.
- A quiet rustle when a hunter is revealed.

### 2.4 Debug

Overlay: camouflaged enemies outlined in a dashed line with their reveal state.

---

## 3. Globals and columns

- `regions`: `hiddenSpots`, `camouflage`, `hiddenShareNear`, `hiddenShareFar` (TRUE / 0.25 / 0.5 for the Vale; FALSE / blank for the others).
- `levels`: optional `hiddenShareNear`, `hiddenShareFar` overrides.
- `globals`: `REVEAL_RADIUS` 180, `REVEAL_LINGER` 2, `THROW_REVEAL` 1.
- Map file: candidate field `hide` (`auto` / `always` / `never`).

---

## 4. Acceptance criteria

- [ ] In the Vale, a share of spots (including some empty ones) is hidden under identical fern clumps; `hide` pins and level overrides work; the editor shows and sets them.
- [ ] Spots within the reveal radius of the Druid are revealed at Prep start and after each move; clicking a hidden spot travels and resolves it (search, build menu, or "Only ferns").
- [ ] All ferns clear at Combat start; unfound turret slots become buildable; unreached resource spots are missed.
- [ ] Camouflaged hunters are a faint shimmer, untargetable, until revealed by turret range, clouds, burning, Wisp bursts or briefly by throwing; area effects still hit them.
- [ ] Neither twist affects the Cinderwood or Hag's Causeway.
- [ ] Debug overlays and panel lines work; the report lists changed tabs; the pull script wasn't run.
