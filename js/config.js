// Broceliande M1 — ALL tuning values and scene coordinates.
// Single source of truth (spec §17). Systems must import from here, never hard-code.
// Values marked // TUNING are starting guesses expected to change after playtesting.
// Values marked // PLACEHOLDER are layout stand-ins to be designed in a later phase.

// ---------------------------------------------------------------------------
// Stage & loop (§3.4, §3.5)
// ---------------------------------------------------------------------------
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

export const SIM_STEP = 1 / 60;          // seconds, fixed timestep
export const MAX_FRAME_DT = 0.05;        // real seconds; larger frame gaps (tab switch) are clamped
export const MAX_STEPS_PER_FRAME = 12;   // hard cap on sim steps per animation frame (covers ×4 speed)
export const SIM_SPEEDS = [1, 2, 4];     // debug speed multipliers (keys 1 / 2 / 4)

// ---------------------------------------------------------------------------
// 17.1 Timing and phases
// ---------------------------------------------------------------------------
export const PREP_DURATION = 25;         // s
export const BUILD_TIME = 2.5;           // s
export const UPGRADE_TIME = 3.0;         // s

// ---------------------------------------------------------------------------
// 17.2 Druid
// ---------------------------------------------------------------------------
export const DRUID_HP = 80;
export const DRUID_POS = { x: 1010, y: 600 };           // TUNING — off-centre
export const DRUID_RADIUS = 28;                          // TUNING
export const DRUID_MELEE_RADIUS = 52;                    // TUNING
export const DRUID_MELEE_SLOTS = 6;                      // TUNING — max simultaneous biters
export const DRUID_ACTION_OFFSET = { x: -40, y: 10 };    // TUNING — Druid position beside a target

// ---------------------------------------------------------------------------
// 17.3 Wolf
// ---------------------------------------------------------------------------
export const WOLF_HP = 18;                // TUNING — 6 base pebbles, 4 upgraded, 3 Vulture pecks
export const WOLF_SPEED = 72;             // TUNING — px/s, aim for 25–30 s lane traversal
export const WOLF_RADIUS = 16;            // TUNING
export const WOLF_DAMAGE = 3;
export const WOLF_ATTACK_INTERVAL = 1.2;  // s

// ---------------------------------------------------------------------------
// 17.4 Turret (Pebble Sprinkler)
// ---------------------------------------------------------------------------
export const TURRET_COST = { pits: 2, reeds: 1, feathers: 0 };
export const TURRET_DAMAGE = 3;
export const TURRET_FIRE_INTERVAL = 0.75; // s
export const TURRET_RANGE = 220;          // TUNING — px
export const PROJECTILE_SPEED = 600;      // TUNING — px/s
export const UPGRADE_COST = { pits: 4, reeds: 0, feathers: 1 };
export const UPGRADED_DAMAGE = 5;
export const UPGRADED_FIRE_INTERVAL = 0.6; // s
export const UPGRADED_RANGE_MULT = 1.2;

// ---------------------------------------------------------------------------
// 17.5 Vulture
// ---------------------------------------------------------------------------
export const VULTURE_COST = { pits: 0, reeds: 0, feathers: 3 };
export const VULTURE_HP = 15;
export const VULTURE_DAMAGE = 6;
export const VULTURE_ATTACK_INTERVAL = 0.7; // s
export const VULTURE_DURATION = 12;         // s
export const MAX_VULTURES = 3;
export const VULTURE_SPEED = 140;           // TUNING — px/s, deliberately slowish so placement matters
export const VULTURE_RADIUS = 14;           // TUNING
export const VULTURE_MELEE_RANGE = 34;      // TUNING — px
export const VULTURE_BLOCK_RADIUS = 36;     // TUNING — px

// ---------------------------------------------------------------------------
// 17.6 Scene layout
// ---------------------------------------------------------------------------
export const HUD_STRIP_HEIGHT = 80;       // px
export const CORRIDOR_WIDTH = 110;        // TUNING — px
export const LANE_LENGTH_FACTOR = 2.0;    // TUNING — target lane length ÷ straight-line spawn→Druid distance

