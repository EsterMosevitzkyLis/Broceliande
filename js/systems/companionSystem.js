// The Vulture companion (M2r): one Vulture per battle, sent on one job at a time. Attack is a Vulture
// (vultureSystem.js), Collect a Squirrel drawn as the Vulture (squirrelSystem.js). This holds what
// the two jobs share: the summon cost and the wait after a job.

import * as C from '../config.js';
import { CompanionState } from '../states.js';

export function createCompanion() {
  return { state: CompanionState.UNSUMMONED, wait: 0, died: false };
}

// What the next send costs: the Vulture's cost to summon it, nothing once it is summoned.
export function companionCost(game) {
  const c = game.companion;
  return c.state === CompanionState.UNSUMMONED || c.died ? C.VULTURE_COST : {};
}

export function companionSent(game) {
  game.companion.state = CompanionState.OUT;
}

// When the job ends the wait starts; after it the Vulture is ready, or needs summoning again if it died.
export function updateCompanion(game, dt) {
  const c = game.companion;
  if (c.state === CompanionState.OUT && game.vultures.length + game.squirrels.length === 0) {
    c.state = CompanionState.WAITING;
    c.wait = Math.max(0, game.stats['vulture.wait']); // effective (Eyrie Crown)
  } else if (c.state === CompanionState.WAITING) {
    c.wait -= dt;
    if (c.wait > 0) return;
    c.state = c.died ? CompanionState.UNSUMMONED : CompanionState.READY;
    c.died = false;
  }
}
