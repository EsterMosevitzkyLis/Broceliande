// The editor's stage (M4a §5.1): the level drawn with the game's own drawing code, in the order the
// game's renderer uses (renderer.js), layer by layer, and the editor's overlays on top: lanes, zones,
// candidate spots, check marks and the selection.

import * as C from '../js/config.js';
import { drawFloor, drawStream, drawCorridors, drawFlats, drawMire, drawDecor, drawLaneGlow, drawAshFlecks } from '../js/render/environment.js';
import { drawDruid, DRUID_REST_POSE } from '../js/render/entities.js';
import { laneEntrance, COLORS } from '../js/renderer.js';
import { drawLane, drawZones } from '../js/debug/debugOverlay.js';
import { geometricZone } from '../js/zones.js';

export const LAYERS = ['ground', 'lanes', 'mire', 'decoration', 'spots', 'zones', 'checks'];

const SPOT = 'rgba(120, 220, 255, 0.95)';
const PROBLEM = 'rgba(255, 70, 60, 0.95)';
const WARN = 'rgba(255, 170, 40, 0.95)';
const SELECT = 'rgba(255, 235, 90, 1)';
const AREA = 'rgba(255, 255, 255, 0.6)';
const NO_GROUND = '#2a2a2a';

function ring(ctx, x, y, r, color, width = 2, dash = []) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function tag(ctx, text, x, y, color) {
  ctx.font = '13px monospace';
  const w = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x - 2, y - 13, w + 4, 17);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// The lane's smoothed centreline, as a thick line (check marks, selection).
function strokeCentreline(ctx, lane, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  lane.path.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

// A decoration object's mark: its base for upright objects, its ellipse for flats.
function decorMark(ctx, d, color, width) {
  if (d.rx !== undefined) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, d.rot ?? 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ring(ctx, d.x, d.y, d.landmark ? d.size * 0.6 : 14, color, width);
  }
}

// Every decoration object of the scene by its index in the map file's decor list.
export function decorByIndex(scene) {
  const all = new Map();
  for (const d of [...scene.decor, ...scene.flats, ...scene.groundPatches]) all.set(d.mapIndex, d);
  return all;
}

// view: { layers: { name: bool }, time (s, for the mire and the glow), checks (checks.js result),
// selection (a check target or null), areas: [{ left, top, right, bottom, name }] (the UI areas) }.
export function drawView(ctx, scene, view) {
  const { layers } = view;
  const level = scene.level;
  ctx.save();
  ctx.clearRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);

  // Ground (renderer.js order): the background image or the procedural ground, then the mire.
  if (layers.ground) {
    if (scene.background) {
      ctx.drawImage(scene.background, 0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
    } else {
      drawFloor(ctx, scene);
      drawStream(ctx, scene);
      drawCorridors(ctx, scene);
      drawFlats(ctx, scene);
    }
  } else {
    ctx.fillStyle = NO_GROUND;
    ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  }
  if (layers.mire) drawMire(ctx, scene, view.time);
  if (layers.ground && level.laneGlow) for (const lane of scene.lanes) drawLaneGlow(ctx, laneEntrance(lane), level.palette.laneGlow, view.time);

  // Upright layer, y-sorted: the decoration and the Druid.
  const d = level.druidPos;
  const upright = [{ y: d.y + C.DRUID_RADIUS * 0.6, draw: () => drawDruid(ctx, d.x, d.y, false, 0, DRUID_REST_POSE) }];
  if (layers.decoration) for (const item of scene.decor) upright.push({ y: item.y, draw: () => drawDecor(ctx, item, level) });
  upright.sort((a, b) => a.y - b.y);
  for (const u of upright) u.draw();
  if (layers.decoration) drawAshFlecks(ctx, scene, view.time);

  // The area behind the game's HUD strip.
  ctx.fillStyle = COLORS.hudBackdrop;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);

  // Overlays.
  ctx.font = '13px monospace';
  if (layers.zones) drawZones(ctx, level);
  if (layers.lanes) {
    ctx.save();
    ctx.strokeStyle = SPOT;
    ctx.fillStyle = SPOT;
    ctx.lineWidth = 1.5;
    ctx.font = '13px monospace';
    for (const lane of scene.lanes) drawLane(ctx, lane);
    ctx.restore();
  }
  if (layers.spots) drawSpots(ctx, scene);
  if (layers.checks) drawCheckMarks(ctx, scene, view);
  drawSelection(ctx, scene, view.selection);
  ctx.restore();
}

// Candidate spots: footprint, footprint + jitter (dashed), index and zone (* for a manual zone).
function drawSpots(ctx, scene) {
  const level = scene.level;
  for (const c of scene.candidates) {
    ring(ctx, c.x, c.y, C.LOCATION_RADIUS, SPOT, 1.5);
    ring(ctx, c.x, c.y, C.LOCATION_RADIUS + C.LOCATION_JITTER, SPOT, 1.5, [3, 5]);
    const loc = level.candidateLocations[c.index];
    const manual = geometricZone(level, loc) !== loc.zone ? '*' : '';
    tag(ctx, `#${c.index} ${loc.zone}${manual}`, c.x - C.LOCATION_RADIUS, c.y + C.LOCATION_RADIUS + C.LOCATION_JITTER + 14, SPOT);
  }
}

// Red marks on whatever a check flags: candidates and lanes with errors or warnings, decoration
// overlaps (orange), and the outlines of the game's UI areas that candidates must keep clear of.
function drawCheckMarks(ctx, scene, view) {
  const marked = view.checks.items.filter((i) => i.severity === 'error' || i.severity === 'warn');
  const candidates = new Set(marked.filter((i) => i.target?.kind === 'candidate').map((i) => i.target.index));
  const lanes = new Set(marked.filter((i) => i.target?.kind === 'lane').map((i) => i.target.id));
  for (const lane of scene.lanes) if (lanes.has(lane.id)) strokeCentreline(ctx, lane, PROBLEM, 4);
  for (const c of scene.candidates) if (candidates.has(c.index)) ring(ctx, c.x, c.y, C.LOCATION_RADIUS + C.LOCATION_JITTER + 4, PROBLEM, 4);
  for (const d of view.checks.overlaps) decorMark(ctx, d, WARN, 2);
  for (const a of view.areas) {
    ctx.strokeStyle = AREA;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(a.left, a.top, a.right - a.left, a.bottom - a.top);
    ctx.setLineDash([]);
    tag(ctx, a.name, a.left + 4, a.bottom + 16, AREA);
  }
}

function drawSelection(ctx, scene, sel) {
  if (!sel) return;
  if (sel.kind === 'candidate') {
    const c = scene.candidates[sel.index];
    if (c) ring(ctx, c.x, c.y, C.LOCATION_RADIUS + C.LOCATION_JITTER + 9, SELECT, 3);
  } else if (sel.kind === 'lane') {
    const lane = scene.lanes.find((l) => l.id === sel.id);
    if (lane) strokeCentreline(ctx, lane, SELECT, 3);
  } else if (sel.kind === 'decor') {
    const d = decorByIndex(scene).get(sel.index);
    if (d) decorMark(ctx, d, SELECT, 3);
  } else if (sel.kind === 'zone') {
    for (const c of scene.candidates) {
      if (scene.level.candidateLocations[c.index].zone === sel.zone) ring(ctx, c.x, c.y, C.LOCATION_RADIUS + C.LOCATION_JITTER + 9, SELECT, 3);
    }
  } else if (sel.kind === 'druid') {
    const d = scene.level.druidPos;
    ring(ctx, d.x, d.y, C.DRUID_RADIUS + 12, SELECT, 3);
  }
}
