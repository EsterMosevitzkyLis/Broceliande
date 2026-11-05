// The Vulture companion (M2r): one Vulture per battle, sent to a spot, where it decides for itself
// what to do (vultureSystem.js). This holds its orders, its summon cost and the wait between orders.

import * as C from '../config.js';
import { CompanionState } from '../states.js';
import { VultureState } from '../entities/vulture.js';

export function createCompanion() {
  return { state: CompanionState.UNSUMMONED, wait: 0 };
}

// What the next order costs: the Vulture's cost to summon it, nothing while it is alive.
export function companionCost(game) {
  return game.companion.state === CompanionState.OUT ? {} : C.VULTURE_COST;
}

// Whether a thing is inside a spot's circle.
export function inSpot(spot, t) {
  return Math.hypot(t.x - spot.x, t.y - spot.y) <= C.VULTURE_SPOT_RADIUS;
}

// A new order: drop what it is doing and go to the spot, to guard it if nothing is there.
export function orderVulture(game, v, p) {
  v.spot = { x: p.x, y: p.y };
  v.guarding = !game.enemies.some((e) => inSpot(p, e)) && !game.drops.some((d) => inSpot(p, d));
  v.targetId = null;
  v.dropId = null;
  v.state = VultureState.FLYING;
}

// An order was given: the Vulture is out and the wait starts now.
export function companionSent(game) {
  game.companion.state = CompanionState.OUT;
  game.companion.wait = Math.max(0, game.stats['vulture.wait']); // effective (Eyrie Crown)
}

// The wait counts down, whatever happens to the Vulture. If it died it must be summoned again.
export function updateCompanion(game, dt) {
  const c = game.companion;
  c.wait = Math.max(0, c.wait - dt);
  if (game.vultures.length === 0) c.state = CompanionState.UNSUMMONED;
}
