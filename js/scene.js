// Static encounter scenes, one per level (M2a §5): lane paths, candidate locations, and the
// level's fixed ground from its map file (M4a §1: decoration, flats, ground patches, streams, mire),
// with the level's start-up checks and the layout stats shown in the debug panel (spec §5, §12,
// §18.3; M1c §2, §5; M1j). Nothing here depends on the run seed, so a level's scene is identical in
// every run. Scenes are built once per level and cached.

import * as C from './config.js';
import { createLanePath } from './lanePath.js';
import { emptyResources } from './resources.js';
import { zoneIds, geometricZone, zoneQuota, zoneCandidates, quotaTotals, isNearZone } from './zones.js';
import { corridorWidth, featureMix, levelWaves, waveTotals, occupiedRadius, spotJitter, spotPin } from './levelSettings.js';
import { fitsCorridor } from './entities/enemy.js';
import { isDecorKind, decorDrawable } from './render/environment.js';

export const LEVEL_IDS = Object.keys(C.LEVELS);

// scene: { levelId, level (its LEVELS entry), lanes, candidates, decor, flats, groundPatches, streams,
// mire (M3c §3.1), background (M4a §1.2: an Image or null) }.
export function createScene(levelId) {
  return sceneFromLevel(levelId, C.LEVELS[levelId]);
}

// The same from a level object of that shape (the map editor's level being edited, M4a §5).
export function sceneFromLevel(levelId, level) {
  const lanes = level.lanes.map((lane) => ({
    id: lane.id,
    name: lane.name,
    waypoints: lane.waypoints,
    corridorWidth: corridorWidth(level), // the level's width (M2b §2): enemies and drops stay inside it
    path: createLanePath(lane.waypoints),
  }));
  // Lanes each candidate could cover as a turret slot (M1c §4.1): some centreline point
  // within the base TURRET_RANGE.
  const candidates = level.candidateLocations.map((c, index) => ({
    index,
    x: c.x,
    y: c.y,
    jitter: spotJitter(c), // M4b §2: its own, or LOCATION_JITTER
    lanes: lanes.filter((lane) => lane.path.distanceTo(c) <= C.TURRET_RANGE).map((lane) => lane.id),
  }));
  const G = level.ground;
  return {
    levelId, level, lanes, candidates,
    decor: G.decor, flats: G.flats, groundPatches: G.groundPatches, streams: G.streams,
    mire: level.mire, background: level.background,
  };
}

const scenes = {};

// The level's scene, built on first use.
export function sceneFor(levelId) {
  scenes[levelId] ??= createScene(levelId);
  return scenes[levelId];
}

// Nearest distance from p to any corridor centreline.
export function corridorDistance(lanes, p) {
  let best = Infinity;
  for (const lane of lanes) best = Math.min(best, lane.path.distanceTo(p));
  return best;
}

// Radius around a candidate that can be occupied by its object once jittered, with the default
// jitter (M4b §2: a candidate with its own jitter: levelSettings.js occupiedRadius).
export const OCCUPIED_RADIUS = C.LOCATION_RADIUS + C.LOCATION_JITTER;

// ---------------------------------------------------------------------------
// Start-up checks, per level: warnings only (errors for broken data), never block the game.
// ---------------------------------------------------------------------------

// Candidate rules (M1c §2). Returns a list of { index, problem } for the debug panel too.
export function candidateProblems(scene) {
  const problems = [];
  // M4b §2: each spot's footprint + its own jitter.
  for (const c of scene.candidates) {
    const add = (problem) => problems.push({ index: c.index, problem });
    const occupied = occupiedRadius(c);
    const clearance = corridorWidth(scene.level) / 2 + occupied;
    if (c.lanes.length === 0) add(`no lane centreline within TURRET_RANGE (${C.TURRET_RANGE} px)`);
    const d = corridorDistance(scene.lanes, c);
    if (d < clearance) add(`${Math.round(d)} px from a corridor centreline, needs ≥ ${clearance} (short by ${Math.ceil(clearance - d)})`);
    if (c.x - occupied < 0 || c.x + occupied > C.STAGE_WIDTH
      || c.y - occupied < C.HUD_STRIP_HEIGHT || c.y + occupied > C.STAGE_HEIGHT) {
      add(`footprint + jitter leaves the screen or reaches the HUD strip`);
    }
    for (const o of scene.candidates) {
      if (o.index <= c.index) continue;
      const gap = Math.hypot(o.x - c.x, o.y - c.y);
      const spacing = occupied + occupiedRadius(o) + C.LOCATION_GAP;
      if (gap < spacing) add(`${Math.round(gap)} px from candidate ${o.index}, needs ≥ ${spacing}`);
    }
  }
  return problems;
}

