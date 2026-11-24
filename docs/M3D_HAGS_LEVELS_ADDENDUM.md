# Broceliande — M3d Addendum: The 18 Levels of Hag's Causeway

**Status:** addendum to the existing specs in `docs/` (`M1_SPEC.md`, `M1B`–`M1J`, `M2A`–`M2P`, `M3A`–`M3C`). Everything there still applies unless this document overrides it.
**Goal:** replace the 18 placeholder Hag's Causeway levels (M3a §1.3) with real ones: layouts, palettes, decoration, mire, resource mixes and hand-written waves.

> Same conventions as M3a (data in the sheet, ASCII CSV text, verification by reading the code, quick smoke check only).

---

## 0. Data changes and the sheet

As in M2k §0. This addendum changes `levels`, `candidates`, `palettes`, `waves`, `spawns` and `sounds`. `spawns` has a dropdown and `waves` has formula columns: re-add them after re-importing (see the M2l prompts).

---

## 1. Rules for every Hag's Causeway level

- All existing scene rules apply (M2a §5.3, M2b §3.5, M1j zones and the current candidate rules): 3 lanes from different screen edges, winding, about 25–30 s of travel for a **wolf-speed** enemy (Thralls are slower, so they take a little longer); off-centre Druid in a new position; 3 sectors × near/far zones; enough candidates for the zone quotas (near 2 + 1, far 3 + 2), aiming for 4 per near zone and 8 per far zone where there's room; name label and wave preview clear of candidates.
- **Corridor width** at least 2 × the visual radius + 2 of any mini-boss or boss in the level (Knight 106, Bog King 122).
- **Default feature mix** (9): 1 Tree, 2 Reed Patch, 1 Shrub, 1 Ruins, 2 Pond, **2 Peat Bog**. Per-level changes below.
- **Mire:** `mireCoverage` per level below (M3c §3).
- **Palette:** each level gets its own, within the region's family (dark teal, murky green, grey-brown, bone-white, with cold mist), plus **one** signature decoration.
- **Step budget:** calibrate each level as before, now including mire costs, aiming for at most about 10% of runs failing the route check. Report the values; the designer will set them in the sheet.
- **Waves:** hand-written in the existing `waves` / `spawns` format, with a one-line summary comment per wave. Use the wave-gap rule (gap after clear or 10 s after the last spawn) as everywhere else.

### Shorthand in the wave tables

T = Drowned Thrall, GT = Grim Drowned Thrall, S = Stirge, GS = Grim Stirge, B = Mirebound Brute, GB = Grim Mirebound Brute, K = The Drowned Knight, GK = Grim Drowned Knight. Counts are totals for that wave. Remember that undead enemies rise once, so they're tougher than the numbers suggest.

All values TUNING.

---

## 2. The levels

### Row 1 (HP ×1.3, 4 waves)

**Tallow Fen** (`tallowFen`): *"Pale candles of fat float on the water. Someone still lights them."*
- Corridor 110 · mire 0.10 · mix: default · Signature: tallow candles floating in still pools.
- Style: gentle introduction to rising dead, even small bursts.

| W1 | W2 | W3 | W4 |
|---|---|---|---|
| 10T | 12T 4S | 14T 6S 1B | 16T 8S 2B |

### Row 2 (HP ×1.35, 4 waves)

**The Lantern Fen** (`lanternFen`): *"Lights drift over the reeds. Follow them and you won't come back."*
- Corridor 115 · mire 0.15 · mix: 1 Tree, 2 Reed, **2 Shrub**, 1 Ruins, 1 Pond, 2 Peat · Signature: hanging lanterns on crooked poles, a few lit.
- Style: Stirge flocks drifting in with every burst.

| W1 | W2 | W3 | W4 |
|---|---|---|---|
| 10T 6S | 12T 8S | 14T 10S 1B | 16T 12S 1B 2GS |

**The Rotting Ford** (`rottingFord`): *"The old ford has gone soft. Things wade across it that shouldn't."*
- Corridor 110 · mire 0.12 · mix: 1 Tree, 2 Reed, 1 Shrub, 1 Ruins, **3 Pond**, 1 Peat · Signature: a rotted wooden footbridge beside a lane.
- Style: Brutes lead each wave, Thralls follow behind them.

| W1 | W2 | W3 | W4 |
|---|---|---|---|
| 8T 1B | 10T 4S 2B | 12T 6S 2B | 14T 6S 3B |

**Bonewhite Willows** (`bonewhiteWillows`): *"The willows have gone white as bone, and still they weep."*
- Corridor 115 · mire 0.12 · mix: **2 Tree**, 2 Reed, 1 Shrub, 1 Ruins, 1 Pond, 2 Peat · Signature: pale, drooping willows.
- Style: one Thrall surge on all lanes per wave.

