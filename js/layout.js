// Per-run layout (M1c §3, §4; zone-based since M1j §4): which candidate locations become turret slots, features and
// vacant spots, the feature types, jitter, and the fairness checks, for the scene's level. Runs on every encounter
// start and restart using the run's seeded RNG, so a fixed seed always gives the same layout.
// M4b: candidates may pin their role (and feature type) and have their own jitter; a level may set
// its own layout rules (lane coverage, route band).

import * as C from './config.js';
import { greedyRoute } from './systems/stepSystem.js';
import { zoneIds, zoneQuota, zoneCandidates } from './zones.js';
import { featureMix, laneMinTurretSlots, routeFactors, spotJitter, spotPin } from './levelSettings.js';
import { createRng } from './rng.js';

function shuffle(rng, items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Uniform random point in a disc of radius the candidate's jitter (M4b §2: its own, or
// LOCATION_JITTER) around it.
function jitter(rng, c) {
  const angle = rng.range(0, Math.PI * 2);
  const r = spotJitter(c) * Math.sqrt(rng.next());
  return { x: c.x + Math.cos(angle) * r, y: c.y + Math.sin(angle) * r };
}

// Lanes a slot at p covers: some centreline point within the base TURRET_RANGE (§4.1).
function coveredLanes(lanes, p) {
  return lanes.filter((lane) => lane.path.distanceTo(p) <= C.TURRET_RANGE).map((lane) => lane.id);
}

// Fairness check (§4) of a layout. Adds { coverage, routeCost, failed } where failed lists the
// constraints broken: 'coverage:<laneId>' per under-covered lane, and 'route'.
function evaluate(scene, layout) {
  const { lanes, level } = scene;
  const coverage = Object.fromEntries(lanes.map((lane) => [lane.id, 0]));
  for (const slot of layout.slots) {
    slot.lanes = coveredLanes(lanes, slot);
    for (const id of slot.lanes) coverage[id]++;
  }
  const routeCost = greedyRoute(layout.features, level.druidPos, scene.mire).steps; // M3c §3.2: mire counts
  const failed = lanes.filter((lane) => coverage[lane.id] < laneMinTurretSlots(level)).map((lane) => `coverage:${lane.id}`);
  const band = routeBand(level);
  if (routeCost < band.min || routeCost > band.max) failed.push('route');
  return { ...layout, coverage, routeCost, failed };
}

// Allowed feature-route cost in steps (§4.2), from a stepBudget (the level's own by default) and the
// level's route factors (M4b §3.2).
export function routeBand(level, stepBudget = level.stepBudget) {
  const f = routeFactors(level);
  return { min: f.min * stepBudget, max: f.max * stepBudget };
}

// role per candidate index: { kind: 'slot' | 'feature' | 'vacant', index } (index into slots/features).
function rolesFor(level, slots, features) {
  const roles = level.candidateLocations.map(() => ({ kind: 'vacant', index: -1 }));
  slots.forEach((s, index) => { roles[s.candidate] = { kind: 'slot', index }; });
  features.forEach((f, index) => { roles[f.candidate] = { kind: 'feature', index }; });
  return roles;
}

// One random draw (M1j §4 steps 1–2, then jitter): for each zone, shuffle its candidates and
// take its turret quota as slots and its feature quota as resource spots (the rest stay
// vacant); then shuffle the feature type mix across all resource spots.
// M4b §1.2: in a zone with pinned spots, pinned turrets and resource spots count towards its
// quotas, pinned vacant ones stay empty, and what is left of the quotas goes to its "not vacant"
// spots first, then to its unpinned ones, the roles shuffled among them. Pinned feature types are
// taken from the mix first; the rest of the mix is shuffled over the other resource spots. A zone
// or level without pins draws exactly as before.
function drawLayout(rng, level) {
  const slotCandidates = [];
  const featureCandidates = [];
  const pinOf = (i) => spotPin(level.candidateLocations[i]);
  for (const zone of zoneIds(level)) {
    const q = zoneQuota(level, zone);
    const here = zoneCandidates(level, zone);
    if (here.every((i) => pinOf(i).role === 'auto')) {
      const order = shuffle(rng, here);
      slotCandidates.push(...order.slice(0, q.turret));
      featureCandidates.push(...order.slice(q.turret, q.turret + q.feature));
      continue;
    }
    const pinned = (role) => here.filter((i) => pinOf(i).role === role);
    const turrets = pinned('turret');
    const features = pinned('feature');
    const pool = [...shuffle(rng, pinned('notVacant')), ...shuffle(rng, pinned('auto'))];
    const left = shuffle(rng, [...Array(Math.max(0, q.turret - turrets.length)).fill('turret'), ...Array(Math.max(0, q.feature - features.length)).fill('feature')]);
    left.forEach((role, k) => {
      if (k >= pool.length) return;
      (role === 'turret' ? turrets : features).push(pool[k]);
    });
    slotCandidates.push(...turrets);
    featureCandidates.push(...features);
  }
  // Pinned types come out of the mix first; the rest is shuffled over the other resource spots.
  const rest = featureMixTypes(level);
  for (const i of featureCandidates) {
    const t = pinOf(i).featureType;
    const at = t ? rest.indexOf(t) : -1;
    if (at >= 0) rest.splice(at, 1);
  }
  const types = shuffle(rng, rest);
  let next = 0;
  const slots = slotCandidates.map((candidate) => ({ ...jitter(rng, level.candidateLocations[candidate]), candidate }));
  const features = featureCandidates.map((candidate) => ({ ...jitter(rng, level.candidateLocations[candidate]), type: pinOf(candidate).featureType ?? types[next++], candidate }));
  return { slots, features };
}

// The level's feature mix as a list of types, one per resource spot (M1j §5, M2b §2).
export function featureMixTypes(level) {
  return Object.entries(featureMix(level)).flatMap(([type, n]) => Array(n).fill(type));
}

// How far a layout misses the constraints, for ranking failed attempts with the same number of
// failed constraints: total missing slot coverage plus steps outside the route band.
function shortfall(level, layout) {
  const band = routeBand(level);
  const missing = Object.values(layout.coverage).reduce((sum, n) => sum + Math.max(0, laneMinTurretSlots(level) - n), 0);
  const outside = Math.max(0, band.min - layout.routeCost, layout.routeCost - band.max);
  return missing + outside;
}

// Fallback choice (§3 step 7): fewest failed constraints; ties go to the smaller shortfall,
// then to the earlier attempt.
function isBetterFallback(level, layout, best) {
  if (layout.failed.length !== best.failed.length) return layout.failed.length < best.failed.length;
  return shortfall(level, layout) < shortfall(level, best);
}

// Returns { slots, features, roles, coverage, routeCost, failed, attempts, failures, fallback }.
// failures counts, over all attempts, how often each constraint failed.
// quiet: no fallback warning (debug-panel statistics over many seeds).
// RANDOMISE_LAYOUT false (M1j §4.2): the same generation, from its own RNG seeded with
// FIXED_LAYOUT_SEED, so the layout is identical every run (and the run's RNG is not used).
export function generateLayout(runRng, scene, { quiet = false } = {}) {
  const { level } = scene;
  const randomised = C.RANDOMISE_LAYOUT;
  const rng = randomised ? runRng : createRng(C.FIXED_LAYOUT_SEED);
  const failures = {};
  let best = null;
  let attempts = 0;
  let result = null;
  while (attempts < C.MAX_LAYOUT_ATTEMPTS) {
    attempts++;
    const layout = evaluate(scene, drawLayout(rng, level));
    for (const f of layout.failed) failures[f] = (failures[f] ?? 0) + 1;
    if (layout.failed.length === 0) {
      result = layout;
      break;
    }
    if (!best || isBetterFallback(level, layout, best)) best = layout;
  }
  const fallback = !result;
  if (fallback) result = best;
  if (fallback && !quiet) {
    console.warn(`Layout: no attempt passed in ${C.MAX_LAYOUT_ATTEMPTS}; using the best one, which fails `
      + `${result.failed.join(', ')} (coverage ${JSON.stringify(result.coverage)}, route ${result.routeCost} steps). `
      + `Failures over all attempts: ${JSON.stringify(failures)}`);
  }
  return { ...result, roles: rolesFor(level, result.slots, result.features), attempts, failures, fallback, randomised };
}

// Layout trials for the map editor's Prep check (M4a §5.4): layouts as generateLayout would make
// them, one per seed (an RNG seeded with it). The draws an encounter tries in turn don't depend on
// the stepBudget, so a trial keeps its draws that pass lane coverage, in order (of all
// MAX_LAYOUT_ATTEMPTS draws), each { route, cover: turret slots covering each lane, in lane order },
// and any budget can be tested against them: trialOutcome, trialFailRate, drawFitRate, centredBudget.
export function trialSetup(scene) {
  const { lanes, level } = scene;
  // A slot lies within its candidate's jitter of it, so the candidate's own distance to a lane
  // settles most coverage tests; only slots near the edge of the range are measured (the same
  // result as coveredLanes, much faster over thousands of draws).
  const centre = level.candidateLocations.map((c) => lanes.map((lane) => lane.path.distanceTo(c)));
  return (slot, i) => {
    const d = centre[slot.candidate][i];
    const j = spotJitter(level.candidateLocations[slot.candidate]);
    if (d + j <= C.TURRET_RANGE) return true;
    if (d - j > C.TURRET_RANGE) return false;
    return lanes[i].path.distanceTo(slot) <= C.TURRET_RANGE;
  };
}

// One trial: covers is trialSetup(scene)'s test.
export function layoutTrial(scene, seed, covers = trialSetup(scene)) {
  const { lanes, level } = scene;
  const rng = createRng(seed);
  const draws = [];
  const min = laneMinTurretSlots(level);
  for (let attempt = 0; attempt < C.MAX_LAYOUT_ATTEMPTS; attempt++) {
    const { slots, features } = drawLayout(rng, level);
    const cover = lanes.map((lane, i) => slots.filter((slot) => covers(slot, i)).length);
    if (cover.every((n) => n >= min)) draws.push({ route: greedyRoute(features, level.druidPos, scene.mire).steps, cover });
  }
  return draws;
}

// The draw a trial ends with at this stepBudget (the first whose route fits the band), or null when
// none does (the game would use its best failed one, with a warning).
export function trialOutcome(draws, level, stepBudget = level.stepBudget) {
  const band = routeBand(level, stepBudget);
  return draws.find((d) => d.route >= band.min && d.route <= band.max) ?? null;
}

export function trialFailRate(trials, level, stepBudget = level.stepBudget) {
  return trials.filter((t) => trialOutcome(t, level, stepBudget) === null).length / trials.length;
}

// Share of single draws (with lane coverage) whose route fits the band of this stepBudget.
export function drawFitRate(trials, level, stepBudget = level.stepBudget) {
  const band = routeBand(level, stepBudget);
  const draws = trials.flat();
  return draws.length ? draws.filter((d) => d.route >= band.min && d.route <= band.max).length / draws.length : 0;
}

// The whole stepBudget whose route band is centred on the map's typical route (the median single
// draw), so rerolls rarely matter and players see the map's full variety. Null with no draws. A
// suggestion only: the budget lives in the levels tab.
export function centredBudget(trials, level) {
  const routes = trials.flat().map((d) => d.route).sort((a, b) => a - b);
  if (!routes.length) return null;
  const f = routeFactors(level);
  return Math.round(routes[Math.floor(routes.length / 2)] / ((f.min + f.max) / 2));
}