// Zone labels (M1j §2.2, §2.3): an unknown label is an error; a label that differs from the
// geometry is only info (the designer may have moved it on purpose); a zone with fewer
// candidates than its turret + feature quota is an error.
function zoneChecks(scene, add) {
  const { level } = scene;
  const ids = zoneIds(level);
  level.candidateLocations.forEach((c, i) => {
    const target = { kind: 'candidate', index: i };
    if (!ids.includes(c.zone)) {
      add('error', `candidate ${i} at (${c.x}, ${c.y}) has zone "${c.zone}", expected one of ${ids.join(', ')}`, target);
      return;
    }
    const geo = geometricZone(level, c);
    if (geo !== c.zone) add('info', `candidate ${i} labelled ${c.zone}, geometrically ${geo} (manual override)`, target);
  });
  for (const zone of ids) {
    const q = zoneQuota(level, zone);
    const n = zoneCandidates(level, zone).length;
    const target = { kind: 'zone', zone };
    if (n < q.turret + q.feature) {
      add('error', `zone ${zone} has ${n} candidates, fewer than its quota of ${q.turret} turret + ${q.feature} feature`, target);
    }
    // M4b §1.3: pins the zone's quotas can't honour.
    const pins = zoneCandidates(level, zone).map((i) => spotPin(level.candidateLocations[i]).role);
    const count = (role) => pins.filter((r) => r === role).length;
    if (count('turret') > q.turret) add('error', `zone ${zone} has ${count('turret')} spots pinned to turret, more than its turret quota of ${q.turret}`, target);
    if (count('feature') > q.feature) add('error', `zone ${zone} has ${count('feature')} spots pinned to a resource spot, more than its feature quota of ${q.feature}`, target);
    const free = Math.max(0, q.turret - count('turret')) + Math.max(0, q.feature - count('feature'));
    if (count('notVacant') > free) add('error', `zone ${zone} has ${count('notVacant')} spots pinned to "not vacant", but only ${free} turret and feature places are left in its quotas`, target);
    if (n > 0 && n - count('vacant') < q.turret + q.feature && n >= q.turret + q.feature) {
      add('error', `zone ${zone} has ${count('vacant')} spots pinned vacant, leaving ${n - count('vacant')} for its quota of ${q.turret} turret + ${q.feature} feature`, target);
    }
    // A zoneQuotaOverrides entry can lower a zone's quota to what it holds, which hides a zone that
    // is short of room: also check every zone against the default near / far quota.
    const kind = isNearZone(zone) ? 'near' : 'far';
    const base = level.zoneQuotas[kind];
    if (n < base.turret + base.feature) {
      add('warn', `${kind} zone ${zone} has ${n} candidates, fewer than the default ${kind} quota of `
        + `${base.turret} turret + ${base.feature} feature${level.zoneQuotaOverrides[zone] ? ' (its quota override hides this)' : ''}`, target);
    }
  }
  // M1j §5: one feature type per resource spot.
  // M2b §2: the level's own mix (or the default), checked against its own quotas.
  const mixTable = featureMix(level);
  // M4b §1.3: spots pinned to a feature type, against the mix.
  const pinnedTypes = {};
  level.candidateLocations.forEach((c, i) => {
    const t = spotPin(c).featureType;
    if (!t) return;
    if (!C.FEATURE_TYPES[t]) add('error', `candidate ${i} is pinned to unknown feature type "${t}"`, { kind: 'candidate', index: i });
    pinnedTypes[t] = (pinnedTypes[t] ?? 0) + 1;
  });
  for (const [t, n] of Object.entries(pinnedTypes)) {
    if (C.FEATURE_TYPES[t] && n > (mixTable[t] ?? 0)) add('error', `${n} spots are pinned to ${C.FEATURE_TYPES[t].name}, but the feature mix has ${mixTable[t] ?? 0}`);
  }
  const mix = Object.values(mixTable).reduce((a, b) => a + b, 0);
  const spots = quotaTotals(level).feature;
  if (mix !== spots) add('error', `feature mix has ${mix} features, but the zone quotas give ${spots} resource spots`);
  for (const type of Object.keys(mixTable)) {
    if (!C.FEATURE_TYPES[type]) add('error', `feature mix has unknown feature type "${type}"`);
  }
}

