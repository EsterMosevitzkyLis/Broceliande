# Art Guide

What every thing in the game is drawn at now, so new hand-drawn art can match it. All numbers were
measured from the game's current procedural drawings (each thing drawn alone, its painted pixels
counted; soft glows and ground shadows left out).

## How sizes work

- **World px = stage px.** The game is laid out on a 1920 x 1080 stage scaled to fit the window,
  but the canvas renders at the screen's real resolution (up to 2 device px per CSS px), so art is
  drawn sharp at any window size rather than blurred by the browser. At a 1920 x 1080 window on a
  normal screen, 1 world px is 1 screen px; on a high-DPI screen, up to 2.
- **Crisp pixel art:** draw at the size listed and set the sprite's `scale` to 1, or draw at exactly
  half and set `scale` to 2. Other scales (like 1.2) make some of your pixels 1 px wide and some 2.
- **Facing:** every procedural creature is drawn facing **right**; the game flips it when it moves
  left. Draw right-facing and put `facing` = right in the sprites tab.
- **Anchor:** the point of the drawing that sits on the thing's position in the game. In the sprites
  tab, `anchorX` / `anchorY` are frame px from the frame's top left (blank = bottom centre). The
  tables below give where the anchor falls in each measured drawing: **ax** px from the drawing's
  left edge, **ay** px from its top edge.
- **Shadows** are drawn by the game under creatures, so don't paint a ground shadow into a sprite.
- **Effects** (hit flash, slow, burning, corrosion, roots, shields, the Grim outline, HP bars) are
  drawn by the game on top of the sprite.
- **Colours** are the drawing's main colours today, most used first. Decoration colours come from
  the level's palette, so the same kind can be recoloured per region.

## How to add art

1. Save the PNG in `assets/sprites/`: a horizontal strip of frames, transparent background.
2. Add a row to the `sprites` tab: `id`, `file`, `frames`, `frameW`, `frameH`, `scale`, `anchorX`,
   `anchorY`, `stride` (px walked per full walk cycle, for movers) or `fps` (for loops), `facing`.
3. Put its id in the thing's `sprite` column (the enemies tab for now; other tabs get the column as
   their art arrives).

## Enemies

Anchor: the creature's feet on the ground, at its centre (the point it stands on). A flyer's body
floats above that point (see "Flies at"). Grim variants are drawn from their base type's art with a
glowing outline, smoke and a darker look; they are listed after the base types and don't need art of
their own unless you want it.

