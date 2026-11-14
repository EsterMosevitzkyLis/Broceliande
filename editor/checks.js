// The editor's live checks (M4a §5.4) for the level being edited: the game's own start-up checks
// (map file shape, candidate rules, zones, waves, lanes, the UI areas), plus figures for the
// designer: candidates per zone against the quota, lane lengths and travel times, corridor width
// against the level's big enemies, the Prep route cost with a suggested step budget, and decoration
// reaching into corridors or candidate areas. Each entry: { group, severity, message, target }, with
// severity 'error', 'warn', 'info' or 'ok' (a figure that passes) and target (what clicking it
// selects): { kind: 'candidate', index }, { kind: 'lane', id }, { kind: 'zone', zone },
// { kind: 'decor', index } (index into the map file's decor list) or null.

import * as C from '../js/config.js';
import { mapProblems } from '../js/mapFile.js';
import { levelChecks } from '../js/scene.js';
import { zoneIds, zoneQuota, zoneCandidates } from '../js/zones.js';
import { corridorWidth, levelWaves } from '../js/levelSettings.js';
import { fitsCorridor } from '../js/entities/enemy.js';
import { layoutTrials, trialOutcome, trialFailRate, routeBand, suggestedBudget } from '../js/layout.js';
import { decorOverlaps } from '../js/mapDraft.js';
import { levelNameLabelProblems, bossBarProblems, wavePreviewProblems } from '../js/ui.js';

const ROUTE_TRIALS = 50;          // layouts made as the game makes them, for the Prep figures
const TARGET_FAIL_RATE = 0.1;     // the suggested stepBudget: the lowest with at most this share of failed layouts
const DECOR_LIST_MAX = 25;        // decoration overlaps listed one by one (all are marked on the map)

export const GROUPS = ['Map file', 'Candidates', 'Zones', 'Lanes', 'Waves', 'Prep', 'Decoration'];

// Which group a message from the game's level checks belongs to.
function groupOf(check) {
  const kind = check.target?.kind;
  if (kind === 'candidate') return 'Candidates';
  if (kind === 'zone' || /^feature mix/.test(check.message)) return 'Zones';
  if (kind === 'lane') return 'Lanes';
  if (/decoration/.test(check.message)) return 'Decoration';
  return 'Waves';
}

export function runChecks(scene, map) {
  const { level, levelId } = scene;
  const out = [];
  const add = (group, severity, message, target = null) => out.push({ group, severity, message, target });

  for (const m of mapProblems(map, levelId)) add('Map file', 'error', m);
  for (const c of levelChecks(scene)) add(groupOf(c), c.severity, c.message, c.target);
  for (const p of [...levelNameLabelProblems(scene), ...bossBarProblems(scene), ...wavePreviewProblems(scene)]) {
    add('Candidates', 'warn', p.problem, { kind: 'candidate', index: p.index });
  }

  // Zones: candidates per zone against its quota (turret + feature), e.g. "fN 4 / 5".
  for (const zone of zoneIds(level)) {
    const q = zoneQuota(level, zone);
    const n = zoneCandidates(level, zone).length;
    const override = level.zoneQuotaOverrides[zone] ? ', quota override' : '';
    add('Zones', n >= q.turret + q.feature ? 'ok' : 'error', `${zone} ${n} / ${q.turret + q.feature} (${q.turret} turret + ${q.feature} feature${override})`, { kind: 'zone', zone });
  }

  // Lanes: length, and unopposed travel time for the slowest and fastest ground enemies in the waves.
  const types = [...new Set(levelWaves(level).flatMap((w) => w.spawns.map((s) => s.type)))].filter((t) => C.ENEMY_TYPES[t]);
  const ground = types.filter((t) => !C.ENEMY_TYPES[t].flying).sort((a, b) => C.ENEMY_TYPES[a].speed - C.ENEMY_TYPES[b].speed);
  const ends = ground.length ? [...new Set([ground[0], ground[ground.length - 1]])] : [];
  for (const lane of scene.lanes) {
    const times = ends.map((t) => `${C.ENEMY_TYPES[t].name} ${(lane.path.length / C.ENEMY_TYPES[t].speed).toFixed(1)} s`).join(', ');
    add('Lanes', 'ok', `${lane.name}: ${Math.round(lane.path.length)} px${times ? `, ${times}` : ''}`, { kind: 'lane', id: lane.id });
  }
  // Corridor width against each mini-boss or boss in the waves.
  const W = corridorWidth(level);
  for (const t of types.filter((x) => C.ENEMY_TYPES[x].boss)) {
    const e = C.ENEMY_TYPES[t];
    add('Lanes', fitsCorridor(t, W) ? 'ok' : 'error', `corridors ${W} px, ${e.name} needs ${2 * e.radius + 2}`);
  }

  // Prep: layouts made as the game makes them (rerolls included): their feature route cost, how
  // often no fair layout is found at the level's stepBudget, and the budget that would give about
  // TARGET_FAIL_RATE of those (shown only: the budget is in the sheet).
  if (level.candidateLocations.length) {
    const trials = layoutTrials(scene, ROUTE_TRIALS);
    const band = routeBand(level);
    const routes = trials.map((t) => trialOutcome(t, level.stepBudget)).filter((r) => r !== null).sort((a, b) => a - b);
    const rate = trialFailRate(trials, level.stepBudget);
    if (routes.length) add('Prep', 'ok', `feature route over ${trials.length} layouts: median ${routes[Math.floor(routes.length / 2)]} steps (${routes[0]}–${routes[routes.length - 1]})`);
    add('Prep', rate > TARGET_FAIL_RATE * 2 ? 'warn' : 'ok', `${Math.round(rate * 100)}% of layouts find no fair draw at stepBudget ${level.stepBudget} (route band ${Math.ceil(band.min)}–${Math.floor(band.max)})`);
    const draws = trials.flat();
    const inBand = draws.filter((r) => r >= band.min && r <= band.max).length;
    if (draws.length) add('Prep', 'info', `${Math.round((100 * inBand) / draws.length)}% of single draws (with lane coverage) fit the band (the game rerolls until one does, up to ${C.MAX_LAYOUT_ATTEMPTS} draws)`);
    const suggested = suggestedBudget(trials, TARGET_FAIL_RATE);
    add('Prep', 'info', suggested === null
      ? `no stepBudget keeps failures to ${Math.round(TARGET_FAIL_RATE * 100)}%: the spots or the feature mix need a look`
      : `suggested stepBudget ${suggested}: the lowest with at most ${Math.round(TARGET_FAIL_RATE * 100)}% of layouts failing (${Math.round(trialFailRate(trials, suggested) * 100)}%); set it in the levels tab`);
  }

  // Decoration reaching into a corridor or a candidate area: warnings.
  const overlaps = decorOverlaps(scene);
  overlaps.slice(0, DECOR_LIST_MAX).forEach((d) => {
    add('Decoration', 'warn', `${d.landmark ? 'landmark ' : ''}${d.kind} at (${Math.round(d.x)}, ${Math.round(d.y)}) reaches into a corridor or a candidate area`, { kind: 'decor', index: d.mapIndex });
  });
  if (overlaps.length > DECOR_LIST_MAX) add('Decoration', 'warn', `and ${overlaps.length - DECOR_LIST_MAX} more (all marked on the map)`);
  return { items: out, overlaps };
}
