// What the editing tools work on (M4a §5.2, §5.3): references to the objects of a map file, their
// positions, the Druid's sector handles, hit-testing and snapping. A reference ("ref") is one of
// { kind: 'candidate', index }, { kind: 'waypoint', lane (index into map.lanes), index },
// { kind: 'druid' } or { kind: 'decor', index } (index into map.decor); the checks list also selects
// { kind: 'lane', id } and { kind: 'zone', zone }, which are only highlighted.

import * as C from '../js/config.js';

export const sameRef = (a, b) => a.kind === b.kind && a.index === b.index && a.lane === b.lane && a.id === b.id && a.zone === b.zone;
export const MOVABLE = new Set(['candidate', 'waypoint', 'druid', 'decor']);

const round2 = (v) => Math.round(v * 100) / 100;

// A ref's position in the map file, or null when it has none (a stream, a lane, a zone).
export function refPos(map, ref) {
  if (ref.kind === 'candidate') return map.candidates[ref.index] ?? null;
  if (ref.kind === 'waypoint') {
    const w = map.lanes[ref.lane]?.waypoints[ref.index];
    return w ? { x: w[0], y: w[1] } : null;
  }
  if (ref.kind === 'druid') return map.druid;
  if (ref.kind === 'decor') {
    const d = map.decor[ref.index];
    return d && Number.isFinite(d.x) ? d : null;
  }
  return null;
}

// Moves a ref to (x, y): whole pixels for spots, waypoints and the Druid (as the files hold them),
// hundredths for decoration.
export function setRefPos(map, ref, x, y) {
  if (ref.kind === 'candidate') Object.assign(map.candidates[ref.index], { x: Math.round(x), y: Math.round(y) });
  else if (ref.kind === 'waypoint') map.lanes[ref.lane].waypoints[ref.index] = [Math.round(x), Math.round(y)];
  else if (ref.kind === 'druid') Object.assign(map.druid, { x: Math.round(x), y: Math.round(y) });
  else if (ref.kind === 'decor') Object.assign(map.decor[ref.index], { x: round2(x), y: round2(y) });
}

// What moving these refs moves: the refs themselves, and with the Druid each lane's last waypoint
// (it sits on his melee ring), unless already among them.
export function movedRefs(map, refs) {
  const out = refs.filter((r) => MOVABLE.has(r.kind) && refPos(map, r));
  if (out.some((r) => r.kind === 'druid')) {
    map.lanes.forEach((lane, l) => {
      const end = { kind: 'waypoint', lane: l, index: lane.waypoints.length - 1 };
      if (!out.some((r) => sameRef(r, end))) out.push(end);
    });
  }
  return out;
}

export const snapValue = (v, grid) => (grid ? Math.round(v / grid) * grid : v);

// ---------------------------------------------------------------------------
// Druid and sectors
// ---------------------------------------------------------------------------

const rad = (deg) => (deg * Math.PI) / 180;
export const SECTOR_GAP = 5; // degrees kept between two sector boundaries

// Where sector boundary i's handle sits: on its line, past the near ring, kept on screen.
export function sectorHandlePos(level, i) {
  const d = level.druidPos;
  const a = rad(level.sectorBoundaryAngles[i]);
  const margin = 24;
  let r = level.nearRadius + 120;
  for (; r > 40; r -= 10) {
    const x = d.x + Math.cos(a) * r;
    const y = d.y + Math.sin(a) * r;
    if (x >= margin && x <= C.STAGE_WIDTH - margin && y >= C.HUD_STRIP_HEIGHT + margin && y <= C.STAGE_HEIGHT - margin) break;
  }
  return { x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r };
}

// Sector boundary i turned to point at p: whole degrees, kept between its neighbours (sectors keep
// their order round the Druid).
export function sectorAngleTowards(angles, i, druid, p) {
  const a = (Math.round((Math.atan2(p.y - druid.y, p.x - druid.x) * 180) / Math.PI) + 360) % 360;
  const prev = angles[(i + angles.length - 1) % angles.length];
  const next = angles[(i + 1) % angles.length];
  const span = (next - prev + 360) % 360 || 360;
  const rel = Math.min(span - SECTOR_GAP, Math.max(SECTOR_GAP, (a - prev + 360) % 360));
  return (prev + rel) % 360;
}

