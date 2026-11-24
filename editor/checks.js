// The editor's live checks (M4a §5.4) for the level being edited: the game's own start-up checks
// (map file shape, candidate rules, zones, waves, lanes, the UI areas), plus figures for the
// designer: candidates per zone against the quota, lane lengths and travel times, corridor width
// against the level's big enemies, the Prep route figures with a suggested step budget, and
// decoration reaching into corridors or candidate areas. Each entry: { group, severity, message,
// target }, with severity 'error', 'warn', 'info' or 'ok' (a figure that passes) and target (what
// clicking it selects): { kind: 'candidate', index }, { kind: 'lane', id }, { kind: 'zone', zone },
// { kind: 'decor', index } (index into the map file's decor list) or null.
//
// cheapChecks runs on every change, even while dragging; the Prep figures come from layout trials
// (prepItems), which the editor runs once the map has been still for a moment.

import * as C from '../js/config.js';
import { mapProblems } from '../js/mapFile.js';
import { levelChecks } from '../js/scene.js';
import { zoneIds, zoneQuota, zoneCandidates, quotaTotals } from '../js/zones.js';
import { corridorWidth, levelWaves, laneMinTurretSlots } from '../js/levelSettings.js';
import { fitsCorridor } from '../js/entities/enemy.js';
import { trialOutcome, trialFailRate, drawFitRate, routeBand, centredBudget } from '../js/layout.js';
import { decorOverlaps } from '../js/mapDraft.js';
import { levelNameLabelProblems, bossBarProblems, wavePreviewProblems } from '../js/ui.js';
import { potionBeltProblems } from '../js/potionBelt.js';

export const ROUTE_TRIALS = 50;   // layouts made as the game makes them, for the Prep figures
const FAIL_WARN_RATE = 0.2;       // a "no fair draw" rate above this is a warning
const DECOR_LIST_MAX = 25;        // decoration overlaps listed one by one (all are marked on the map)

export const GROUPS = ['Map file', 'Candidates', 'Zones', 'Lanes', 'Waves', 'Prep', 'Decoration'];

// Which group a message from the game's level checks belongs to.
function groupOf(check) {
  const kind = check.target?.kind;
  if (kind === 'candidate') return 'Candidates';
  if (kind === 'zone' || /^feature mix/.test(check.message)) return 'Zones';
  if (kind === 'lane') return 'Lanes';
  if (kind === 'decor') return 'Decoration'; // M6b §6: relic pylon placement
  if (/decoration/.test(check.message)) return 'Decoration';
  return 'Waves';
}