// PLACEHOLDER — rough winding waypoints; lanes are designed properly in the lane phase.
// Spawn is the first point (at/just beyond the screen edge); the last point should end
// at the edge of the Druid's melee ring (§12.2).
export const LANES = [
  {
    id: 'upperLeft',
    name: 'Upper-left',
    waypoints: [
      { x: -40, y: 200 }, { x: 220, y: 180 }, { x: 380, y: 320 }, { x: 250, y: 470 },
      { x: 420, y: 560 }, { x: 640, y: 420 }, { x: 800, y: 300 }, { x: 900, y: 450 },
      { x: 962, y: 574 },
    ],
  },
  {
    id: 'right',
    name: 'Right',
    waypoints: [
      { x: 1960, y: 520 }, { x: 1720, y: 560 }, { x: 1600, y: 380 }, { x: 1400, y: 300 },
      { x: 1260, y: 420 }, { x: 1420, y: 620 }, { x: 1300, y: 760 }, { x: 1120, y: 700 },
      { x: 1060, y: 618 },
    ],
  },
  {
    id: 'bottomLeft',
    name: 'Bottom-left',
    waypoints: [
      { x: -40, y: 900 }, { x: 200, y: 960 }, { x: 420, y: 840 }, { x: 360, y: 700 },
      { x: 560, y: 680 }, { x: 700, y: 900 }, { x: 880, y: 880 }, { x: 950, y: 720 },
      { x: 985, y: 645 },
    ],
  },
];

// PLACEHOLDER — 12 slots, ~4 per lane, irregular, outside corridors (designed with the lanes).
export const TURRET_SLOTS = [
  { x: 310, y: 250 }, { x: 520, y: 460 }, { x: 700, y: 330 }, { x: 830, y: 520 },
  { x: 1560, y: 470 }, { x: 1480, y: 250 }, { x: 1330, y: 540 }, { x: 1200, y: 800 },
  { x: 300, y: 820 }, { x: 560, y: 790 }, { x: 800, y: 780 }, { x: 1060, y: 470 },
];

// ---------------------------------------------------------------------------
// 17.7 Searchable features
// ---------------------------------------------------------------------------
// yields: resource → [min, max] inclusive integers. All ranges TUNING.
export const FEATURE_TYPES = {
  tree:      { name: 'Tree',       searchTime: 1.2, yields: { pits: [2, 4] } },
  reedPatch: { name: 'Reed Patch', searchTime: 1.4, yields: { reeds: [1, 3] } },
  shrub:     { name: 'Shrub',      searchTime: 1.7, yields: { feathers: [2, 4] } },
  ruins:     { name: 'Ruins',      searchTime: 1.8, yields: { pits: [0, 3], feathers: [0, 2] } },
  pond:      { name: 'Pond',       searchTime: 2.0, yields: { pits: [0, 2], reeds: [1, 2] } },
};

// PLACEHOLDER positions — mix is final: 2 Trees, 1 Reed Patch, 1 Shrub, 2 Ruins, 2 Ponds.
export const FEATURES = [
  { type: 'tree',      x: 140,  y: 380 },
  { type: 'tree',      x: 1700, y: 880 },
  { type: 'reedPatch', x: 620,  y: 1000 },
  { type: 'shrub',     x: 1180, y: 200 },
  { type: 'ruins',     x: 560,  y: 180 },
  { type: 'ruins',     x: 1780, y: 300 },
  { type: 'pond',      x: 1400, y: 960 },
  { type: 'pond',      x: 150,  y: 620 },
];

// ---------------------------------------------------------------------------
// 17.8 Wave
// ---------------------------------------------------------------------------
export const WAVE_TOTAL = 35;
export const BURST_STAGGER = 0.6;        // TUNING — s between wolves in one burst

// TUNING — bursts per lane id; time = seconds since Combat began.
export const WAVE = {
  upperLeft:  [{ time: 0, count: 3 }, { time: 12, count: 2 }, { time: 24, count: 3 }, { time: 40, count: 4 }],
  right:      [{ time: 5, count: 2 }, { time: 16, count: 3 }, { time: 30, count: 3 }, { time: 48, count: 4 }],
  bottomLeft: [{ time: 9, count: 3 }, { time: 20, count: 2 }, { time: 35, count: 3 }, { time: 52, count: 3 }],
};

// ---------------------------------------------------------------------------
// 17.9 Debug
// ---------------------------------------------------------------------------
export const DEBUG_SEED = null;          // null = new random seed each restart; integer = fixed seed
export const DEBUG_START_ENABLED = false;
