// The right panel's tool options (M4a §5.3): the decoration picker, the scatter and mire brushes,
// the palette editor and the background picker, and the buttons for selected decoration. Each
// panel is built from the editor state when its tool is picked or the level changes; every change
// goes through api.begin() / api.changed() / api.end(), so it is undoable.

import * as C from '../js/config.js';
import { BACKGROUND_DIR } from '../js/mapFile.js';
import { thumbnail, entryDrawable, flipDecor, scaleDecor, nextVariant, VARIANTS } from './decor.js';

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
const clone = (v) => JSON.parse(JSON.stringify(v));

const leaves = (v) => (v && typeof v === 'object' ? Object.values(v).reduce((n, x) => n + leaves(x), 0) : 1);

// Copies into palette every key (or list entry) of from that it lacks, leaving its own colours
// alone. Returns how many colours it added.
function addMissing(palette, from) {
  let added = 0;
  for (const [k, v] of Object.entries(from)) {
    if (!(k in palette) || palette[k] === undefined) {
      palette[k] = clone(v);
      added += leaves(v);
    } else if (v && typeof v === 'object' && palette[k] && typeof palette[k] === 'object') {
      added += addMissing(palette[k], v);
    }
  }
  return added;
}

// A labelled range slider bound to obj[key].
function slider(label, obj, key, min, max, step, unit, onChange = () => {}) {
  const value = el('span', { className: 'ed-slider-value', textContent: `${obj[key]}${unit}` });
  const input = el('input', { type: 'range', min, max, step, value: obj[key] });
  input.addEventListener('input', () => {
    obj[key] = Number(input.value);
    value.textContent = `${obj[key]}${unit}`;
    onChange();
  });
  return el('label', { className: 'ed-slider' }, label, input, value);
}

// Two or more buttons, one of them active, bound to obj[key].
function choice(obj, key, options) {
  const box = el('div', { className: 'ed-choice' });
  for (const [value, text] of options) {
    const b = el('button', { type: 'button', textContent: text });
    b.classList.toggle('active', obj[key] === value);
    b.addEventListener('click', () => {
      obj[key] = value;
      for (const x of box.children) x.classList.toggle('active', x === b);
    });
    box.append(b);
  }
  return box;
}