// areas: the UI areas measured once per level, { label, bossBar, wavePreview, potionBelt }.
// laneRows: the sheet's lanes reference tab (data/lanes.csv), whose ids the spawns tab offers.
export function cheapChecks(scene, map, areas, laneRows = []) {
  const { level, levelId } = scene;
  const out = [];
  const add = (group, severity, message, target = null) => out.push({ group, severity, message, target });

  for (const m of mapProblems(map, levelId)) add('Map file', 'error', m);
  for (const c of levelChecks(scene)) add(groupOf(c), c.severity, c.message, c.target);
  const underUi = [...levelNameLabelProblems(scene, areas.label), ...bossBarProblems(scene, areas.bossBar), ...wavePreviewProblems(scene, areas.wavePreview), ...potionBeltProblems(scene, areas.potionBelt)];
  for (const p of underUi) add('Candidates', 'warn', p.problem, { kind: 'candidate', index: p.index });

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
  // M4b §4: the spots whose turret range reaches each lane (a slot there would cover it).
  for (const lane of scene.lanes) {
    const n = scene.candidates.filter((c) => c.lanes.includes(lane.id)).length;
    add('Lanes', n >= laneMinTurretSlots(level) ? 'ok' : 'error', `${lane.id}: ${n} spots in turret range (needs ${laneMinTurretSlots(level)} turret slots)`, { kind: 'lane', id: lane.id });
  }
  // Coverage grows with the lane count: the zone quotas' turret slots against what every lane needs
  // (a slot near two lanes counts for both, so this is a hint, not an error).
  const slots = quotaTotals(level).turret;
  const need = scene.lanes.length * laneMinTurretSlots(level);
  if (slots < need) add('Lanes', 'warn', `${scene.lanes.length} lanes × ${laneMinTurretSlots(level)} turret slots = ${need}, but the zone quotas give ${slots} turret slots: only slots covering two lanes can make up the difference`);
  // The lanes tab lists each level's lane ids for the spawns tab's dropdown: after a lane is added,
  // deleted or renamed it needs the same change.
  const tab = laneRows.filter((r) => r.level === levelId);
  const ids = scene.lanes.map((l) => l.id);
  if (tab.length && (tab.length !== ids.length || !ids.every((id) => tab.some((r) => r.laneId === id)))) {
    const rows = scene.lanes.map((l) => `${levelId},${l.id},${l.name},"${l.waypoints[0].x}, ${l.waypoints[0].y}"`);
    add('Lanes', 'warn', `the sheet's lanes tab lists ${tab.map((r) => r.laneId).join(', ')} for this level, the map has ${ids.join(', ')}: give the lanes tab these rows: ${rows.join('  ')}`);
  }
  // Corridor width against each mini-boss or boss in the waves.
  const W = corridorWidth(level);
  for (const t of types.filter((x) => C.ENEMY_TYPES[x].boss)) {
    const e = C.ENEMY_TYPES[t];
    add('Lanes', fitsCorridor(t, W) ? 'ok' : 'error', `corridors ${W} px, ${e.name} needs ${2 * e.radius + 2}`);
  }

  // Decoration reaching into a corridor or a candidate area: warnings.
  const overlaps = decorOverlaps(scene);
  overlaps.slice(0, DECOR_LIST_MAX).forEach((d) => {
    add('Decoration', 'warn', `${d.landmark ? 'landmark ' : ''}${d.kind} at (${Math.round(d.x)}, ${Math.round(d.y)}) reaches into a corridor or a candidate area`, { kind: 'decor', index: d.mapIndex });
  });
  if (overlaps.length > DECOR_LIST_MAX) add('Decoration', 'warn', `and ${overlaps.length - DECOR_LIST_MAX} more (all marked on the map)`);
  return { items: out, overlaps };
}

// Prep (from layout trials, js/layout.js): the feature route of the layouts the game would end
// with, how often no fair draw turns up at the level's stepBudget, the share of single draws that
// fit its band, the budget centred on the map's typical route (shown only: the budget is in the
// sheet), and (M4b §4) how many turret slots typically end up covering each lane. Returns
// { items, suggested }.
export function prepItems(scene, trials) {
  const { level } = scene;
  const out = [];
  const add = (severity, message) => out.push({ group: 'Prep', severity, message, target: null });
  if (!trials.length) return { items: out, suggested: null };
  const pct = (x) => `${Math.round(x * 100)}%`;
  const band = routeBand(level);
  const ends = trials.map((t) => trialOutcome(t, level)).filter(Boolean);
  const routes = ends.map((d) => d.route).sort((a, b) => a - b);
  const fail = trialFailRate(trials, level);
  if (routes.length) add('ok', `feature route over ${trials.length} layouts: median ${routes[Math.floor(routes.length / 2)]} steps (${routes[0]}–${routes[routes.length - 1]})`);
  add(fail > FAIL_WARN_RATE ? 'warn' : 'ok', `${pct(fail)} of layouts find no fair draw at stepBudget ${level.stepBudget} (route band ${Math.ceil(band.min)}–${Math.floor(band.max)})`);
  add('info', `${pct(drawFitRate(trials, level))} of single draws fit that band (the game rerolls until one does, up to ${C.MAX_LAYOUT_ATTEMPTS} draws)`);
  if (ends.length) {
    const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
    add('ok', `turret slots typically covering each lane: ${scene.lanes.map((l, i) => `${l.id} ${median(ends.map((d) => d.cover[i]))}`).join(', ')} (needs ${laneMinTurretSlots(level)})`);
  }
  const suggested = centredBudget(trials, level);
  if (suggested === null) {
    add('warn', 'no draw covers every lane: the spots need a look');
  } else {
    add('info', `suggested stepBudget ${suggested}, centred on the typical route: ${pct(drawFitRate(trials, level, suggested))} of single draws fit, ${pct(trialFailRate(trials, level, suggested))} of layouts find no fair draw; set it in the levels tab`);
  }
  return { items: out, suggested };
}
