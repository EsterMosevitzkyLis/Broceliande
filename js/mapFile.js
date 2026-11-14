// Battle map files (M4a §1): one per level, data/maps/<levelId>.json, holding everything about the
// level's ground that is fixed: lanes, the Druid, sectors, corridor width, candidate spots with their
// zones, zone quota overrides, every decoration object, the mire, the palette, presentation
// settings and an optional background image. Loaded at start-up with the CSVs (boot.js); applyData()
// turns each into the level fields the game has always used (levelFromMap). Shared by the game
// and the map editor (M4a §3).

import { geometricZone } from './zones.js';
import { decodeMire, MIRE_CELL } from './mire.js';
import * as C from './config.js';

export const MAP_VERSION = 1;
export const MAP_DIR = 'data/maps';
export const BACKGROUND_DIR = 'data/maps/backgrounds';

// Fetches every level's map file. Returns { maps: { id: map }, backgrounds: { id: Image } };
// problems (a missing or broken file, an image that won't load) go into problems.errors.
export async function loadMaps(levelIds, problems) {
  const maps = {};
  const backgrounds = {};
  const err = (id, message) => problems.errors.push({ tab: 'maps', row: '', column: `${id}.json`, message });
  await Promise.all(levelIds.map(async (id) => {
    const url = `${MAP_DIR}/${id}.json`;
    let map;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status === 404 ? 'no such file: every level needs a map file' : `HTTP ${res.status}`);
      map = await res.json();
    } catch (e) {
      err(id, `could not load ${url} (${e.message})`);
      return;
    }
    for (const message of mapProblems(map, id)) err(id, message);
    maps[id] = map;
    if (map.backgroundImage) {
      try {
        backgrounds[id] = await loadImage(`${BACKGROUND_DIR}/${map.backgroundImage}`);
      } catch (e) {
        err(id, `could not load its background image ${BACKGROUND_DIR}/${map.backgroundImage}`);
      }
    }
  }));
  return { maps, backgrounds };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const isPoint = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isXY = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);

// The file's shape (§1.2); the level's geometry rules (candidates, zones, lanes) are checked later
// by the start-up checks in scene.js, as before.
export function mapProblems(map, id) {
  const out = [];
  if (map.version !== MAP_VERSION) out.push(`version should be ${MAP_VERSION}`);
  if (map.level !== id) out.push(`"level" is "${map.level}", should be "${id}"`);
  if (!isXY(map.druid)) out.push('"druid" needs x and y');
  if (!(map.corridorWidth > 0)) out.push('"corridorWidth" should be a number above 0');
  if (!Array.isArray(map.lanes) || map.lanes.length !== 3) out.push('needs 3 lanes');
  for (const lane of map.lanes ?? []) {
    if (!lane.id) out.push('a lane has no id');
    if (!Array.isArray(lane.waypoints) || lane.waypoints.length < 2 || !lane.waypoints.every(isPoint)) out.push(`lane ${lane.id}: needs at least 2 waypoints, each [x, y]`);
  }
  const S = map.sectors ?? {};
  if (!Array.isArray(S.angles) || S.angles.length !== 3 || !Array.isArray(S.names) || S.names.length !== 3) out.push('"sectors" needs 3 angles and 3 names');
  if (!(S.nearRadius > 0)) out.push('"sectors.nearRadius" should be a number above 0');
  if (!Array.isArray(map.candidates) || !map.candidates.every((c) => isXY(c) && (c.zoneAuto || typeof c.zone === 'string'))) out.push('each candidate needs x, y and a zone (or zoneAuto)');
  if (!Array.isArray(map.decor) || !map.decor.every((d) => typeof d.type === 'string')) out.push('each decoration object needs a type');
  for (const kind of new Set((map.decor ?? []).filter((d) => d.type?.startsWith('landmark:')).map((d) => d.type.slice(9)))) {
    if (!C.DECOR.landmarkSize[kind]) out.push(`landmark "${kind}" has no default size (config.js DECOR.landmarkSize)`);
  }
  const PINS = /^(auto|turret|feature|notVacant|vacant|feature:[A-Za-z0-9]+)$/;
  (map.candidates ?? []).forEach((c, i) => {
    if (c.pin !== undefined && !PINS.test(c.pin)) out.push(`candidate ${i}: pin "${c.pin}" should be auto, turret, feature, feature:<type>, notVacant or vacant`);
    if (c.jitter !== undefined && !(c.jitter >= 0)) out.push(`candidate ${i}: jitter should be a number of px, 0 or more`);
  });
  for (const [k, v] of Object.entries(map.rules ?? {})) {
    if (!['laneMinTurretSlots', 'routeMinFactor', 'routeMaxFactor'].includes(k)) out.push(`rules: unknown rule "${k}"`);
    else if (!(v >= 0)) out.push(`rules.${k} should be a number, 0 or more`);
  }
  if (!(map.mire?.cell > 0) || !Array.isArray(map.mire?.rows)) out.push('"mire" needs a cell size and a rows list');
  else {
    try { decodeMire(map.mire); } catch (e) { out.push(e.message); }
  }
  if (!map.palette || typeof map.palette !== 'object') out.push('needs a palette');
  return out;
}

