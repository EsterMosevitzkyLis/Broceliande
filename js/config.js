// Broceliande — code-side settings (M2j §2.2): stage and loop, UI and drawing sizes, visual-only
// timings, decoration sizes, debug. Balancing data (global settings, Druid, enemies, turrets,
// summons, items, levels, waves…) lives in data/*.csv, edited in the Google Sheet, and each battle
// level's ground in data/maps/<id>.json (M4a); both are filled in at the bottom of this file by
// applyData() at start-up (see js/boot.js).

import { levelFromMap } from './mapFile.js';

// ---------------------------------------------------------------------------
// Stage & loop (§3.4, §3.5)
// ---------------------------------------------------------------------------
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export const SIM_STEP = 1 / 60;          // seconds, fixed timestep
export const MAX_FRAME_DT = 0.05;        // real seconds; larger frame gaps (tab switch) are clamped
export const MAX_STEPS_PER_FRAME = 12;   // hard cap on sim steps per animation frame (covers ×4 speed)
export const SIM_SPEEDS = [1, 2, 4];     // game speeds for the player in Combat (M2k §1: HUD buttons, keys 1 / 2 / 4)

// ---------------------------------------------------------------------------
// M1b addendum §9 — step-budget Prep (docs/M1B_STEPS_ADDENDUM.md)
// ---------------------------------------------------------------------------
export const PREP_MODE = 'steps';          // 'steps' | 'timed' — mode at page load; debug key M toggles it
export const STEP_BAR_BLINK_HZ = 3;        // TUNING — red blink rate of the step bar on an unaffordable hover (§5.2)
// M1g §2: footstep route preview (UI time, visual only).
export const FOOTPRINT_SIDE_OFFSET = 5;    // TUNING — px each footprint sits left / right of the route line
export const FOOTPRINT_REVEAL_TIME = 0.5;  // TUNING — s for the trail to appear from the Druid to the target, whatever the distance
export const TRAIL_FOOTPRINT_ALPHA = 0.45; // TUNING — committed route-trail footprints (M1h §1), fainter than the preview
export const FOOTPRINT_FADE_TIME = 0.06;   // s each footprint takes to fade in
export const CALIBRATION_SLOT_COUNT = 5;   // debug panel: "all features + N nearest slots" greedy figure (§8)
export const CALIBRATION_TARGET_RATIO = 1.4; // that figure should be about this × the level's stepBudget (§9 budget intent)

// ---------------------------------------------------------------------------
// 17.2 Druid
// ---------------------------------------------------------------------------
export const DRUID_ACTION_OFFSET = { x: -58, y: 20 };    // TUNING — Druid position beside a target (just outside LOCATION_RADIUS)
// M1f §4: each strike is wind-up → swing + lunge → impact (damage lands here) → recover.
export const STRIKE_RECOVER_TIME = 0.18;                 // s, staff and Druid return to rest (visual only)
export const STRIKE_LUNGE_PX = 10;                       // px the Druid lunges toward the target (visual only)

// ---------------------------------------------------------------------------
// Enemies — visual and debug only (their stats and drops are in data/enemies.csv, drops.csv)
// ---------------------------------------------------------------------------

// Flying enemies (M2h §3, the Stirge).
export const DEBUG_STIRGE_FLOCK = 4; // debug key S: Stirges per flock (M2h §6)

// Mini-boss feedback (M2c §2.5–2.7). Visual only.
export const SCREEN_SHAKE_ENABLED = true; // false: no screen shake
export const OGRE_SHAKE_PX = 6;           // TUNING — px, canvas drawing only
export const OGRE_SHAKE_TIME = 0.2;       // TUNING — s
export const OGRE_DUST_TIME = 0.45;       // s a dust ring spreads and fades at the blow's target
export const OGRE_DUST_RADIUS = 46;       // px, its final radius
export const OGRE_BLOW_POSE_TIME = 0.3;   // s the club stays down after a blow (drawing)
export const BOSS_BANNER_TIME = 2;        // s the "An Ogre approaches!" banner shows, fading out
export const BOSS_LANE_PULSE_TIME = 2;    // s the boss's lane entrance pulses red
export const BOSS_LANE_PULSE_RADIUS = 90; // px

// Grim enemies (M2l). Their stats, traits, drawScale and soundPitch are in data/enemies.csv; this is
// their look and debug only.
export const GRIM_OUTLINE_COLOR = '#ff8a2a'; // TUNING — ember outline round the whole silhouette
export const GRIM_OUTLINE_WIDTH = 1.6;      // px
export const GRIM_OUTLINE_PERIOD = 1;       // s per pulse
export const GRIM_OUTLINE_ALPHA = [0.55, 1]; // its opacity at the pulse's low and high
export const GRIM_CRACK_COLOR = '#ff9a3a';  // glowing crack lines across the body
export const GRIM_SPIKE_COLOR = '#b9b4aa';  // the Grim Ogre's club spikes (iron)
export const GRIM_SMOKE_PUFFS = 5;          // TUNING — pale ash puffs rising off each Grim at once
export const GRIM_SMOKE_RGB = '214, 208, 200'; // pale ash grey
export const GRIM_SMOKE_ALPHA = 0.62;       // a puff's peak opacity
export const GRIM_SMOKE_RATE = 0.55;        // TUNING — rises per s (each puff's cycle)
export const GRIM_SMOKE_RISE = 1.6;         // × radius a puff rises before it fades
export const GRIM_SPARKS = 3;               // tiny ember sparks rising through the smoke
export const GRIM_SPARK_RATE = 0.9;         // rises per s
export const ARMOR_SPARK_TIME = 0.18;       // s the grey spark shows where armor reduced a hit
export const HEAL_SPARKLE_TIME = 0.4;       // s the red sparkle shows on a biter that healed
export const DOGGED_SPIRAL_SPEED = 3;       // × the slow spiral's turn rate on a slow-resistant enemy
export const DOGGED_SPIRAL_ALPHA = 0.5;     // its opacity
export const DEBUG_GRIM_WOLVES = 4;         // debug Shift+G: Grim Wolves (the region's swarm Grims, M3b §1) spawned at once
// Undead Grims (M3b §2): the same look rules in cold green, with pale mist instead of ash smoke.
export const UNDEAD_OUTLINE_COLOR = '#7fe0a8'; // TUNING — cold green outline
export const UNDEAD_CRACK_COLOR = '#8af0b4';   // glowing crack lines
export const UNDEAD_MIST_RGB = '200, 226, 214'; // pale mist

// Rising dead (M3b §3.3) and sinking drops (§4). Visual only; the timings are in data/globals.csv.
export const RISE_ANIM_TIME = 0.6;          // s a risen enemy takes to pull itself up (drawing)
export const RISEN_TINT = 'rgba(70, 96, 46, 0.42)'; // the muddy green tint risen enemies keep
export const BODY_GLOW_RGB = '120, 230, 150'; // the faint green glow round a body waiting to rise
export const ASH_TIME = 1.2;                // s a body burnt to ash smoulders before it is gone
export const DROP_SINK_BLINK_TIME = 3;      // s: in its last this-many s a sinking drop blinks
export const DROP_SINK_DEPTH = 0.45;        // × icon size a drop settles into the mire by the end
export const DROP_SINK_SHRINK = 0.45;       // how much smaller it is by the end
// Mire ground (M3c §3.1): each level's patches are fixed in its map file (M4a §1.2). The draft
// generator (mapDraft.js, for the map editor) makes each a cluster of overlapping round blobs,
// kept MIRE_CORRIDOR_GAP px off every corridor.
export const MIRE_SEED_OFFSET = 7331;
export const MIRE_BLOBS = [4, 8];           // blobs per patch
export const MIRE_BLOB_RADIUS = [26, 64];   // px
export const MIRE_PATCH_SPREAD = 70;        // px a patch's blobs scatter round its centre
export const MIRE_CORRIDOR_GAP = 6;         // px
export const MIRE_SAMPLE_PX = 4;            // px between samples when measuring travel inside the mire
// M3d: dark and wet in the middle (base, deep), a soft lighter muddy rim (rim, rimOuter), a sheen,
// reeds and a slow bubble.
export const MIRE_COLORS = {
  base: 'rgba(22, 32, 24, 0.86)', deep: 'rgba(10, 18, 14, 0.45)', rim: 'rgba(96, 82, 56, 0.55)', rimOuter: 'rgba(110, 96, 66, 0.22)',
  sheen: 'rgba(170, 210, 190, 0.3)', reed: '#6a8a52', bubble: 'rgba(200, 228, 210, 0.7)',
};
// The Bog King (M3b §5.3). Visual only; his stats and timings are in data/.
export const BOSS_ENTRANCE_TIME = 2;        // s his lane's entrance bubbles and darkens before he rises from it
export const BOG_KING_SHAKE_PX = 13;        // TUNING — px, the screen shake of his slam (an Ogre's: OGRE_SHAKE_PX)
export const BOG_KING_SHAKE_TIME = 0.35;    // s
export const BOG_KING_SPLASH_RADIUS = 96;   // px, the splash ring of his slam
export const BOG_KING_SUMMON_POSE_TIME = 0.9; // s he holds his arms spread after raising Thralls
export const SHOWCASE_GAP = 28;             // debug Shift+C: px between the figures in the comparison row
export const SHOWCASE_PAIR_GAP = 70;        // px between one normal / Grim pair and the next


