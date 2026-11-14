// The map editor (M4a §5), loaded by boot.js once the data is applied. Phase 2: the level picker,
// the game-accurate view with layer toggles, the live checks and saving through tools/serve.py
// (§4). The editing tools, undo / redo, snap, Preview a run, Play this level and Generate draft
// come in later phases; their controls are in place, disabled.

import * as C from '../js/config.js';
import { levelFromMap, MAP_DIR } from '../js/mapFile.js';
import { sceneFromLevel } from '../js/scene.js';
import { geometricZone, zoneQuota, zoneCandidates } from '../js/zones.js';
import { levelNameLabelArea, bossBarArea, wavePreviewArea } from '../js/ui.js';
import { formatMap } from './mapWriter.js';
import { runChecks, GROUPS } from './checks.js';
import { drawView, decorByIndex, LAYERS } from './view.js';

const SAVE_OFF_MESSAGE = 'Saving works when the editor is run locally with tools/serve.py.';
const LAST_LEVEL_KEY = 'broceliande.editor.level';
const LAYERS_KEY = 'broceliande.editor.layers';
const DEFAULT_LAYERS = { ground: true, lanes: false, mire: true, decoration: true, spots: true, zones: false, checks: true };
const CHECKS_DELAY = 150; // ms after the last change before the checks run again

const $ = (id) => document.getElementById(id);
const canvas = $('ed-canvas');
const ctx = canvas.getContext('2d');
canvas.width = C.STAGE_WIDTH;
canvas.height = C.STAGE_HEIGHT;

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* per-viewer convenience only */ } },
};

// Editor state. map: the working copy of the level's map file; savedText: the file as last loaded
// or saved (the unsaved-changes dot compares against it).
const ed = {
  data: null,
  levelId: null,
  map: null,
  savedText: '',
  scene: null,
  checks: { items: [], overlaps: [] },
  areas: [],
  selection: null,
  layers: { ...DEFAULT_LAYERS, ...readLayers() },
  canSave: false,
  backgroundFiles: [],
};

function readLayers() {
  try { return JSON.parse(store.get(LAYERS_KEY) ?? '{}'); } catch { return {}; }
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const isDirty = () => !!ed.map && formatMap(ed.map) !== ed.savedText;

function status(text, kind = '') {
  const el = $('ed-status');
  el.textContent = text;
  el.className = kind;
}

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------

export async function startEditor(data) {
  ed.data = data;
  copyGameStage(await (await fetch('index.html', { cache: 'no-store' })).text());
  await detectServer();
  buildPicker();
  buildLayers();
  wireControls();
  if (data.dataProblems.length) {
    const box = $('ed-data-problems');
    box.hidden = false;
    box.textContent = `Data problems (from the sheet or data/*.csv): ${data.dataProblems.map((p) => [p.tab, p.row && `row ${p.row}`, p.column, p.message].filter(Boolean).join(' · ')).join(' | ')}`;
  }
  const wanted = new URLSearchParams(location.search).get('level') ?? store.get(LAST_LEVEL_KEY);
  const first = [wanted, ...Object.keys(C.LEVELS)].find((id) => id && C.LEVELS[id]);
  if (first) await openLevel(first);
  requestAnimationFrame(frame);
}

// The game's stage markup (index.html), hidden off-screen: the level name label, the boss HP bar
// and the wave preview are measured on it with the game's own styles, as the game's start-up
// checks measure them (ui.js).
function copyGameStage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const stage = document.adoptNode(doc.getElementById('stage'));
  stage.querySelector('canvas')?.remove();
  stage.style.width = `${C.STAGE_WIDTH}px`;
  stage.style.height = `${C.STAGE_HEIGHT}px`;
  $('ed-measure').append(stage);
}

// Saving needs tools/serve.py (§4): its background listing answers only there.
async function detectServer() {
  try {
    const res = await fetch('api/backgrounds', { cache: 'no-store' });
    const body = res.ok && res.headers.get('Content-Type')?.includes('application/json') ? await res.json() : null;
    ed.canSave = Array.isArray(body?.backgrounds);
    ed.backgroundFiles = body?.backgrounds ?? [];
  } catch {
    ed.canSave = false;
  }
  $('ed-save').disabled = !ed.canSave;
  $('ed-save').title = ed.canSave ? 'Save the map file (Ctrl+S)' : SAVE_OFF_MESSAGE;
  if (!ed.canSave) {
    $('ed-readonly').hidden = false;
    $('ed-readonly').textContent = SAVE_OFF_MESSAGE;
  }
}

