// Mire ground (M3c §3): soft patches on a level's battlefield, fixed in its map file (M4a §1.2),
// never on a corridor (they may cover candidate spots). Travel inside them costs MIRE_STEP_MULT ×
// as many steps (stepSystem.js). A mire: [{ seed, blobs: [{ x, y, r }] }], [] for none.

import * as C from './config.js';

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