// ---------------------------------------------------------------------------
// Turrets — visual only (their stats are in data/turrets.csv)
// ---------------------------------------------------------------------------

export const CLOUD_GROW_TIME = 0.3;       // s, a cloud grows from pellet size to full radius (visual only)
export const CLOUD_FADE_TIME = 0.6;       // s, it fades out over its last moments (visual only)
export const TURRET_TURN_SPEED = 9;       // TUNING — rad/s, how fast a turret visibly turns toward its target (visual; firing does not wait for it)
export const TWIN_SHOT_SPREAD = 5;        // px either side of the muzzle the Stormspinner's two pebbles leave from (M2m §2.5, visual)
export const CONE_BURST_TIME = 0.4;       // s a Cinderjaw breath shows (M2o §4.2, visual; the damage is instant)
export const EMBER_JUMP_TIME = 0.45;      // s Wildfire embers take to jump to a newly lit enemy (M2o §4.2)
export const CINDERJAW_TONGUE_PERIOD = 2.6; // s between idle tongue flicks (visual)

// ---------------------------------------------------------------------------
// 17.5 Vulture
// ---------------------------------------------------------------------------
export const VULTURE_FLIGHT_HEIGHT = 26;    // px a flying Vulture is drawn above its ground shadow (visual only)

// ---------------------------------------------------------------------------
// 17.6 Scene layout
// ---------------------------------------------------------------------------
export const HUD_STRIP_HEIGHT = 80;       // px
export const LANE_LENGTH_FACTOR = 2.0;    // TUNING — target lane length ÷ straight-line spawn→Druid distance
export const LANE_LENGTH_TOLERANCE = 0.15; // start-up warning if a lane's length factor is off LANE_LENGTH_FACTOR by more than this fraction
export const LANE_SAMPLES_PER_SEGMENT = 24; // polyline samples between two waypoints (§12.2)

// Spot art (slot pads, turrets of every type and level, features) is drawn for a footprint of
// SPOT_ART_RADIUS and scaled by SPOT_SCALE = LOCATION_RADIUS / SPOT_ART_RADIUS round the location
// centre, so it keeps its proportions when the footprint changes. The sizes below are design sizes.
export const SPOT_ART_RADIUS = 45;        // px, the footprint the spot drawings were made for
export const TURRET_SLOT_RADIUS = 30;     // TUNING — px, slot pad size (drawing only; must fit SPOT_ART_RADIUS)
export const TURRET_BASE_OFFSET = 18;     // px the slot pad sits below its location centre, so pad + turret fit the footprint (M1c §2.1)

// ---------------------------------------------------------------------------
// 17.7 Searchable features
// ---------------------------------------------------------------------------

export const FEATURE_RADIUS = 32;         // TUNING — px, feature sprite scale (drawing only; sprites must fit SPOT_ART_RADIUS)

// ---------------------------------------------------------------------------
// M1c addendum — candidate locations and randomised layout (docs/M1C_LAYOUT_ADDENDUM.md §7)
// ---------------------------------------------------------------------------
export const DECOR_MARGIN = 15;           // TUNING — px, decoration keeps this far beyond footprint + jitter


// ---------------------------------------------------------------------------
// Decorative forest (§5.3, M1c §5) — visual only, no gameplay effect.
// Every object is fixed in the level's map file (M4a §1.2); the draft generator (mapDraft.js)
// scatters it on a jittered grid from a seed. Each object's drawn extent (a circle `lift` px above its base with
// radius `r`, both × its size) must stay clear of every corridor and of every candidate
// location's footprint + jitter + DECOR_MARGIN, including vacant ones.
// ---------------------------------------------------------------------------
export const DECOR = {
  cellSize: 64,               // px, jittered grid cell; one candidate object per cell
  treeChance: 0.42,           // per cell, away from corridors; these three chances × the level's decorDensity
  bushChance: 0.22,
  rockChance: 0.08,
  edgeBand: 110,              // px from the screen border where trees always grow (boundary)
  corridorGap: 2,             // px kept between any object's drawn extent and a corridor edge
  extent: {                   // drawn extent per kind, in units of the object's size (matches render/environment.js)
    tree: { lift: 40, r: 48 },
    bush: { lift: 10, r: 22 },
    rock: { lift: 7, r: 17 },
    // Themed kinds (M2b §3); gnarled trees use `tree`.
    reeds: { lift: 12, r: 16 },
    sunkenRoof: { lift: 15, r: 40 },
    brokenFence: { lift: 12, r: 30 },
    mushrooms: { lift: 5, r: 16 },
    standingStone: { lift: 30, r: 34 },
    gravestone: { lift: 14, r: 17 },
    slab: { lift: 4, r: 22 },
    kiln: { lift: 8, r: 26 },          // M2f §4.1
    sunkenStones: { lift: 8, r: 36 },  // M2f §4.4
    stump: { lift: 6, r: 18 },         // M2f §4.7
    weepingStone: { lift: 30, r: 28 }, // M2f §4.9
    root: { lift: 6, r: 44 },          // M2f §4.11 (ring round the Druid)
    // M3d §2: Hag's Causeway's signature decoration.
    tallowCandles: { lift: 8, r: 22 }, // floating in Tallow Fen's pools
    leechStones: { lift: 8, r: 30 },   // in the Leechwater Pools
    lanternPole: { lift: 30, r: 22 },  // The Lantern Fen
    reedWall: { lift: 20, r: 14 },     // along The Corpse Reedbeds' corridors
    footbridge: { lift: 8, r: 60 },    // The Rotting Ford (landmark)
    gallows: { lift: 40, r: 50 },      // The Drowned Gallows (landmark)
    tanneryVats: { lift: 12, r: 60 },  // The Drowned Tannery (landmark)
    dryingRack: { lift: 20, r: 22 },
    ossuary: { lift: 30, r: 52 },      // The Sunken Ossuary (landmark)
    widowTree: { lift: 50, r: 30 },    // The Widow's Mire (landmark, on the mire)
    plagueCart: { lift: 14, r: 42 },   // The Plague Carts (landmarks)
    sluiceGate: { lift: 24, r: 55 },   // The Weeping Sluice (landmark)
    sunkenBelfry: { lift: 40, r: 46 }, // The Drowned Bell Tower (landmark)
    altarStone: { lift: 12, r: 44 },   // The Blackwater Shrine (landmark)
    peatThrone: { lift: 45, r: 50 },   // Bog King's Rest (landmark, at a lane's far end)
    charredRoof: { lift: 15, r: 40 },  // M3a §2: The Burnt Hamlet's ash pits
    charredBeams: { lift: 10, r: 32 },
    scorchedStones: { lift: 8, r: 36 }, // M3a §2: The Ember Road's ash pits
  },
  clearingRadius: 120,        // px, open dirt clearing around the Druid
  groundPatches: 70,          // subtle floor colour blobs
};

