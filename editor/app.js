// The map editor (M4a §5), loaded by boot.js once the data is applied: the level picker, the
// game-accurate view with layer toggles, the live checks, saving through tools/serve.py (§4), and
// editing: selection, undo / redo, snap to grid, and the tools (§5.2, §5.3): Lanes, Druid and
// sectors, Spots, decoration (Place, Scatter), Mire, Palette and Background; Preview a run, Play
// this level and Generate draft (§5.5–5.7).
//
// Every edit changes `ed.map` (the working copy of the map file). The scene and the cheap checks are
// rebuilt from it once per frame while anything changes; the Prep trials run once the map has been
// still for PREP_DELAY, a few at a time between frames, with a "checking…" marker.

import * as C from '../js/config.js';
import { levelFromMap, MAP_DIR } from '../js/mapFile.js';
import { sceneFromLevel } from '../js/scene.js';
import { geometricZone, zoneIds, zoneQuota, zoneCandidates } from '../js/zones.js';
import { levelNameLabelArea, bossBarArea, wavePreviewArea } from '../js/ui.js';
import { trialSetup, layoutTrial } from '../js/layout.js';
import { clipMire, encodeMire } from '../js/mire.js';
import { BACKGROUND_DIR } from '../js/mapFile.js';
import { formatMap } from './mapWriter.js';
import { cheapChecks, prepItems, GROUPS, ROUTE_TRIALS } from './checks.js';
import { drawView, LAYERS, LAYER_LABELS } from './view.js';
import { createTools, TOOLS } from './tools.js';
import { MOVABLE } from './geometry.js';
import { createPanels } from './panels.js';
import { buildCatalogue, defaultMix } from './decor.js';
import { createDraftDialog } from './draft.js';
import { previewLayout, previewSummary } from './preview.js';
import { createSidePanels } from './sidePanels.js';

const SAVE_OFF_MESSAGE = 'Saving works when the editor is run locally with tools/serve.py.';
const LAST_LEVEL_KEY = 'broceliande.editor.level';
const LAYERS_KEY = 'broceliande.editor.layers';
const SNAP_KEY = 'broceliande.editor.snap';
const BG_OPACITY_KEY = 'broceliande.editor.bgOpacity';
const DEFAULT_LAYERS = { ground: true, lanes: false, mire: true, decoration: true, spots: true, zones: false, checks: true };
const PREP_DELAY = 1000;   // ms the map is still (no drag) before the Prep trials run
const PREP_SLICE = 25;     // ms of trials per step, so the page stays responsive while they run
const UNDO_LIMIT = 200;    // undo steps kept
const TOOL_KEYS = { v: 'select', l: 'lanes', d: 'druid', s: 'spots', p: 'place', b: 'scatter', m: 'mire' };
const TOOL_HELP = {
  select: 'Click to select a spot, the Druid or a decoration object, drag to move, drag on empty ground to box-select (Shift adds). Delete removes, arrows nudge (Shift: 10 px).',
  lanes: 'Drag a waypoint to move it, click a corridor to insert one, Delete removes it (a lane keeps 2). Box-drag selects waypoints.',
  druid: 'Drag the Druid (each lane\'s end follows), a sector handle to turn its boundary, or the near ring to resize it. Zones of auto spots follow.',
  spots: 'Click empty ground to add a spot, drag to move, Delete removes. Pick a zone for a selected spot on the right.',
  place: 'Pick a type below and click the map to place it. Click an object to select it, drag to move; F flips, [ and ] scale, N changes the variant, Delete removes.',
  scatter: 'Paint decoration with the brush, or erase it. Each stroke is one undo step.',
  mire: 'Paint or erase mire with the brush. Each stroke is one undo step.',
  palette: 'Every colour of the level\'s palette; the map updates as you pick. Works as Select on the map.',
  background: 'An image drawn instead of the procedural ground. Works as Select on the map.',
};

const $ = (id) => document.getElementById(id);
const canvas = $('ed-canvas');
const ctx = canvas.getContext('2d');
canvas.width = C.STAGE_WIDTH;
canvas.height = C.STAGE_HEIGHT;

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* per-viewer convenience only */ } },
};

function readJson(key) {
  try { return JSON.parse(store.get(key) ?? 'null'); } catch { return null; }
}