| Enemy | Drawn size (w x h) | Anchor ax, ay | Flies at | Main colours |
|---|---|---|---|---|
| wolf (current sprite) | 52 x 32 | 26, 32 |  | #656b7d, #545869, #3b373d, #7c8295 |
| bear | 71 x 43 | 31, 43 |  | #3b2618, #24160d |
| ogre | 110 x 111 | 35, 111 |  | #6f7f55, #4d5a3a, #6e4a2a, #859468 |
| stirge | 35 x 18 | 15, 36 | 18-36 px up | #4a2e38, #3a222c, #c8a090 |
| thrall | 28 x 37 | 13, 35 |  | #3e4a44, #46545d, #6f8290, #3e5835 |
| brute | 52 x 55 | 24, 54 |  | #5c5e4a, #3b3c2d, #5e4127, #2b251a |
| knight | 75 x 138 | 22, 136 |  | #7a4e30, #4a3020, #8a8a84 |
| bogKing | 133 x 178 | 76, 172 |  | #211b14, #253836 |
| spider | 34 x 19 | 17, 18 |  | #2a1f33, #1d1525, #120c18 |
| lizardman | 42 x 47 | 21, 45 |  | #3f5224, #6e893d, #c4b27a, #b5542c |
| hunter | 37 x 48 | 19, 46 |  | #3f5224, #6e893d, #c8a04a |
| giantLizard | 79 x 28 | 43, 25 |  | #6f8a3e, #3f5224 |
| shaman | 31 x 49 | 17, 47 |  | #6e5238, #3f5224, #4d371f, #6e883d |
| broodmother | 109 x 67 | 53, 65 |  | #2a1c30, #1e1424, #120a16, #c8bca8 |
| highShaman | 82 x 155 | 47, 151 |  | #5a3e2a, #7a3a24, #4e3820, #b5552c |
| broodEgg | 18 x 22 | 9, 21 |  | #e6dcc4 |
| ironOracle | 94 x 190 | 56, 186 |  | #26272c, #3a3e45, #1c1f24, #3f5224 |
| grimWolf (current sprite) | 62 x 40 | 31, 38 |  | #fe8927, #48424e, #544d59, #2e2328 |
| grimBear | 81 x 64 | 35, 62 |  | #3b2617, #24160d, #452b17, #fb8626 |
| grimOgre | 115 x 140 | 37, 135 |  | #6f7f55, #4d5a3a, #fe8827, #6e4a2a |
| grimStirge | 41 x 22 | 18, 39 | 17-39 px up | #fd8626, #563436, #4d2c2b, #c96926 |
| grimThrall | 35 x 44 | 16, 40 |  | #7bdca4, #4b5d69, #2f3a42, #7ce1a6 |
| grimBrute | 61 x 67 | 28, 64 |  | #3e4334, #28291e, #5d4127, #7cdda5 |
| grimKnight | 78 x 156 | 24, 152 |  | #2e2018, #4e3424, #8a8a84, #7de1a7 |
| grimSpider | 41 x 29 | 21, 26 |  | #fb8626, #261922, #1b1320, #1c131f |
| grimLizardman | 50 x 57 | 25, 53 |  | #fb8626, #293318 |
| grimHunter | 44 x 56 | 22, 52 |  | #fd8726, #283318, #485729, #793a23 |
| grimGiantLizard | 91 x 36 | 49, 30 |  | #475829, #fc8726, #293318 |
| grimShaman | 37 x 61 | 20, 57 |  | #4b3725, #fd8726, #543c26, #293318 |
| grimBroodmother | 113 x 71 | 55, 67 |  | #1b1121, #fd8727, #130b17, #271822 |
| grimBroodEgg | 22 x 26 | 11, 23 |  | #ba9eaa, #ff8827, #b8a0b0, #b8a0ae |

The wolf's numbers are its current sprite at scale 1.2 (the procedural wolf was about 53 x 37).

## Turrets

Turrets stand on a slot pad at a build location. Anchor for both: the **location centre**. The pad
is drawn under every turret. Turret drawings grow with level (bands, rings and crowns are added);
levels 4 and 5 are mostly the same size. Sizes are on screen (the spot art is designed for a 45 px
footprint and scaled by 0.844 to the 38 px location radius).

