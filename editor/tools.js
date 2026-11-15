// The editing tools (M4a §5.2, §5.3 first three tools) on the stage: pointer and keyboard. Every
// change goes through api.begin() (one undo step per gesture), api.changed(dragging) and api.end().
//
//   Select   click to select, drag to move, box-drag to multi-select (Shift adds), on spots, the
//            Druid and decoration
//   Lanes    drag waypoints, click a corridor to insert one, Delete removes (a lane keeps 2); after
//            New lane (lanePanels.js), a click picks the new lane's entry on the nearest screen edge
//   Druid    drag the Druid (each lane's last waypoint follows), the sector handles, the near ring
//   Spots    click empty ground to add a spot, drag to move, Delete removes
//   Place    click to place the picked decoration type; click an object to select it, drag to move
//   Scatter  paint decoration with the brush (or erase it)
//   Mire     paint or erase mire cells with the brush (never on a corridor)
//   Palette, Background: their panels; on the stage they work as Select
// Everywhere: Delete removes, arrows nudge 1 px (Shift 10), Esc deselects; with decoration
// selected, F flips, [ and ] scale by 10%, N cycles the variant.

import * as C from '../js/config.js';
import { geometricZone } from '../js/zones.js';
import { createRng } from '../js/rng.js';
import { decodeMire, encodeMire, paintMire } from '../js/mire.js';
import { newDecor, scatterAt, eraseAt, flipDecor, scaleDecor, nextVariant } from './decor.js';
import {
  sameRef, refPos, setRefPos, movedRefs, snapValue, sectorHandlePos, sectorAngleTowards,
  hitCandidate, hitDruid, hitWaypoint, hitDecor, laneInsertAt, refsInBox,
} from './geometry.js';

export const TOOLS = ['select', 'lanes', 'druid', 'spots', 'place', 'scatter', 'mire', 'palette', 'background'];
const BRUSHES = new Set(['scatter', 'mire']);
const DRAG_START = 3;    // screen px the pointer moves before a press becomes a drag
const MIN_NEAR_RADIUS = 60;

// The kinds each tool picks and box-selects.
const PICKS = {
  select: new Set(['candidate', 'druid', 'decor']),
  lanes: new Set(['waypoint']),
  druid: new Set(['druid']),
  spots: new Set(['candidate']),
  place: new Set(['decor']),
  scatter: new Set(),
  mire: new Set(),
};
PICKS.palette = PICKS.select;
PICKS.background = PICKS.select;

