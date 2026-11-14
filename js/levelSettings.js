// Per-level settings with global defaults (M2b §2): a level may set its own corridorWidth and
// featureMix (from data/levels.csv); otherwise CORRIDOR_WIDTH applies. Everything that used the globals
// reads them through here.

import * as C from './config.js';

export function corridorWidth(level) {
  return level.corridorWidth ?? C.CORRIDOR_WIDTH;
}

export function featureMix(level) {
  return level.featureMix;
}

// M4b §3.2: the level's own layout rules (its map file's `rules`), else the globals.
export function laneMinTurretSlots(level) {
  return level.rules?.laneMinTurretSlots ?? C.LANE_MIN_TURRET_SLOTS;
}

export function routeFactors(level) {
  return { min: level.rules?.routeMinFactor ?? C.FEATURE_ROUTE_MIN_FACTOR, max: level.rules?.routeMaxFactor ?? C.FEATURE_ROUTE_MAX_FACTOR };
}

// M4b §2: a candidate's own jitter (px), else LOCATION_JITTER; and the radius its object can then
// occupy (footprint + jitter).
export function spotJitter(c) {
  return c.jitter ?? C.LOCATION_JITTER;
}

export function occupiedRadius(c) {
  return C.LOCATION_RADIUS + spotJitter(c);
}

// M4b §1.1: a candidate's pinned role: 'auto', 'turret', 'feature' (with featureType, or null for
// a rolled type), 'notVacant' or 'vacant'.
export function spotPin(c) {
  const pin = c.pin || 'auto';
  if (pin.startsWith('feature:')) return { role: 'feature', featureType: pin.slice(8) };
  return { role: pin, featureType: null };
}

// M2f §4: how long an enemy waits behind a slower one before passing through it (M2d §3.4).
export function stuckTime(level) {
  return level.stuckTime ?? C.STUCK_TIME;
}

// M3b §3–§4: whether the level's region has a twist ('risingDead', 'sinkingDrops', 'mireGround').
export function regionTwist(level, twist) {
  return !!C.REGIONS[level.region]?.[twist];
}

// M2i §2: the level's waves, each { gapAfter, spawns: [{ t, lane, type, count }], tolls? }.
export function levelWaves(level) {
  return level.waves;
}

// Per-type enemy totals { type: n } of one wave, or of all the level's waves.
export function waveTotals(wave) {
  const totals = {};
  for (const s of wave.spawns) totals[s.type] = (totals[s.type] ?? 0) + s.count;
  return totals;
}

export function levelTotals(level) {
  const totals = {};
  for (const wave of levelWaves(level)) {
    for (const [type, n] of Object.entries(waveTotals(wave))) totals[type] = (totals[type] ?? 0) + n;
  }
  return totals;
}
