// Which world object is under a point (for clicks, hover and tooltips). Read-only.

import * as C from './config.js';
import { turretOnSlot } from './systems/buildSystem.js';

// Features, slots and turrets are all hit-tested on their location's footprint circle,
// which contains everything drawn there (M1c §2.1).
function hitsFootprint(loc, p) {
  return Math.hypot(p.x - loc.x, p.y - loc.y) <= C.LOCATION_RADIUS;
}

// Returns { kind: 'feature' | 'slot' | 'turret', index } or null. Footprints never
// overlap, but lower objects win ties, matching y-sorted drawing (the one in front is picked).
export function pick(game, p) {
  if (p.y < C.HUD_STRIP_HEIGHT) return null;
  let best = null;
  game.features.forEach((f, index) => {
    if (hitsFootprint(f, p) && (!best || f.y > best.y)) best = { kind: 'feature', index, y: f.y };
  });
  game.slots.forEach((slot, index) => {
    const turret = turretOnSlot(game, index);
    if (hitsFootprint(slot, p) && (!best || slot.y > best.y)) {
      best = { kind: turret ? 'turret' : 'slot', index, y: slot.y };
    }
  });
  return best && { kind: best.kind, index: best.index };
}
