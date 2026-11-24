# Broceliande — M6d Addendum: Lizard Scales, Saurian Dens and the Scale Bulwark

**Status:** addendum to the existing specs in `docs/`, building on M6a–M6c.
**Goal:** the Vale's resource, **Lizard Scales**, from lizardfolk and their dens; and a new defensive turret, the **Scale Bulwark**, which raises a wall across a lane. Scales and the Bulwark are available **from the Lost Vale onward** (region order 3 and later), including future regions without lizards.

> Same conventions as M6a.

---

## 1. Lizard Scales

- New material resource `scales`, name **Lizard Scales**. Order: after Peat.
- **Icon:** three overlapping green-bronze scales with a faint sheen, in the shared icon definition.
- **HUD:** shown once the run has reached region 3 **or** the player has any.
- Chime: a light, dry clicking tone.
- Works everywhere materials do (floaters, drops, sweep, carry-over, death penalty, cost rows, `G` +10).

### 1.1 Sources

- **Drops** (new `drops` rows; Grim ×1.5): Lizardman 25%, 1–2 · Lizard Hunter 25%, 1 · Giant Lizard 60%, 2–3 · Lizard Shaman 40%, 1–2 · High-Shaman 100%, 4–6 · The Iron Oracle 100%, 8–10. Spiders and egg sacs: none.
- **New resource spot: Saurian Den** (`saurianDen`): a low burrow under roots, lined with shed skins and scraps of woven grass. Yields Scales 2–4, Pits 0–2, Gold 1–3; `mainResource` scales. New `features` columns `scales_min`, `scales_max`; new `levels` column `mix_saurianDen` (0 outside the Vale).
- **Traders:** a new `trade` row for scales (`baseValue` 2.5). Scales are stocked by traders **only in regions with order 3 or more**: add a `trade` column `minRegionOrder` (blank = any), set to 3 for scales.

---

## 2. The Scale Bulwark (new turret)

### 2.1 Concept

A defensive turret: a squat, scaled emitter on a spot that raises a **wall of overlapping scales across a lane**. Ground enemies are stopped at the wall and must break it, while your other turrets fire on them. The wall regrows while the emitter stands.

### 2.2 Availability

- New `turrets` column `minRegionOrder`. The Bulwark's is **3**: it appears in build menus only in the Lost Vale and later regions.
- No regional variants for now.

### 2.3 Two parts

| Part | Where | HP | Notes |
|---|---|---|---|
| **Emitter** | On the spot | Turret HP (§2.6) | Can be damaged by hunters, repaired by a Bough Double, destroyed (wreck) like any turret |
| **Wall** | Across the chosen lane point | Wall HP (§2.6) | Blocks ground enemies; regrows after a delay while the emitter stands |

### 2.4 Building and placing the wall

1. Choose **Scale Bulwark** in a slot's build menu (Prep, or a Bough Double in Combat).
2. **Wall placement mode:** the Bulwark's **reach** (a circle around the slot) appears, and the parts of lane centrelines inside it light up. A **ghost wall** follows the mouse along the lit lanes, spanning the corridor at right angles to the lane.
3. **Click** to confirm. **Esc** or right-click cancels at no cost.
4. The wall's position is **final** for the battle.

Rules for wall positions:

- Inside the reach, on a lane, spanning the full corridor width.
- At least `WALL_MIN_GAP` (60 px) along the lane from any other wall.
- Not within `WALL_DRUID_CLEARANCE` (150 px) of the Druid.
- Invalid positions show the ghost in red with a short reason.

In step-mode Prep, the step cost is paid when the wall is confirmed, and the Druid then travels and builds as usual.

### 2.5 The wall in Combat

- **Ground enemies** reaching the wall stop and attack it, as at a landed Vulture (melee enemies bite it; blocked hunters throw spears at it). Enemies queued behind wait (the unstick rule doesn't let them pass a wall).
- **Bosses and mini-bosses are held too**, and attack it with their full blows.
- Flying enemies pass over it.
- When the wall breaks: a crumble of scale pieces and a dry crack. It **regrows** after `wallRegrow` seconds, rising from the ground over 0.5 s, as long as the emitter stands. If the emitter is destroyed, the wall falls and doesn't regrow.
- A wall that regrows where enemies are standing pushes them gently back along the lane to its far side (the side they came from), so nothing ends up trapped inside it.
- While the emitter is being upgraded or repaired, the wall stays up (and can't regrow if broken).

### 2.6 Levels

New `turrets` columns `wallHp`, `wallRegrow`, `reach`, `thornsRatio` (blank where unused). All TUNING.

| Level | Name | Emitter HP | Wall HP | Regrow | Reach | Special | Cost | Time |
|---|---|---|---|---|---|---|---|---|
| 1 | Scale Bulwark | 60 | 80 | 8 s | 200 | | 2 Pits + 3 Scales (build) | 2.5 s |
| 2 | | 70 | 110 | 7 s | 215 | | 3 Pits + 2 Scales | 3 s |
| 3 | | 80 | 140 | 6 s | 230 | | 4 Pits + 3 Scales + 1 Feather | 4 s |
| 4 | **Shieldscale Rampart** | 90 | 180 | 5 s | 245 | | 6 Pits + 4 Scales + 1 Bough | 5 s |
| 5 | **Thornscale Bastion** | 100 | 230 | 4 s | 260 | **Thorns:** attackers take 30% of the damage they deal to the wall | 8 Pits + 5 Scales + 1 Bough | 6 s |

Wall HP doesn't scale with the level's `enemyHpMult` (the enemies already do).

### 2.7 Look and sound

- **Emitter:** a squat stone-and-wood base covered in overlapping green-bronze scales, with a ridge of upright scales on top that glows faintly when the wall rises. Higher levels add more scale plates; level 5 has thorny spikes.
- **Wall:** a curved barrier of large overlapping scales spanning the corridor, with an HP bar when damaged; cracks appear as it weakens.
- Sounds: a grinding rise (wall up), dry scale-knocks (hits), a brittle crack (break).

---

## 3. Acceptance criteria

- [ ] Lizard Scales: resource, icon, HUD rule, chime, drops, Saurian Dens, and traders stocking scales only from region 3.
- [ ] The Scale Bulwark appears in build menus only from region 3; placing it shows its reach, lit lanes and a ghost wall; invalid positions are explained; the position is final.
- [ ] The wall stops ground enemies (including bosses) and is attacked; blocked enemies don't pass via the unstick rule; flyers pass over.
- [ ] The wall regrows while the emitter stands; the emitter has turret HP, can be repaired, and its destruction drops the wall.
- [ ] Five levels with the stats, costs and names in §2.6; level 5 thorns.
- [ ] The report lists changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
