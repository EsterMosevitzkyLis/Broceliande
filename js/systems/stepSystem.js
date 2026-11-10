// Step-budget Prep (M1b addendum §3–§5): travel cost and which markers can be visited.
// Read-only queries; the travel action itself lives in the action system.

import * as C from '../config.js';
import { GameState, PrepMode, ActionState } from '../states.js';
import { canAfford } from '../resources.js';
import { turretOnSlot } from './buildSystem.js';
import { buildCost, buildableTypes } from '../entities/turret.js';
import { travelDistance, mireMult, inMire } from '../mire.js';

export function isStepMode(game) {
  return game.prepMode === PrepMode.STEPS;
}

// Centre of a marker: { kind: 'feature' | 'slot', index } (§4).
export function markerPos(game, marker) {
  return marker.kind === 'feature' ? game.features[marker.index] : game.slots[marker.index];
}

// Whole steps from the Druid's current position to a marker (§4). M3c §3.2: travel inside mire
// ground counts MIRE_STEP_MULT × (its extra scaled by mire.stepMult, Bogwalker Boots).
export function stepCost(game, marker) {
  return stepParts(game, marker).cost;
}

// The step cost and its parts: { cost, outside, inside } (px of travel outside and inside the mire).
export function stepParts(game, marker) {
  const p = markerPos(game, marker);
  const d = travelDistance(game.scene.mire, game.druidPos, p, gameMireMult(game));
  // Effective step length (M2e, Hare's Shoes: STEP_PX × 1.15).
  return { cost: Math.ceil(d.weighted / game.stats['steps.length'] - 1e-9), outside: d.outside, inside: d.inside };
}

const gameMireMult = (game) => mireMult(game.stats['mire.stepMult']);

// Turret types the player can currently pay for (M1f §5.2).
export function affordableTurretTypes(game) {
  return buildableTypes(game.scene.level.region).filter((type) => canAfford(game.resources, buildCost(type)));
}

// Whether a marker is a valid step-mode target, ignoring the step budget (§5.1). A slot needs
// at least one affordable turret type (M1f §5.2).
export function isVisitTarget(game, marker) {
  if (!marker) return false;
  if (marker.kind === 'feature') return !game.features[marker.index].exhausted;
  if (marker.kind === 'slot') return !turretOnSlot(game, marker.index) && affordableTurretTypes(game).length > 0;
  return false;
}

// Clickable right now in step-mode Prep: valid and affordable (§5.1).
export function canVisit(game, marker) {
  return isStepMode(game)
    && game.state === GameState.PREP
    && isVisitTarget(game, marker)
    && stepCost(game, marker) <= game.stepsRemaining;
}

// Whether any marker can still be clicked; when none can, Start Battle pulses (§5.6).
export function anyVisitable(game) {
  return game.features.some((f) => canVisit(game, { kind: 'feature', index: f.index }))
    || game.slots.some((_, index) => canVisit(game, { kind: 'slot', index }));
}

// ---------------------------------------------------------------------------
// Calibration figures for tuning STEP_BUDGET (§8, §9), for this run's layout. These and the
// layout's feature-route check use the base STEP_PX and stepBudget, not equipment (M2e).
// ---------------------------------------------------------------------------
const legCost = (a, b, mire) => Math.ceil(travelDistance(mire, a, b, mireMult()).weighted / C.STEP_PX - 1e-9); // M3c §3.2: the base mire cost

// Greedy nearest-neighbour route from `start` (the level's Druid position) through every point. Each leg is charged
// in whole steps, exactly as in play (mire included, M3c §3.2). Returns { steps, visits }. Also used for the
// M1c §4.2 feature-route fairness check.
export function greedyRoute(points, start, mire = []) {
  const left = [...points];
  let pos = start;
  let steps = 0;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) {
      if (Math.hypot(left[i].x - pos.x, left[i].y - pos.y) < Math.hypot(left[best].x - pos.x, left[best].y - pos.y)) best = i;
    }
    steps += legCost(pos, left[best], mire);
    pos = left.splice(best, 1)[0];
  }
  return { steps, visits: points.length };
}