// Level picker: every level of the levels tab, grouped by region in region order, by row within a
// region; a level without a map file is marked (and can't be opened until Generate draft, §5.7).
function buildPicker() {
  const picker = $('ed-level');
  const rows = ed.data.levelRows;
  const regionIds = [...C.REGION_ORDER, ...new Set(rows.map((r) => r.region).filter((r) => !C.REGION_ORDER.includes(r)))];
  for (const regionId of regionIds) {
    const group = document.createElement('optgroup');
    group.label = C.REGIONS[regionId]?.name ?? regionId;
    const inRegion = rows.filter((r) => r.region === regionId).sort((a, b) => a.row - b.row);
    for (const r of inRegion) {
      const option = document.createElement('option');
      option.value = r.id;
      const noFile = ed.data.missing.includes(r.id);
      option.textContent = `${r.row}. ${r.name}${noFile ? '  (no map file)' : ''}`;
      option.disabled = noFile;
      group.append(option);
    }
    if (inRegion.length) picker.append(group);
  }
}

function buildLayers() {
  const box = $('ed-layers');
  for (const name of LAYERS) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!ed.layers[name];
    input.addEventListener('change', () => {
      ed.layers[name] = input.checked;
      store.set(LAYERS_KEY, JSON.stringify(ed.layers));
    });
    label.append(input, ` ${name}`);
    box.append(label);
  }
}

function wireControls() {
  $('ed-level').addEventListener('change', async (e) => {
    const id = e.target.value;
    if (id === ed.levelId) return;
    if (isDirty() && !confirm(`${C.LEVELS[ed.levelId].name} has unsaved changes. Open ${C.LEVELS[id].name} anyway and lose them?`)) {
      e.target.value = ed.levelId;
      return;
    }
    await openLevel(id);
  });
  $('ed-save').addEventListener('click', save);
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (ed.canSave) save();
      else status(SAVE_OFF_MESSAGE, 'error');
    } else if (e.key === 'Escape') {
      select(null);
    }
  });
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
  });
  canvas.addEventListener('click', (e) => select(pickAt(stagePoint(e))));
  window.addEventListener('resize', fitCanvas);
  fitCanvas();
}

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

async function openLevel(id) {
  ed.levelId = id;
  ed.map = clone(ed.data.maps[id]);
  ed.selection = null;
  // The file as it is on disk: a file saved in another layout is marked (saving rewrites it).
  let diskText = null;
  try {
    diskText = await (await fetch(`${MAP_DIR}/${id}.json`, { cache: 'no-store' })).text();
  } catch { /* shown below */ }
  ed.savedText = formatMap(ed.map);
  $('ed-format-note').hidden = diskText === null || diskText.replace(/\r\n/g, '\n') === ed.savedText;
  $('ed-level').value = id;
  store.set(LAST_LEVEL_KEY, id);
  const url = new URL(location.href);
  url.searchParams.set('level', id);
  history.replaceState(null, '', url);
  document.title = `${C.LEVELS[id].name} · Map editor`;
  rebuild();
  status(`Opened ${MAP_DIR}/${id}.json`);
}

// The level as the game would build it from the working map (config.js applyData): the sheet's
// numbers from LEVELS, the ground from the map file.
function editedLevel() {
  return { ...C.LEVELS[ed.levelId], ...levelFromMap(ed.map), background: ed.data.backgrounds[ed.levelId] ?? null };
}

let checksTimer = null;

// After any change to the map (later phases call it from every edit): a new scene, the checks a
// moment later, the unsaved-changes dot.
function rebuild() {
  ed.scene = sceneFromLevel(ed.levelId, editedLevel());
  clearTimeout(checksTimer);
  checksTimer = setTimeout(refreshChecks, ed.checks.items.length ? CHECKS_DELAY : 0);
  updateDirty();
  showSelection();
}

function refreshChecks() {
  const scene = ed.scene;
  const start = performance.now();
  ed.checks = runChecks(scene, ed.map);
  ed.checksTime = performance.now() - start;
  ed.areas = [
    { ...levelNameLabelArea(scene), name: 'level name' },
    { ...bossBarArea(), name: 'boss bar' },
    { ...wavePreviewArea(scene), name: 'wave preview' },
  ];
  showChecks();
}

function updateDirty() {
  const dirty = isDirty();
  $('ed-dirty').classList.toggle('on', dirty);
  $('ed-dirty').title = dirty ? 'Unsaved changes' : 'No unsaved changes';
}

