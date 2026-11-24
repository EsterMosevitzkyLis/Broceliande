# Broceliande — M3b Addendum: Hag's Causeway Enemies, Rising Dead, Sinking Drops, the Bog King

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2P`, `M3A`). Everything there still applies unless this document overrides it.
**Goal:** Hag's Causeway's own enemies (replacing wolves, Bears and Ogres there), two region twists (**rising dead** and **sinking drops**), and the final boss, **the Bog King**.

> Same conventions as M3a (data in the sheet, ASCII CSV text, verification by reading the code, quick smoke check only).

---

## 0. Data changes and the sheet

As in M2k §0. This addendum changes `enemies` (new rows and columns), `drops` (new rows), `sounds` (new rows) and `globals` (new keys).

---

## 1. Enemy roles

New `enemies` column `role`: `swarm`, `brute`, `miniboss`, `flyer`, `boss`. Existing rows: wolf and Grim Wolf `swarm`, Bear and Grim Bear `brute`, Ogre and Grim Ogre `miniboss`, Stirge and Grim Stirge `flyer`.

Debug spawn keys (`B`, `O`, `S`, `Shift+G`/`B`/`O`/`S`, and any wolf spawn) now spawn the **current region's** enemy for that role, so the same keys test both regions.

---

## 2. New enemies

Stirges and Grim Stirges also appear in Hag's Causeway, unchanged. Wolves, Bears and Ogres don't; these replace them. All are **undead** (they rise again, §3), and all have **pale, cold green eyes** instead of the demonic red, marking them as a different kind of enemy.

All values TUNING. Blank Grim cells inherit from the base row (M2l).

| ID | Name | Role | HP | Speed | Damage | Every | Radius | Other |
|---|---|---|---|---|---|---|---|---|
| `thrall` | Drowned Thrall | swarm | 22 | 62 | 2.5 | 1.4 s | 16 | `rises` TRUE |
| `grimThrall` | Grim Drowned Thrall | swarm | 30 | | 3.2 | | | Grim, `slowResist` 0.5 |
| `brute` | Mirebound Brute | brute | 110 | 44 | 9 | 2.0 s | 27 | `meleeSlots` 2, `rises` TRUE |
| `grimBrute` | Grim Mirebound Brute | brute | 150 | | 11 | | | Grim, `armor` 1 |
| `knight` | The Drowned Knight | miniboss | 520 | 28 | 28 | 3.5 s | 52 (collision 30) | `windup` 0.8, `armor` 2, `meleeSlots` 3, boss rules, `rises` TRUE |
| `grimKnight` | Grim Drowned Knight | miniboss | 700 | | 34 | | | Grim, `splashRatio` 0.5, `splashRadius` 50 |

- The Drowned Knight uses all the Ogre's mini-boss rules: boss bar, banner (`The Drowned Knight wades out of the water!`), corridor-width check, melee slots, the unstick rule and keeping to one side. Its armor means weak hits do little: it rewards upgraded turrets and burning.
- Grim versions use the existing Grim look rules, adapted: darker, waterlogged, with **cold green** ember-style eyes and glowing outline (instead of orange), and pale mist instead of smoke.

### 2.1 Drops

Base drops follow their Cinderwood counterparts' current rows (Thrall ← Wolf, Brute ← Bear, Knight ← Ogre), plus Peat (Peat itself is added in M3c; add these rows then, or now with the resource id `peat` if M3c is built first):

| Enemy | Extra Peat drop |
|---|---|
| Drowned Thrall | 5%, 1 |
| Mirebound Brute | 30%, 1–2 |
| The Drowned Knight | 100%, 2–3 |

Grim drops: chance ×1.5, capped at 1.0, as before.

### 2.2 Looks and sound

- **Drowned Thrall:** a hunched, waterlogged corpse, grey-blue skin, strands of weed hanging off, dragging one foot.
- **Mirebound Brute:** a heavy corpse knotted together with roots and clods of peat, hunched under its own weight.
- **The Drowned Knight:** a tall figure in rusted, barnacled plate, water streaming from the joints, dragging a heavy, notched blade (its wind-up raises the blade).
- Sounds (event bus, existing spam limits): wet groans for Thralls, a deep creaking groan for Brutes, a metallic, sloshing roar for the Knight, plus `riseAgain` (§3) and their death sounds.

---

## 3. Twist: rising dead

Active when the current region has `risingDead` TRUE.

### 3.1 Rule

- An enemy with `rises` TRUE that dies **rises again once**:
  - Its body stays where it fell for `RISE_DELAY` (1.5 s), then it stands up at the same spot with `RISE_HP_FRAC` (0.5) of its max HP, and carries on along its lane.
  - A risen enemy is marked **risen** and never rises again.
- **Fire stops it:** an enemy that dies **while burning** (M2o) stays dead. It's shown as burning to ash instead of collapsing.
- Drops are rolled **only on its final death** (no double drops).
- The wave isn't cleared while a body is waiting to rise. "Enemies left" counts waiting bodies.
- A body waiting to rise doesn't collide, can't be targeted and frees any Druid melee slots. When it rises it queues for slots again as normal.

### 3.2 The Drowned Knight

- Rises once **as a boss**: its boss bar refills to 50% and a banner reads `The Drowned Knight rises again!`.
- Same fire rule: killed while burning, it stays down.

### 3.3 Look

- On death, the body slumps and half-sinks, with bubbles and a faint green glow during the delay.
- On rising, it pulls itself up with mud and water streaming off.
- Risen enemies keep a **muddy, greenish tint** and slightly torn look, so players can tell they won't rise again.
- Sound `riseAgain`: a wet, gurgling groan.

---

## 4. Twist: sinking drops

Active when the current region has `sinkingDrops` TRUE.

- Once a drop has **landed** (M1g §1), it starts sinking into the mire. After `DROP_SINK_TIME` (12 s) it's gone.
- **Look:** it slowly settles lower, darkens and gets smaller, with a few bubbles. In its last 3 s it blinks gently.
- Squirrels collect items as normal; there's no change to their targeting.
- Sinking pauses during `ENDING`. The Victory sweep (M2d §2) collects only the items still above the mire.
- In regions without the twist, drops never sink (as now).

---

## 5. The Bog King (final boss)

Appears only at **Bog King's Rest**.

### 5.1 Stats

`enemies` row `bogKing`, role `boss`. All TUNING.

| HP (before `enemyHpMult`) | Speed | Damage | Every | Wind-up | Radius | Collision | Armor | Melee slots |
|---|---|---|---|---|---|---|---|---|
| 1200 | 22 | 40 | 4.0 s | 1.0 s | 60 | 34 | 1 | 3 |

- He doesn't rise again (`rises` FALSE).
- Burning, slow (`slowResist` 0.5) and Corrosion affect him.
- Corridor check: levels with the Bog King need `corridorWidth` ≥ 2 × 60 + 2 = 122.

### 5.2 Abilities

- **Raise the drowned:** every `BOG_KING_SUMMON_INTERVAL` (10 s), he raises `BOG_KING_SUMMON_COUNT` (3) Drowned Thralls from the bog around him, in his lane just ahead of and beside him. They're normal Thralls (they can rise again). Cap: `BOG_KING_SUMMON_MAX` (12) of his raised Thralls alive at once.
- **Sink and resurface:** the first time his HP drops to 50%, he **sinks** into the bog (3 s, can't be damaged or targeted, a ring of bubbles), then **re-emerges at the start of a different lane** (seeded) and carries on from there. All slow, burn and Corrosion statuses are cleared when he sinks.
- Victory needs the Bog King dead, plus all other enemies.

### 5.3 Presentation

- **Entrance:** his lane's entrance bubbles and darkens for 2 s, then he rises from the peat. Banner: `The Bog King rises from the peat!` Deep, slow roar.
- **Boss bar:** `THE BOG KING`, with a crown icon. It stays visible (greyed) while he's submerged.
- **Look:** huge and hunched, made of black peat, roots and rotting reeds, with a crude crown of antlers and rusted iron, and cold green eyes. He trails dark water and drags his hands through the mud.
- **Attack:** raises both fists overhead (wind-up), then slams them down, with a wide splash ring and a strong screen shake (reuse the Ogre's system, stronger values).
- **Raising Thralls:** he spreads his arms, and three Thralls claw up out of the ground around him.

### 5.4 Globals

| Key | Value |
|---|---|
| `RISE_DELAY` | 1.5 |
| `RISE_HP_FRAC` | 0.5 |
| `DROP_SINK_TIME` | 12 |
| `BOG_KING_SUMMON_INTERVAL` | 10 |
| `BOG_KING_SUMMON_COUNT` | 3 |
| `BOG_KING_SUMMON_MAX` | 12 |
| `BOG_KING_SINK_TIME` | 3 |

---

## 6. Debug

| Key | Action |
|---|---|
| `Shift+J` | Spawn the Bog King at the start of a random lane (Combat only; logs an error if corridors are too narrow) |

Overlay: bodies waiting to rise (with their countdown); risen enemies marked; sinking timers on drops.
Panel: rises this battle, enemies burned to ash (prevented rises), drops lost to the mire.

---

## 7. Acceptance criteria

- [ ] Enemies have roles; debug spawn keys spawn the current region's enemy for each role.
- [ ] Drowned Thrall, Mirebound Brute and The Drowned Knight (plus Grim versions) exist with the stats, looks and sounds in §2; green eyes; the Knight uses the mini-boss rules.
- [ ] Rising dead: undead enemies rise once at 50% HP after 1.5 s; burning deaths stay dead; drops only on final death; waves wait for waiting bodies; risen enemies are visibly marked.
- [ ] The Drowned Knight rises once as a boss with its bar refilled to 50%.
- [ ] Sinking drops: landed drops sink over 12 s with a visible countdown, pause during ENDING, and the sweep only collects what's left. Only in regions with the twist.
- [ ] The Bog King: stats, raising Thralls with the cap, sinking at 50% and resurfacing on another lane, entrance, boss bar, looks and sounds.
- [ ] Twists are switched per region by the `regions` tab.
- [ ] Debug additions work; the report lists changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