// ---------------------------------------------------------------------------
// Hit-testing (stage coordinates; tol: a few screen pixels in stage units)
// ---------------------------------------------------------------------------

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function hitCandidate(map, p) {
  let best = null;
  map.candidates.forEach((c, index) => {
    const d = dist(c, p);
    if (d <= C.LOCATION_RADIUS && (!best || d < best.d)) best = { d, index };
  });
  return best && { kind: 'candidate', index: best.index };
}

export function hitDruid(map, p, tol) {
  return dist({ x: map.druid.x, y: map.druid.y - 15 }, p) <= C.DRUID_RADIUS + tol ? { kind: 'druid' } : null;
}

export function hitWaypoint(map, p, tol) {
  let best = null;
  map.lanes.forEach((lane, l) => lane.waypoints.forEach(([x, y], index) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d <= 8 + tol && (!best || d < best.d)) best = { d, ref: { kind: 'waypoint', lane: l, index } };
  }));
  return best?.ref ?? null;
}

// The nearest upright object whose base is close (a landmark: within its size), else a flat patch
// (water, mist, mere, ash pit) under p. Ground patches and streams aren't picked.
export function hitDecor(map, p, tol, { upright = true, flats = true } = {}) {
  let best = null;
  map.decor.forEach((d, index) => {
    if (!Number.isFinite(d.x) || d.type === 'groundPatch' || d.rx !== undefined) return;
    if (!upright) return;
    const reach = d.type.startsWith('landmark:') ? Math.max(24, d.scale * 0.5) : 18 + tol;
    const dd = dist(d, p);
    if (dd <= reach && (!best || dd < best.d)) best = { d: dd, index };
  });
  if (best) return { kind: 'decor', index: best.index };
  if (!flats) return null;
  for (let index = map.decor.length - 1; index >= 0; index--) {
    const d = map.decor[index];
    if (d.rx === undefined || d.type === 'groundPatch') continue;
    const c = Math.cos(-(d.rot ?? 0));
    const s = Math.sin(-(d.rot ?? 0));
    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const u = dx * c - dy * s;
    const v = dx * s + dy * c;
    if ((u / d.rx) ** 2 + (v / d.ry) ** 2 <= 1) return { kind: 'decor', index };
  }
  return null;
}

// Where a click on a lane's corridor would insert a waypoint: the lane and the waypoint segment
// nearest p, if p is on that lane's corridor (scene lanes: smoothed paths).
export function laneInsertAt(map, scene, p) {
  let best = null;
  scene.lanes.forEach((lane, l) => {
    const d = lane.path.distanceTo(p);
    if (d > lane.corridorWidth / 2 || (best && d >= best.d)) return;
    const w = map.lanes[l].waypoints;
    let seg = 0;
    let segD = Infinity;
    for (let i = 0; i < w.length - 1; i++) {
      const sd = segmentDistance(p, w[i], w[i + 1]);
      if (sd < segD) { segD = sd; seg = i; }
    }
    best = { d, lane: l, index: seg + 1 };
  });
  return best;
}

function segmentDistance(p, [ax, ay], [bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.y - ay) * vy) / len2)) : 0;
  return Math.hypot(p.x - (ax + vx * t), p.y - (ay + vy * t));
}

// Refs inside a box (stage rectangle), for the active tool's kinds.
export function refsInBox(map, box, kinds) {
  const inside = (x, y) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
  const out = [];
  if (kinds.has('candidate')) map.candidates.forEach((c, index) => inside(c.x, c.y) && out.push({ kind: 'candidate', index }));
  if (kinds.has('waypoint')) map.lanes.forEach((lane, l) => lane.waypoints.forEach(([x, y], index) => inside(x, y) && out.push({ kind: 'waypoint', lane: l, index })));
  if (kinds.has('decor')) map.decor.forEach((d, index) => d.type !== 'groundPatch' && Number.isFinite(d.x) && inside(d.x, d.y) && out.push({ kind: 'decor', index }));
  if (kinds.has('druid') && inside(map.druid.x, map.druid.y)) out.push({ kind: 'druid' });
  return out;
}