// Waves (M2i §2, after §14): every wave has spawns; every spawn a known lane id (or 'random'), a
// known enemy type, a count ≥ 1 and t ≥ 0; an Ogre needs corridors wide enough for it (M2c §2.4).
function waveChecks(scene, add) {
  const { level } = scene;
  const waves = levelWaves(level);
  if (waves.length === 0) add('error', 'has no waves');
  waves.forEach((wave, i) => {
    const where = `wave ${i + 1}`;
    if (!wave.spawns?.length) add('error', `${where}: has no spawns`);
    if (i < waves.length - 1 && !(wave.gapAfter >= 0)) add('error', `${where}: gapAfter should be a number of seconds`);
    for (const s of wave.spawns ?? []) {
      const t = C.ENEMY_TYPES[s.type];
      if (!t) add('error', `${where}: spawn has unknown type "${s.type}"`);
      if (s.lane !== 'random' && !level.lanes.some((l) => l.id === s.lane)) {
        add('error', `${where}: spawn at t ${s.t} (${s.type}) names lane "${s.lane}", which the level doesn't have (its lanes: ${level.lanes.map((l) => l.id).join(', ')}, or random)`);
      }
      if (!(s.count >= 1) || !(s.t >= 0)) add('error', `${where}: spawn needs count ≥ 1 and t ≥ 0`);
      if (t && !fitsCorridor(s.type, corridorWidth(level))) {
        add('error', `corridors are ${corridorWidth(level)} px, too narrow for its ${t.name} (needs ${2 * t.radius + 2})`);
      }
    }
  });
}

// Per-wave totals, e.g. "Tornville Haunt W2: 14W 1B", to compare with each wave's comment by eye
// (M2i §2). Logged once, the first time the debug view is on.
export const TOTAL_LETTERS = [['wolf', 'W'], ['grimWolf', 'GW'], ['thrall', 'T'], ['grimThrall', 'GT'], ['stirge', 'S'], ['grimStirge', 'GS'], ['bear', 'B'], ['grimBear', 'GB'], ['brute', 'MB'], ['grimBrute', 'GMB'], ['ogre', 'O'], ['grimOgre', 'GO'], ['knight', 'K'], ['grimKnight', 'GK'],
  ['spider', 'Sp'], ['grimSpider', 'GSp'], ['lizardman', 'L'], ['grimLizardman', 'GL'], ['hunter', 'H'], ['grimHunter', 'GH'],
  ['giantLizard', 'GiL'], ['grimGiantLizard', 'GGiL'], ['shaman', 'Sh'], ['grimShaman', 'GSh'],
  ['broodmother', 'BM'], ['grimBroodmother', 'GBM'], ['highShaman', 'HS'], ['broodEgg', 'E'], ['grimBroodEgg', 'GE'], ['ironOracle', 'IO']]; // M6b
export function logWaveTotals() {
  for (const id of LEVEL_IDS) {
    const level = C.LEVELS[id];
    levelWaves(level).forEach((wave, i) => {
      const totals = waveTotals(wave);
      const text = TOTAL_LETTERS.filter(([type]) => totals[type]).map(([type, letter]) => `${totals[type]}${letter}`).join(' ');
      console.info(`${level.name} W${i + 1}: ${text}`);
    });
  }
}

// Every per-scene check for one level (M2a §5.1), as a list of { severity ('error', 'warn' or
// 'info'), message, target } (target, when there is one: { kind: 'candidate', index },
// { kind: 'lane', id } or { kind: 'zone', zone }). The game logs them at start-up (validateLevel);
// the map editor shows them as it edits (M4a §5.4).
// M6b §6: relic pylons (landmark:relicPylon decoration): each within the base TURRET_RANGE of at
// least PYLON_MIN_SPOTS candidate spots, and none on a corridor; a level whose waves bring the Iron
// Oracle needs PYLON_COUNT of them (the map editor shows these with the decoration checks).
function pylonChecks(scene, add) {
  const pylons = scene.decor.filter((d) => d.kind === 'relicPylon');
  const oracle = levelWaves(scene.level).some((w) => w.spawns.some((s) => C.ENEMY_TYPES[s.type]?.baseType === 'ironOracle'));
  if (oracle && pylons.length !== C.PYLON_COUNT) add('error', `the Iron Oracle comes in its waves: it needs ${C.PYLON_COUNT} relic pylons (landmark:relicPylon decoration), the map has ${pylons.length}`);
  for (const p of pylons) {
    const where = `relic pylon at (${Math.round(p.x)}, ${Math.round(p.y)})`;
    const target = { kind: 'decor', index: p.mapIndex };
    const spots = scene.candidates.filter((c) => Math.hypot(c.x - p.x, c.y - p.y) <= C.TURRET_RANGE).length;
    if (spots < C.PYLON_MIN_SPOTS) add('error', `${where}: ${spots} candidate spots within turret range (${C.TURRET_RANGE} px), needs ${C.PYLON_MIN_SPOTS}`, target);
    const clear = Math.min(...scene.lanes.map((l) => l.path.distanceTo(p))) - corridorWidth(scene.level) / 2;
    if (clear < p.size) add('error', `${where} stands on a corridor (its base must clear the corridor edge)`, target);
  }
}