async function save() {
  if (!ed.canSave || !ed.map) return;
  const text = formatMap(ed.map);
  status('Saving…');
  try {
    const res = await fetch(`api/save-map?level=${encodeURIComponent(ed.levelId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    ed.savedText = text;
    ed.data.maps[ed.levelId] = clone(ed.map);
    $('ed-format-note').hidden = true;
    updateDirty();
    status(`Saved ${body.saved}`, 'ok');
  } catch (err) {
    status(`Could not save: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Checks list and selection
// ---------------------------------------------------------------------------

const SEVERITY_MARK = { error: '✖', warn: '▲', info: 'i', ok: '✓' };

function showChecks() {
  const list = $('ed-checks');
  const items = ed.checks.items;
  const count = (s) => items.filter((i) => i.severity === s).length;
  $('ed-checks-summary').textContent = `${count('error')} errors, ${count('warn')} warnings (${Math.round(ed.checksTime)} ms)`;
  list.replaceChildren();
  for (const group of GROUPS) {
    const inGroup = items.filter((i) => i.group === group);
    if (!inGroup.length) continue;
    const head = document.createElement('div');
    head.className = 'ed-check-group';
    head.textContent = group;
    list.append(head);
    for (const item of inGroup) {
      const row = document.createElement('div');
      row.className = `ed-check ${item.severity}${item.target ? ' target' : ''}`;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = SEVERITY_MARK[item.severity];
      row.append(mark, item.message);
      if (item.target) row.addEventListener('click', () => select(item.target));
      list.append(row);
    }
  }
}

function select(target) {
  ed.selection = target;
  showSelection();
}

// The selection's properties (read-only in this phase).
function showSelection() {
  const box = $('ed-selection');
  const sel = ed.selection;
  const scene = ed.scene;
  const level = scene?.level;
  const lines = [];
  if (!sel || !scene) {
    lines.push('Nothing selected. Click a spot, the Druid or a decoration object, or an entry in the checks.');
  } else if (sel.kind === 'candidate') {
    const c = ed.map.candidates[sel.index];
    if (c) {
      const sc = scene.candidates[sel.index];
      lines.push(`Candidate #${sel.index}`, `x ${c.x}, y ${c.y}`, `zone ${level.candidateLocations[sel.index].zone} (${c.zoneAuto ? 'auto' : `manual; by geometry ${geometricZone(level, c)}`})`);
      lines.push(`covers ${sc.lanes.map((id) => scene.lanes.find((l) => l.id === id).name).join(', ') || 'no lane'}`);
    }
  } else if (sel.kind === 'lane') {
    const lane = scene.lanes.find((l) => l.id === sel.id);
    if (lane) lines.push(`Lane ${lane.name} (${lane.id})`, `${lane.waypoints.length} waypoints, ${Math.round(lane.path.length)} px`, `corridor width ${lane.corridorWidth} px`);
  } else if (sel.kind === 'zone') {
    const q = zoneQuota(level, sel.zone);
    lines.push(`Zone ${sel.zone}`, `${zoneCandidates(level, sel.zone).length} candidates`, `quota ${q.turret} turret + ${q.feature} feature${level.zoneQuotaOverrides[sel.zone] ? ' (override)' : ''}`);
  } else if (sel.kind === 'decor') {
    const d = ed.map.decor[sel.index];
    if (d) {
      lines.push(`Decoration #${sel.index}: ${d.type}`);
      lines.push(Object.entries(d).filter(([k]) => k !== 'type' && k !== 'points').map(([k, v]) => `${k} ${v}`).join(', '));
    }
  } else if (sel.kind === 'druid') {
    lines.push('Druid', `x ${level.druidPos.x}, y ${level.druidPos.y}`, `sectors ${level.sectorNames.map((n, i) => `${n} from ${level.sectorBoundaryAngles[i]}°`).join(', ')}`, `near radius ${level.nearRadius} px`);
  }
  box.replaceChildren(...lines.map((t) => Object.assign(document.createElement('div'), { textContent: t })));
}

// What a click at p picks (inspect only in this phase): a candidate, the Druid, or the nearest
// upright decoration object whose base is close.
function pickAt(p) {
  const scene = ed.scene;
  if (!scene) return null;
  if (ed.layers.spots) {
    const c = scene.candidates.find((x) => Math.hypot(x.x - p.x, x.y - p.y) <= C.LOCATION_RADIUS);
    if (c) return { kind: 'candidate', index: c.index };
  }
  const d = scene.level.druidPos;
  if (Math.hypot(d.x - p.x, d.y - 15 - p.y) <= C.DRUID_RADIUS + 10) return { kind: 'druid' };
  if (ed.layers.decoration) {
    let best = null;
    for (const item of decorByIndex(scene).values()) {
      if (item.rx !== undefined || item.points) continue;
      const dist = Math.hypot(item.x - p.x, item.y - p.y);
      if (dist <= 24 && (!best || dist < best.dist)) best = { dist, index: item.mapIndex };
    }
    if (best) return { kind: 'decor', index: best.index };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

// The 1920×1080 stage scaled to fit the centre area.
function fitCanvas() {
  const box = $('ed-centre').getBoundingClientRect();
  const s = Math.min(box.width / C.STAGE_WIDTH, box.height / C.STAGE_HEIGHT);
  canvas.style.width = `${C.STAGE_WIDTH * s}px`;
  canvas.style.height = `${C.STAGE_HEIGHT * s}px`;
}

function stagePoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * C.STAGE_WIDTH) / r.width, y: ((e.clientY - r.top) * C.STAGE_HEIGHT) / r.height };
}

function frame(now) {
  if (ed.scene) drawView(ctx, ed.scene, { layers: ed.layers, time: now / 1000, checks: ed.checks, selection: ed.selection, areas: ed.areas });
  requestAnimationFrame(frame);
}
