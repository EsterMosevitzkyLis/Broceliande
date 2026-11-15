// Lane and sector controls (1 to 4 lanes; sectors kept apart from the lanes): the Lanes tool's
// panel (each lane's id and name, the waves spawning on it, New lane and Delete lane) and the Druid
// tool's sector count. New lane: the next click on the map picks an entry point on the nearest
// screen edge, and the lane winds from there to the Druid (js/mapDraft.js draftLanes). Every change
// is one undo step.

import * as C from '../js/config.js';
import { MIN_LANES, MAX_LANES, MIN_SECTORS, MAX_SECTORS, angleTo, splitSector, mergeSector } from '../js/mapFile.js';
import { draftLanes } from '../js/mapDraft.js';
import { createRng, makeRandomSeed } from '../js/rng.js';
import { levelWaves } from '../js/levelSettings.js';
import { zoneIds } from '../js/zones.js';

const ENTRY_OUTSIDE = 40; // px a new lane's entry point sits beyond the screen edge, as the existing lanes'
const ID_RE = /^[A-Za-z0-9]+$/;
const DIRECTIONS = [['east', 'East'], ['southEast', 'South-east'], ['south', 'South'], ['southWest', 'South-west'],
  ['west', 'West'], ['northWest', 'North-west'], ['north', 'North'], ['northEast', 'North-east']];

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

// The entry point for a click at p: on the nearest screen edge (the top edge is the stage's, above
// the HUD strip), ENTRY_OUTSIDE px beyond it.
export function entryAt(p) {
  const W = C.STAGE_WIDTH;
  const H = C.STAGE_HEIGHT;
  const x = Math.round(Math.min(W, Math.max(0, p.x)));
  const y = Math.round(Math.min(H, Math.max(0, p.y)));
  const edges = [
    [x, { x: -ENTRY_OUTSIDE, y }],
    [W - x, { x: W + ENTRY_OUTSIDE, y }],
    [y, { x, y: -ENTRY_OUTSIDE }],
    [H - y, { x, y: H + ENTRY_OUTSIDE }],
  ];
  return edges.sort((a, b) => a[0] - b[0])[0][1];
}

// Where on the screen edge an entry point shows (the point itself is just off screen).
export const entryMark = (e) => ({ x: Math.min(C.STAGE_WIDTH - 6, Math.max(6, e.x)), y: Math.min(C.STAGE_HEIGHT - 6, Math.max(6, e.y)) });

// Every spawn row of the level's waves on this lane: [{ wave (1-based), type, count }].
export function spawnsOn(level, laneId) {
  return levelWaves(level).flatMap((w, i) => w.spawns.filter((s) => s.lane === laneId).map((s) => ({ wave: i + 1, type: s.type, count: s.count })));
}

function spawnText(rows) {
  if (!rows.length) return 'no spawns';
  const n = rows.reduce((a, r) => a + r.count, 0);
  const waves = [...new Set(rows.map((r) => r.wave))];
  return `${n} enemies in wave${waves.length > 1 ? 's' : ''} ${waves.join(', ')}`;
}

