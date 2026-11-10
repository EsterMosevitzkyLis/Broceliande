// Mire ground (M3c §3): soft patches on a level's battlefield, in a region with mireGround. Each
// level's patches are generated once (with its scene) from its decorSeed, as clusters of
// overlapping round blobs covering roughly its mireCoverage of the battlefield, never on a
// corridor (they may cover candidate spots). Travel inside them costs MIRE_STEP_MULT × as many
// steps (stepSystem.js). A mire: [{ blobs: [{ x, y, r }] }], [] for none.

import * as C from './config.js';
import { createRng } from './rng.js';
import { regionTwist } from './levelSettings.js';

const CELL = 16; // px, the grid that estimates how much ground is covered

export function generateMire(scene) {
  const level = scene.level;
  if (!regionTwist(level, 'mireGround') || !(level.mireCoverage > 0)) return [];
  const rng = createRng((level.decorSeed + C.MIRE_SEED_OFFSET) >>> 0);
  const top = C.HUD_STRIP_HEIGHT;
  const target = (C.STAGE_WIDTH * (C.STAGE_HEIGHT - top) * level.mireCoverage) / (CELL * CELL);
  const covered = new Set();
  const mark = (b) => {
    for (let gx = Math.floor((b.x - b.r) / CELL); gx <= Math.ceil((b.x + b.r) / CELL); gx++) {
      for (let gy = Math.floor((b.y - b.r) / CELL); gy <= Math.ceil((b.y + b.r) / CELL); gy++) {
        if (Math.hypot(gx * CELL - b.x, gy * CELL - b.y) <= b.r) covered.add(`${gx},${gy}`);
      }
    }
  };
  const patches = [];
  for (let tries = 0; tries < 300 && covered.size < target; tries++) {
    const cx = rng.range(0, C.STAGE_WIDTH);
    const cy = rng.range(top + 30, C.STAGE_HEIGHT);
    const blobs = [];
    const n = rng.int(C.MIRE_BLOBS[0], C.MIRE_BLOBS[1]);
    for (let i = 0; i < n; i++) {
      const b = { x: cx + rng.range(-C.MIRE_PATCH_SPREAD, C.MIRE_PATCH_SPREAD), y: cy + rng.range(-C.MIRE_PATCH_SPREAD, C.MIRE_PATCH_SPREAD) * 0.6, r: rng.range(C.MIRE_BLOB_RADIUS[0], C.MIRE_BLOB_RADIUS[1]) };
      if (b.y - b.r * 0.5 > top && clearOfCorridors(scene, b)) blobs.push(b);
    }
    if (blobs.length < 2) continue;
    patches.push({ blobs, seed: rng.int(0, 1e6) });
    blobs.forEach(mark);
  }
  return patches;
}

function clearOfCorridors(scene, b) {
  return scene.lanes.every((lane) => lane.path.distanceTo(b) >= lane.corridorWidth / 2 + b.r + C.MIRE_CORRIDOR_GAP);
}

export function inMire(mire, x, y) {
  return mire.some((p) => p.blobs.some((b) => Math.hypot(x - b.x, y - b.y) < b.r));
}

// Length of the straight line a → b that lies inside the mire (sampled every MIRE_SAMPLE_PX).
export function mireLength(mire, a, b) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (!mire.length || len === 0) return 0;
  const n = Math.max(1, Math.ceil(len / C.MIRE_SAMPLE_PX));
  let inside = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    if (inMire(mire, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) inside++;
  }
  return (len * inside) / n;
}

// §3.2: the step cost formula's distance: outside + mult × inside, and the two parts.
// mult: MIRE_STEP_MULT, its extra part scaled by the mire.stepMult stat (Bogwalker Boots: 0).
export function travelDistance(mire, a, b, mult) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const inside = mireLength(mire, a, b);
  return { weighted: len - inside + mult * inside, outside: len - inside, inside };
}

export function mireMult(statMult = 1) {
  return 1 + (C.MIRE_STEP_MULT - 1) * statMult;
}
