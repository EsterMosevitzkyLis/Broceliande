// Battle map files (M4a §1): one per level, data/maps/<levelId>.json, holding everything about the
// level's ground that is fixed: lanes, the Druid, sectors, corridor width, candidate spots with their
// zones, zone quota overrides, every decoration object, the mire, the palette, presentation
// settings and an optional background image. Loaded at start-up with the CSVs (boot.js); applyData()
// turns each into the level fields the game has always used (levelFromMap). Shared by the game
// and the map editor (M4a §3).

import { geometricZone } from './zones.js';

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
  if (!Array.isArray(map.mire?.patches)) out.push('"mire" needs a patches list');
  if (!map.palette || typeof map.palette !== 'object') out.push('needs a palette');
  return out;
}

const xy = ([x, y]) => ({ x, y });

// Ground decoration kinds (drawn flat, under everything upright); every other type is an upright
// object, a "landmark:" prefix marking a level's signature landmark.
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
    palette: map.palette,
    tollSound: P.tollSound ?? undefined,
    laneGlow: !!P.laneGlow,
    ashFlecks: P.ashFlecks ?? 0,
    backgroundImage: map.backgroundImage ?? null,
    ground: { decor: [], flats: [], groundPatches: [], streams: [] },
    mire: map.mire.patches.map((p) => ({ seed: p.seed, blobs: p.blobs.map(([x, y, r]) => ({ x, y, r })) })),
  };
  // zoneAuto: the zone worked out from the geometry; otherwise the stored zone is a manual override.
  level.candidateLocations = map.candidates.map((c) => ({ x: c.x, y: c.y, zone: c.zoneAuto ? geometricZone(level, c) : c.zone }));
  const G = level.ground;
  for (const d of map.decor) {
    if (d.type === 'groundPatch') G.groundPatches.push({ x: d.x, y: d.y, rx: d.rx, ry: d.ry, light: !!d.light });
    else if (d.type === 'stream') G.streams.push({ width: d.width, points: d.points.map(xy) });
    else if (FLAT_KINDS[d.type]) G.flats.push({ kind: FLAT_KINDS[d.type], x: d.x, y: d.y, rx: d.rx, ry: d.ry, rot: d.rot ?? 0, glow: !!d.glow });
    else {
      const item = { kind: d.type.replace(/^landmark:/, ''), x: d.x, y: d.y, size: d.scale ?? 1, variant: d.variant ?? 0, flip: !!d.flip };
      if (d.angle !== undefined) item.angle = d.angle;
      G.decor.push(item);
    }
  }
  return level;
}
