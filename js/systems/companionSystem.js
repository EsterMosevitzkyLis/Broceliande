// The Vulture companion (M2r): one Vulture per battle, on one job until it is given another or dies.
// Attack is a Vulture (vultureSystem.js), Collect a Squirrel drawn as the Vulture (squirrelSystem.js).
// This holds what the two jobs share: the summon cost and the wait between orders.

import * as C from '../config.js';
import { CompanionState } from '../states.js';

export function createCompanion() {
  return { state: CompanionState.UNSUMMONED, wait: 0 };
}

// What the next order costs: the Vulture's cost to summon it, nothing while it is alive.
export function companionCost(game) {
  return game.companion.state === CompanionState.OUT ? {} : C.VULTURE_COST;
}

// A new order ends the current job. Returns the share of its HP the Vulture has left, for the next
// job (the two jobs have different max HP). A Collect job's claimed drop is released.
export function endJob(game) {
  const v = game.vultures[0];
  const s = game.squirrels[0];
  game.vultures = [];
  game.squirrels = [];
  if (v) return v.hp / C.VULTURE_HP;
  if (!s) return 1;
  const drop = game.drops.find((d) => d.id === s.targetId);
  if (drop) drop.claimedBy = null;
  return s.hp / s.maxHp;
}

// An order was given: the Vulture is on its job and the wait starts now.
export function companionSent(game) {
  game.companion.state = CompanionState.OUT;
  game.companion.wait = Math.max(0, game.stats['vulture.wait']); // effective (Eyrie Crown)
}

// The wait counts down, whatever happens to the Vulture. If it died it must be summoned again.
export function updateCompanion(game, dt) {
  const c = game.companion;
  c.wait = Math.max(0, c.wait - dt);
  if (game.vultures.length + game.squirrels.length === 0) c.state = CompanionState.UNSUMMONED;
}