const xy = ([x, y]) => ({ x, y });

// Ground decoration kinds (drawn flat, under everything upright); every other type is an upright
// object, a "landmark:" prefix marking a level's signature landmark. Every object's scale multiplies
// its default size: 1 for most (their drawings scale from it), a landmark's DECOR.landmarkSize px.
const FLAT_KINDS = { water: 'water', mist: 'mist', mere: 'mere', ashPit: 'ash' };

// The level fields for one map: druidPos, corridorWidth, lanes, sectorBoundaryAngles, sectorNames,
// nearRadius, zoneQuotaOverrides, candidateLocations, palette, tollSound, laneGlow, ashFlecks,
// backgroundImage, and its fixed ground: decor (upright objects), flats, groundPatches, streams, mire.
export function levelFromMap(map) {
  const P = map.presentation ?? {};
  const level = {
    druidPos: { x: map.druid.x, y: map.druid.y },
    corridorWidth: map.corridorWidth,
    lanes: map.lanes.map((l) => ({ id: l.id, name: l.name ?? l.id, waypoints: l.waypoints.map(xy) })),
    sectorBoundaryAngles: map.sectors.angles,
    sectorNames: map.sectors.names,
    nearRadius: map.sectors.nearRadius,
    zoneQuotaOverrides: map.zoneQuotaOverrides ?? {},
    rules: map.rules ?? {}, // M4b §3.2: laneMinTurretSlots, routeMinFactor, routeMaxFactor (missing: the globals)
    palette: map.palette,
    tollSound: P.tollSound ?? undefined,
    laneGlow: !!P.laneGlow,
    ashFlecks: P.ashFlecks ?? 0,
    backgroundImage: map.backgroundImage ?? null,
    ground: { decor: [], flats: [], groundPatches: [], streams: [] },
    mire: decodeMire(map.mire),
  };
  // zoneAuto: the zone worked out from the geometry; otherwise the stored zone is a manual override.
  // M4b §1–§2: an optional pinned role and jitter of its own (missing: rolled, LOCATION_JITTER).
  level.candidateLocations = map.candidates.map((c) => {
    const loc = { x: c.x, y: c.y, zone: c.zoneAuto ? geometricZone(level, c) : c.zone };
    if (c.pin && c.pin !== 'auto') loc.pin = c.pin;
    if (c.jitter !== undefined) loc.jitter = c.jitter;
    return loc;
  });
  const G = level.ground;
  // mapIndex: the object's place in the file's decor list (the map editor's checks point at it).
  map.decor.forEach((d, mapIndex) => {
    if (d.type === 'groundPatch') G.groundPatches.push({ x: d.x, y: d.y, rx: d.rx, ry: d.ry, light: !!d.light, mapIndex });
    else if (d.type === 'stream') G.streams.push({ width: d.width, points: d.points.map(xy), mapIndex });
    else if (FLAT_KINDS[d.type]) G.flats.push({ kind: FLAT_KINDS[d.type], x: d.x, y: d.y, rx: d.rx, ry: d.ry, rot: d.rot ?? 0, glow: !!d.glow, mapIndex });
    else {
      const landmark = d.type.startsWith('landmark:');
      const kind = d.type.replace(/^landmark:/, '');
      const size = (d.scale ?? 1) * (landmark ? C.DECOR.landmarkSize[kind] ?? 1 : 1);
      const item = { kind, x: d.x, y: d.y, size, variant: d.variant ?? 0, flip: !!d.flip, landmark, mapIndex };
      if (d.angle !== undefined) item.angle = d.angle;
      G.decor.push(item);
    }
  });
  return level;
}