// Editor state. map: the working copy of the level's map file; savedText: the file as last loaded
// or saved (the unsaved-changes dot compares against it); selection: refs (geometry.js).
const ed = {
  data: null,
  levelId: null,
  map: null,
  savedText: '',
  scene: null,
  checks: { items: [], overlaps: [] },
  prep: { items: [], state: 'idle' }, // state: 'idle' | 'stale' (waiting) | 'running'
  areas: null,
  selection: [],
  box: null,
  tool: 'select',
  snap: Number(store.get(SNAP_KEY)) || 0,
  layers: { ...DEFAULT_LAYERS, ...(readJson(LAYERS_KEY) ?? {}) },
  undo: [],
  redo: [],
  catalogue: [],                                   // decor.js buildCatalogue
  place: { entry: null, variant: 0 },              // the picked decoration type
  scatter: { mode: 'paint', radius: 80, density: 1, mix: [], keepClear: true },
  mireBrush: { mode: 'paint', radius: 40 },
  pointer: null,                                   // the pointer on the stage (brush outline)
  bgOpacity: Number(store.get(BG_OPACITY_KEY) ?? 1),
  bgImages: {},                                    // background file → Image
  mireSrc: null,                                   // the map's mire last decoded, and the result
  mireGrid: null,
  clipKey: '',                                     // lanes + corridor width the mire was last clipped to
  preview: { on: false, seed: 1, data: null },     // Preview a run: its seed and layout
  gesture: false,
  needsRebuild: false,
  canSave: false,
  backgroundFiles: [],
};

window.mapEditor = ed; // for poking at in the browser console

const clone = (v) => JSON.parse(JSON.stringify(v));
const isDirty = () => !!ed.map && formatMap(ed.map) !== ed.savedText;

function status(text, kind = '') {
  const el = $('ed-status');
  el.textContent = text;
  el.className = kind;
}

// ---------------------------------------------------------------------------
// Edits and undo (the tools' api)
// ---------------------------------------------------------------------------

// The start of a change: the map as it was goes on the undo stack (once per gesture).
function begin() {
  if (ed.gesture) return;
  ed.gesture = true;
  ed.undo.push(JSON.stringify(ed.map));
  if (ed.undo.length > UNDO_LIMIT) ed.undo.shift();
  ed.redo = [];
}

function end() {
  ed.gesture = false;
  if (ed.needsRebuild) rebuild();
  schedulePrep();
}

// dragging: a drag is under way: rebuilt once per frame, and the Prep trials wait for it to end.
// Anything else is rebuilt at once.
function changed(dragging) {
  ed.needsRebuild = true;
  if (dragging) {
    stopPrep('stale');
    return;
  }
  rebuild();
  schedulePrep();
}

function undoRedo(from, to) {
  if (!from.length || ed.gesture) return;
  to.push(JSON.stringify(ed.map));
  ed.map = JSON.parse(from.pop());
  ed.selection = [];
  changed(false);
  if (ed.tool === 'palette' || ed.tool === 'background') panels.show();
}

const api = {
  ed,
  begin,
  end,
  changed,
  status,
  select: (refs) => select(refs),
  decorAction: (fn) => tools.decorAction(fn),
  saveViewSettings: () => store.set(BG_OPACITY_KEY, String(ed.bgOpacity)),
  // A few screen pixels, in stage units (hit tolerances).
  tol: (px) => (px * C.STAGE_WIDTH) / canvas.getBoundingClientRect().width,
};
const tools = createTools(api, canvas);
const panels = createPanels(api);
const draft = createDraftDialog(api);
const side = createSidePanels(api);

// ---------------------------------------------------------------------------
// Start-up
// ---------------------------------------------------------------------------

export async function startEditor(data) {
  ed.data = data;
  ed.catalogue = buildCatalogue(data.maps);
  for (const [id, img] of Object.entries(data.backgrounds)) if (data.maps[id]?.backgroundImage) ed.bgImages[data.maps[id].backgroundImage] = img;
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
// region; a level without a map file is marked (it opens on a blank map, for Generate draft, §5.7).
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
    label.append(input, ` ${LAYER_LABELS[name] ?? name}`);
    box.append(label);
  }
}