| W1 | W2 | W3 | W4 |
|---|---|---|---|
| 14T | 16T 4S | 18T 6S 1B | 22T 8S 2B |

### Row 3 (HP ×1.45, 4 waves)

**The Corpse Reedbeds** (`corpseReedbeds`): *"The reeds grow thick here. Something keeps them fed."*
- Corridor **95** (narrow), `stuckTime` 1.8 · mire 0.15 · mix: 1 Tree, **3 Reed**, 1 Shrub, 1 Ruins, 1 Pond, 2 Peat · Signature: tall dense reed walls along the corridors.
- Style: steady stream that jams in the narrow lanes.

| W1 | W2 | W3 | W4 |
|---|---|---|---|
| 14T 4S | 16T 6S 1B | 18T 8S 2B 2GT | 20T 10S 2B 4GT |

**The Drowned Gallows** (`drownedGallows`, **Fell Wilds**): *"The gallows stand knee-deep in water. The hanged did not stay hanged."*
- Corridor 110 · mire 0.15 · mix: default · Signature: a half-sunken gallows with frayed ropes.
- Style: balanced; **The Drowned Knight opens wave 4**.

| W1 | W2 | W3 | W4 |
|---|---|---|---|
| 12T 4S 1B | 14T 6S 2B | 16T 6S 2B 2GT | 12T 6S 1B **1K** |

### Row 4 (HP ×1.55, 5 waves)

**The Leechwater Pools** (`leechwaterPools`): *"Warm, still water. Don't put your hand in."*
- Corridor 115 · mire 0.15 · mix: 1 Tree, 2 Reed, 1 Shrub, 1 Ruins, **3 Pond**, 1 Peat · Signature: dark pools with leeches clinging to the stones.
- Style: Stirge-heavy, with Grim Stirges building up.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 10T 8S | 12T 10S 1B | 14T 12S 1B 2GS | 16T 12S 2B 4GS | 18T 14S 2B 6GS |

**Wormwood Hollow** (`wormwoodHollow`): *"Bitter herbs choke the hollow, and the dead seem to like it."*
- Corridor 110 · mire 0.12 · mix: 1 Tree, 2 Reed, **2 Shrub**, 1 Ruins, 1 Pond, 2 Peat · Signature: grey-green wormwood bushes.
- Style: two lanes busy, one quiet; the quiet lane changes each wave.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 14T 4S | 16T 6S 1B | 18T 8S 2B 2GT | 20T 8S 2B 4GT | 22T 10S 3B 6GT |

**The Sallow Mere** (`sallowMere`): *"A wide grey lake that never quite reflects the sky."*
- Corridor **130** (wide) · mire 0.18 · mix: 1 Tree, **3 Reed**, 1 Shrub, 1 Ruins, 1 Pond, 2 Peat · Signature: a broad grey mere at the map's edge with sallow trees.
- Style: wide lanes, big surges.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 16T 6S | 18T 8S 1B | 20T 10S 1B 2GT | 24T 10S 2B 4GT | 28T 12S 2B 6GT |

### Row 5 (HP ×1.65, 5 waves)

**The Drowned Tannery** (`drownedTannery`): *"The vats overflowed long ago. The stink never left."*
- Corridor 115 · mire 0.12 · mix: 1 Tree, 2 Reed, 1 Shrub, **3 Ruins**, 1 Pond, 1 Peat · Signature: sunken tanning vats and drying racks.
- Style: Brutes spread evenly through each wave, Grim Brutes from wave 3.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 12T 4S 2B | 14T 6S 2B | 14T 6S 3B 1GB | 16T 8S 3B 1GB | 18T 8S 3B 2GB |

**The Sunken Ossuary** (`sunkenOssuary`, **Fell Wilds**): *"The bone-house slid into the bog. Its tenants climbed back out."*
- Corridor 115 · mire 0.15 · mix: 1 Tree, 2 Reed, 1 Shrub, **2 Ruins**, 1 Pond, 2 Peat · Signature: a tilted stone ossuary with skulls in its niches.
- Style: lots of Thralls; **The Drowned Knight opens wave 5**.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 14T 6S | 16T 8S 1B | 18T 8S 2B 2GT | 20T 10S 2B 4GT | 14T 8S 2B **1K** |

### Row 6 (HP ×1.75, 5 waves)

**The Widow's Mire** (`widowsMire`): *"She walked in looking for him. Neither came out."*
- Corridor 115 · mire **0.25** (the most) · mix: 1 Tree, 2 Reed, 1 Shrub, 1 Ruins, 1 Pond, **3 Peat** · Signature: a lone veiled figure-shaped dead tree in the mire.
- Style: balanced; the mire makes Prep routes expensive, and sinking drops make Squirrels matter.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 14T 6S | 16T 8S 1B 2GT | 18T 10S 2B 4GT | 20T 10S 2B 6GT 1GB | 22T 12S 3B 8GT 1GB |