// ---------------------------------------------------------------------------
// 17.8 Wave
// ---------------------------------------------------------------------------
export const WAVE_ICON_SIZE = 30;       // px, enemy images in the wave preview (M2i §4.2)

// ---------------------------------------------------------------------------
// Summons — UI and visual only (their stats are in data/summons.csv)
// ---------------------------------------------------------------------------

// Summon shortcuts in Combat (same as clicking the summon's card in the summon panel), shown as key badges there.
export const SUMMON_DENIED_FLASH_TIME = 0.45; // s an unavailable summon's card flashes in the summon panel

// Slow Wisp (M2k §3.5), visual only; its stats are in data/summons.csv.
export const WISP_COLOR = '#c8dcf0';          // pale silver-blue: the orb, its trail, the burst and the slowed tint
export const WISP_GLOW = 'rgba(190, 215, 245, 0.35)';
export const WISP_TRAIL_POINTS = 10;          // TUNING — trail length, in past positions
export const WISP_TRAIL_SPACING = 0.05;       // s of flight between trail points
export const WISP_SPIRAL_RADIUS = 6;          // TUNING — px, the lazy spiral the orb and trail wobble along
export const WISP_SPIRAL_RATE = 3;            // rad/s of that wobble
export const WISP_BURST_TIME = 0.8;           // s the burst takes to fade out
export const SLOW_TINT_FILTER = 'grayscale(0.55) sepia(0.25) hue-rotate(175deg) brightness(1.25)'; // TUNING — pale silver-blue tint on a slowed enemy (canvas filter)
export const CORRODE_TINT_FILTER = 'sepia(0.55) hue-rotate(30deg) saturate(1.6) brightness(1.08)'; // TUNING — faint yellow-green tint on a Corroded enemy (M2m §2.5)
export const SLOW_CORRODE_TINT_FILTER = 'grayscale(0.5) sepia(0.4) hue-rotate(110deg) saturate(1.3) brightness(1.2)'; // TUNING — teal mix while both slowed and Corroded
export const SLOW_SPIRAL_SIZE = 7;            // px, radius of the spiral floating above a slowed enemy's head
export const SLOW_SPIRAL_TURN_RATE = 1.2;     // rad/s it turns
export const SOUND_WISP_FREQ = 620;           // TUNING — Hz, the Wisp's airy whistle

// Bough Double (M1i §2): a summon that does one build or upgrade job at a turret slot in
// Combat, then disappears. Its full cost (the job's cost plus BOUGH_DOUBLE_COST) is paid at
// once; cancelling refunds it all. It appears beside its target at DRUID_ACTION_OFFSET.
export const DOUBLE_TINT = '#7a5530';       // monochrome brown version of the Druid's drawing
export const DOUBLE_ALPHA = 0.6;
export const DOUBLE_CRAFT_SWING_INTERVAL = 0.45; // s between staff swings (each one a craft hit)
export const DOUBLE_APPEAR_TIME = 0.2;      // s to fade and scale in (visual only)
export const DOUBLE_FADE_TIME = 0.3;        // s to fade out on completion or cancel (visual only)
export const DOUBLE_BOB_PX = 2;             // px of gentle bob while crafting (visual only)
export const DOUBLE_CHIP_TIME = 0.45;       // s a wood chip flies before vanishing (visual only)

export const RESOURCE_ICON_SIZE = 28;     // px, resource icons in the HUD panel
export const MENU_PORTRAIT_SIZE = 40;     // px, creature / turret images in menus (M1f §2)
export const MENU_COST_ICON_SIZE = 18;    // px, resource icons in cost rows (M1f §3)
export const DROP_ICON_SCALE = 0.7;       // drop icons on the ground, relative to RESOURCE_ICON_SIZE
// M1g §1: drops pop out of the death point and arc to their resting spot (simulation time).
export const DROP_SETTLE_TIME = 0.08;     // s of squash-and-settle on landing (visual only)

// ---------------------------------------------------------------------------
// Sound (M1g §3) — synthesised in js/audio.js, triggered by gameplay events. Never affects the simulation.
// ---------------------------------------------------------------------------
export const SOUND_RESOURCE_FREQ = { pits: 440, reeds: 660, feathers: 990, boughs: 300, shells: 520, peat: 180 }; // TUNING — Hz, chime pitch per resource (Boughs lowest and woody, M1i §1.3; Shells soft and hollow, M2k §2.1)
export const SOUND_CHIME_STAGGER = 0.07;  // s between chimes when one search finds several resources
export const SOUND_SUMMON_FREQ = { vulture: 330, squirrel: 880 }; // TUNING — Hz, shimmer base pitch per summon
export const SOUND_STATS_WINDOW = 5;      // s, debug panel: sounds played / skipped over this much real time (M1g §5)
export const SOUND_MUTE_KEY = 'broceliande.muted'; // localStorage key for the mute state

// ---------------------------------------------------------------------------
// Place scenes (M2n §1): full-screen scenes of non-combat map nodes, the Trader's first. A scene
// template: a background in the place's palette (PLACE_PALETTE) with decoration, a character on
// the left (the Druid) and one on the right (the host), and the interaction area between them.
// Stage px; feet positions. Drawing and layout only.
// ---------------------------------------------------------------------------
export const PLACE_SCENE = {
  horizonY: 430,                          // the clearing's back edge: forest above, open ground below
  clearing: { x: 960, y: 760, rx: 1000, ry: 330 }, // the open ground ellipse
  druid: { x: 400, y: 640, scale: 2.4 },  // left character (zone kept clear for a sprite later)
  host: { x: 1520, y: 600, scale: 2.4 },  // right character
  decorSeed: 4242,                        // the background trees and bushes (visual only)
  backTrees: 16,                          // trees along the clearing's back edge
  sideBushes: 10,                         // bushes along its sides
};
export const TRADER_SCENE = {
  cart: { x: 1700, y: 520 },              // behind the trader
  campfire: { x: 690, y: 470 },           // at the back of the clearing, behind and right of the Druid
  blanket: { x: 1510, y: 845, rx: 400, ry: 195 }, // the goods lie on it (DOM over it, traderScreen.js)
  coins: { x: 545, y: 650 },              // the Druid's little pile of gold, beside him (M3e §5.1)
  coinsPerCoin: 15,                       // gold per coin drawn in that pile (visual only)
  coinsMax: 14,                           // most coins drawn
};
// The Tinker's Rest (M2p §4.2): ruins and an old forge on the left by the Druid, the open book on
// its workbench on the right (the book's pages are HTML over it, tinkerScreen.js).
export const TINKER_SCENE = {
  forge: { x: 760, y: 520 },              // the forge's base, centre (behind the anvil)
  anvil: { x: 640, y: 700 },              // the anvil's base, centre; the craft animation plays over it
  beam: { x1: 560, x2: 960, y: 250 },     // the beam the tools hang from, above the forge
  book: { x: 990, y: 150, w: 870, h: 790 }, // the open book (both pages), stage px
};
export const TINKER_FADE_TIME = 0.35;     // s, the fade into and out of the Tinker's Rest (M2n §1)
export const CRAFT_ANIM = {               // s from Craft (M2p §4.3): visual timings only
  strikes: [0.25, 0.6],                   // the hammer hits the anvil
  appear: 0.95,                           // the item appears in a burst of sparks
  end: 1.9,                               // the animation is over (Craft and Undo are back)
};
export const FORGE_CRACKLE_GAPS = [0.8, 1.3, 0.6, 1.1, 0.9]; // s between the forge's quiet crackles, in turn (M2p §4.4)
export const TRADER_FADE_TIME = 0.35;     // s, the fade into and out of the trader scene (M2n §1)
export const TRADER_LOOKS = [             // per-trader colour variation (cloak, hood lining, pack), by profile (traderProfiles order)
  { cloak: '#5b3a5e', lining: '#8a5a8e', pack: '#7a5a34' },
  { cloak: '#3d5a3a', lining: '#6d8a5a', pack: '#80613a' },
  { cloak: '#6a3a2a', lining: '#a0603e', pack: '#6c5232' },
  { cloak: '#2f4a5e', lining: '#5a7a90', pack: '#7d5c3a' },
  { cloak: '#5e5230', lining: '#8f8048', pack: '#6a4a2c' },
];