function setTool(tool) {
  ed.tool = tool;
  const notWaypoint = (r) => r.kind !== 'waypoint';
  const kind = (k) => (r) => r.kind === k;
  const keeps = { select: notWaypoint, palette: notWaypoint, background: notWaypoint, place: kind('decor'), spots: kind('candidate'), lanes: kind('waypoint'), druid: kind('druid') }[tool];
  ed.selection = keeps ? ed.selection.filter(keeps) : [];
  for (const b of document.querySelectorAll('#ed-tools [data-tool]')) b.classList.toggle('active', b.dataset.tool === tool);
  $('ed-tool-help').textContent = TOOL_HELP[tool];
  if (ed.map) panels.show();
  showSelection();
  panels.showActions();
  if (ed.scene) showSidePanels();
}

const typing = (e) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);

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
  $('ed-preview').addEventListener('click', () => {
    ed.preview.on = !ed.preview.on;
    updatePreview();
  });
  $('ed-preview-prev').addEventListener('click', () => { ed.preview.seed = Math.max(1, ed.preview.seed - 1); updatePreview(); });
  $('ed-preview-next').addEventListener('click', () => { ed.preview.seed++; updatePreview(); });
  $('ed-play').addEventListener('click', play);
  $('ed-draft-button').addEventListener('click', () => draft.open());
  $('ed-undo').addEventListener('click', () => undoRedo(ed.undo, ed.redo));
  $('ed-redo').addEventListener('click', () => undoRedo(ed.redo, ed.undo));
  for (const b of document.querySelectorAll('#ed-tools [data-tool]')) b.addEventListener('click', () => setTool(b.dataset.tool));
  $('ed-snap').value = String(ed.snap);
  $('ed-snap').addEventListener('change', (e) => {
    ed.snap = Number(e.target.value);
    store.set(SNAP_KEY, String(ed.snap));
  });
  // Corridor width: one undo step per slider gesture.
  const width = $('ed-corridor-width');
  width.addEventListener('input', () => {
    begin();
    ed.map.corridorWidth = Number(width.value);
    $('ed-corridor-width-value').textContent = `${width.value} px`;
    changed(true);
  });
  width.addEventListener('change', () => end());

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (key === 's') {
        e.preventDefault();
        if (ed.canSave) save();
        else status(SAVE_OFF_MESSAGE, 'error');
      } else if (!typing(e) && (key === 'z' || key === 'y')) {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) undoRedo(ed.redo, ed.undo);
        else undoRedo(ed.undo, ed.redo);
      }
      return;
    }
    if (typing(e)) return;
    if (tools.onKey(e)) {
      e.preventDefault();
      return;
    }
    if (TOOL_KEYS[key] && !e.altKey) setTool(TOOL_KEYS[key]);
  });
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) e.preventDefault();
  });
  window.addEventListener('resize', fitCanvas);
  fitCanvas();
  setTool('select');
}

// ---------------------------------------------------------------------------
// Level
// ---------------------------------------------------------------------------

async function openLevel(id) {
  ed.levelId = id;
  ed.map = clone(ed.data.maps[id]);
  ed.selection = [];
  ed.undo = [];
  ed.redo = [];
  ed.areas = null;
  ed.mireSrc = null;
  ed.clipKey = '';
  ed.scatter.mix = defaultMix(ed.map);
  // The file as it is on disk: a file saved in another layout is marked (saving rewrites it). A level
  // without a file starts from a blank map (boot.js), unsaved.
  let diskText = null;
  try {
    const res = await fetch(`${MAP_DIR}/${id}.json`, { cache: 'no-store' });
    if (res.ok) diskText = await res.text();
  } catch { /* shown below */ }
  const noFile = diskText === null && ed.data.missing.includes(id);
  ed.savedText = noFile ? '' : formatMap(ed.map);
  $('ed-format-note').hidden = noFile || diskText === null || diskText.replace(/\r\n/g, '\n') === ed.savedText;
  $('ed-new-note').hidden = !noFile;
  $('ed-level').value = id;
  store.set(LAST_LEVEL_KEY, id);
  const url = new URL(location.href);
  url.searchParams.set('level', id);
  history.replaceState(null, '', url);
  document.title = `${C.LEVELS[id].name} · Map editor`;
  rebuild();
  panels.show();
  runPrep();
  status(`Opened ${MAP_DIR}/${id}.json`);
}

