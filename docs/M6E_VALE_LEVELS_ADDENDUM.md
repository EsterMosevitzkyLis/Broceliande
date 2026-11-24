# Broceliande — M6e Addendum: The Lost Vale Levels and Waves

**Status:** addendum to the existing specs in `docs/`, building on M6a–M6d.
**Goal:** replace the 19 placeholder levels of the Lost Vale with real levels: `levels` rows, map files (made like the Hag's Causeway ones, then refined by the designer in the editor), and hand-written waves.

> Same conventions as M6a.

---

## 1. Rules for every Vale level

- Every map file follows the existing scene rules (lanes, sectors, zone quotas, candidate spacing, decor not touching vacant spots, landmark scale).
- **Corridor minimums:** levels with the Broodmother ≥ 102, the High-Shaman ≥ 90, the Iron Oracle ≥ 114. Everything else ≥ 90 unless stated.
- **Default feature mix:** 2 Tree, 1 Reed, 2 Shrub, 2 Ruins, 1 Pond, 1 Saurian Den (`mix_saurianDen` 1). Overrides below.
- **Hidden share:** the region default (near 0.25, far 0.5) unless overridden.
- **Step budgets:** Claude Code computes the typical route per level (as before) and reports **centred suggestions**; the designer sets the final values in the sheet. Tightness is tuned through the route band, not the budget.
- **`enemyHpMult` by row:** 2.1, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.8.
- **Waves:** 4 in rows 1–3, 5 in rows 4–7, 6 at the boss. Gaps 13 / 15 / 17 as in the existing sheet pattern (gap starts on clear or 10 s after the last spawn). Spawn pacing, lane split and ordering inside a wave follow the Hag's Causeway pattern: swarms first, brutes and supports in the middle, mini-bosses and bosses as stated.
- **Palettes:** each level gets its own `palette` in its map file, all variations on the Vale's look: deep greens, moss, wet dark stone, gold-tinged mist light. Named below.

**Wave shorthand:** Sp spider, L lizardman, H hunter, G giant lizard, Sh shaman; a `g` prefix means the Grim version (gSp, gL, gH, gG, gSh).

---

## 2. The levels

| Row | Level | Lanes | Corridor | Palette | Signature decor and feel | Overrides |
|---|---|---|---|---|---|---|
| 1 | **Emerald Gully** | 2 | 100 | `valeGully` | A steep, fern-choked gully with a stream; moss-covered stone steps; the first glimpse of a ruined arch | |
| 2 | **Serpent's Rest** | 2 | 95 | `valeSerpent` | A coiled stone serpent statue half buried in roots; warm basking rocks | |
| 2 | **Fernbound Court** | 3 | 95 | `valeCourt` | An Elder courtyard swallowed by ferns; broken flagstones; a dry fountain | hidden far 0.6 |
| 2 | **The Whispering Canopy** | 2 | 100 | `valeCanopy` | Giant trunks, hanging vines, dim green light from high above; rope bridges overhead (decor) | mix: Tree 3, Ruins 1 |
| 3 | **The Blackstone Steps** | 2 | 95 | `valeBlackstone` | Wide black basalt stairs descending through mist; carved glyph steps | mix: Ruins 3, Tree 1 |
| 3 | **Broodmother's Hollow** (Fell) | 2 | 110 | `valeHollow` | A dark hollow of webs between roots; cocoons hanging from branches; pale fungus light | mix: Saurian Den 0, Shrub 3; Broodmother |
| 4 | **Sunken Atrium** | 3 | 130 | `valeAtrium` | A vast sunken hall open to the sky; columns standing in shallow water; lily pads | mix: Pond 2, Reed 2 |
| 4 | **The Moss-Crowned Gate** | 2 | 95 | `valeGate` | A colossal Elder gateway with a crown of moss and ferns; tribal totems before it | mix: Saurian Den 2 |
| 4 | **Glasswater Basin** | 3 | 100 | `valeGlass` | A still, mirror-clear pool under a waterfall; reflections of the trees; stepping stones | mix: Pond 2, Reed 2, Shrub 1 |
| 5 | **The Scale-Shrine** (Fell) | 2 | 100 | `valeShrine` | A tribal shrine built into Elder ruins; scale offerings, bone wind-chimes, a relic altar glowing gold | mix: Saurian Den 2, Ruins 3, Pond 0; High-Shaman |
| 5 | **The Drowned Observatory** | 3 | 100 | `valeObservatory` | A ruined Elder observatory dome, half flooded; bronze rings and star-carved stones | mix: Ruins 3, Pond 2, Tree 1 |
| 5 | **The Coilstone Circle** | 2 | 110 | `valeCoilstone` | A ring of spiral-carved standing stones in a clearing; giant lizard tracks in the mud | mix: Saurian Den 2 |
| 6 | **The Fallen Colossus** | 3 | 105 | `valeColossus` | An enormous fallen Elder statue across the map, overgrown; lanes run along and over it | mix: Ruins 3 |
| 6 | **The Fernsea** | 3 | 100 | `valeFernsea` | An open sea of waist-high ferns rolling in the wind; a few lone tree ferns | hidden near 0.4, far 0.7; mix: Shrub 3, Ruins 1 |
| 6 | **Broodmother's Den** (Fell) | 2 | 115 | `valeDen` | A deep cavern mouth thick with webs; bones, egg-shell litter, a faint violet glow | mix: Saurian Den 0, Shrub 3, Ruins 2; Grim Broodmother |
| 7 | **The Saurian Crossing** | 3 | 100 | `valeCrossing` | A river ford marked with tribal standards; hunting blinds of woven fern | mix: Reed 2, Pond 2, Saurian Den 2 |
| 7 | **The Hollow Ziggurat** | 3 | 100 | `valeZiggurat` | A stepped Elder pyramid, its top broken open; green-gold relic light from inside | mix: Ruins 3, Saurian Den 2 |
| 7 | **The Ironspan** | 2 | 105 | `valeIronspan` | The approach to a great dark-metal bridge over a gorge; mist rising; the metal humming | mix: Ruins 3, Pond 0, Tree 1 |
| 8 | **The Shaman's Perch** (Boss) | 3 | 125 | `valePerch` | A high ledge at the end of the Ironspan; the Oracle's perch at one lane's entrance; three relic pylons; the gorge below | mix: Ruins 3, Pond 0; 3 `landmark:relicPylon` placed per M6b §6.2 |

Lane counts and corridors are starting values: Claude Code may adjust lanes to make the zone quotas fit, and reports any change.

---

## 3. Waves

### Row 1

**Emerald Gully**
| W | Enemies |
|---|---|
| 1 | 10 Sp, 6 L |
| 2 | 12 Sp, 8 L, 2 H |
| 3 | 14 Sp, 10 L, 3 H, 1 Sh |
| 4 | 16 Sp, 12 L, 4 H, 1 G, 1 Sh |

### Row 2

**Serpent's Rest**
| W | Enemies |
|---|---|
| 1 | 4 Sp, 10 L, 1 H |
| 2 | 6 Sp, 12 L, 2 H, 1 Sh |
| 3 | 6 Sp, 14 L, 3 H, 1 G, 1 Sh |
| 4 | 8 Sp, 16 L, 4 H, 1 G, 2 Sh |

**Fernbound Court**
| W | Enemies |
|---|---|
| 1 | 16 Sp, 4 L |
| 2 | 20 Sp, 6 L, 1 H |
| 3 | 24 Sp, 8 L, 2 H, 1 Sh |
| 4 | 28 Sp, 10 L, 3 H, 1 G, 1 Sh |

**The Whispering Canopy**
| W | Enemies |
|---|---|
| 1 | 8 Sp, 6 L, 3 H |
| 2 | 10 Sp, 8 L, 4 H |
| 3 | 12 Sp, 8 L, 5 H, 1 Sh |
| 4 | 14 Sp, 10 L, 6 H, 1 G, 1 Sh |

### Row 3

**The Blackstone Steps**
| W | Enemies |
|---|---|
| 1 | 8 Sp, 10 L, 1 G |
| 2 | 10 Sp, 12 L, 2 H, 1 G, 1 Sh |
| 3 | 12 Sp, 12 L, 3 H, 2 G, 1 Sh, 2 gL |
| 4 | 14 Sp, 14 L, 4 H, 2 G, 2 Sh, 3 gL |

**Broodmother's Hollow** (Fell)
| W | Enemies |
|---|---|
| 1 | 14 Sp, 6 L, 2 H |
| 2 | 16 Sp, 8 L, 3 H, 1 Sh |
| 3 | 18 Sp, 8 L, 3 H, 1 G, 1 Sh, 2 gSp |
| 4 | **Broodmother** + 10 Sp, 6 L, 2 H, 1 Sh |

### Row 4

**Sunken Atrium**
| W | Enemies |
|---|---|
| 1 | 12 Sp, 8 L, 2 H |
| 2 | 14 Sp, 10 L, 3 H, 1 Sh |
| 3 | 16 Sp, 12 L, 3 H, 1 G, 1 Sh, 2 gL |
| 4 | 18 Sp, 14 L, 4 H, 1 G, 2 Sh, 3 gL |
| 5 | 20 Sp, 16 L, 5 H, 2 G, 2 Sh, 4 gL |

**The Moss-Crowned Gate**
| W | Enemies |
|---|---|
| 1 | 8 Sp, 10 L, 2 H, 1 Sh |
| 2 | 10 Sp, 12 L, 2 H, 2 Sh |
| 3 | 12 Sp, 12 L, 3 H, 1 G, 2 Sh, 1 gSh |
| 4 | 12 Sp, 14 L, 4 H, 1 G, 3 Sh, 1 gSh |
| 5 | 14 Sp, 16 L, 4 H, 2 G, 3 Sh, 2 gSh |

**Glasswater Basin**
| W | Enemies |
|---|---|
| 1 | 12 Sp, 8 L, 2 H |
| 2 | 14 Sp, 10 L, 3 H, 1 Sh |
| 3 | 16 Sp, 10 L, 4 H, 1 G, 1 Sh, 2 gSp |
| 4 | 18 Sp, 12 L, 4 H, 1 G, 2 Sh, 2 gH |
| 5 | 20 Sp, 14 L, 5 H, 2 G, 2 Sh, 3 gH |

### Row 5

**The Scale-Shrine** (Fell)
| W | Enemies |
|---|---|
| 1 | 8 Sp, 10 L, 2 H, 1 Sh |
| 2 | 10 Sp, 12 L, 3 H, 2 Sh |
| 3 | 12 Sp, 12 L, 3 H, 1 G, 2 Sh, 2 gL |
| 4 | 12 Sp, 14 L, 4 H, 1 G, 2 Sh, 3 gL, 1 gSh |
| 5 | **High-Shaman** + 10 Sp, 12 L, 3 H, 1 G, 2 Sh |

**The Drowned Observatory**
| W | Enemies |
|---|---|
| 1 | 10 Sp, 8 L, 4 H |
| 2 | 12 Sp, 8 L, 5 H, 1 Sh |
| 3 | 12 Sp, 10 L, 6 H, 1 G, 1 Sh, 2 gH |
| 4 | 14 Sp, 10 L, 6 H, 1 G, 2 Sh, 3 gH |
| 5 | 16 Sp, 12 L, 7 H, 2 G, 2 Sh, 4 gH |

**The Coilstone Circle**
| W | Enemies |
|---|---|
| 1 | 8 Sp, 8 L, 2 G |
| 2 | 10 Sp, 10 L, 2 H, 2 G, 1 Sh |
| 3 | 12 Sp, 10 L, 2 H, 3 G, 1 Sh, 1 gG |
| 4 | 12 Sp, 12 L, 3 H, 3 G, 2 Sh, 1 gG |
| 5 | 14 Sp, 14 L, 3 H, 4 G, 2 Sh, 2 gG |

### Row 6

**The Fallen Colossus**
| W | Enemies |
|---|---|
| 1 | 12 Sp, 10 L, 2 H, 1 G |
| 2 | 14 Sp, 12 L, 3 H, 1 G, 1 Sh, 2 gL |
| 3 | 16 Sp, 12 L, 4 H, 2 G, 2 Sh, 3 gL |
| 4 | 18 Sp, 14 L, 4 H, 2 G, 2 Sh, 4 gL, 1 gG |
| 5 | 20 Sp, 16 L, 5 H, 3 G, 3 Sh, 5 gL, 1 gG |

**The Fernsea**
| W | Enemies |
|---|---|
| 1 | 20 Sp, 6 L, 2 H |
| 2 | 24 Sp, 8 L, 3 H, 1 Sh, 4 gSp |
| 3 | 28 Sp, 8 L, 3 H, 1 G, 1 Sh, 6 gSp |
| 4 | 30 Sp, 10 L, 4 H, 1 G, 2 Sh, 8 gSp |
| 5 | 34 Sp, 12 L, 4 H, 2 G, 2 Sh, 10 gSp |

**Broodmother's Den** (Fell)
| W | Enemies |
|---|---|
| 1 | 16 Sp, 8 L, 2 H, 2 gSp |
| 2 | 18 Sp, 10 L, 3 H, 1 Sh, 4 gSp |
| 3 | 20 Sp, 10 L, 3 H, 1 G, 1 Sh, 6 gSp |
| 4 | 22 Sp, 12 L, 4 H, 1 G, 2 Sh, 6 gSp, 2 gL |
| 5 | **Grim Broodmother** + 12 Sp, 8 L, 3 H, 1 Sh |

### Row 7

**The Saurian Crossing**
| W | Enemies |
|---|---|
| 1 | 12 Sp, 10 L, 4 H, 2 gH |
| 2 | 14 Sp, 12 L, 5 H, 1 Sh, 3 gH |
| 3 | 16 Sp, 12 L, 5 H, 1 G, 2 Sh, 4 gH |
| 4 | 18 Sp, 14 L, 6 H, 2 G, 2 Sh, 5 gH, 1 gSh |
| 5 | 20 Sp, 16 L, 7 H, 2 G, 3 Sh, 6 gH, 1 gSh |

**The Hollow Ziggurat**
| W | Enemies |
|---|---|
| 1 | 10 Sp, 12 L, 2 H, 1 G, 1 Sh, 2 gL |
| 2 | 12 Sp, 12 L, 3 H, 2 G, 2 Sh, 3 gL |
| 3 | 14 Sp, 14 L, 3 H, 2 G, 2 Sh, 4 gL, 1 gG |
| 4 | 14 Sp, 14 L, 4 H, 3 G, 3 Sh, 5 gL, 1 gG, 1 gSh |
| 5 | 16 Sp, 16 L, 4 H, 3 G, 3 Sh, 6 gL, 2 gG, 1 gSh |

**The Ironspan**
| W | Enemies |
|---|---|
| 1 | 12 Sp, 12 L, 3 H, 1 G, 1 Sh |
| 2 | 14 Sp, 12 L, 4 H, 2 G, 2 Sh, 3 gL |
| 3 | 16 Sp, 14 L, 4 H, 2 G, 2 Sh, 4 gL, 2 gH |
| 4 | 18 Sp, 14 L, 5 H, 2 G, 3 Sh, 5 gL, 3 gH, 1 gG |
| 5 | 20 Sp, 16 L, 5 H, 3 G, 3 Sh, 6 gL, 4 gH, 1 gG, 1 gSh |

### Row 8

**The Shaman's Perch** (Boss)
| W | Enemies |
|---|---|
| 1 | 14 Sp, 12 L, 3 H, 1 Sh |
| 2 | 16 Sp, 14 L, 4 H, 1 G, 2 Sh, 3 gL |
| 3 | **The Iron Oracle** (appears on his perch, bound to the pylons) + 16 Sp, 14 L, 4 H, 2 G, 2 Sh, 4 gL |
| 4 | 18 Sp, 14 L, 5 H, 2 G, 3 Sh, 5 gL, 3 gH, 1 gG |
| 5 | 20 Sp, 16 L, 5 H, 3 G, 3 Sh, 6 gL, 4 gH, 1 gG, 1 gSh |
| 6 | 22 Sp, 18 L, 6 H, 3 G, 4 Sh, 8 gL, 5 gH, 2 gG, 2 gSh |

The Oracle's Iron Call summons come **on top of** these counts. Waves 4–6 continue on schedule whether or not he's still bound; victory needs him dead plus all other enemies.

All counts are TUNING. After playtesting, the designer edits the `waves` / `spawns` tabs directly.

---

## 4. Acceptance criteria

- [ ] All 19 Vale levels have `levels` rows (row, nodeType, region, `enemyHpMult`, mix, hidden overrides), map files with their lanes, corridors, palettes and signature decor, and pass the editor's validation (zone quotas, corridor minimums, pylon checks at The Shaman's Perch).
- [ ] The placeholders from M6a are gone.
- [ ] Waves and spawns match §3, with mini-bosses and the Iron Oracle where stated.
- [ ] Claude Code reports centred step-budget suggestions per level and any lane-count changes.
- [ ] The report lists every changed tab; the pull script wasn't run.
- [ ] A full run from the Cinderwood through the Lost Vale is possible (debug Jump to region is fine for testing).
