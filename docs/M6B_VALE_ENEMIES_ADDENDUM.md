# Broceliande — M6b Addendum: Vale Enemies, Turret HP, Shields and the Iron Oracle

**Status:** addendum to the existing specs in `docs/`, building on M6a.
**Goal:** the Lost Vale's enemies (none of them Stirges): spiders, lizardmen, lizard hunters (the first **ranged** enemy, and the first that **damages turrets**), giant lizards and lizard shamans (who **shield** their kin). Mini-bosses: the **Broodmother** (and Grim Broodmother) and the **High-Shaman**. The final boss: **the Iron Oracle**, shielded by relic pylons. Turrets gain **HP** and can be **repaired** by a Bough Double.

> Same conventions as M6a.

---

## 1. Factions and looks

- **Lizardfolk** (lizardmen, hunters, giant lizards, shamans, the High-Shaman, the Iron Oracle): green-bronze scales, crests and frills, bone and feather ornaments, **amber slit-pupil eyes** (distinct from the demons' red and the undead's green).
- **Spiders** (and the Broodmother): black-violet carapaces, long legs, a cluster of small glinting eyes.

All use the shared enemy systems (roles, Grim variants with inheritance, drops, HP bars, statuses) unless stated here.

---

## 2. Turret HP and repair

### 2.1 HP