// ---------------------------------------------------------------------------
// 17.9 Debug
// ---------------------------------------------------------------------------
export const DEBUG_SEED = null;          // null = new random seed each restart; integer = fixed seed
export const DEBUG_START_ENABLED = false;
export const DEBUG_GRANT_GOLD = 50; // M3e §8: debug G also grants this much gold
export const DEBUG_GRANT_AMOUNT = 10;   // G key: +this many of each resource
export const DEBUG_DROP_MULT = 10;      // X key toggles wolf drop chances between ×1 and ×this (M1d §3)

// ---------------------------------------------------------------------------
// Feedback (§16.3) — visual only
// ---------------------------------------------------------------------------
export const FLOATING_TEXT_TIME = 1.4;   // s a "+2 Pits" style text stays up (simulation time)
export const FLOATING_TEXT_RISE = 40;    // px it drifts upward over that time
// Resource floaters (M2d §1): every resource gain (searches, Squirrel pickups, debug G) shows one
// rising icon + "×N" per resource, instead of floating text. Damage numbers stay as text.
export const FLOATER_ICON_SIZE = 28;     // TUNING — px
export const DRUID_SWIPE_TIME = 0.25;   // s a Druid strike swoosh arc stays visible (M1e §2.4, M1f §4)
export const STRIKE_SPARK_TIME = 0.2;   // s the impact spark on the target stays visible (M1f §4)
export const STRIKE_KNOCKBACK_PX = 3;   // px the target is pushed back visually on impact (simulation position unchanged)
export const STRIKE_KNOCKBACK_TIME = 0.15; // s for that visual knock-back to settle

// ---------------------------------------------------------------------------
// Level map and run (M2a §2–§4, M3a). A run crosses the regions in order; in each, a path through
// the region's map from its row 1 node to its boss. Each region's map is generated (M2g, js/mapGen.js): the nodes stay
// in their rows, at fixed row heights on the 1920×1080 stage, the start at the bottom; their order,
// x positions and roads vary. Nothing in the code is tied to these particular nodes.
// ---------------------------------------------------------------------------
// Node types (M2c §1.1): every type plays the same (an encounter from its levelId); they differ in
// label (tooltip), icon (a draw function in render/map.js) and whether that icon has red eyes. A
// Fell Wilds' level includes a mini-boss.
export const NODE_TYPES = {
  wilds: { label: 'Wilds',      icon: 'wolfHead', redEyes: false },
  fell:  { label: 'Fell Wilds', icon: 'wolfHead', redEyes: true  },
  // M2f §2: a region's final node, drawn MAP_BOSS_SCALE × as large with a dark red rim and a slow
  // red pulse; winning the last region's completes the run with that region's finalLine (M3a §3).
  boss:  { label: 'Boss', icon: 'wolfHead', redEyes: true, large: true },
  // M2n §2.2: a Wandering Trader (no battle): a warm amber rim, a lantern, and a gold coin mark
  // instead of the red V once visited. Generated with the map, not listed in MAP_NODES.
  trader: { label: 'Wandering Trader', icon: 'lantern', rim: '#e0a63c', fill: '#5a3c1e', completedMark: 'coin' },
  // M2p §4.1: a Tinker's Rest (no battle): a copper rim, an anvil, and a small hammer mark once
  // visited. Generated with the map, like the Traders.
  tinker: { label: "Tinker's Rest", icon: 'anvil', rim: '#c8784a', fill: '#4e3226', completedMark: 'hammer' },
};

// M2e §4.6 (as revised): the map's ground runs across the whole screen; its nodes use the right
// half (x ≥ EQUIP_PANEL_WIDTH), and it doesn't scroll.
// The rows are spread evenly over the map's height (mapGen.js rowY): the top row's node, rim
// included, MAP_TOP_MARGIN below the HUD strip; the bottom row's label MAP_BOTTOM_MARGIN above the
// screen's bottom edge. Positions within a row are generated (M2g).
export const MAP_TOP_MARGIN = 95;         // px from the HUD strip's bottom to the top row's node (the boss, with its rim); room for the region title (M3a §5.1)
export const MAP_TITLE = { y: 44, fontPx: 46, letterSpacing: 6 }; // M3a §5.1: the region's name, centred over the map area, its middle y px below the HUD strip
export const MAP_BOTTOM_MARGIN = 25;      // px from the bottom row's label (the start node's) to the screen's bottom edge
export const MAP_LABEL_PILL = { padX: 7, padY: 2, radius: 8, color: 'rgba(12, 16, 10, 0.6)' }; // the soft backing behind node names
export const MAP_LABEL_FONT_PX = 18;      // node names; a name wider than MAP_LABEL_MAX_WIDTH wraps onto two lines
export const MAP_LABEL_MAX_WIDTH = 170;   // px
// M2g §1, M3a §1.2: the map's nodes, one per level (built in applyData from the levels tab), each
// in its level's region and row: row 1 the region's start, its last row the boss. Their order
// within a row, their positions and the roads between rows are generated per region map
// (js/mapGen.js). { id (= levelId), levelId, name, type, region }.
export let MAP_NODES;
export const MAP_NODE_RADIUS = 30;        // px (M2e §4.6, was 44)
export const MAP_BOSS_SCALE = 1.5;        // M2f §2: a large node (the Boss) is drawn and hit-tested this much bigger
export const MAP_BOSS_PULSE_HZ = 0.35;    // its slow, faint red pulse
export const MAP_HOVER_SCALE = 1.08;      // an available node under the pointer grows this much
export const MAP_PULSE_HZ = 0.8;          // gentle glow pulse of available nodes
export const MAP_DECOR_SEED = 909;        // the map's procedural background shapes, identical every run
// M3a §5.2: each region's map background, drawn in its palette (palettes rows map<Region>). Counts
// of each kind of shape, scattered with MAP_DECOR_SEED and kept clear of the nodes and the equipment.
export const MAP_BACKGROUNDS = {
  cinderwood: { clusters: 120, embers: 14, ashMotes: 40 },          // charred tree clusters, faint ember glows, drifting ash
  hags: { pools: 22, reeds: 40, willows: 12, stones: 10, mist: 9 }, // still pools, reed clumps, dead willows, causeway fragments, mist wisps
};
export const MAP_ASH_DRIFT = { speed: 14, sway: 10 };       // px/s the ash motes fall, px they sway (wall-clock, visual only)
export const MAP_MIST_DRIFT = { speed: 9, wobble: 12 };     // px/s the mist wisps drift sideways, px they bob
export const MAP_AMBIENCE_GAPS = [3.2, 4.5, 2.6, 5.1, 3.8]; // s between the map's quiet ambience sounds, in turn (M3a §6)
export const CROSSING_FADE_TIME = 1.2;    // s, the fade into the next region's map after the crossing dialog (M3a §3)