export function createTools(api, canvas) {
  const { ed } = api;
  let press = null; // { start, startScreen, hit, mode, ... } while the pointer is down

  const stagePoint = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * C.STAGE_WIDTH) / r.width, y: ((e.clientY - r.top) * C.STAGE_HEIGHT) / r.height };
  };

  // What the active tool would pick at p.
  function hitAt(p) {
    const tol = api.tol(6);
    const map = ed.map;
    if (ed.tool === 'druid') {
      for (let i = 0; i < map.sectors.angles.length; i++) {
        const h = sectorHandlePos(ed.scene.level, i);
        if (Math.hypot(h.x - p.x, h.y - p.y) <= 10 + tol) return { kind: 'sector', index: i };
      }
      if (hitDruid(map, p, tol)) return { kind: 'druid' };
      const d = Math.hypot(p.x - map.druid.x, p.y - map.druid.y);
      if (Math.abs(d - map.sectors.nearRadius) <= 4 + tol) return { kind: 'nearRing' };
      return null;
    }
    if (ed.tool === 'lanes') return hitWaypoint(map, p, tol);
    if (ed.tool === 'spots') return hitCandidate(map, p);
    if (ed.tool === 'place') return hitDecor(map, p, tol, { upright: ed.layers.decoration, flats: ed.layers.ground });
    if (BRUSHES.has(ed.tool)) return null;
    return hitCandidate(map, p) ?? hitDruid(map, p, tol)
      ?? (ed.layers.decoration || ed.layers.ground ? hitDecor(map, p, tol, { upright: ed.layers.decoration, flats: ed.layers.ground }) : null);
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !ed.map) return;
    canvas.setPointerCapture(e.pointerId);
    const p = stagePoint(e);
    press = { start: p, startScreen: { x: e.clientX, y: e.clientY }, hit: hitAt(p), shift: e.shiftKey, mode: null };
    if (BRUSHES.has(ed.tool)) startBrush(p);
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = stagePoint(e);
    ed.pointer = p;
    if (press?.mode === 'brush') {
      brushTo(p);
      return;
    }
    if (!press) {
      updateCursor(p);
      return;
    }
    if (!press.mode) {
      if (Math.hypot(e.clientX - press.startScreen.x, e.clientY - press.startScreen.y) < DRAG_START) return;
      startDrag();
    }
    dragTo(p);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!press) return;
    const p = stagePoint(e);
    if (press.mode === 'brush') {
      api.end();
    } else if (press.mode === 'box') {
      const found = refsInBox(ed.map, ed.box, PICKS[ed.tool]);
      api.select(press.shift ? [...ed.selection.filter((r) => !found.some((f) => sameRef(f, r))), ...found] : found);
      ed.box = null;
    } else if (press.mode) {
      api.end();
    } else {
      click(p);
    }
    press = null;
  });

  canvas.addEventListener('pointerleave', () => {
    ed.pointer = null;
  });

  canvas.addEventListener('pointercancel', () => {
    if (press?.mode && press.mode !== 'box') api.end();
    ed.box = null;
    press = null;
  });

  // A press that didn't move.
  function click(p) {
    if (ed.tool === 'lanes' && ed.newLane) return api.addLaneAt(p);
    const hit = press.hit;
    if (hit && (hit.kind === 'sector' || hit.kind === 'nearRing')) return;
    if (hit) {
      if (press.shift) {
        const had = ed.selection.some((r) => sameRef(r, hit));
        api.select(had ? ed.selection.filter((r) => !sameRef(r, hit)) : [...ed.selection, hit]);
      } else {
        api.select([hit]);
      }
      return;
    }
    if (ed.tool === 'spots') return addSpot(p);
    if (ed.tool === 'place') return placeDecor(p);
    if (ed.tool === 'lanes') {
      const at = laneInsertAt(ed.map, ed.scene, p);
      if (at) return insertWaypoint(at, p);
    }
    if (!press.shift) api.select([]);
  }

  function startDrag() {
    const hit = press.hit;
    if (!hit) {
      press.mode = 'box';
      return;
    }
    api.begin();
    if (hit.kind === 'sector' || hit.kind === 'nearRing') {
      press.mode = hit.kind;
      return;
    }
    // Dragging an unselected object selects it alone; a selected one moves the whole selection.
    if (!ed.selection.some((r) => sameRef(r, hit))) api.select([hit]);
    press.mode = 'move';
    press.anchor = { ...refPos(ed.map, hit) };
    press.origins = movedRefs(ed.map, ed.selection).map((ref) => ({ ref, ...refPos(ed.map, ref) }));
  }

  function dragTo(p) {
    const map = ed.map;
    if (press.mode === 'box') {
      ed.box = { left: Math.min(press.start.x, p.x), top: Math.min(press.start.y, p.y), right: Math.max(press.start.x, p.x), bottom: Math.max(press.start.y, p.y) };
      return;
    }
    if (press.mode === 'sector') {
      map.sectors.angles[press.hit.index] = sectorAngleTowards(map.sectors.angles, press.hit.index, map.druid, p);
    } else if (press.mode === 'nearRing') {
      map.sectors.nearRadius = Math.max(MIN_NEAR_RADIUS, Math.round(snapValue(Math.hypot(p.x - map.druid.x, p.y - map.druid.y), ed.snap)));
    } else if (press.mode === 'move') {
      // The grabbed object snaps to the grid; everything else keeps its offset from it.
      const dx = snapValue(press.anchor.x + p.x - press.start.x, ed.snap) - press.anchor.x;
      const dy = snapValue(press.anchor.y + p.y - press.start.y, ed.snap) - press.anchor.y;
      for (const o of press.origins) setRefPos(map, o.ref, o.x + dx, o.y + dy);
    }
    api.changed(true);
  }

  function addSpot(p) {
    const x = Math.round(snapValue(p.x, ed.snap));
    const y = Math.round(snapValue(p.y, ed.snap));
    api.begin();
    ed.map.candidates.push({ x, y, zone: geometricZone(ed.scene.level, { x, y }), zoneAuto: true });
    api.changed(false);
    api.end();
    api.select([{ kind: 'candidate', index: ed.map.candidates.length - 1 }]);
  }

  function insertWaypoint(at, p) {
    api.begin();
    ed.map.lanes[at.lane].waypoints.splice(at.index, 0, [Math.round(snapValue(p.x, ed.snap)), Math.round(snapValue(p.y, ed.snap))]);
    api.changed(false);
    api.end();
    api.select([{ kind: 'waypoint', lane: at.lane, index: at.index }]);
  }

  // Brushes (Scatter, Mire): one undo step per stroke; a dab where the stroke starts, then one each
  // time the pointer has moved a third of the radius.
  function startBrush(p) {
    api.begin();
    press.mode = 'brush';
    press.rng = createRng((Date.now() >>> 0) || 1);
    if (ed.tool === 'mire') press.grid = decodeMire(ed.map.mire);
    dab(p);
  }

  function brushTo(p) {
    const b = brushSettings();
    if (Math.hypot(p.x - press.last.x, p.y - press.last.y) < Math.max(4, b.radius / 3)) return;
    dab(p);
  }

  const brushSettings = () => (ed.tool === 'mire' ? ed.mireBrush : ed.scatter);

  function dab(p) {
    press.last = p;
    const b = brushSettings();
    let changed = 0;
    if (ed.tool === 'mire') {
      changed = paintMire(press.grid, ed.scene.lanes, p.x, p.y, b.radius, b.mode === 'paint' ? 1 : 0);
      if (changed) ed.map.mire = encodeMire(press.grid);
    } else if (b.mode === 'erase') {
      changed = eraseAt(ed.map, p, b.radius);
    } else {
      changed = scatterAt(ed.map, ed.scene, p, b, press.rng);
    }
    if (changed) {
      ed.selection = ed.selection.filter((r) => r.kind !== 'decor');
      api.changed(true);
    }
  }

  function placeDecor(p) {
    const entry = ed.place.entry;
    if (!entry) {
      api.status('Pick a decoration type on the right first.', 'error');
      return;
    }
    api.begin();
    ed.map.decor.push(newDecor(entry, ed.place.variant, snapValue(p.x, ed.snap), snapValue(p.y, ed.snap)));
    api.changed(false);
    api.end();
    api.select([{ kind: 'decor', index: ed.map.decor.length - 1 }]);
  }

  // F, [, ], N on the selected decoration.
  function decorAction(action) {
    const list = ed.selection.filter((r) => r.kind === 'decor').map((r) => ed.map.decor[r.index]).filter(Boolean);
    if (!list.length) return false;
    api.begin();
    for (const d of list) action(d);
    api.changed(false);
    api.end();
    return true;
  }

  function updateCursor(p) {
    if (!ed.map) return;
    const hit = hitAt(p);
    let cursor = 'default';
    if (BRUSHES.has(ed.tool)) cursor = 'crosshair';
    else if (ed.tool === 'lanes' && ed.newLane) cursor = 'crosshair';
    else if (hit) cursor = hit.kind === 'sector' || hit.kind === 'nearRing' ? 'grab' : 'move';
    else if (ed.tool === 'spots' || ed.tool === 'place' || (ed.tool === 'lanes' && laneInsertAt(ed.map, ed.scene, p))) cursor = 'copy';
    canvas.style.cursor = cursor;
  }

  // ---------------------------------------------------------------------------
  // Keyboard: Delete, arrows, Esc (shortcuts for tools, undo and save are in app.js)
  // ---------------------------------------------------------------------------

  function deleteSelection() {
    const sel = ed.selection;
    const map = ed.map;
    const candidates = sel.filter((r) => r.kind === 'candidate').map((r) => r.index);
    const decor = sel.filter((r) => r.kind === 'decor').map((r) => r.index);
    const waypoints = sel.filter((r) => r.kind === 'waypoint');
    if (!candidates.length && !decor.length && !waypoints.length) return;
    // A lane keeps at least 2 waypoints.
    const kept = [];
    map.lanes.forEach((lane, l) => {
      const mine = waypoints.filter((r) => r.lane === l).map((r) => r.index);
      if (mine.length && lane.waypoints.length - mine.length < 2) kept.push(lane.name ?? lane.id);
    });
    if (kept.length) {
      api.status(`A lane keeps at least 2 waypoints (${kept.join(', ')}): nothing deleted.`, 'error');
      return;
    }
    api.begin();
    const desc = (a, b) => b - a;
    for (const i of candidates.sort(desc)) map.candidates.splice(i, 1);
    for (const i of decor.sort(desc)) map.decor.splice(i, 1);
    map.lanes.forEach((lane, l) => {
      for (const i of waypoints.filter((r) => r.lane === l).map((r) => r.index).sort(desc)) lane.waypoints.splice(i, 1);
    });
    api.changed(false);
    api.end();
    api.select([]);
  }

  function nudge(dx, dy) {
    const refs = movedRefs(ed.map, ed.selection);
    if (!refs.length) return;
    api.begin();
    for (const ref of refs) {
      const p = refPos(ed.map, ref);
      setRefPos(ed.map, ref, p.x + dx, p.y + dy);
    }
    api.changed(false);
    api.end();
  }

  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  // Returns true when it used the key.
  function onKey(e) {
    if (!ed.map || press) return false;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelection();
      return true;
    }
    if (ARROWS[e.key]) {
      const step = e.shiftKey ? 10 : 1;
      nudge(ARROWS[e.key][0] * step, ARROWS[e.key][1] * step);
      return true;
    }
    if (e.key === 'Escape') {
      if (ed.newLane) {
        ed.newLane = false;
        api.refresh();
      }
      api.select([]);
      return true;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    const action = { f: flipDecor, '[': (d) => scaleDecor(d, false), ']': (d) => scaleDecor(d, true), n: nextVariant }[e.key.toLowerCase()];
    return action ? decorAction(action) : false;
  }

  return { onKey, decorAction, isDragging: () => !!press?.mode && press.mode !== 'box' };
}