| Thing | Drawn size (w x h) | Anchor ax, ay | Main colours |
|---|---|---|---|
| Slot pad (empty build spot) | 52 x 38 | 26, 4 | #e5dbb3, #ddd3ac, #d5cba5, #b4aa89 |
| Pebble Sprinkler level 1 | 42 x 52 | 21, 33 | #5b3d22, #8a6236, #4a3a2c |
| Pebble Sprinkler level 2 | 50 x 66 | 25, 33 | #e8c547, #5b3d22, #8a6236, #4a3a2c |
| Pebble Sprinkler level 3 | 58 x 70 | 29, 34 | #8fd8ff, #5b3d22, #8a6236, #4a3a2c |
| Pebble Sprinkler level 4 | 68 x 73 | 34, 34 | #8fd8ff, #d9dee6, #5b3d22, #8a6236 |
| Pebble Sprinkler level 5 | 68 x 73 | 34, 34 | #8fd8ff, #ffd23f, #5b3d22, #8a6236 |
| Poison Toader level 1 | 40 x 32 | 20, 16 | #4f8a3c, #9cc46a, #a173c4, #2b4a22 |
| Poison Toader level 2 | 50 x 49 | 25, 16 | #4f8a3c, #9cc46a, #a173c4, #9cd96b |
| Poison Toader level 3 | 58 x 60 | 29, 24 | #4f8a3c, #a173c4, #9cc46a, #9cd96b |
| Poison Toader level 4 | 68 x 66 | 34, 27 | #4f8a3c, #a173c4, #9cc46a, #9cd96b |
| Poison Toader level 5 | 68 x 66 | 34, 27 | #a173c3, #4f8a3c, #9cc46a, #9cd96b |
| Cinderjaw level 1 | 43 x 37 | 17, 20 | #6d675c, #6e6b4c, #4d4b34, #8b8579 |
| Cinderjaw level 2 | 51 x 53 | 25, 20 | #6d675c, #766d49, #4d4b34, #6e6b4b |
| Cinderjaw level 3 | 58 x 58 | 29, 22 | #6d675c, #c2642b, #4d4b34, #f8a859 |
| Cinderjaw level 4 | 68 x 61 | 34, 22 | #c2632a, #6d675c, #f8a859, #4d4b34 |
| Cinderjaw level 5 | 68 x 61 | 34, 22 | #c2632a, #6d675c, #f8a859, #4d4b34 |
| Peatjaw level 1 | 43 x 37 | 17, 20 | #483c2d, #4e4632, #342e20, #6a894a |
| Peatjaw level 2 | 51 x 53 | 25, 20 | #493b2d, #4e4632, #342e20, #6a894a |
| Peatjaw level 3 | 58 x 58 | 29, 22 | #483b2c, #8a3a1a, #d56839, #342e20 |
| Peatjaw level 4 | 68 x 61 | 34, 22 | #483b2c, #8a3a19, #d56839, #a74c25 |
| Peatjaw level 5 | 68 x 61 | 34, 22 | #493b2c, #8a3a19, #d56839, #392b1b |
| Scale Bulwark level 1 | 36 x 34 | 18, 17 | #6b675d, #898476, #3a4622, #47562a |
| Scale Bulwark level 2 | 50 x 50 | 25, 17 | #6b675d, #898476, #3a4622, #859a48 |
| Scale Bulwark level 3 | 58 x 58 | 29, 22 | #6b675d, #7e9943, #c6d686, #849b47 |
| Scale Bulwark level 4 | 68 x 61 | 34, 22 | #7e9943, #6b675d, #c5d685, #849b47 |
| Scale Bulwark level 5 | 68 x 66 | 34, 27 | #6b675d, #7e9943, #c5d685, #849b47 |

Turrets that aim (the Pebble Sprinkler, the Cinderjaw) turn toward their target; the measured
drawing faces up.

## The Druid and summons

Anchor: the thing's position. The Druid's feet are about 19 px below his anchor; a flying Vulture
floats 27-61 px above its anchor.

| Thing | Drawn size (w x h) | Anchor ax, ay | Faces | Main colours |
|---|---|---|---|---|
| Druid | 45 x 81 | 20, 62 | the viewer | #3d6b4a, #4c7f58, #7a5530, #d9b48f |
| Bough Double (the Druid, brown and see-through) | 45 x 81 | 20, 62 | the viewer | #78532e, #89643f, #7a5530, #d9b48f |
| Vulture, landed | 62 x 41 | 32, 35 | right | #4a3326, #2f2019, #e9e2d2, #d98b80 |
| Vulture, flying | 62 x 34 | 32, 61 | right | #4a3326, #e9e2d2, #d98b80 |
| Squirrel | 53 x 56 | 31, 49 | right | #a0623a, #8b5530, #c58a5a, #e6cfa6 |
| Slow Wisp (a glowing orb) | 36 x 36 | 12, 18 | its flight direction | #c5daf2, #d7e6f4 |

Elder Squirrels (the Burrowcall potion) are the squirrel at 1.3x, in silver.

## Feature spots (searchable)