// The level as the game would build it from the working map (config.js applyData): the sheet's
// numbers from LEVELS, the ground from the map file.
function editedLevel() {
  const level = { ...C.LEVELS[ed.levelId], ...levelFromMap(ed.map), background: backgroundImage(ed.map.backgroundImage) };
  // The same mire grid while the map's mire is unchanged (its drawing is cached per grid).
  if (ed.mireSrc === ed.map.mire) level.mire = ed.mireGrid;
  else {
    ed.mireSrc = ed.map.mire;
    ed.mireGrid = level.mire;
  }
  return level;
}

// The Image for a background file, loaded on first use (null until it has loaded).
function backgroundImage(file) {
  if (!file) return null;
  if (!(file in ed.bgImages)) {
    ed.bgImages[file] = null;
    const img = new Image();
    img.onload = () => {
      ed.bgImages[file] = img;
      ed.needsRebuild = true;
    };
    img.onerror = () => status(`Could not load ${BACKGROUND_DIR}/${file}`, 'error');
    img.src = `${BACKGROUND_DIR}/${file}`;
  }
  return ed.bgImages[file];
}

// A new scene and the cheap checks from the map; spots with an auto zone take their zone from the
// geometry (so the file holds it too).
function rebuild() {
  ed.needsRebuild = false;
  const level = editedLevel();
  ed.map.candidates.forEach((c, i) => {
    if (c.zoneAuto) c.zone = level.candidateLocations[i].zone;
  });
  ed.scene = sceneFromLevel(ed.levelId, level);
  // Mire never lies on a corridor: after a lane or the corridor width changed, the cells now under
  // a corridor are cleared (§5.3).
  const clipKey = JSON.stringify([ed.map.lanes, ed.map.corridorWidth]);
  if (clipKey !== ed.clipKey) {
    ed.clipKey = clipKey;
    if (clipMire(ed.scene.mire, ed.scene.lanes)) {
      ed.map.mire = encodeMire(ed.scene.mire);
      ed.mireSrc = ed.map.mire;
    }
  }
  // The UI areas depend only on the level's name and waves: measured once per level.
  ed.areas ??= { label: levelNameLabelArea(ed.scene), bossBar: bossBarArea(), wavePreview: wavePreviewArea(ed.scene) };
  ed.checks = cheapChecks(ed.scene, ed.map, ed.areas);
  updateDirty();
  showChecks();
  showSelection();
  showLevelPanel();
  showSidePanels();
  panels.showActions();
  if (ed.preview.on) updatePreview();
}

// Preview a run (§5.5): the layout for the current seed, rolled again whenever the map changes.
function updatePreview() {
  $('ed-preview').classList.toggle('active', ed.preview.on);
  $('ed-preview-panel').hidden = !ed.preview.on;
  if (!ed.preview.on || !ed.scene) {
    ed.preview.data = null;
    return;
  }
  ed.preview.data = ed.scene.candidates.length ? previewLayout(ed.scene, ed.preview.seed) : null;
  $('ed-preview-seed').textContent = `Seed ${ed.preview.seed}`;
  const lines = ed.preview.data ? previewSummary(ed.preview.data, ed.scene) : ['The level has no spots yet.'];
  $('ed-preview-summary').replaceChildren(...lines.map((t) => Object.assign(document.createElement('div'), { textContent: t })));
}

// Play this level (§5.6): the game in a new tab, straight into the level's Prep, after saving if
// there are unsaved changes (the game reads the saved file).
async function play() {
  if (isDirty()) {
    if (!ed.canSave) {
      status('This level has unsaved changes, and saving needs tools/serve.py: the game will show the last saved version.', 'error');
    } else if (confirm('Save your changes first? The game plays the saved map file.')) {
      await save();
      if (isDirty()) return;
    } else if (!ed.savedText) {
      status('This level has no map file yet: save it before playing it.', 'error');
      return;
    }
  }
  window.open(`index.html?level=${encodeURIComponent(ed.levelId)}${$('ed-play-debug').checked ? '&debugResources' : ''}`, '_blank');
}

function updateDirty() {
  const dirty = isDirty();
  $('ed-dirty').classList.toggle('on', dirty);
  $('ed-dirty').title = dirty ? 'Unsaved changes' : 'No unsaved changes';
  $('ed-undo').disabled = !ed.undo.length;
  $('ed-redo').disabled = !ed.redo.length;
}

