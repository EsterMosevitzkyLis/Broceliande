// Hidden spots in Prep (M6c §1): spots hidden under identical fern clumps until the Druid comes
// near. game.hiddenSpots: one per hidden candidate, { index, candidate, kind ('slot' | 'feature' |
// 'vacant'), roleIndex (into game.slots / game.features, -1 for an empty spot), x, y, revealed,
// revealAge (s since its ferns began to part, null before), cleared (by Combat starting) }.
//   Revealing: at Prep start and after every move, every hidden spot within REVEAL_RADIUS of the
//     Druid. Revealed spots stay revealed for the battle.
//   Clicking a hidden spot: in step mode the Druid travels there (marker { kind: 'hidden', index },
//     costing steps as usual), and on arrival it is revealed and resolved: a resource spot is
//     searched, a turret slot opens its build menu, an empty one says "Only ferns".
//   Combat start: every fern clump clears.

import * as C from '../config.js';
import { rollHiddenSpots } from '../hiddenSpots.js';
import { completeSearch } from './searchSystem.js';
import { addFloatingText } from '../effects.js';
import { events } from '../events.js';

export function createHiddenSpots(game) {
  const level = game.scene.level;
  return rollHiddenSpots(game.rng, level).map((candidate, index) => {
    const role = game.layout.roles[candidate];
    const at = role.kind === 'slot' ? game.slots[role.index] : role.kind === 'feature' ? game.features[role.index] : level.candidateLocations[candidate];
    return { index, candidate, kind: role.kind, roleIndex: role.index, x: at.x, y: at.y, revealed: false, revealAge: null, cleared: false };
  });
}

// Whether a turret slot or resource spot is still under its ferns (not shown, not clickable).
export function isUnderFerns(game, kind, index) {
  return (game.hiddenSpots ?? []).some((s) => !s.revealed && s.kind === kind && s.roleIndex === index);
}

function reveal(game, spot) {
  spot.revealed = true;
  spot.revealAge = 0;
}

// Every hidden spot within REVEAL_RADIUS of where the Druid stands now; one rustle for them all.
export function revealNear(game) {
  const p = game.druidPos;
  const near = game.hiddenSpots.filter((s) => !s.revealed && Math.hypot(s.x - p.x, s.y - p.y) <= C.REVEAL_RADIUS);
  for (const s of near) reveal(game, s);
  if (near.length) events.emit('fernsParted', { count: near.length });
}

// The Druid reached (step mode) or clicked (timed Prep) a hidden spot: revealed, then resolved.
// startSearch: timed Prep starts a search instead of searching at once.
export function resolveHiddenSpot(game, index, startSearch = null) {
  const s = game.hiddenSpots[index];
  if (!s.revealed) {
    reveal(game, s);
    events.emit('fernsParted', { count: 1 });
  }
  if (s.kind === 'feature') {
    if (game.features[s.roleIndex].exhausted) return;
    if (startSearch) {
      startSearch(game, s.roleIndex);
      return;
    }
    events.emit('searchStarted', { featureIndex: s.roleIndex });
    completeSearch(game, s.roleIndex);
  } else if (s.kind === 'slot') {
    events.emit('hiddenSlotFound', { slotIndex: s.roleIndex }); // the UI opens its build menu
  } else {
    addFloatingText(game, C.ONLY_FERNS_TEXT, s.x, s.y - C.LOCATION_RADIUS, true, true);
    events.emit('onlyFerns', { x: s.x, y: s.y });
  }
}

// Combat start: every clump still standing sways and fades; turret slots never found become
// visible (buildable through Bough Doubles), resource spots never reached are simply missed.
export function clearFerns(game) {
  const left = game.hiddenSpots.filter((s) => !s.revealed);
  for (const s of left) {
    reveal(game, s);
    s.cleared = true;
  }
  if (left.length) events.emit('fernsCleared', { count: left.length });
}

// Visual only: the parting / clearing ferns' clock (updateEffects).
export function ageFerns(game, dt) {
  for (const s of game.hiddenSpots ?? []) if (s.revealAge !== null) s.revealAge += dt;
}

// Where the ferns still show: { spot, progress } (0 = standing, 1 = gone).
export function fernClumps(game) {
  const out = [];
  for (const s of game.hiddenSpots ?? []) {
    if (!s.revealed) out.push({ spot: s, progress: 0 });
    else {
      const progress = s.revealAge / (s.cleared ? C.FERN_CLEAR_TIME : C.FERN_PART_TIME);
      if (progress < 1) out.push({ spot: s, progress });
    }
  }
  return out;
}