export function calibrationFigures(game) {
  const home = game.scene.level.druidPos;
  const dist = (p) => Math.hypot(p.x - home.x, p.y - home.y);
  const nearestSlots = [...game.slots].sort((a, b) => dist(a) - dist(b)).slice(0, C.CALIBRATION_SLOT_COUNT);
  return {
    features: greedyRoute(game.features, home, game.scene.mire),
    featuresAndSlots: greedyRoute([...game.features, ...nearestSlots], home, game.scene.mire),
  };
}

// ---------------------------------------------------------------------------
// Footprints (M1g §2.1, M1h §1): one per step of a leg, shared by the hover preview and the
// committed route trail so a committed leg keeps exactly the footprints that were previewed.
// ---------------------------------------------------------------------------

// Footprint positions from `from` to the marker at `to`: `cost` prints evenly spaced, the last
// on the edge of the target's footprint circle (not on the object), alternating left / right of
// the line by FOOTPRINT_SIDE_OFFSET and facing the direction of travel.
// fromMarker: the Druid stands on a marker (not at home), so the trail starts at that marker's
// edge too. M3c §3.2: with mire (and its cost multiplier mult), the prints are spaced by step cost
// rather than distance, so they bunch up inside it, and each one there is marked mire.
// Returns [{ x, y, angle, side, mire }].
export function footprintLayout(from, to, cost, fromMarker, mire = [], mult = 1) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const start = fromMarker ? Math.min(C.LOCATION_RADIUS, dist / 2) : 0;
  const end = Math.max(start, dist - C.LOCATION_RADIUS);
  const angle = Math.atan2(uy, ux);
  const prints = [];
  const at = alongByCost(from, ux, uy, start, end, mire, mult);
  for (let i = 1; i <= cost; i++) {
    const along = at(i / cost);
    const side = i % 2 === 1 ? -1 : 1; // left, right, left, …
    prints.push({
      x: from.x + ux * along - uy * C.FOOTPRINT_SIDE_OFFSET * side,
      y: from.y + uy * along + ux * C.FOOTPRINT_SIDE_OFFSET * side,
      angle,
      side,
      mire: mire.length > 0 && inMire(mire, from.x + ux * along, from.y + uy * along),
    });
  }
  return prints;
}

// The distance along the line (from start to end) at fraction f of its step cost: travel inside
// the mire weighs mult × as much. Without mire, simply start + (end − start) × f.
function alongByCost(from, ux, uy, start, end, mire, mult) {
  if (!mire.length || end <= start) return (f) => start + (end - start) * f;
  const n = Math.max(1, Math.ceil((end - start) / C.MIRE_SAMPLE_PX));
  const piece = (end - start) / n;
  const cum = [0];
  for (let i = 0; i < n; i++) {
    const d = start + piece * (i + 0.5);
    cum.push(cum[i] + piece * (inMire(mire, from.x + ux * d, from.y + uy * d) ? mult : 1));
  }
  return (f) => {
    const goal = f * cum[n];
    let i = 0;
    while (i < n - 1 && cum[i + 1] < goal) i++;
    const k = cum[i + 1] > cum[i] ? (goal - cum[i]) / (cum[i + 1] - cum[i]) : 0;
    return start + piece * (i + Math.min(1, Math.max(0, k)));
  };
}

// The footprints of the leg from the Druid's current position to a marker.
export function legFootprints(game, marker) {
  const from = game.druidPos;
  const home = game.scene.level.druidPos;
  const fromMarker = from.x !== home.x || from.y !== home.y;
  return footprintLayout(from, markerPos(game, marker), stepCost(game, marker), fromMarker, game.scene.mire, gameMireMult(game));
}

// Hover preview (§5.2): for a hovered unsearched feature or empty slot in step-mode Prep,
// { from, to, cost, affordable }, where affordable means within the step budget. Slots
// short of resources still preview (the tooltip says why). None while travelling, since
// the Druid has not yet reached the next origin.
export function routePreview(game, hover) {
  if (!isStepMode(game) || game.state !== GameState.PREP) return null;
  if (game.action.state === ActionState.TRAVELLING || !hover) return null;
  if (hover.kind === 'feature' && game.features[hover.index].exhausted) return null;
  if (hover.kind !== 'feature' && hover.kind !== 'slot') return null;
  const cost = stepCost(game, hover);
  return { from: game.druidPos, prints: legFootprints(game, hover), cost, affordable: cost <= game.stepsRemaining };
}