async function save() {
  if (!ed.canSave || !ed.map) return;
  if (ed.needsRebuild) rebuild();
  const text = formatMap(ed.map);
  status('Saving…');
  try {
    const res = await fetch(`api/save-map?level=${encodeURIComponent(ed.levelId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    ed.savedText = text;
    ed.data.maps[ed.levelId] = clone(ed.map);
    $('ed-format-note').hidden = true;
    if (ed.data.missing.includes(ed.levelId)) {
      // A new level's first save: it has a map file now.
      ed.data.missing = ed.data.missing.filter((id) => id !== ed.levelId);
      const option = $('ed-level').querySelector(`option[value="${ed.levelId}"]`);
      option.textContent = option.textContent.replace('  (no map file)', '');
      $('ed-new-note').hidden = true;
    }
    updateDirty();
    status(`Saved ${body.saved}`, 'ok');
  } catch (err) {
    status(`Could not save: ${err.message}`, 'error');
  }
}

// ---------------------------------------------------------------------------
// Prep trials: after PREP_DELAY of stillness, ROUTE_TRIALS layouts, a few per slice
// ---------------------------------------------------------------------------

let prepTimer = null;
let prepRun = 0; // bumped to abandon a run under way

function stopPrep(state) {
  clearTimeout(prepTimer);
  prepRun++;
  if (ed.prep.state !== state) {
    ed.prep.state = state;
    showChecks();
  }
}

function schedulePrep() {
  stopPrep('stale');
  prepTimer = setTimeout(runPrep, PREP_DELAY);
}

function runPrep() {
  stopPrep('running');
  if (ed.needsRebuild) rebuild();
  const run = prepRun;
  const scene = ed.scene;
  const covers = trialSetup(scene);
  const trials = [];
  const step = () => {
    if (run !== prepRun) return;
    const until = performance.now() + PREP_SLICE;
    while (trials.length < ROUTE_TRIALS && performance.now() < until) trials.push(layoutTrial(scene, trials.length + 1, covers));
    if (trials.length < ROUTE_TRIALS) {
      setTimeout(step, 0);
      return;
    }
    const prep = prepItems(scene, trials);
    ed.prep = { items: prep.items, suggested: prep.suggested, state: 'idle' };
    showLevelData();
    showChecks();
  };
  // Let the "checking…" marker show before the first slice.
  requestAnimationFrame(() => setTimeout(step, 0));
}

// ---------------------------------------------------------------------------
// Checks list, selection and level panels
// ---------------------------------------------------------------------------

const SEVERITY_MARK = { error: '✖', warn: '▲', info: 'i', ok: '✓' };

function showChecks() {
  const list = $('ed-checks');
  const items = [...ed.checks.items, ...ed.prep.items];
  const count = (s) => items.filter((i) => i.severity === s).length;
  $('ed-checks-summary').textContent = `${count('error')} errors, ${count('warn')} warnings`;
  $('ed-checking').hidden = ed.prep.state !== 'running';
  list.replaceChildren();
  for (const group of GROUPS) {
    const inGroup = items.filter((i) => i.group === group);
    if (!inGroup.length && group !== 'Prep') continue;
    const head = document.createElement('div');
    head.className = 'ed-check-group';
    head.textContent = group;
    if (group === 'Prep' && ed.prep.state !== 'idle') {
      const note = document.createElement('span');
      note.className = 'ed-prep-note';
      note.textContent = ed.prep.state === 'running' ? ' checking…' : ' (out of date: rechecks when you pause)';
      head.append(note);
    }
    list.append(head);
    for (const item of inGroup) {
      const row = document.createElement('div');
      const stale = item.group === 'Prep' && ed.prep.state !== 'idle';
      row.className = `ed-check ${item.severity}${item.target ? ' target' : ''}${stale ? ' stale' : ''}`;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = SEVERITY_MARK[item.severity];
      row.append(mark, item.message);
      if (item.target) row.addEventListener('click', () => select([item.target]));
      list.append(row);
    }
  }
}

function select(refs) {
  ed.selection = refs;
  showSelection();
  panels.showActions();
}

// Rebuilds a panel's contents, unless the designer is typing or dragging a slider in it.
function fill(box, children) {
  if (box.contains(document.activeElement) && document.activeElement !== box) return;
  box.replaceChildren(...children);
}

// The selection's properties, and (sidePanels.js) a single spot's, the Druid's, a waypoint's or a
// decoration object's editing controls.
function showSelection() {
  const box = $('ed-selection');
  const sel = ed.selection;
  const scene = ed.scene;
  const level = scene?.level;
  const lines = [];
  fill($('ed-selection-edit'), scene ? side.selection() : []);
  if (!scene || !sel.length) {
    lines.push('Nothing selected.');
  } else if (sel.length > 1) {
    const counts = {};
    for (const r of sel) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    lines.push(`${sel.length} selected: ${Object.entries(counts).map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`).join(', ')}`);
    if (!sel.some((r) => MOVABLE.has(r.kind))) lines.push('(highlighted only)');
  } else {
    const ref = sel[0];
    if (ref.kind === 'candidate') {
      const c = ed.map.candidates[ref.index];
      const sc = scene.candidates[ref.index];
      if (c && sc) lines.push(`Spot #${ref.index}`);
    } else if (ref.kind === 'waypoint') {
      const lane = ed.map.lanes[ref.lane];
      const w = lane?.waypoints[ref.index];
      if (w) lines.push(`Lane ${lane.name ?? lane.id}, waypoint ${ref.index} of ${lane.waypoints.length - 1}`);
    } else if (ref.kind === 'lane') {
      const lane = scene.lanes.find((l) => l.id === ref.id);
      if (lane) lines.push(`Lane ${lane.name} (${lane.id})`, `${lane.waypoints.length} waypoints, ${Math.round(lane.path.length)} px`);
    } else if (ref.kind === 'zone') {
      const q = zoneQuota(level, ref.zone);
      lines.push(`Zone ${ref.zone}`, `${zoneCandidates(level, ref.zone).length} spots`, `quota ${q.turret} turret + ${q.feature} feature${level.zoneQuotaOverrides[ref.zone] ? ' (override)' : ''}`);
    } else if (ref.kind === 'decor') {
      const d = ed.map.decor[ref.index];
      if (d) {
        lines.push(`Decoration #${ref.index}: ${d.type}`);
        lines.push(Object.entries(d).filter(([k]) => !['type', 'points', 'x', 'y'].includes(k)).map(([k, v]) => `${k} ${v}`).join(', '));
      }
    } else if (ref.kind === 'druid') {
      lines.push('Druid');
    }
  }
  box.replaceChildren(...lines.map((t) => Object.assign(document.createElement('div'), { textContent: t })));
}

// M4b §3, §5: Zone rules (with the Druid or Spots tool), Level rules and the read-only Level data.
function showSidePanels() {
  $('ed-zone-rules-section').hidden = !(ed.tool === 'druid' || ed.tool === 'spots');
  if (!$('ed-zone-rules-section').hidden) fill($('ed-zone-rules'), side.zoneRules());
  fill($('ed-level-rules'), side.levelRules());
  showLevelData();
}

function showLevelData() {
  if (ed.scene) fill($('ed-level-data'), side.levelData());
}

// The level's own settings edited here: corridor width (sectors: Druid tool).
function showLevelPanel() {
  const level = ed.scene.level;
  const width = $('ed-corridor-width');
  if (document.activeElement !== width) width.value = String(ed.map.corridorWidth);
  $('ed-corridor-width-value').textContent = `${ed.map.corridorWidth} px`;
  $('ed-sectors').textContent = `Sectors ${level.sectorNames.map((n, i) => `${n} from ${level.sectorBoundaryAngles[i]}°`).join(', ')}; near radius ${level.nearRadius} px`;
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

// The brush's circle under the pointer (Scatter, Mire).
function brushOutline() {
  if (!ed.pointer || (ed.tool !== 'scatter' && ed.tool !== 'mire')) return null;
  const b = ed.tool === 'mire' ? ed.mireBrush : ed.scatter;
  return { x: ed.pointer.x, y: ed.pointer.y, r: b.radius, erase: b.mode === 'erase' };
}

function frame(now) {
  if (ed.needsRebuild) rebuild();
  if (ed.scene) {
    drawView(ctx, ed.scene, { layers: ed.layers, time: now / 1000, checks: ed.checks, selection: ed.selection, areas: ed.areas ? [{ ...ed.areas.label, name: 'level name' }, { ...ed.areas.bossBar, name: 'boss bar' }, { ...ed.areas.wavePreview, name: 'wave preview' }] : [], tool: ed.tool, box: ed.box, bgOpacity: ed.bgOpacity, brush: brushOutline(), preview: ed.preview.data });
  }
  requestAnimationFrame(frame);
}