// Generated map (M2g §2–§5): node order and x positions within each row, the roads between
// adjacent rows (never crossing) and their curves, from the run seed. Rows stay at fixed heights.
export const MAP_RANDOMISE = true;        // false = every run uses the map from MAP_FIXED_SEED (§3)
export const MAP_FIXED_SEED = 2024;
export const MAP_Y_JITTER = 8;            // px, a node's height may differ from its row's by up to this
export const MAP_MIN_NODE_GAP = 150;      // px between nodes in one row, so their labels don't collide
export const MAP_X_MARGIN = 110;          // px kept from the map area's edges (EQUIP_PANEL_WIDTH … stage edge), for labels
export const MAP_SINGLE_NODE_SPREAD = 60; // px, a single-node row (start, boss) sits within this of the map area's centre
export const MAP_ROAD_REACH = 220;        // px; a road's weight falls as exp(−horizontal distance / this): short roads are likelier
export const MAP_EXTRA_ROAD_CHANCE = 0.25; // TUNING — chance per extra non-crossing road candidate (× its distance weight)
export const MAP_MAX_ATTEMPTS = 200;      // whole maps tried until one passes every check; else the best one, with a warning
export const MAP_BOSS_MAX_ROADS_IN = 4;    // roads the boss node may take in: the one exception to 1–3 (M2n), so the row under it can hold a Trader
export const MAP_ROAD_BEND = 26;          // px, the most a road's curve bows sideways (seeded per road)
export const MAP_ROAD_CLEARANCE = 12;     // px a road keeps from other nodes' circles and labels

// ---------------------------------------------------------------------------
// Druid equipment (M2e §1–§2). Six slots: three staff charms, each strengthening one summon,
// and three pieces of personal equipment with passive effects. Items are data: effects are
// { stat, op: 'add' | 'mult', value } on the stats in js/stats.js (adds first, then mults),
// applied by the stats resolver when a battle starts. Item IDs are stable keys.
// ---------------------------------------------------------------------------
export const SLOT_TYPES = {
  crown:    { label: 'Crown Charm',   group: 'staff' },    // Vulture
  grip:     { label: 'Grip Charm',    group: 'staff' },    // Squirrel
  ferrule:  { label: 'Ferrule Charm', group: 'staff' },    // Bough Double
  necklace: { label: 'Necklace',      group: 'personal' }, // HP and survival
  belt:     { label: 'Belt',          group: 'personal' }, // work and gathering
  shoes:    { label: 'Shoes',         group: 'personal' }, // movement
};

// Item rarity (M2p §1.1): the items tab's `rarity` → its label and icon frame colour.
export const RARITY = {
  0: { label: 'Crafted',  frame: '#a070d8' }, // purple, craft-only
  1: { label: 'Common',   frame: '#b07a4a' }, // bronze
  2: { label: 'Uncommon', frame: '#5fae5a' }, // green
  3: { label: 'Rare',     frame: '#e0b83a' }, // gold
};
export const RARITY_FRAME_WIDTH = 2.5;   // px, the frame round an item icon (at a 64 px icon; scales with it)


// Finding items (M2e §3): one hidden in a random resource spot of each battle.
export const ITEM_FOUND_TIME = 2.5;       // s the "You found a …!" message stays, fading over its last third
export const MAP_MESSAGE_TIME = 4;        // s the map's "Pattern learned: …" message stays, fading over its last third (M2p §3.3)
export const ITEM_FLOATER_SIZE = 40;      // px, the slot-type silhouette floater rising from the spot

// Equipment area on the map (M2e §4, as revised): about the left half of the screen, below the HUD
// strip, drawn straight over the map's ground (no panel background). Panel px: x from the stage's
// left edge, y from the HUD strip's bottom. The portrait's centre is at about mid-screen height.
export const EQUIP_PANEL_WIDTH = 960;     // px of the 1920 px stage: the equipment half; the map nodes use the rest
export const EQUIP_SLOT_SIZE = 88;        // px, slot circle diameter
export const EQUIP_PORTRAIT = { x: 350, y: 260, w: 260, h: 400 }; // px in the panel: the Druid portrait's box
// Slot centres in the panel (px). Staff slots on the viewer's left, level with their part of the
// staff (held in the Druid's right hand, on the viewer's left); personal slots on the right, level
// with neck, waist and feet.
export const EQUIP_SLOT_POS = {
  crown:    { x: 256, y: 296 },
  grip:     { x: 256, y: 470 },
  ferrule:  { x: 256, y: 644 },
  necklace: { x: 704, y: 376 },
  belt:     { x: 704, y: 502 },
  shoes:    { x: 704, y: 638 },
};
// The staff and body points each slot is level with (panel px): the staff's x, and the slot rows.
export const EQUIP_SLOT_ANCHOR = {
  crown:    { x: 378, y: 282 },
  grip:     { x: 378, y: 470 },
  ferrule:  { x: 378, y: 652 },
  necklace: { x: 496, y: 376 },
  belt:     { x: 518, y: 502 },
  shoes:    { x: 516, y: 638 },
};
// Where the map's tree clusters thin out to a natural clearing round the equipment (stage px): an
// ellipse; clusters stop at a ragged edge (±EQUIP_CLEARING_RAGGED of its size) rather than a line.
export const EQUIP_CLEARING = { x: 480, y: 640, rx: 380, ry: 470 };
export const EQUIP_CLEARING_RAGGED = 0.2;

// ===========================================================================
// Balancing data (M2j): loaded from data/*.csv (edited in the Google Sheet) at start-up by
// js/boot.js, which calls applyData() before any other game module runs. These keep the names
// they had when they lived above, so systems still read C.NAME. Their meaning is documented in the
// CSVs' `notes` column and docs/M2J_DATA_SHEET_ADDENDUM.md.
// ===========================================================================

// Code-side lists the data must match: the resources the game draws (icons, HUD) and its summons.
export const RESOURCE_IDS = ['gold', 'pits', 'reeds', 'feathers', 'boughs', 'shells', 'peat'];
// M3c §1: a regional resource's HUD counter shows only from its region on (or while any is held).
export const REGIONAL_RESOURCES = { peat: 'hags' };
export const SUMMON_KINDS = ['vulture', 'squirrel', 'double', 'slowWisp'];
// Palettes of non-combat places (M2n §1): rows of the palettes tab that aren't levels.
// M3a §5: a region's own version of a place (trader + 'Hags' = 'traderHags') is used there if it
// exists; and each region's map background (map + 'Cinderwood').
export const PLACE_PALETTES = ['trader', 'tinker', 'traderHags', 'tinkerHags', 'mapCinderwood', 'mapHags'];
// The traders tab's kinds (M2n §4.5, M3e §7): the lines for each moment (names are in traderProfiles).
export const TRADER_LINE_KINDS = ['greet', 'buy', 'sell', 'poor', 'soldout', 'leave'];
// The traderTables tab's tables (M3e §3.2).
export const TRADER_TABLES = ['itemCount', 'patternCount', 'itemRarity', 'patternRarity'];

// globals tab
export let PREP_DURATION, END_DELAY, STEP_PX, TRAVEL_TWEEN_TIME;
export let ENEMY_WANDER_SPEED, ENEMY_WANDER_INTERVAL, ENEMY_SIDESTEP_SPEED, ENEMY_SLOT_CLAIM_DISTANCE,
  DRUID_APPROACH_RADIUS, ENEMY_DIRECT_APPROACH_ANGLE, STUCK_TIME, STUCK_DECAY_RATE, SIDE_KEEP_MARGIN;
export let STIRGE_DRUID_RING, STIRGE_WANDER_SPEED, STIRGE_WANDER_INTERVAL, STIRGE_SEPARATION,
  STIRGE_SEPARATION_SPEED, CLOUDS_HIT_FLYERS;
export let BURST_STAGGER, FIRST_WAVE_DELAY, WAVE_GAP_AFTER_LAST_SPAWN;
export let RISE_DELAY, RISE_HP_FRAC, DROP_SINK_TIME; // M3b §3–§4
export let BOG_KING_SUMMON_INTERVAL, BOG_KING_SUMMON_COUNT, BOG_KING_SUMMON_MAX, BOG_KING_SINK_TIME; // M3b §5
export let MIRE_STEP_MULT, ITEM_BURN_TICK, ITEM_BURN_DAMAGE; // M3c §3.2, §5
export let SPOT_SCALE; // LOCATION_RADIUS / SPOT_ART_RADIUS, set in applyData
export let CORRIDOR_WIDTH, RANDOMISE_LAYOUT, FIXED_LAYOUT_SEED, LOCATION_RADIUS, LOCATION_JITTER, LOCATION_GAP,
  LANE_MIN_TURRET_SLOTS, FEATURE_ROUTE_MIN_FACTOR, FEATURE_ROUTE_MAX_FACTOR, MAX_LAYOUT_ATTEMPTS;