export function createLanePanels(api) {
  const { ed } = api;
  const edit = (fn) => {
    api.begin();
    fn();
    api.changed(false);
    api.end();
  };

  // A new lane from the entry point nearest p, winding to the Druid; named after its direction.
  function addLaneAt(p) {
    const map = ed.map;
    ed.newLane = false;
    if (map.lanes.length >= MAX_LANES) return;
    const entry = entryAt(p);
    const [id0, name0] = DIRECTIONS[Math.round(angleTo(map.druid, entry) / 45) % 8];
    let id = id0;
    let name = name0;
    for (let k = 2; map.lanes.some((l) => l.id === id); k++) {
      id = `${id0}${k}`;
      name = `${name0} ${k}`;
    }
    edit(() => {
      map.lanes.push(...draftLanes(map.druid, [{ id, name, entry }], createRng(makeRandomSeed() || 1)));
    });
    api.select([{ kind: 'waypoint', lane: map.lanes.length - 1, index: 0 }]);
    api.status(`Added lane "${id}" from (${entry.x}, ${entry.y}). Spawns rows name it "${id}"; add it to the sheet's lanes tab too.`, 'ok');
  }

  function deleteLane(index) {
    const lane = ed.map.lanes[index];
    const rows = spawnsOn(ed.scene.level, lane.id);
    const warn = rows.length
      ? `\n\nThe level's waves spawn on it: ${spawnText(rows)}. Those spawns rows become errors until they are moved to another lane (or "random") in the sheet's spawns tab.`
      : '';
    if (!confirm(`Delete lane "${lane.id}" (${lane.name ?? lane.id})?${warn}\n\nUndo (Ctrl+Z) brings it back.`)) return;
    edit(() => ed.map.lanes.splice(index, 1));
    api.select([]);
    api.status(`Deleted lane "${lane.id}".${rows.length ? ' Its spawns rows are now errors (see Checks).' : ''}`, rows.length ? 'error' : 'ok');
  }

  function rename(index, key, input) {
    const lane = ed.map.lanes[index];
    const value = input.value.trim();
    if (key === 'id' && (!ID_RE.test(value) || ed.map.lanes.some((l, i) => i !== index && l.id === value))) {
      input.value = lane.id;
      api.status('A lane id is letters and digits only, and different from the other lanes\'.', 'error');
      return;
    }
    if (!value || value === (lane[key] ?? lane.id)) return;
    edit(() => { lane[key] = value; });
    if (key === 'id') api.status(`Lane renamed to "${value}": spawns rows naming the old id are now errors, and the sheet's lanes tab needs it too.`, 'error');
  }

  // ---- Lanes tool ----------------------------------------------------------------------------
  function lanes() {
    const map = ed.map;
    const level = ed.scene.level;
    const rows = map.lanes.map((lane, i) => {
      const id = el('input', { type: 'text', value: lane.id, title: 'Lane id: the name spawns rows use' });
      id.style.width = '96px';
      id.addEventListener('change', () => rename(i, 'id', id));
      const name = el('input', { type: 'text', value: lane.name ?? lane.id, title: 'Name (debug panel and checks)' });
      name.style.width = '96px';
      name.addEventListener('change', () => rename(i, 'name', name));
      const del = el('button', { type: 'button', textContent: 'Delete', title: 'Delete this lane' });
      del.disabled = map.lanes.length <= MIN_LANES;
      del.addEventListener('click', () => deleteLane(i));
      return el('tr', {},
        el('td', {}, id), el('td', {}, name),
        el('td', { textContent: spawnText(spawnsOn(level, lane.id)) }),
        el('td', {}, del));
    });
    const add = el('button', { type: 'button', textContent: ed.newLane ? 'Cancel new lane' : 'New lane' });
    add.disabled = !ed.newLane && map.lanes.length >= MAX_LANES;
    add.classList.toggle('active', !!ed.newLane);
    add.addEventListener('click', () => {
      ed.newLane = !ed.newLane;
      api.refresh();
    });
    return [
      el('table', { className: 'ed-table' }, el('tr', {}, ...['id', 'name', 'waves', ''].map((h) => el('th', { textContent: h }))), ...rows),
      el('div', { className: 'ed-choice' }, add, el('span', { className: 'ed-note', textContent: ` ${map.lanes.length} of ${MIN_LANES}–${MAX_LANES} lanes` })),
      el('div', { className: 'ed-note', textContent: ed.newLane
        ? 'Click the map near a screen edge: the lane enters there and winds to the Druid. Esc cancels.'
        : 'Lanes and sectors are separate: adding or deleting a lane leaves the sectors (and zones) as they are.' }),
    ];
  }

  // ---- Druid tool: sector count ----------------------------------------------------------------
  // Changing the count splits the widest sector or merges the narrowest; spots with a manual zone in
  // a sector that is gone go back to auto, and that sector's zone quota overrides are dropped.
  function setSectorCount(n) {
    const map = ed.map;
    edit(() => {
      while (map.sectors.angles.length < n) splitSector(map.sectors);
      while (map.sectors.angles.length > n) mergeSector(map.sectors);
      const zones = new Set(map.sectors.names.flatMap((s) => [`n${s}`, `f${s}`]));
      for (const c of map.candidates) if (!c.zoneAuto && !zones.has(c.zone)) c.zoneAuto = true;
      for (const z of Object.keys(map.zoneQuotaOverrides ?? {})) if (!zones.has(z)) delete map.zoneQuotaOverrides[z];
    });
  }

  function sectors() {
    const n = ed.map.sectors.angles.length;
    const less = el('button', { type: 'button', textContent: '−', title: 'One sector fewer (the narrowest joins its neighbour)' });
    less.disabled = n <= MIN_SECTORS;
    less.addEventListener('click', () => setSectorCount(n - 1));
    const more = el('button', { type: 'button', textContent: '+', title: 'One more sector (the widest is split in half)' });
    more.disabled = n >= MAX_SECTORS;
    more.addEventListener('click', () => setSectorCount(n + 1));
    return [
      el('div', { className: 'ed-choice' }, 'Sectors', less, el('span', { textContent: ` ${n} ` }), more,
        el('span', { className: 'ed-note', textContent: ` ${zoneIds(ed.scene.level).length} zones` })),
      el('div', { className: 'ed-note', textContent: 'Zones come from the sectors, not the lanes. Drag a handle to turn a boundary. Changing the count changes the zones: check the Zone rules and the feature mix.' }),
    ];
  }

  return { lanes, sectors, addLaneAt };
}