- New `turrets` column `hp`, per level (TUNING): Sprinkler 40 / 50 / 60 / 70 / 80; Toader 45 / 55 / 65 / 75 / 85; Cinderjaw and Peatjaw 50 / 60 / 70 / 80 / 90; Scale Bulwark emitter, see M6d.
- **Only enemies with the new `enemies` column `attacksTurrets` = TRUE can damage turrets.** For now that's lizard hunters (and their Grim version). The Cinderwood and Hag's Causeway play exactly as before.
- A damaged turret shows a small HP bar under it.
- Upgrading a turret raises its max HP and **adds** the difference to its current HP (it doesn't heal fully).

### 2.2 Destroyed turrets

- At 0 HP the turret collapses into a **wreck** (a small pile of broken pieces on the slot), with a crunch sound and a bit of debris.
- An upgrade or repair in progress on it is cancelled and refunded, as for any cancelled job.
- The slot becomes **buildable** again (through a Bough Double, as any Combat build); building on it clears the wreck.

### 2.3 Repair

- New Bough Double job: **Repair**, on a damaged (not destroyed) turret. Target it in the Double's targeting mode; its tooltip shows `Repair` with the cost.
- Cost: the Double's own Bough plus `REPAIR_COST` (2 Pits). Time: `REPAIR_TIME` (2.5 s). It restores full HP. The turret doesn't fire while being repaired. Undo and refund rules as for other jobs. All TUNING (`globals`).

---

## 3. Shields

A new status, `shielded`, in the shared status system:

- A shield has an amount; damage is taken from the shield first, then from HP.
- **Order of damage:** Corrosion multiplier, then armor (minimum 1 per hit), then the shield, then HP.
- Shields absorb every kind of damage, including burn ticks and cloud ticks.
- A shield lasts `duration` seconds or until it's used up. A new shield on a shielded enemy **resets** it to the larger amount (no stacking).
- **Look:** a shimmering bubble of overlapping translucent scales around the enemy, and a thin cyan-green segment on its HP bar. Breaking it: a small shatter of scale fragments and a glassy chime.
- Shield amounts scale with the level's `enemyHpMult`.

---

## 4. Enemies

All values TUNING. Blank Grim cells inherit from the base row.

### 4.1 Stats

| ID | Name | Role | HP | Speed | Damage | Every | Radius | Other |
|---|---|---|---|---|---|---|---|---|
| `spider` | Spider | swarm | 14 | 90 | 1.5 | 0.9 s | 13 | |
| `grimSpider` | Grim Spider | swarm | 19 | | 2 | | | Grim, `slowResist` 0.5 |
| `lizardman` | Lizardman | warrior | 34 | 60 | 4 | 1.5 s | 17 | |
| `grimLizardman` | Grim Lizardman | warrior | 46 | | 5 | | | Grim, `armor` 1 |
| `hunter` | Lizard Hunter | ranged | 26 | 66 | 6 (spear) | 2.4 s | 15 | `attackRange` 240, `attacksTurrets` TRUE, `camouflage` TRUE |
| `grimHunter` | Grim Lizard Hunter | ranged | 35 | | 8 | | | Grim, `attackRange` 260 |
| `giantLizard` | Giant Lizard | brute | 140 | 42 | 11 | 2.0 s | 28 | `meleeSlots` 2, `armor` 1 |
| `grimGiantLizard` | Grim Giant Lizard | brute | 190 | | 14 | | | Grim, `armor` 2 |
| `shaman` | Lizard Shaman | support | 30 | 55 | 3 | 1.8 s | 16 | Shield ability (§4.3) |
| `grimShaman` | Grim Lizard Shaman | support | 40 | | | | | Grim, stronger shields (§4.3) |

New roles: `warrior`, `ranged`, `support` (alongside `swarm`, `brute`, `miniboss`, `boss`).

### 4.2 Lizard hunters (ranged)

- Hunters walk their lane as usual. When a **valid target** is within `attackRange`, they **stop** and throw spears at it every `attackInterval`; when no target is in range, they walk on.
- **Target priority:** summons (Vultures, Squirrels) in range, then **turrets** in range (lowest HP first), then the Druid.
- **Spears** are visible projectiles (a thin wooden spear with a bone tip), fast but not instant; they hit their target if it's still there.
- At 240 px, a hunter outranges a level 1 Sprinkler (220 px) but not a level 2 (264 px): upgrades matter against hunters.
- Camouflage: see M6c.

### 4.3 Lizard shamans (support)

- Every `SHAMAN_SHIELD_INTERVAL` (6 s), a shaman shields up to `SHAMAN_SHIELD_TARGETS` (3) of the nearest **lizardfolk** within `SHAMAN_SHIELD_RANGE` (180 px), including itself, for `SHAMAN_SHIELD_AMOUNT` (12) lasting `SHAMAN_SHIELD_DURATION` (8 s). Spiders are never shielded.
- Grim shamans: every 5 s, amount 18.
- **Look:** a robed lizard with a staff topped by a glowing relic shard; when casting, it raises the staff and thin green-gold threads reach the shielded allies.
- Debug overlay shows shield links.

### 4.4 Spiders and others

Spiders, lizardmen and giant lizards have no special abilities beyond their stats (armor on giant lizards).

### 4.5 Drops

Follow the existing patterns (gold from humanoids only, M3e; Grim chances ×1.5). Lizard scales (M6d) are added there. Starting values:

| Enemy | Gold | Other |
|---|---|---|
| Spider | none | Feathers 5%, 1 |
| Lizardman | 25%, 1–3 | Pits 10%, 1–2 |
| Lizard Hunter | 30%, 2–4 | Feathers 10%, 1 |
| Giant Lizard | none | Pits 40%, 2–3 |
| Lizard Shaman | 50%, 3–5 | Shells 20%, 1 |

---

## 5. Mini-bosses

All use the mini-boss rules (boss bar, banner, corridor width check, melee slots, keeping to one side, unstick rule).

### 5.1 The Broodmother

| HP | Speed | Damage | Every | Wind-up | Radius | Collision | Melee slots |
|---|---|---|---|---|---|---|---|
| 600 | 30 | 20 | 3.0 s | 0.6 s | 50 | 30 | 3 |

- **Egg sacs:** every `BROOD_EGG_INTERVAL` (6 s) she lays an egg sac on the lane just behind her.
  - An egg sac is a **stationary target** (HP 20, scaled by `enemyHpMult`): turrets, summons and the Druid can attack it like an enemy.
  - After `BROOD_HATCH_TIME` (5 s) it **hatches into 4 spiders**, unless destroyed first.
  - Egg sacs count as enemies for "Enemies left" and the wave clearing; they don't block or attack.
- Banner: `The Broodmother crawls out of the dark!`
- **Look:** a huge bloated spider, pale-banded abdomen, egg clusters on her back; eggs are pale, veined, pulsing sacs.

### 5.2 Grim Broodmother (Broodmother's Den)

HP 820; lays an egg sac every 5 s; eggs have 28 HP and hatch into 5 spiders. Grim look rules.

### 5.3 The High-Shaman

| HP | Speed | Damage | Every | Radius | Collision | Melee slots |
|---|---|---|---|---|---|---|
| 560 | 30 | 18 | 3.0 s | 44 | 28 | 3 |

- **Relic pulse:** every 8 s, shields **every lizardfolk** within 260 px for 20, and **himself** for 60 (all lasting 8 s), with a visible expanding ring of green-gold light.
- **Empowering presence:** lizardfolk within 260 px move 15% faster.
- Banner: `The High-Shaman raises the relic!`
- **Look:** a tall, elaborately crested lizard in a feathered cloak, carrying a large Elder relic on a pole that glows during the pulse.

---

## 6. The Iron Oracle (final boss)

Appears only at **The Shaman's Perch**.

### 6.1 Stats

`bossOracle` row (id `ironOracle`), role `boss`. Before `enemyHpMult`:

| HP | Speed (descending) | Damage | Every | Wind-up | Radius | Collision | Armor | Melee slots |
|---|---|---|---|---|---|---|---|---|
| 1100 | 26 | 45 | 4.0 s | 1.0 s | 56 | 32 | 1 | 3 |

Corridor check: The Shaman's Perch needs `corridorWidth` ≥ 2 × 56 + 2 = 114.

### 6.2 The fight

**Stage 1: on his perch (bound to the bridge).**
- At the start of the level's wave 3, the Oracle appears **at the entrance of one lane** (his perch), standing still.
- He's **invulnerable** while any **relic pylon** stands. Three **thin bright links** run from the pylons to him.
- Every 12 s he casts **Iron Call**: every lizardfolk on the map gains a shield of 15, and **2 lizardmen** appear at his lane's entrance.

**Relic pylons.**
- Three **Elder relic pylons**, placed in the level's map file as decoration of type `landmark:relicPylon` (the editor places them like any landmark).
- Each is a **stationary target**: HP 250 (**not** scaled by `enemyHpMult`), armor 0. Turrets, Vultures and the Druid's strike can attack pylons; **turrets target a pylon only when no enemy is in their range.**
- Breaking a pylon: a crack of light, a falling chime, and its link to the Oracle snaps.
- Editor check (Shaman's Perch only): each pylon must be within base turret range of at least 2 candidate spots, and none on a corridor.

**Stage 2: the descent.**
- When the last pylon falls: banner `The Oracle's link is broken!`, his shield shatters, and he **walks down his lane** like a boss (melee, wind-up, screen shake), still casting Iron Call every 12 s.
- Scale Bulwark walls hold him (M6d).
- Victory needs the Oracle dead, plus all other enemies.

### 6.3 Presentation

- **Look:** a gaunt, towering lizard shaman fused with dark metal: an iron mask over half his face, metal plates grown into his scales, a long staff of the same dark metal as the Ironspan. His eyes glow cold white instead of amber.
- **Pylons:** tall standing stones banded with dark metal, a glowing core, humming.
- Boss bar `THE IRON ORACLE`, greyed and marked "bound" during stage 1, with three small pylon pips that go dark as pylons fall.
- Sounds: a deep metallic hum (pylons), a resonant voice-like drone (Iron Call), a heavy staff slam (attack), a ringing crash (death).

---

## 7. Globals (all TUNING)

`REPAIR_COST` 2 (Pits), `REPAIR_TIME` 2.5, `SHAMAN_SHIELD_INTERVAL` 6, `SHAMAN_SHIELD_TARGETS` 3, `SHAMAN_SHIELD_RANGE` 180, `SHAMAN_SHIELD_AMOUNT` 12, `SHAMAN_SHIELD_DURATION` 8, `BROOD_EGG_INTERVAL` 6, `BROOD_HATCH_TIME` 5, and the Iron Oracle's values (`ORACLE_CALL_INTERVAL` 12, `ORACLE_CALL_SHIELD` 15, `ORACLE_CALL_SPAWNS` 2, `PYLON_HP` 250, `PYLON_ARMOR` 0).

---

## 8. Acceptance criteria

- [ ] All ten regular enemies exist with their stats, roles, looks (amber eyes, spider carapaces), sounds and drops; Stirges don't appear in the Vale.
- [ ] Turrets have HP per level; only `attacksTurrets` enemies damage them; wrecks, cancelled jobs, rebuilding and Bough Double Repair work.
- [ ] Hunters stop and throw spears at summons, then turrets, then the Druid, within their range.
- [ ] Shields absorb damage in the stated order, refresh without stacking, and are visible; shamans cast them on nearby lizardfolk.
- [ ] Broodmother (and Grim) lay targetable egg sacs that hatch into spiders unless destroyed.
- [ ] The High-Shaman's relic pulse and speed aura work.
- [ ] The Iron Oracle: bound and invulnerable on his perch until three pylons are broken, Iron Call, then his descent; pylons are targetable stationary objects; the editor checks pylon placement.
- [ ] Debug Spawn enemy covers every new type; the report lists changed tabs; the pull script wasn't run.
- [ ] Everything else still works, and the Cinderwood and Hag's Causeway play as before.