// ---------------------------------------------------------------------------
// New levels (M4a §5.7): a blank map and the sectors for a set of lanes
// ---------------------------------------------------------------------------

const COMPASS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const angleTo = (from, to) => ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI + 360) % 360;

// Sectors round the Druid for lanes entering at these points, one lane per sector: boundaries
// halfway (by angle) between neighbouring lanes, each sector named after its lane's compass
// direction (screen y points down: 90° is S). Returns { angles, names }, angles in sector order.
export function sectorsFor(druid, entries) {
  const lanes = entries.map((p) => angleTo(druid, p)).sort((a, b) => a - b);
  const angles = lanes.map((a, i) => {
    const prev = lanes[(i + lanes.length - 1) % lanes.length];
    const gap = (a - prev + 360) % 360 || 360;
    return Math.round((prev + gap / 2) % 360);
  });
  const names = lanes.map((a) => COMPASS[Math.round(a / 45) % 8]);
  names.forEach((n, i) => { if (names.indexOf(n) !== i) names[i] = `${n}${i + 1}`; });
  return { angles, names };
}

// A map for a level with no map file yet, as a starting point for a draft: the Druid near the
// middle, straight lanes from their entry points to his melee ring (lanes: [{ id, name, entry }]),
// sectors from them, no spots, decoration or mire. settings: { corridorWidth, meleeRadius,
// nearRadius, palette }.
export function blankMap(levelId, lanes, settings) {
  const druid = { x: 960, y: 600 };
  const ring = (p) => {
    const d = Math.hypot(p.x - druid.x, p.y - druid.y) || 1;
    return [Math.round(druid.x + ((p.x - druid.x) / d) * settings.meleeRadius), Math.round(druid.y + ((p.y - druid.y) / d) * settings.meleeRadius)];
  };
  const { angles, names } = sectorsFor(druid, lanes.map((l) => l.entry));
  return {
    version: MAP_VERSION,
    level: levelId,
    druid,
    corridorWidth: settings.corridorWidth,
    lanes: lanes.map((l) => ({ id: l.id, name: l.name, waypoints: [[l.entry.x, l.entry.y], ring(l.entry)] })),
    sectors: { angles, names, nearRadius: settings.nearRadius },
    zoneQuotaOverrides: {},
    candidates: [],
    decor: [],
    mire: { cell: MIRE_CELL, rows: [] },
    palette: settings.palette,
    presentation: { tollSound: null, laneGlow: false, ashFlecks: 0 },
    backgroundImage: null,
    notes: '',
  };
}

// A level's lanes from the lanes tab (rows { level, laneId, name, entry: "x, y" }), or three lanes
// from the left, right and bottom edges when it has none there.
export function lanesFromTab(levelId, rows = []) {
  const mine = rows.filter((r) => r.level === levelId && r.laneId);
  if (mine.length) {
    return mine.map((r) => {
      const [x, y] = String(r.entry ?? '').split(',').map((v) => Number(v.trim()));
      return { id: r.laneId, name: r.name ?? r.laneId, entry: Number.isFinite(x) && Number.isFinite(y) ? { x, y } : { x: -40, y: 540 } };
    });
  }
  return [{ id: 'west', name: 'West', entry: { x: -40, y: 420 } }, { id: 'east', name: 'East', entry: { x: 1960, y: 460 } }, { id: 'south', name: 'South', entry: { x: 900, y: 1120 } }];
}
