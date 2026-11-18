// The editor's stage (M4a §5.1): the level drawn with the game's own drawing code, in the order the
// game's renderer uses (renderer.js), layer by layer, and the editor's overlays on top: lanes, zones,
// candidate spots, check marks and the selection.

import * as C from '../js/config.js';
import { drawFloor, drawStream, drawCorridors, drawFlats, drawMire, drawDecor, drawLaneGlow, drawAshFlecks, decorDrawable } from '../js/render/environment.js';
import { drawDruid, DRUID_REST_POSE, drawTurretSlot, drawFeature, featureBase } from '../js/render/entities.js';
import { laneEntrance, COLORS } from '../js/renderer.js';
import { drawLane, drawZones } from '../js/debug/debugOverlay.js';
import { geometricZone } from '../js/zones.js';
import { spotPin, spotHide } from '../js/levelSettings.js';
import { entryMark } from './lanePanels.js';
import { sectorHandlePos } from './geometry.js';

export const LAYERS = ['ground', 'lanes', 'mire', 'decoration', 'spots', 'zones', 'checks', 'laneLabels'];
export const LAYER_LABELS = { laneLabels: 'lane labels' };

const SPOT = 'rgba(120, 220, 255, 0.95)';
const PROBLEM = 'rgba(255, 70, 60, 0.95)';
const WARN = 'rgba(255, 170, 40, 0.95)';
const SELECT = 'rgba(255, 235, 90, 1)';
const HIDDEN = 'rgba(150, 240, 120, 1)'; // M6c: spots under ferns
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

// A kind this palette can't draw (it lacks a colour the kind needs: the checks list says which) is
// skipped and marked, so the rest of the level still draws while it is being fixed. Tested once
// per palette and kind.
const drawable = new WeakMap(); // palette → Map(kind → bool)
function canDraw(palette, kind) {
  if (!drawable.has(palette)) drawable.set(palette, new Map());
  const known = drawable.get(palette);
  if (!known.has(kind)) known.set(kind, decorDrawable(kind, palette));
  return known.get(kind);
}

function drawOrMark(ctx, palette, kind, draw, x, y) {
  if (canDraw(palette, kind)) draw();
  else ring(ctx, x, y, 14, PROBLEM, 3, [3, 3]);
}