export let ZONE_NEAR_TURRET, ZONE_NEAR_FEATURE, ZONE_FAR_TURRET, ZONE_FAR_FEATURE;
export let DROP_SPACING, DROP_POP_HEIGHT, DROP_POP_TIME, DROP_POP_STAGGER, DROP_SINGLE_OFFSET;
export let FLOATER_RISE_PX, FLOATER_TIME, FLOATER_STAGGER, FLOATER_STACK_PX;
export let SWEEP_FLIGHT_TIME, SWEEP_STAGGER, SWEEP_END_MARGIN, SWEEP_END_SCALE, SWEEP_PULSE_TIME;
export let CARRY_DRUID_HP, ITEMS_PER_BATTLE, RARITY_WEIGHT_1, RARITY_WEIGHT_2, RARITY_WEIGHT_3, FIND_PATTERN_CHANCE, WORK_SPEED, SEARCH_MAIN_BONUS, BOUGH_REFUND_CHANCE;
export let MASTER_VOLUME, SOUND_PITCH_JITTER;
export let TRADE_TAG_CHEAP, TRADE_TAG_PRICEY, GOLD_PER_VALUE, RESOURCE_SELL_FRACTION, ITEM_SELL_FRACTION, SHOP_PRICE_JITTER;
export let ITEM_PRICE_R0, ITEM_PRICE_R1, ITEM_PRICE_R2, ITEM_PRICE_R3, PATTERN_PRICE_R0, PATTERN_PRICE_R1, PATTERN_PRICE_R2, PATTERN_PRICE_R3;
export let ITEM_PRICE, PATTERN_PRICE; // M3e §4: rarity → default price (from the globals above)

// druid tab
export let DRUID_HP, DRUID_RADIUS, DRUID_MELEE_RADIUS, DRUID_MELEE_SLOTS, DRUID_MELEE_DAMAGE, DRUID_MELEE_INTERVAL,
  STRIKE_WINDUP_TIME, STRIKE_SWING_TIME, DRUID_REGEN_AMOUNT, DRUID_REGEN_INTERVAL;

// resources: id → { name, singular, plural, order, kind }; RESOURCE_ORDER: ids in display order;
// MATERIAL_ORDER: the same without currency (M3e §2.1: gold is never part of a cost)
export let RESOURCES, RESOURCE_ORDER, MATERIAL_ORDER;
// features: id → { name, searchTime, yields: { resource: [min, max] }, mainResource }
export let FEATURE_TYPES;
// enemies + drops: id → { baseType (its own id for a base row), variant (e.g. 'grim', or null), name, plural, hp, speed, radius, damage, attackInterval, meleeSlotsUsed,
// hitHeight, drops: [{ resource, chance, min, max }], and optional collisionRadius, windupTime,
// flying, flyHeight, burstStagger, dropSpacing, keepSide, sideWander, boss, stepSoundInterval }
export let ENEMY_TYPES;
// turrets: id → { name, attack: 'projectile' | 'cloud' | 'cone', range (level 1), projectileSpeed (not for a cone),
// muzzleHeight, levels: [{ damage, fireInterval, range, cost, time, name (or null), targets (M2m §2.3:
// pebbles per volley), cloud?: { radius, duration, tickInterval, tickDamage, corrode?: { mult, linger } },
// cone?: { angle (degrees), burn: { duration, tickInterval, tickDamage, spreadRadius } } }] }.
// Level 1's cost / time are the build; later levels' the upgrade to that level.
export let TURRET_TYPES;
export let TURRET_RANGE; // the Pebble Sprinkler's level-1 range: lane coverage for layouts (M1c §4.1)
// summons: id → its row; and the values systems read by name
export let SUMMON_TYPES, SUMMON_KEYS;
export let VULTURE_COST, VULTURE_HP, VULTURE_DAMAGE, VULTURE_ATTACK_INTERVAL, VULTURE_DURATION, MAX_VULTURES,
  VULTURE_SPEED, VULTURE_RADIUS, VULTURE_MELEE_RANGE, VULTURE_BLOCK_RADIUS;
export let SQUIRREL_COST, SQUIRREL_HP, SQUIRREL_DURATION, SQUIRREL_SPEED, MAX_SQUIRRELS, SQUIRREL_RADIUS,
  SQUIRREL_PICKUP_RANGE, SQUIRREL_BLOCKS_WOLVES, SQUIRREL_DAMAGE, SQUIRREL_ATTACK_INTERVAL, SQUIRREL_BLOCK_RADIUS;
export let WISP_COST, WISP_SPEED, MAX_WISPS, WISP_RADIUS, WISP_BURST_RADIUS, WISP_SLOW_MULT, WISP_SLOW_DURATION; // Slow Wisp (M2k §3)
export let BOUGH_DOUBLE_COST, MAX_BOUGH_DOUBLES, DOUBLE_WISP_TIME;
// items: id → { slot, rarity, price (M3e §4, or undefined: its rarity's default), name, description, effects: [{ stat, op, value }], colors: [main, accent], mark }
export let ITEMS;
// M2p §5: item ID → { cost, patternWeight, patternPrice } (its pattern's crafting cost, find weight and,
// M3e §4, Trader price or undefined: its rarity's default).
export let RECIPES;
// stats: stat → description (labels; the stats themselves are in js/stats.js)
export let STATS;
// regions (M3a §1.1): id → { name, order, deathLossPct, traders, tinkers, tinkerMinRow, risingDead,
// sinkingDrops, mireGround, introTitle, introText, finalLine }; REGION_ORDER: ids in order
export let REGIONS, REGION_ORDER;
// levels: id → its map file's fields (mapFile.js levelFromMap: lanes, druidPos, sectors, corridorWidth,
// candidateLocations, palette, ground, mire…) and background (an Image or null), plus name, description,
// region, row, nodeType, stepBudget, featureMix, zoneQuotas, waves, and optional enemyHpMult, stuckTime
export let LEVELS;
// sounds: id → { volume, pitch, minGap, maxVoices, enabled }
export let SOUNDS;
// trade (M2n §3.1, M3e §4): resource → { baseValue, stockMin, stockMax (default's fallback), regions }
export let TRADE;
// traders (M2n §4.5, M3e §7): kind → [{ trader (a profile id, or null: any trader), text }] (TRADER_LINE_KINDS)
export let TRADER_TEXT;
// traderProfiles + traderTables + traderStock (M3e §3): id → { name, regions (null = any), itemPriceMult,
// patternPriceMult, itemBuyMult, tables: { table: [{ value, weight }] }, stock: { resource: { stockMin,
// stockMax, priceMin, priceMax } } }; `default` fills in what a profile leaves out
export let TRADER_PROFILES;
// palettes of non-combat places (PLACE_PALETTES): id → palette, like a level's
export let PLACE_PALETTE;