Anchor: the location centre; the feature's base (where it meets the ground) is the given px below it.
A soft glow fills the 38 px location circle under it (drawn by the game).

| Feature | Drawn size (w x h) | Anchor ax, ay | Base below anchor | Main colours |
|---|---|---|---|---|
| tree | 46 x 74 | 23, 37 | 30 px | #3f6e2c, #f0a066, #4a4530, #593d26 |
| reedPatch | 54 x 52 | 27, 27 | 13 px | #3f6f8f, #6f8f3a, #6b4428, #44728a |
| shrub | 58 x 48 | 29, 24 | 17 px | #35602f, #ece6da, #4a4530 |
| ruins | 54 x 52 | 27, 26 | 19 px | #8a877c, #4a4530, #5f5d55 |
| pond | 62 x 40 | 31, 20 | 0 px | #3f6f8f, #56704a, #6c9ab7 |
| peatBog | 54 x 40 | 27, 21 | 3 px | #2e2419, #3a2b1c, #1c2a2a |
| saurianDen | 52 x 31 | 26, 14 | 5 px | #4a3b26, #5e4b30, #6c5233, #17110a |

## Decoration

Anchor: the object's base point (its x, y in the map file). Sizes are for the median object of each
kind in the map files: objects have a `size` multiplier ("Size range" shows the spread), and
landmarks give their size in px. Colours are from the level named, since decoration takes its
level's palette.