export function createPanels(api) {
  const { ed } = api;
  const box = document.getElementById('ed-tool-options');

  function show() {
    const build = { place: placePanel, scatter: scatterPanel, mire: mirePanel, palette: palettePanel, background: backgroundPanel }[ed.tool];
    box.replaceChildren(...(build ? build() : []));
    box.hidden = !build;
  }

  // ---- Place: thumbnails of every type and variant, grouped -------------------------------
  function placePanel() {
    const palette = ed.map.palette;
    const out = [el('div', { className: 'ed-note', textContent: 'Pick a type, then click the map to place it. Greyed types need palette colours this level lacks: picking one adds them from a level that has them.' })];
    let group = null;
    let grid = null;
    for (const entry of ed.catalogue) {
      entry.drawable = entryDrawable(entry, palette);
      // A greyed type is shown with the palette of the first level that can draw it.
      const donor = entry.drawable ? null : donorFor(entry);
      const look = donor ? ed.data.maps[donor].palette : palette;
      if (entry.group !== group) {
        group = entry.group;
        grid = el('div', { className: 'ed-thumbs' });
        out.push(el('div', { className: 'ed-thumb-group', textContent: group }), grid);
      }
      for (let v = 0; v < entry.variants; v++) {
        const b = el('button', { type: 'button', className: 'ed-thumb', title: `${entry.type}${entry.variants > 1 ? `, variant ${v}` : ''}${donor ? ` (adds colours from ${C.LEVELS[donor].name})` : ''}` }, thumbnail(entry, v, look));
        b.classList.toggle('greyed', !entry.drawable);
        b.classList.toggle('active', ed.place.entry?.type === entry.type && ed.place.variant === v);
        b.addEventListener('click', () => {
          ed.place = { entry, variant: v };
          if (!entry.drawable && !addColoursFor(entry)) return;
          for (const t of box.querySelectorAll('.ed-thumb')) t.classList.toggle('active', t === b);
        });
        grid.append(b);
      }
    }
    return out;
  }

  // A greyed type picked: the colours it needs, from the first level whose palette has them.
  // The first level whose palette can draw a type (other levels' palettes don't change here).
  const donors = new Map();
  const donorFor = (entry) => {
    if (!donors.has(entry.type)) donors.set(entry.type, Object.keys(C.LEVELS).find((id) => id !== ed.levelId && ed.data.maps[id] && entryDrawable(entry, ed.data.maps[id].palette)) ?? null);
    return donors.get(entry.type);
  };

  function addColoursFor(entry) {
    const donor = donorFor(entry);
    if (!donor) {
      api.status(`No level's palette has the colours a ${entry.label} needs.`, 'error');
      return false;
    }
    api.begin();
    const n = addMissing(ed.map.palette, ed.data.maps[donor].palette);
    api.changed(false);
    api.end();
    api.status(`Added ${n} missing palette colours from ${C.LEVELS[donor].name}, for the ${entry.label}.`, 'ok');
    show();
    return true;
  }

  // ---- Scatter: mode, radius, density, mix, keep clear ------------------------------------
  function scatterPanel() {
    const S = ed.scatter;
    const types = ed.catalogue.filter((e) => e.variants > 1 && !e.type.startsWith('landmark:') && entryDrawable(e, ed.map.palette)).map((e) => e.type);
    const mixRows = S.mix.map((m) => {
      const pick = el('select', {}, ...types.map((t) => el('option', { value: t, textContent: t })));
      pick.value = m.type;
      pick.addEventListener('change', () => { m.type = pick.value; });
      const weight = el('input', { type: 'number', min: 0, max: 100, step: 5, value: m.weight, className: 'ed-weight' });
      weight.addEventListener('input', () => { m.weight = Math.max(0, Number(weight.value) || 0); });
      return el('div', { className: 'ed-mix-row' }, pick, weight, '%');
    });
    const keep = el('input', { type: 'checkbox', checked: S.keepClear });
    keep.addEventListener('change', () => { S.keepClear = keep.checked; });
    return [
      choice(S, 'mode', [['paint', 'Paint'], ['erase', 'Erase']]),
      slider('Radius', S, 'radius', 20, 300, 5, ' px'),
      slider('Density', S, 'density', 0.2, 3, 0.1, ' per 100×100 px'),
      el('div', { className: 'ed-thumb-group', textContent: 'Mix' }),
      ...mixRows,
      el('label', { className: 'ed-check-row' }, keep, ' keep clear of corridors, spots and the Druid\'s clearing'),
      el('div', { className: 'ed-note', textContent: 'Painting adds single objects you can then edit one by one. Erase removes upright objects (not landmarks) under the brush.' }),
    ];
  }

  // ---- Mire: paint / erase, radius --------------------------------------------------------
  function mirePanel() {
    return [
      choice(ed.mireBrush, 'mode', [['paint', 'Paint'], ['erase', 'Erase']]),
      slider('Radius', ed.mireBrush, 'radius', 8, 200, 4, ' px'),
      el('div', { className: 'ed-note', textContent: `Mire is a grid of ${ed.map.mire.cell} px cells. It can't be painted on corridors, and a lane moved over mire clears it.` }),
    ];
  }

  // ---- Palette: every colour key, with Copy palette from… ----------------------------------
  function palettePanel() {
    const rows = [];
    const probe = document.createElement('canvas').getContext('2d');
    const walk = (obj, path) => {
      for (const [k, v] of Object.entries(obj)) {
        const p = [...path, k];
        if (v && typeof v === 'object') walk(v, p);
        else rows.push(colourRow(p, probe));
      }
    };
    walk(ed.map.palette, []);
    const from = el('select', {}, ...Object.keys(ed.data.maps).filter((id) => id !== ed.levelId && C.LEVELS[id])
      .map((id) => el('option', { value: id, textContent: C.LEVELS[id].name })));
    const copy = el('button', { type: 'button', textContent: 'Copy all', title: 'Replace this palette with that level\'s' });
    copy.addEventListener('click', () => {
      api.begin();
      ed.map.palette = clone(ed.data.maps[from.value].palette);
      api.changed(false);
      api.end();
      show();
    });
    const missing = el('button', { type: 'button', textContent: 'Add missing', title: 'Add the colours that level has and this one lacks, keeping this palette\'s own' });
    missing.addEventListener('click', () => {
      api.begin();
      const n = addMissing(ed.map.palette, ed.data.maps[from.value].palette);
      api.changed(false);
      api.end();
      api.status(n ? `Added ${n} colours from ${C.LEVELS[from.value].name}.` : `${C.LEVELS[from.value].name} has no colours this palette lacks.`, n ? 'ok' : '');
      show();
    });
    return [el('div', { className: 'ed-mix-row' }, 'From', from, copy, missing), el('div', { className: 'ed-palette' }, ...rows)];
  }

  // One palette colour: a swatch picker (its alpha kept for rgba colours) and the text itself.
  function colourRow(path, probe) {
    const get = () => path.reduce((o, k) => o[k], ed.map.palette);
    const set = (v) => {
      const parent = path.slice(0, -1).reduce((o, k) => o[k], ed.map.palette);
      parent[path[path.length - 1]] = v;
    };
    const picker = el('input', { type: 'color' });
    const text = el('input', { type: 'text', className: 'ed-colour-text', value: get() });
    const sync = () => {
      const { hex } = parseColour(get(), probe);
      picker.value = hex ?? '#000000';
      text.value = get();
    };
    picker.addEventListener('input', () => {
      api.begin();
      const { alpha } = parseColour(get(), probe);
      set(alpha === null ? picker.value : hexToRgba(picker.value, alpha));
      text.value = get();
      api.changed(true);
    });
    picker.addEventListener('change', () => api.end());
    text.addEventListener('change', () => {
      if (!isColour(text.value, probe)) {
        api.status(`"${text.value}" isn't a colour.`, 'error');
        sync();
        return;
      }
      api.begin();
      set(text.value.trim());
      api.changed(false);
      api.end();
      sync();
    });
    sync();
    return el('label', { className: 'ed-colour' }, picker, el('span', { className: 'ed-colour-key', textContent: path.join('.') }), text);
  }

  // ---- Background: an image from data/maps/backgrounds/, and the editor-only opacity -------
  function backgroundPanel() {
    const out = [];
    if (!ed.canSave) {
      out.push(el('div', { className: 'ed-note', textContent: 'Saving works when the editor is run locally with tools/serve.py.' }));
    }
    const pick = el('select', {}, el('option', { value: '', textContent: 'none (procedural ground)' }),
      ...ed.backgroundFiles.map((f) => el('option', { value: f, textContent: f })));
    if (ed.map.backgroundImage && !ed.backgroundFiles.includes(ed.map.backgroundImage)) pick.append(el('option', { value: ed.map.backgroundImage, textContent: `${ed.map.backgroundImage} (not found)` }));
    pick.value = ed.map.backgroundImage ?? '';
    pick.disabled = !ed.canSave;
    pick.addEventListener('change', () => {
      api.begin();
      ed.map.backgroundImage = pick.value || null;
      api.changed(false);
      api.end();
    });
    out.push(
      el('label', { className: 'ed-mix-row' }, 'Image', pick),
      slider('Opacity (editor only)', ed, 'bgOpacity', 0, 1, 0.05, '', () => api.saveViewSettings()),
      el('div', { className: 'ed-note', textContent: `Copy images into ${BACKGROUND_DIR}/ by hand. With an image set, the game draws it instead of the procedural ground, corridors and floor decoration. Below full opacity, the editor shows the procedural ground under it for tracing.` }),
    );
    return out;
  }

  // ---- Buttons for selected decoration ----------------------------------------------------
  const actions = document.getElementById('ed-decor-actions');
  const act = (fn) => () => api.decorAction(fn);
  actions.append(
    el('button', { type: 'button', textContent: 'Flip (F)', onclick: act(flipDecor) }),
    el('button', { type: 'button', textContent: '−10% ([)', onclick: act((d) => scaleDecor(d, false)) }),
    el('button', { type: 'button', textContent: '+10% (])', onclick: act((d) => scaleDecor(d, true)) }),
    el('button', { type: 'button', textContent: `Variant (N)`, title: `cycles 0–${VARIANTS - 1}`, onclick: act(nextVariant) }),
  );
  const showActions = () => { actions.hidden = !ed.selection.some((r) => r.kind === 'decor'); };

  return { show, showActions };
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

function isColour(text, probe) {
  probe.fillStyle = '#010203';
  probe.fillStyle = text;
  const a = probe.fillStyle;
  probe.fillStyle = '#030201';
  probe.fillStyle = text;
  return a === probe.fillStyle;
}

// { hex: '#rrggbb', alpha: number or null (null: an opaque colour) } for a CSS colour.
function parseColour(text, probe) {
  probe.fillStyle = '#000000';
  probe.fillStyle = text;
  const v = probe.fillStyle;
  if (v.startsWith('#')) return { hex: v, alpha: null };
  const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { hex: null, alpha: null };
  const hex = `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return { hex, alpha: m[4] === undefined ? null : Number(m[4]) };
}

const hexToRgba = (hex, alpha) => `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;