**The Plague Carts** (`plagueCarts`): *"Abandoned carts, still loaded. Nobody came back to bury them."*
- Corridor 120 · mire 0.12 · mix: 1 Tree, 2 Reed, 1 Shrub, **3 Ruins**, 1 Pond, 1 Peat · Signature: overturned carts with sacking and wheels.
- Style: two surges per wave.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 16T 6S | 18T 8S 1B 2GT | 20T 10S 2B 4GT | 22T 12S 2B 6GT | 26T 14S 2B 8GT 1GB |

**The Weeping Sluice** (`weepingSluice`): *"The sluice gates leak a steady trickle, day and night."*
- Corridor **95** (narrow), `stuckTime` 2.0 · mire 0.15 · mix: default · Signature: a broken wooden sluice gate with water running through it.
- Style: steady stream; Brutes jam the narrow lanes.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 14T 6S 1B | 16T 8S 2B 2GT | 18T 10S 2B 4GT 1GB | 20T 10S 3B 4GT 1GB | 22T 12S 3B 6GT 2GB |

### Row 7 (HP ×1.9, 5 waves)

**Carrion Orchard** (`carrionOrchard`): *"The fruit rots on the branch, and the crows won't touch it."*
- Corridor 120 · mire 0.12 · mix: **3 Tree**, 2 Reed, 1 Shrub, 1 Ruins, 1 Pond, 1 Peat · Signature: twisted orchard trees with black, rotting fruit.
- Style: three surges per wave.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 16T 8S 2GT | 18T 10S 1B 4GT 2GS | 20T 12S 2B 6GT 2GS | 22T 12S 2B 8GT 4GS 1GB | 26T 14S 3B 10GT 4GS 1GB |

**The Drowned Bell Tower** (`drownedBellTower`, **Fell Wilds**): *"The tower sank to its belfry. On still nights the bell still rings."*
- Corridor 120 · mire 0.15 · mix: default · Signature: a bell tower's top poking out of the water.
- Style: **a muffled bell toll before each synchronised surge** (reuse the Hollow of Bells toll mechanic with a deeper, wetter toll sound, `drownedToll`); **The Drowned Knight opens wave 5**.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 16T 8S | 18T 10S 1B 2GT | 20T 12S 2B 4GT 2GS | 22T 12S 2B 6GT 4GS 1GB | 16T 10S 2B 4GT **1K** |

**The Blackwater Shrine** (`blackwaterShrine`): *"An altar to something older than the saints, half under black water."*
- Corridor 115 · mire 0.15 · mix: 1 Tree, 2 Reed, 1 Shrub, **3 Ruins**, 1 Pond, 1 Peat · Signature: a moss-covered altar stone with carved spirals.
- Style: Brute-heavy, with Brutes evenly through each wave.

| W1 | W2 | W3 | W4 | W5 |
|---|---|---|---|---|
| 12T 6S 2B | 14T 8S 2B 1GB | 16T 8S 3B 1GB 2GT | 16T 10S 3B 2GB 4GT | 18T 12S 4B 2GB 6GT |

### Row 8 (HP ×2.0, 6 waves)

**Bog King's Rest** (`bogKingsRest`, **Boss**): *"Where the Causeway ends, the peat rises into a throne."*
- Corridor **130** (Bog King needs 122) · mire 0.15 · mix: default · Signature: a throne of peat and roots at the far end of one lane.
- Style: builds steadily; **The Drowned Knight opens wave 3**; **the Bog King rises at the start of wave 5**; wave 6 is the final push, with a **Grim Drowned Knight**.

| W1 | W2 | W3 | W4 | W5 | W6 |
|---|---|---|---|---|---|
| 16T 8S 2GT | 18T 10S 2B 4GT | 20T 12S 2B 4GT 2GS **1K** | 22T 12S 3B 6GT 4GS 1GB | **Bog King** + 16T 10S 2B 4GT | 24T 14S 3B 8GT 6GS 2GB **1GK** |

The Bog King's own raised Thralls come on top of these counts.

---

## 3. Acceptance criteria

- [ ] All 18 Hag's Causeway levels replace their placeholders, with their names, descriptions, rows, node types, HP multipliers, corridor widths, feature mixes, mire coverage, palettes and signature decorations.
- [ ] Every level passes start-up validation (candidates, zones, corridors, boss widths).
- [ ] Waves match §2 exactly, with summary comments; The Drowned Bell Tower's toll works; the Bog King appears at the start of Bog King's Rest wave 5.
- [ ] Suggested step budgets are reported per level (route failures about 10% or less).
- [ ] The report lists changed tabs; the pull script wasn't run.
- [ ] Everything else still works.
