// Vulture ally data (spec §15). Behaviour lives in the vulture system.

import * as C from '../config.js';

// Explicit per-Vulture state machine (§15.3):
//   FLYING   → heading for its target or spot in a straight line; collides with nothing
//   LANDED   → within melee range of its target (pecks it), or guarding its spot; blocks nearby wolves
//   HOVERING → nothing to do anywhere; waits in place
export const VultureState = Object.freeze({
  FLYING: 'FLYING',
  LANDED: 'LANDED',
  HOVERING: 'HOVERING',
});

// duration: its effective lifetime (stats resolver, M2e §2.2).
export function createVulture(id, x, y, duration = C.VULTURE_DURATION) {
  return {
    id,
    x,
    y,
    hp: C.VULTURE_HP,
    state: VultureState.HOVERING, // picks a target on its first update
    targetId: null,                // the enemy it is fighting
    dropId: null,                  // the drop it is fetching (M2r)
    spot: null,                    // { x, y }: the spot it was ordered to, until that is empty (M2r)
    guarding: false,               // the spot was empty when ordered: wait there for something to enter
    duration,                      // s it lasts in all (status bar)
    remaining: duration,           // s left before it expires
    attackTimer: 0,                // s since landing / last peck
    lastHitTime: -Infinity,        // combat time it was last bitten (hit flash)
    lastPeckTime: -Infinity,       // combat time of its last peck (animation)
    facing: 1,
  };
}