export function levelChecks(scene) {
  const { level } = scene;
  const out = [];
  const add = (severity, message, target = null) => out.push({ severity, message, target });
  zoneChecks(scene, add);
  waveChecks(scene, add);
  // M4a §1.3: every decoration object in the map file is a kind the game can draw.
  for (const kind of new Set(scene.decor.map((d) => d.kind))) {
    if (!isDecorKind(kind)) add('error', `its map file has decoration of unknown type "${kind}"`);
    else if (!decorDrawable(kind, level.palette)) add('error', `its palette lacks colours its "${kind}" decoration needs`);
  }
  for (const kind of new Set(scene.flats.map((f) => f.kind))) {
    if (!decorDrawable(kind, level.palette)) add('error', `its palette lacks colours its "${kind}" ground needs`);
  }
  pylonChecks(scene, add);
  for (const { index, problem } of candidateProblems(scene)) {
    const c = scene.candidates[index];
    add('warn', `candidate ${index} at (${c.x}, ${c.y}): ${problem}`, { kind: 'candidate', index });
  }

  for (const lane of scene.lanes) {
    const { factor } = laneStats(scene, lane);
    if (Math.abs(factor - C.LANE_LENGTH_FACTOR) > C.LANE_LENGTH_FACTOR * C.LANE_LENGTH_TOLERANCE) {
      add('warn', `${lane.name} lane is ${factor.toFixed(2)}× its straight-line distance; target is LANE_LENGTH_FACTOR = ${C.LANE_LENGTH_FACTOR}`, { kind: 'lane', id: lane.id });
    }
  }

  for (const lane of scene.lanes) {
    const end = lane.waypoints[lane.waypoints.length - 1];
    const r = Math.hypot(end.x - level.druidPos.x, end.y - level.druidPos.y);
    if (Math.abs(r - C.DRUID_MELEE_RADIUS) > 2) {
      add('warn', `${lane.name} lane ends ${Math.round(r)} px from the Druid, expected DRUID_MELEE_RADIUS = ${C.DRUID_MELEE_RADIUS}`, { kind: 'lane', id: lane.id });
    }
  }
  return out;
}

// One level's checks, logged as console errors, warnings and info.
export function validateLevel(scene) {
  for (const { severity, message } of levelChecks(scene)) console[severity](`${scene.levelId}: ${message}`);
}

// Start-up: every level's checks (M2a §5.1).
export function validateLevels() {
  for (const id of LEVEL_IDS) validateLevel(sceneFor(id));
}

// ---------------------------------------------------------------------------
// Debug-panel stats
// ---------------------------------------------------------------------------
export function laneStats(scene, lane) {
  const spawn = lane.waypoints[0];
  const d = scene.level.druidPos;
  const straight = Math.hypot(d.x - spawn.x, d.y - spawn.y);
  return {
    length: lane.path.length,
    factor: lane.path.length / straight,
    travelTime: lane.path.length / C.ENEMY_TYPES.wolf.speed,
  };
}

// Average yield of searching every feature of a level's mix once, plus the total search time.
export function expectedResources(level) {
  const totals = { ...emptyResources(), searchTime: 0 }; // every resource, Boughs included (M1i §1.3)
  // One of each feature in the mix (M1j §5): every resource spot of a run, searched once.
  for (const [typeKey, n] of Object.entries(featureMix(level))) {
    const type = C.FEATURE_TYPES[typeKey];
    for (let i = 0; i < n; i++) {
      for (const [res, [min, max]] of Object.entries(type.yields)) totals[res] += (min + max) / 2;
      totals.searchTime += type.searchTime;
    }
  }
  return totals;
}