// Builds every value above from the loaded tabs (rows as from js/data/loader.js, already checked by
// js/data/validate.js). Leaves out blank cells so the code's defaults apply, and keeps row order.
// t: the tables; maps: each level's map file, backgrounds: its background image (M4a §1.3).
export function applyData(t, maps = {}, backgrounds = {}) {
  const keyed = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const byId = (rows, f, col = 'id') => Object.fromEntries(rows.map((r) => [r[col], f(r)]));
  const opt = (obj, key, value) => { if (value !== undefined) obj[key] = value; return obj; };
  const cost = (r) => {
    const c = {};
    for (const k of Object.keys(r)) if (k.startsWith('cost_')) c[k.slice(5)] = r[k];
    return c;
  };

  ({
    PREP_DURATION, END_DELAY, STEP_PX, TRAVEL_TWEEN_TIME,
    ENEMY_WANDER_SPEED, ENEMY_WANDER_INTERVAL, ENEMY_SIDESTEP_SPEED, ENEMY_SLOT_CLAIM_DISTANCE,
    DRUID_APPROACH_RADIUS, ENEMY_DIRECT_APPROACH_ANGLE, STUCK_TIME, STUCK_DECAY_RATE, SIDE_KEEP_MARGIN,
    STIRGE_DRUID_RING, STIRGE_WANDER_SPEED, STIRGE_WANDER_INTERVAL, STIRGE_SEPARATION, STIRGE_SEPARATION_SPEED, CLOUDS_HIT_FLYERS,
    BURST_STAGGER, FIRST_WAVE_DELAY, WAVE_GAP_AFTER_LAST_SPAWN,
    RISE_DELAY, RISE_HP_FRAC, DROP_SINK_TIME,
    BOG_KING_SUMMON_INTERVAL, BOG_KING_SUMMON_COUNT, BOG_KING_SUMMON_MAX, BOG_KING_SINK_TIME,
    MIRE_STEP_MULT, ITEM_BURN_TICK, ITEM_BURN_DAMAGE,
    CORRIDOR_WIDTH, RANDOMISE_LAYOUT, FIXED_LAYOUT_SEED, LOCATION_RADIUS, LOCATION_JITTER, LOCATION_GAP,
    LANE_MIN_TURRET_SLOTS, FEATURE_ROUTE_MIN_FACTOR, FEATURE_ROUTE_MAX_FACTOR, MAX_LAYOUT_ATTEMPTS,
    ZONE_NEAR_TURRET, ZONE_NEAR_FEATURE, ZONE_FAR_TURRET, ZONE_FAR_FEATURE,
    DROP_SPACING, DROP_POP_HEIGHT, DROP_POP_TIME, DROP_POP_STAGGER, DROP_SINGLE_OFFSET,
    FLOATER_RISE_PX, FLOATER_TIME, FLOATER_STAGGER, FLOATER_STACK_PX,
    SWEEP_FLIGHT_TIME, SWEEP_STAGGER, SWEEP_END_MARGIN, SWEEP_END_SCALE, SWEEP_PULSE_TIME,
    CARRY_DRUID_HP, ITEMS_PER_BATTLE, RARITY_WEIGHT_1, RARITY_WEIGHT_2, RARITY_WEIGHT_3, FIND_PATTERN_CHANCE, WORK_SPEED, SEARCH_MAIN_BONUS, BOUGH_REFUND_CHANCE,
    MASTER_VOLUME, SOUND_PITCH_JITTER,
    TRADE_TAG_CHEAP, TRADE_TAG_PRICEY, GOLD_PER_VALUE, RESOURCE_SELL_FRACTION, ITEM_SELL_FRACTION, SHOP_PRICE_JITTER,
    ITEM_PRICE_R0, ITEM_PRICE_R1, ITEM_PRICE_R2, ITEM_PRICE_R3, PATTERN_PRICE_R0, PATTERN_PRICE_R1, PATTERN_PRICE_R2, PATTERN_PRICE_R3,
  } = keyed(t.globals));
  ITEM_PRICE = [ITEM_PRICE_R0, ITEM_PRICE_R1, ITEM_PRICE_R2, ITEM_PRICE_R3];
  PATTERN_PRICE = [PATTERN_PRICE_R0, PATTERN_PRICE_R1, PATTERN_PRICE_R2, PATTERN_PRICE_R3];
  SPOT_SCALE = LOCATION_RADIUS / SPOT_ART_RADIUS;

  ({
    hp: DRUID_HP, radius: DRUID_RADIUS, meleeRadius: DRUID_MELEE_RADIUS, meleeSlots: DRUID_MELEE_SLOTS,
    meleeDamage: DRUID_MELEE_DAMAGE, meleeInterval: DRUID_MELEE_INTERVAL, strikeWindupTime: STRIKE_WINDUP_TIME,
    strikeSwingTime: STRIKE_SWING_TIME, regenAmount: DRUID_REGEN_AMOUNT, regenInterval: DRUID_REGEN_INTERVAL,
  } = keyed(t.druid));

  RESOURCES = byId(t.resources, (r) => ({ name: r.name, singular: r.singular, plural: r.plural, order: r.order, kind: r.kind }));
  RESOURCE_ORDER = [...t.resources].sort((a, b) => a.order - b.order).map((r) => r.id);
  MATERIAL_ORDER = RESOURCE_ORDER.filter((k) => RESOURCES[k].kind === 'material');

  FEATURE_TYPES = byId(t.features, (r) => {
    const yields = {};
    for (const res of RESOURCE_ORDER) if (r[`${res}_min`] !== undefined) yields[res] = [r[`${res}_min`], r[`${res}_max`]];
    return { name: r.name, searchTime: r.searchTime, yields, mainResource: r.mainResource };
  });

  // Variant rows (M2l §1.1): every blank cell takes the baseType row's value.
  const enemyRows = byId(t.enemies, (r) => r);
  ENEMY_TYPES = byId(t.enemies.map((r) => (r.baseType ? { ...enemyRows[r.baseType], ...r } : r)), (r) => {
    const e = { baseType: r.baseType ?? r.id, variant: r.variant ?? null, name: r.name, plural: r.plural, hp: r.hp, speed: r.speed, radius: r.radius, damage: r.damage, attackInterval: r.attackInterval, meleeSlotsUsed: r.meleeSlots, hitHeight: r.hitHeight };
    opt(e, 'collisionRadius', r.collisionRadius);
    opt(e, 'windupTime', r.windup);
    for (const k of ['flying', 'flyHeight', 'burstStagger', 'dropSpacing', 'keepSide', 'sideWander', 'boss', 'stepSoundInterval']) opt(e, k, r[k]);
    // M3b §1–§3: its role, whether it rises again (rising dead), its region (blank: every region) and
    // a boss's arrival banner.
    e.role = r.role;
    e.rises = r.rises ?? false;
    e.region = r.region ?? null;
    opt(e, 'banner', r.banner);
    // Traits (M2l §1.3) and look; absent = none / ×1.
    for (const k of ['slowResist', 'armor', 'splashRatio', 'splashRadius', 'lifesteal', 'drawScale', 'soundPitch']) opt(e, k, r[k]);
    e.drops = t.drops.filter((d) => d.enemy === r.id).map((d) => ({ resource: d.resource, chance: d.chance, min: d.min, max: d.max }));
    return e;
  });

  TURRET_TYPES = {};
  // M3c §4.1: a variant row (baseType) takes every blank cell from its base type's row at the same level.
  const turretRow = (id, level) => t.turrets.find((x) => x.turret === id && x.level === level);
  for (const row of t.turrets) {
    const r = row.baseType ? { ...turretRow(row.baseType, row.level), ...row } : row;
    const type = (TURRET_TYPES[r.turret] ??= { name: r.name, attack: r.attack, range: r.range, projectileSpeed: r.projectileSpeed, muzzleHeight: r.muzzleHeight, baseType: row.baseType ?? r.turret, region: row.region ?? null, levels: [] });
    const level = { damage: r.damage, fireInterval: r.fireInterval, range: r.range, cost: cost(r), time: r.time, name: r.levelName ?? null, targets: r.targets ?? 1 };
    if (r.attack === 'cloud') level.cloud = { radius: r.cloudRadius, duration: r.cloudDuration, tickInterval: r.cloudTick, tickDamage: r.cloudTickDamage };
    if (r.corrodeMult !== undefined) level.cloud.corrode = { mult: r.corrodeMult, linger: r.corrodeLinger }; // M2m §2.4: Corrosion
    // M2o §3.1: the Cinderjaw's cone (total angle, degrees) and the burn it sets; spreadRadius: Wildfire.
    if (r.attack === 'cone') level.cone = { angle: r.coneAngle, burn: { duration: r.burnDuration, tickInterval: r.burnTick, tickDamage: r.burnTickDamage, spreadRadius: r.spreadRadius ?? 0 } };
    type.levels.push(level);
  }
  TURRET_RANGE = TURRET_TYPES.sprinkler.range;

  SUMMON_TYPES = byId(t.summons, (r) => ({ ...r, cost: cost(r) }));
  SUMMON_KEYS = byId(t.summons, (r) => r.key);
  const v = SUMMON_TYPES.vulture;
  VULTURE_COST = v.cost; VULTURE_HP = v.hp; VULTURE_DAMAGE = v.damage; VULTURE_ATTACK_INTERVAL = v.attackInterval;
  VULTURE_DURATION = v.duration; MAX_VULTURES = v.max; VULTURE_SPEED = v.speed; VULTURE_RADIUS = v.radius;
  VULTURE_MELEE_RANGE = v.meleeRange; VULTURE_BLOCK_RADIUS = v.blockRadius;
  const s = SUMMON_TYPES.squirrel;
  SQUIRREL_COST = s.cost; SQUIRREL_HP = s.hp; SQUIRREL_DURATION = s.duration; SQUIRREL_SPEED = s.speed; MAX_SQUIRRELS = s.max;
  SQUIRREL_RADIUS = s.radius; SQUIRREL_PICKUP_RANGE = s.pickupRange; SQUIRREL_BLOCKS_WOLVES = s.blocks ?? false;
  SQUIRREL_DAMAGE = s.damage; SQUIRREL_ATTACK_INTERVAL = s.attackInterval; SQUIRREL_BLOCK_RADIUS = s.blockRadius;
  const d = SUMMON_TYPES.double;
  BOUGH_DOUBLE_COST = d.cost; MAX_BOUGH_DOUBLES = d.max; DOUBLE_WISP_TIME = d.wispTime;
  const w = SUMMON_TYPES.slowWisp;
  WISP_COST = w.cost; WISP_SPEED = w.speed; MAX_WISPS = w.max; WISP_RADIUS = w.radius;
  WISP_BURST_RADIUS = w.burstRadius; WISP_SLOW_MULT = w.slowMult; WISP_SLOW_DURATION = w.slowDuration;

  ITEMS = byId(t.items, (r) => {
    const effects = [];
    for (let n = 1; r[`effect${n}_stat`] !== undefined || r[`effect${n + 1}_stat`] !== undefined; n++) {
      if (r[`effect${n}_stat`] !== undefined) effects.push({ stat: r[`effect${n}_stat`], op: r[`effect${n}_op`], value: r[`effect${n}_value`] });
    }
    return { slot: r.slot, rarity: r.rarity, price: r.price, name: r.name, description: r.description, effects, colors: [r.iconColor, r.iconAccent], mark: r.iconMark };
  });
  STATS = byId(t.stats, (r) => r.description, 'stat');
  RECIPES = byId(t.recipes, (r) => ({ cost: cost(r), patternWeight: r.patternWeight, patternPrice: r.patternPrice }), 'item');

  REGIONS = byId(t.regions, (r) => ({
    name: r.name, order: r.order, deathLossPct: r.deathLossPct, traders: r.traders, tinkers: r.tinkers, tinkerMinRow: r.tinkerMinRow,
    risingDead: r.risingDead ?? false, sinkingDrops: r.sinkingDrops ?? false, mireGround: r.mireGround ?? false,
    introTitle: r.introTitle ?? r.name, introText: r.introText ?? '', finalLine: r.finalLine ?? null,
  }));
  REGION_ORDER = [...t.regions].sort((a, b) => a.order - b.order).map((r) => r.id);

  const featureIds = Object.keys(FEATURE_TYPES);
  LEVELS = byId(t.levels, (r) => {
    // M4a §1.3: the level's ground (lanes, Druid, sectors, candidates, decoration, mire, palette…)
    // from its map file; the numbers about play from the levels tab.
    const level = { ...levelFromMap(maps[r.id]), name: r.name, description: r.description, region: r.region, row: r.row, nodeType: r.nodeType, stepBudget: r.stepBudget };
    level.background = backgrounds[r.id] ?? null;
    for (const k of ['enemyHpMult', 'stuckTime']) opt(level, k, r[k]);
    level.featureMix = Object.fromEntries(featureIds.map((f) => [f, r[`mix_${f}`] ?? 0]));
    level.zoneQuotas = { near: { turret: ZONE_NEAR_TURRET, feature: ZONE_NEAR_FEATURE }, far: { turret: ZONE_FAR_TURRET, feature: ZONE_FAR_FEATURE } };
    level.waves = t.waves.filter((w) => w.level === r.id).map((w) => {
      // M3b §1: each spawn is its region's enemy for the role (a wolf in Hag's Causeway is a Drowned Thrall).
      const wave = { gapAfter: w.gapAfter, spawns: t.spawns.filter((sp) => sp.level === r.id && sp.wave === w.wave).map((sp) => ({ t: sp.t, lane: sp.lane, type: regionalEnemy(sp.type, r.region), count: sp.count })) };
      return opt(wave, 'tolls', w.tolls);
    });
    return level;
  });
  // Map nodes (M3a §1.2): one per level, with its name, type and region (and its row, M2g §1:
  // mapGen.js reads it there).
  MAP_NODES = Object.entries(LEVELS).map(([id, l]) => ({ id, levelId: id, name: l.name, type: l.nodeType, region: l.region }));

  SOUNDS = byId(t.sounds, (r) => ({ volume: r.volume, pitch: r.pitch, minGap: r.minGap, maxVoices: r.maxVoices, enabled: r.enabled }));

  // regions (M3c §1): where traders stock it; null = everywhere.
  TRADE = byId(t.trade, (r) => ({ baseValue: r.baseValue, stockMin: r.stockMin, stockMax: r.stockMax, regions: r.regions ? r.regions.split(',').map((x) => x.trim()) : null }), 'resource');
  TRADER_TEXT = Object.fromEntries(TRADER_LINE_KINDS.map((kind) => [kind, t.traders.filter((r) => r.kind === kind).map((r) => ({ trader: r.trader ?? null, text: r.text }))]));
  TRADER_PROFILES = byId(t.traderProfiles, (r) => {
    const tables = {};
    for (const x of t.traderTables.filter((x) => x.trader === r.id)) (tables[x.table] ??= []).push({ value: x.value, weight: x.weight });
    const stock = Object.fromEntries(t.traderStock.filter((x) => x.trader === r.id)
      .map((x) => [x.resource, { stockMin: x.stockMin, stockMax: x.stockMax, priceMin: x.priceMin, priceMax: x.priceMax }]));
    return {
      name: r.name ?? '', regions: r.regions ? r.regions.split(',').map((x) => x.trim()) : null,
      itemPriceMult: r.itemPriceMult, patternPriceMult: r.patternPriceMult, itemBuyMult: r.itemBuyMult, tables, stock,
    };
  });
  PLACE_PALETTE = Object.fromEntries(PLACE_PALETTES.map((id) => [id, unflatten(t.palettes.find((p) => p.level === id) ?? {}, ['level', '_row'])]));
}

// M3b §1: the enemy a region uses in the place of `type`: the type itself if it belongs to that
// region (or to every region, like the Stirge), else that region's enemy with the same role and
// variant (a Grim Wolf in Hag's Causeway is a Grim Drowned Thrall). The type itself if there is none.
export function regionalEnemy(type, regionId) {
  const t = ENEMY_TYPES[type];
  if (!t || !t.region || t.region === regionId) return type;
  return Object.keys(ENEMY_TYPES).find((id) => {
    const o = ENEMY_TYPES[id];
    return o.region === regionId && o.role === t.role && o.variant === t.variant;
  }) ?? type;
}

// A palette row's flattened columns ("treeDark_canopy_0") back into nested objects and arrays.
function unflatten(row, skip) {
  const out = {};
  for (const [col, value] of Object.entries(row)) {
    if (skip.includes(col)) continue;
    const path = col.split('_');
    let node = out;
    path.forEach((part, i) => {
      if (i === path.length - 1) { node[part] = value; return; }
      node[part] ??= /^\d+$/.test(path[i + 1]) ? [] : {};
      node = node[part];
    });
  }
  return out;
}