// view: { layers: { name: bool }, time (s, for the mire and the glow), checks (the cheap checks),
// selection (a list of refs, geometry.js), areas: [{ left, top, right, bottom, name }] (the UI
// areas), tool (the active tool: its overlay shows whatever the layers say), box (a box being
// dragged, or null), bgOpacity (editor only: below 1 the procedural ground shows under a background
// image, for tracing), brush ({ x, y, r, erase } or null), preview (preview.js previewLayout, or
// null: Preview a run shows its slot pads, resource spots and empty spots) }.
export function drawView(ctx, scene, view) {
  const { layers } = view;
  const level = scene.level;
  ctx.save();
  ctx.clearRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);

  // Ground (renderer.js order): the background image or the procedural ground, then the mire.
  if (layers.ground) {
    const opacity = view.bgOpacity ?? 1;
    if (!scene.background || opacity < 1) {
      drawFloor(ctx, scene);
      drawStream(ctx, scene);
      drawCorridors(ctx, scene);
      for (const f of scene.flats) drawOrMark(ctx, level.palette, f.kind, () => drawFlats(ctx, { level, flats: [f] }), f.x, f.y);
    }
    if (scene.background) {
      ctx.globalAlpha = opacity;
      ctx.drawImage(scene.background, 0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = NO_GROUND;
    ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  }
  if (layers.mire) drawMire(ctx, scene, view.time);
  if (layers.ground && level.laneGlow) for (const lane of scene.lanes) drawLaneGlow(ctx, laneEntrance(lane), level.palette.laneGlow, view.time);

  // Preview a run: slot pads on the ground, resource spots upright (as the game draws them).
  const preview = view.preview;
  if (preview) for (const slot of preview.slots) drawTurretSlot(ctx, slot, false, false);

  // Upright layer, y-sorted: the decoration, the Druid (and a previewed run's resource spots).
  const d = level.druidPos;
  const upright = [{ y: d.y + C.DRUID_RADIUS * 0.6, draw: () => drawDruid(ctx, d.x, d.y, false, 0, DRUID_REST_POSE) }];
  if (preview) for (const f of preview.features) upright.push({ y: featureBase(f).y, draw: () => drawFeature(ctx, f, false) });
  if (layers.decoration) for (const item of scene.decor) upright.push({ y: item.y, draw: () => drawOrMark(ctx, level.palette, item.kind, () => drawDecor(ctx, item, level), item.x, item.y) });
  upright.sort((a, b) => a.y - b.y);
  for (const u of upright) u.draw();
  if (layers.decoration) drawAshFlecks(ctx, scene, view.time);

  // The area behind the game's HUD strip.
  ctx.fillStyle = COLORS.hudBackdrop;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);

  // Overlays.
  ctx.font = '13px monospace';
  const tool = view.tool;
  if (layers.zones || tool === 'druid') drawZones(ctx, level);
  if (layers.lanes || tool === 'lanes') {
    ctx.save();
    ctx.strokeStyle = SPOT;
    ctx.fillStyle = SPOT;
    ctx.lineWidth = 1.5;
    ctx.font = '13px monospace';
    for (const lane of scene.lanes) drawLane(ctx, lane);
    ctx.restore();
  }
  if (layers.spots || tool === 'spots') drawSpots(ctx, scene);
  if (layers.laneLabels || tool === 'lanes') drawLaneLabels(ctx, scene);
  const single = view.selection.length === 1 && view.selection[0].kind === 'candidate' ? scene.candidates[view.selection[0].index] : null;
  if (single) drawCoverage(ctx, scene, single);
  if (preview) drawPreviewTags(ctx, scene, preview);
  if (layers.checks) drawCheckMarks(ctx, scene, view);
  if (tool === 'druid') drawDruidHandles(ctx, level);
  const decor = view.selection.some((r) => r.kind === 'decor') ? decorByIndex(scene) : null;
  for (const ref of view.selection) drawSelected(ctx, scene, ref, decor);
  if (view.brush) {
    const b = view.brush;
    ring(ctx, b.x, b.y, b.r, b.erase ? PROBLEM : SELECT, 2, [8, 6]);
  }
  // New lane: where a click would put its entry, and a dashed line to the Druid.
  if (view.newLaneAt) {
    const m = entryMark(view.newLaneAt);
    ctx.save();
    ctx.strokeStyle = SELECT;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
    ctx.restore();
    ring(ctx, m.x, m.y, 12, SELECT, 3);
  }
  if (view.box) {
    const b = view.box;
    ctx.fillStyle = 'rgba(255, 235, 90, 0.08)';
    ctx.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    ctx.strokeStyle = SELECT;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// Candidate spots: footprint, footprint + its jitter (dashed), index and zone (* for a manual zone),
// and a pinned role's badge (M4b §1.4): T, R, R:<type>, ≠∅ or ∅; M6c §1.1: a hide setting's badge,
// "ferns" (always hidden) or "no ferns" (never).
const PIN_BADGE = { turret: 'T', feature: 'R', notVacant: '≠∅', vacant: '∅' };
function drawSpots(ctx, scene) {
  const level = scene.level;
  for (const c of scene.candidates) {
    ring(ctx, c.x, c.y, C.LOCATION_RADIUS, SPOT, 1.5);
    ring(ctx, c.x, c.y, C.LOCATION_RADIUS + c.jitter, SPOT, 1.5, [3, 5]);
    const loc = level.candidateLocations[c.index];
    const manual = geometricZone(level, loc) !== loc.zone ? '*' : '';
    tag(ctx, `#${c.index} ${loc.zone}${manual}`, c.x - C.LOCATION_RADIUS, c.y + C.LOCATION_RADIUS + c.jitter + 14, SPOT);
    const pin = spotPin(loc);
    if (pin.role !== 'auto') {
      const text = pin.featureType ? `R:${C.FEATURE_TYPES[pin.featureType]?.name ?? pin.featureType}` : PIN_BADGE[pin.role];
      ctx.font = 'bold 14px monospace';
      tag(ctx, text, c.x + C.LOCATION_RADIUS * 0.5, c.y - C.LOCATION_RADIUS * 0.6, 'rgba(255, 225, 120, 1)');
      ctx.font = '13px monospace';
    }
    const hide = spotHide(loc);
    if (hide !== 'auto') tag(ctx, hide === 'always' ? 'ferns' : 'no ferns', c.x - C.LOCATION_RADIUS, c.y - C.LOCATION_RADIUS - 6, HIDDEN);
  }
}

// M4b §4: each lane's ID at its entrance (the name spawns rows use).
function drawLaneLabels(ctx, scene) {
  for (const lane of scene.lanes) {
    const p = laneEntrance(lane);
    ctx.font = 'bold 16px monospace';
    const w = ctx.measureText(lane.id).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(p.x - w / 2 - 5, p.y - 12, w + 10, 22);
    ctx.fillStyle = 'rgba(255, 140, 120, 1)';
    ctx.textAlign = 'center';
    ctx.fillText(lane.id, p.x, p.y + 4);
    ctx.textAlign = 'left';
  }
  ctx.font = '13px monospace';
}

// M4b §4: thin lines from a selected spot to the nearest point of each lane its base turret range
// reaches.
function drawCoverage(ctx, scene, c) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 140, 120, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  for (const id of c.lanes) {
    const q = scene.lanes.find((l) => l.id === id).path.closestPoint(c);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.restore();
}

// Red marks on whatever a check flags: candidates and lanes with errors or warnings, decoration
// overlaps (orange), and the outlines of the game's UI areas that candidates must keep clear of.
function drawCheckMarks(ctx, scene, view) {
  const marked = view.checks.items.filter((i) => i.severity === 'error' || i.severity === 'warn');
  const candidates = new Set(marked.filter((i) => i.target?.kind === 'candidate').map((i) => i.target.index));
  const lanes = new Set(marked.filter((i) => i.target?.kind === 'lane').map((i) => i.target.id));
  for (const lane of scene.lanes) if (lanes.has(lane.id)) strokeCentreline(ctx, lane, PROBLEM, 4);
  for (const c of scene.candidates) if (candidates.has(c.index)) ring(ctx, c.x, c.y, C.LOCATION_RADIUS + c.jitter + 4, PROBLEM, 4);
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

// Preview a run: each resource spot's type under it, and the empty spots as faint dashed rings.
// M6c §1.1: the spots hidden under ferns, a green dashed ring and "ferns".
function drawPreviewTags(ctx, scene, preview) {
  for (const i of preview.hidden ?? []) {
    const c = scene.candidates[i];
    ring(ctx, c.x, c.y, C.LOCATION_RADIUS + 6, HIDDEN, 2.5, [6, 4]);
    tag(ctx, 'ferns', c.x + C.LOCATION_RADIUS * 0.3, c.y - C.LOCATION_RADIUS - 6, HIDDEN);
  }
  for (const i of preview.vacant) {
    const c = scene.candidates[i];
    ring(ctx, c.x, c.y, C.LOCATION_RADIUS, 'rgba(255, 255, 255, 0.45)', 1.5, [4, 6]);
  }
  for (const f of preview.features) tag(ctx, C.FEATURE_TYPES[f.type].name, f.x - 24, f.y + C.LOCATION_RADIUS + 8, 'rgba(255, 235, 160, 0.95)');
}

// The Druid tool's handles: one per sector boundary, and the near ring drawn thick.
function drawDruidHandles(ctx, level) {
  const d = level.druidPos;
  ring(ctx, d.x, d.y, level.nearRadius, 'rgba(255, 255, 255, 0.9)', 3);
  level.sectorBoundaryAngles.forEach((angle, i) => {
    const h = sectorHandlePos(level, i);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(h.x, h.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ring(ctx, h.x, h.y, 9, 'rgba(0, 0, 0, 0.8)', 2);
    tag(ctx, `${angle}°`, h.x + 12, h.y - 10, 'rgba(255, 255, 255, 0.95)');
  });
}

function drawSelected(ctx, scene, sel, decor) {
  if (sel.kind === 'candidate') {
    const c = scene.candidates[sel.index];
    if (c) ring(ctx, c.x, c.y, C.LOCATION_RADIUS + c.jitter + 9, SELECT, 3);
  } else if (sel.kind === 'waypoint') {
    const w = scene.lanes[sel.lane]?.waypoints[sel.index];
    if (w) ring(ctx, w.x, w.y, 9, SELECT, 3);
  } else if (sel.kind === 'lane') {
    const lane = scene.lanes.find((l) => l.id === sel.id);
    if (lane) strokeCentreline(ctx, lane, SELECT, 3);
  } else if (sel.kind === 'decor') {
    const d = decor.get(sel.index);
    if (d) decorMark(ctx, d, SELECT, 3);
  } else if (sel.kind === 'zone') {
    for (const c of scene.candidates) {
      if (scene.level.candidateLocations[c.index].zone === sel.zone) ring(ctx, c.x, c.y, C.LOCATION_RADIUS + c.jitter + 9, SELECT, 3);
    }
  } else if (sel.kind === 'druid') {
    const d = scene.level.druidPos;
    ring(ctx, d.x, d.y, C.DRUID_RADIUS + 12, SELECT, 3);
  }
}