| Kind | Objects in maps | Drawn size (w x h) | Anchor ax, ay | Size range | Example level | Main colours |
|---|---|---|---|---|---|---|
| altarStone | 1 | 88 x 45 | 44, 29 | 44 | blackwaterShrine | #040808, #141c1c, #5c625c, #7c827a |
| bareTree | 27 | 52 x 89 | 28, 85 | 0.81-1.25 | bone | #f2ece0, #d8d2c4, #f2ecdf |
| basaltSteps | 1 | 140 x 50 | 70, 49 | 70 | blackstoneSteps | #16181a, #232629, #2a2d30 |
| baskingStones | 9 | 60 x 20 | 32, 12 | 0.90-1.24 | serpentsRest | #82806a, #2e3430, #a19a77 |
| bell | 1 | 131 x 81 | 56, 61 | 60 | bells | #4a381a, #284426, #8a6a34 |
| boneLitter | 4 | 37 x 10 | 20, 6 | 0.90-1.24 | broodmothersDen | #d7ceb6, #eee7d7, #9c968b, #c4bca5 |
| brokenFence | 11 | 34 x 19 | 17, 17 | 0.64-0.95 | blackwaterShrine | #2c261e, #4b4232 |
| bronzeRing | 1 | 48 x 35 | 24, 31 | 1.086 | drownedObservatory | #4f893a, #8e6c36 |
| bush | 2055 | 40 x 29 | 20, 27 | 0.80-1.25 | widowsMire | #2e4238, #566e5a |
| cairn | 1 | 160 x 70 | 80, 62 | 90 | mossbound | #a2a49a, #76786e, #5a8a34 |
| caveMouth | 1 | 160 x 93 | 80, 93 | 80 | broodmothersDen | #2e3430, #080a0c, #4f8a3a, #1b1825 |
| chapelWall | 1 | 220 x 54 | 110, 52 | 110 | briar | #555552, #141a12, #7a7a76, #2c4a26 |
| charredBeams | 2 | 41 x 15 | 21, 13 | 0.70-0.88 | drowned | #151110, #13100f, #362b24, #2b231d |
| charredRoof | 1 | 57 x 27 | 27, 22 | 0.774 | drowned | #141110, #382c24, #c8c3bc, #13100f |
| charredTree | 42 | 57 x 79 | 29, 74 | 0.81-1.25 | widows | #161210, #15110f, #74623a |
| cocoons | 4 | 38 x 63 | 17, 61 | 0.82-1.18 | broodmothersDen | #26201a, #e1ded2, #251f19 |
| coilStone | 6 | 24 x 42 | 12, 42 | 1 | coilstoneCircle | #2e3430, #565a50, #4f893a, #787e70 |
| dryFountain | 1 | 100 x 66 | 50, 54 | 50 | fernboundCourt | #2e3430, #4e5650, #1d2820, #6e786c |
| dryingRack | 1 | 46 x 38 | 23, 36 | 1.142 | drownedTannery | #7a5e42, #4a3622 |
| elderColumn | 5 | 18 x 49 | 9, 49 | 0.82-1.00 | sunkenAtrium | #4e5650, #2e3430, #6e786c, #616a60 |
| fallenColossus | 1 | 297 x 63 | 150, 54 | 150 | fallenColossus | #363c36, #5a6058, #4f8a3a |
| fernBush | 1634 | 44 x 15 | 22, 11 | 0.80-1.62 | mossCrownedGate | #48873e, #4a8a40, #295d2d, #3b7636 |
| fernTree | 1121 | 75 x 66 | 30, 62 | 0.80-1.25 | serpentsRest | #174124, #3c3222, #2e622e, #153f23 |
| flagstones | 4 | 60 x 31 | 28, 20 | 1.04-1.23 | fernboundCourt | #4e5650, #4c544d, #434b45, #4f893a |
| footbridge | 1 | 139 x 39 | 70, 31 | 70 | rottingFord | #6a5234, #3d2d1e |
| gallows | 1 | 110 x 89 | 55, 71 | 55 | drownedGallows | #10181a, #252b2a, #2e261e |
| giantTrunk | 2 | 90 x 144 | 45, 144 | 45 | whisperingCanopy | #33291c, #2b2217, #4e893a |
| glowFungus | 4 | 28 x 17 | 13, 17 | 0.91-1.11 | broodmothersHollow | #d8e3d1, #c7f0d8, #c7eed6 |
| glyphStone | 8 | 23 x 43 | 11, 43 | 0.83-1.09 | hollowZiggurat | #1e2124 |
| gnarledTree | 33 | 68 x 83 | 35, 78 | 0.80-1.25 | wychwood | #1d3524, #2f2530, #2e242f |
| gorgeEdge | 1 | 300 x 75 | 150, 83 | 150 | shamansPerch | #161917, #252a26, #070a09, #1d211e |
| gravestone | 2 | 21 x 31 | 9, 30 | 0.83-1.02 | barrow | #5e5e58, #8a8a84 |
| hangingVines | 5 | 30 x 63 | 15, 71 | 0.87-1.19 | whisperingCanopy | #2a5e2e, #4a8a40, #48883e |
| ironBridge | 1 | 160 x 84 | 80, 81 | 80 | ironspan | #2e3337, #070a09, #242829, #141715 |
| ironStake | 9 | 10 x 33 | 4, 33 | 0.80-1.18 | ironspan | #2e3338, #373b3a |
| kiln | 2 | 60 x 33 | 30, 25 | 0.82-1.23 | charcoal | #3d332b, #594b3c, #463525, #1b120b |
| lanternPole | 3 | 19 x 55 | 3, 53 | 0.85-1.02 | lanternFen | #2a2822, #544933, #463d2c, #4d4430 |
| leechStones | 5 | 43 x 17 | 20, 12 | 0.66-0.99 | leechwaterPools | #3a423e, #5a645e, #1a1311, #2a2a26 |
| lilyPads | 6 | 35 x 17 | 18, 9 | 1 | glasswaterBasin | #2a5e2e |
| lizardTracks | 3 | 54 x 18 | 27, 9 | 0.82-1.11 | coilstoneCircle | #3b2d1b, #4a3a24, #2c2214, #231a0f |
| mossGate | 1 | 188 x 146 | 94, 146 | 90 | mossCrownedGate | #4e5650, #2e3430, #86bc5a, #5a9a40 |
| mossSteps | 1 | 53 x 19 | 27, 18 | 0.816 | emeraldGully | #6c766a, #2e3430, #434a45, #4f893a |
| mound | 1 | 270 x 61 | 135, 61 | 135 | barrow | #5b6833, #7a8846, #1a1612 |
| mushrooms | 7 | 18 x 12 | 10, 12 | 0.82-1.21 | wychwood | #b48ce0, #d8d0c0, #7bb894, #c3cab5 |
| observatoryDome | 1 | 168 x 98 | 84, 76 | 80 | drownedObservatory | #103a3e, #2e3430, #24504a |
| oraclePerch | 1 | 72 x 68 | 36, 68 | 45 | shamansPerch | #262c2a, #464c46, #363a37 |
| orchardTree | 47 | 75 x 90 | 39, 85 | 0.82-1.22 | carrionOrchard | #25251d, #1c1518 |
| ossuary | 1 | 99 x 67 | 44, 51 | 52 | sunkenOssuary | #0c1618, #7a7a72, #9c9a90, #141717 |
| peatThrone | 1 | 84 x 112 | 42, 110 | 50 | bogKingsRest | #20170f, #2a1e14, #36271a, #2e2419 |
| plagueCart | 3 | 85 x 46 | 39, 38 | 38.00-42.00 | plagueCarts | #4a3a26, #796343, #9a8a68, #695539 |
| reedWall | 79 | 45 x 44 | 25, 43 | 0.94-1.26 | corpseReedbeds | #7a8a46, #3e5a2e, #3e3220 |
| reeds | 203 | 26 x 23 | 13, 22 | 0.80-1.23 | weepingSluice | #55786a, #3e2e1e |
| relicAltar | 1 | 100 x 65 | 50, 65 | 50 | scaleShrine | #2e3430, #363a32, #474838, #686955 |
| relicPylon | 3 | 48 x 83 | 24, 83 | 24 | shamansPerch | #5c665a, #2c3036, #66736b, #626d65 |
| rock | 239 | 28 x 19 | 14, 17 | 0.80-1.25 | barrow | #8a8a84, #5d5d57, #aaaaa2 |
| root | 5 | 78 x 34 | 39, 19 | 0.85 | heartwood | #3a2a20, #20160e, #5a4232, #35261c |
| ropeBridge | 1 | 148 x 140 | 74, 140 | 70 | whisperingCanopy | #33291c, #1b4626, #6d5533 |
| ruinedArch | 1 | 110 x 140 | 55, 140 | 60 | emeraldGully | #4e5650, #2e3430, #4f8a3a, #6d776b |
| scaleOffering | 6 | 24 x 35 | 12, 35 | 0.83-1.24 | scaleShrine | #5a4630, #4f8a3a, #f0cc5c, #59462f |
| scorchedStones | 3 | 46 x 14 | 23, 10 | 0.65-0.69 | causeway | #39332d, #5a524a, #1a1512, #beb4aa |
| serpentStatue | 1 | 112 x 107 | 56, 91 | 55 | serpentsRest | #5d5a4c, #2e3430, #82806a, #3a3223 |
| slab | 1 | 36 x 22 | 18, 15 | 0.852 | barrow | #8a8a84, #5e5e58, #797973 |
| sluiceGate | 1 | 110 x 75 | 55, 55 | 55 | weepingSluice | #3e2e1e, #0a1a1c, #6a5234, #1e3634 |
| standingStone | 10 | 20 x 34 | 10, 34 | 0.6 | wychwood | #46445a, #6a6878 |
| stump | 8 | 21 x 21 | 10, 21 | 0.83-1.15 | drowned | #1c1714, #622e1b |
| sunkenBelfry | 1 | 102 x 107 | 51, 91 | 46 | drownedBellTower | #081418, #646a68, #3a3a36, #424846 |
| sunkenRoof | 13 | 50 x 24 | 23, 24 | 0.58-0.95 | drownedTannery | #4a3622, #795d39 |
| tallowCandles | 8 | 30 x 18 | 14, 13 | 0.61-0.97 | tallowFen | #e8e0c7, #d6cbac, #ffe19a, #ccc2a5 |
| tanneryVats | 1 | 120 x 63 | 60, 44 | 60 | drownedTannery | #1a1a10, #33301e, #382b18, #4a3622 |
| thornBush | 143 | 46 x 30 | 23, 30 | 0.80-1.25 | blackthorn | #7a4961, #3f2836, #74465d |
| totem | 10 | 16 x 80 | 8, 80 | 0.84-1.02 | scaleShrine | #5a4630, #4a3a24, #58452d, #b04e2a |
| tree | 1792 | 52 x 87 | 26, 87 | 0.80-1.25 | mossbound | #29502e, #3e3324 |
| tribalStandard | 2 | 24 x 67 | 8, 67 | 0.98-1.00 | saurianCrossing | #a8462a, #5a4630, #ddd4bc |
| violetGlow | 5 | 20 x 13 | 9, 13 | 0.82-1.25 | broodmothersDen | #a47ce0, #d4c8e0, #a37bde, #cab8e1 |
| waterfall | 1 | 140 x 141 | 70, 123 | 70 | glasswaterBasin | #2e3430, #0e4442, #4e5650, #2a5a4e |
| web | 10 | 52 x 48 | 26, 48 | 0.85-1.22 | broodmothersDen | #26201a, #e6eaf1 |
| widowTree | 1 | 47 x 79 | 24, 74 | 30 | widowsMire | #bdc8bf, #7b7f77, #2a2620 |
| willowTree | 83 | 86 x 67 | 46, 62 | 0.80-1.25 | bonewhiteWillows | #a8a69a, #cbc7b9, #e4e0d2, #d8d4c6 |
| wormwoodBush | 61 | 35 x 22 | 16, 20 | 0.81-1.25 | wormwoodHollow | #99a78d, #6a7a62, #74846b, #85947a |
| ziggurat | 1 | 180 x 119 | 90, 119 | 90 | hollowZiggurat | #2e3430, #52594b, #3b4338 |

Kinds the game can draw that no map uses yet are not listed.

## Portraits

| Where | Size | Notes |
|---|---|---|
| Dialogue portraits | 380 x 480 frame | One per character. The `portrait` column of the narrative `characters` tab already takes an image file from `data/narrative/portraits/`; blank = the drawn placeholder. A telepathic speaker's frame tilts at the shoulders (about 80% down). |
| Equipment panel Druid | 260 x 400 box | The Druid behind the equipment slots; his belt carries the potion sockets. |
| Place scenes (Trader, Tinker's Rest, villages) | characters at 2.4x their battle size | The Druid stands on the left at stage (400, 640), the host on the right at (1520, 600), anchored at their feet. The Druid comes to about 108 x 194 there. |
| Menu portraits (build and summon menus) | 40 x 40 (34 x 34 on tiles) | Made from the battlefield drawing, cropped and fitted, so new battlefield art shows here by itself. |
| Wave preview icons | 30 x 30 | The same, from the enemy's drawing. |

## HUD and menu icons

| Icon | Size (px) | Where |
|---|---|---|
| Gold | 28 | HUD resource panel |
| Materials (pits, reeds, feathers, boughs, shells, peat, scales) | 20 | HUD two-row grid |
| Materials in cost rows | 18 (14 on build tiles) | Build, summon and craft menus |
| Drops on the ground | about 20 | Battlefield, before the sweep |
| Resource floaters | 28 | Rising from a searched spot |
| Item icons | 60 in an equipment slot (an 88 px circle), 40 in popover rows, 26 in the Tinker book, 52 on Trader cards, 92 in the Trader's deal | Framed by rarity |
| Item found floater | 40 | Rising from the spot where an item was found |
| Potions | 38 in a 44 px belt socket, 30 for active effects by the HP bar, 30 on the map belt, 40 in the inventory | Vessel shape by tier, liquid colour by potion |

