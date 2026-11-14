// Decoration in the editor (M4a §5.3): the catalogue of every type the game can draw (with its
// variants, and landmarks), thumbnails, the actions on selected objects (flip, scale, variant), and
// the scatter brush.

import * as C from '../js/config.js';
import { decorKinds, drawDecor, drawFlats, decorDrawable } from '../js/render/environment.js';
import { decorFits, extentKind } from '../js/mapDraft.js';

export const VARIANTS = 3;             // shape variants per type (0–2), as the drawings use them
export const FLAT_TYPES = ['water', 'mist', 'mere', 'ashPit', 'groundPatch'];
const FLAT_KIND = { water: 'water', mist: 'mist', mere: 'mere', ashPit: 'ash' };
const SCALE_STEP = 1.1;                // the ±10% scale buttons
const THUMB = 56;                      // px, thumbnail size

const round2 = (v) => Math.round(v * 100) / 100;
const round3 = (v) => Math.round(v * 1000) / 1000;
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];

// The catalogue, from what the game can draw and how the map files use it: [{ type, label, group,
// variants, template }], template: a new object's fields besides its position. A kind used as a
// landmark in any map file is a landmark ("landmark:<kind>", its scale its size in px, the median
// of its uses); flats take their size from the median of theirs.
export function buildCatalogue(maps) {
  const all = Object.values(maps).flatMap((m) => m.decor);
  const landmarkSizes = {};
  for (const d of all) if (d.type.startsWith('landmark:')) (landmarkSizes[d.type.slice(9)] ??= []).push(d.scale);
  const out = [];
  for (const kind of decorKinds()) {
    const landmark = !!landmarkSizes[kind];
    const group = landmark ? 'Landmarks' : /Tree$|^tree$/.test(kind) ? 'Trees' : /Bush$|^bush$/.test(kind) ? 'Bushes' : 'Props';
    out.push({
      type: landmark ? `landmark:${kind}` : kind,
      label: kind,
      group,
      variants: VARIANTS,
      template: { variant: 0, scale: landmark ? median(landmarkSizes[kind]) : 1, flip: false },
    });
  }
  for (const type of FLAT_TYPES) {
    const uses = all.filter((d) => d.type === type);
    const rx = uses.length ? round2(median(uses.map((d) => d.rx))) : 60;
    const ry = uses.length ? round2(median(uses.map((d) => d.ry))) : 30;
    const template = type === 'groundPatch' ? { rx, ry, light: false } : { rx, ry, rot: 0 };
    if (uses.some((d) => d.glow)) template.glow = true;
    out.push({ type, label: type, group: 'Ground', variants: 1, template });
  }
  const order = ['Trees', 'Bushes', 'Props', 'Landmarks', 'Ground'];
  return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
}

// A new map-file object of a catalogue entry at (x, y), in the files' key order.
export function newDecor(entry, variant, x, y) {
  const t = entry.template;
  if (entry.variants === 1) {
    const { rx, ry, ...rest } = t;
    return { type: entry.type, x: round2(x), y: round2(y), rx, ry, ...rest };
  }
  return { type: entry.type, variant, x: round2(x), y: round2(y), scale: t.scale, flip: false };
}

// Whether a level's palette has every colour a catalogue entry needs.
export function entryDrawable(entry, palette) {
  if (entry.type === 'groundPatch') return !!palette.floorAccent;
  return decorDrawable(entry.variants === 1 ? FLAT_KIND[entry.type] : entry.label, palette);
}

// A thumbnail of a type and variant, drawn with a level's palette (blank if it can't be).
export function thumbnail(entry, variant, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = THUMB;
  canvas.height = THUMB;
  const g = canvas.getContext('2d');
  if (!entryDrawable(entry, palette)) return canvas;
  g.save();
  if (entry.variants === 1) {
    const k = Math.min((THUMB * 0.42) / entry.template.rx, (THUMB * 0.3) / entry.template.ry);
    const item = { x: THUMB / 2, y: THUMB / 2, rx: entry.template.rx * k, ry: entry.template.ry * k, rot: 0, glow: !!entry.template.glow, light: false };
    if (entry.type === 'groundPatch') {
      g.fillStyle = palette.floor;
      g.fillRect(0, 0, THUMB, THUMB);
      g.fillStyle = palette.floorAccent.dark;
      g.beginPath();
      g.ellipse(item.x, item.y, item.rx, item.ry, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      drawFlats(g, { level: { palette }, flats: [{ ...item, kind: FLAT_KIND[entry.type] }] });
    }
  } else {
    const landmark = entry.type.startsWith('landmark:');
    const size = entry.template.scale;
    const e = C.DECOR.extent[extentKind(entry.label)] ?? { lift: 20, r: 25 };
    const k = landmark ? (THUMB * 0.75) / size : Math.min((THUMB * 0.42) / (e.r * size), (THUMB * 0.8) / ((e.lift + e.r) * size));
    g.translate(THUMB / 2, THUMB - 6);
    g.scale(k, k);
    drawDecor(g, { kind: entry.label, x: 0, y: 0, size, variant, flip: false }, { palette });
  }
  g.restore();
  return canvas;
}

// ---------------------------------------------------------------------------
// Actions on selected objects (map.decor entries)
// ---------------------------------------------------------------------------

export function flipDecor(d) {
  if ('flip' in d) d.flip = !d.flip;
}

// up: true for +10%, false for −10%.
export function scaleDecor(d, up) {
  const f = up ? SCALE_STEP : 1 / SCALE_STEP;
  if ('scale' in d) d.scale = round3(d.scale * f);
  if ('rx' in d) {
    d.rx = round2(d.rx * f);
    d.ry = round2(d.ry * f);
  }
  if (d.type === 'stream') d.width = round2(d.width * f);
}

export function nextVariant(d) {
  if ('variant' in d) d.variant = (d.variant + 1) % VARIANTS;
}

// ---------------------------------------------------------------------------
// Scatter brush
// ---------------------------------------------------------------------------

const isUpright = (d) => 'scale' in d;
const extentOf = (d) => C.DECOR.extent[extentKind(d.type.replace(/^landmark:/, ''))] ?? { lift: 20, r: 25 };
const SPACING = 0.75; // two scattered objects keep this × the sum of their extents apart

// One dab of the brush at p: adds objects (map-file entries) until the brush circle holds about
// density per 100 × 100 px of upright objects. settings: { radius, density, mix: [{ type, weight }],
// keepClear }; scene: the level's scene (corridors, spots, the Druid). rng: js/rng.js.
export function scatterAt(map, scene, p, settings, rng) {
  const { radius, density, mix, keepClear } = settings;
  const total = mix.reduce((a, m) => a + m.weight, 0);
  if (!total) return 0;
  const near = map.decor.filter((d) => isUpright(d) && Math.hypot(d.x - p.x, d.y - p.y) < radius + 120);
  const inside = near.filter((d) => Math.hypot(d.x - p.x, d.y - p.y) <= radius).length;
  const want = Math.round((density * Math.PI * radius * radius) / 10000) - inside;
  const home = scene.level.druidPos;
  let added = 0;
  for (let n = 0; n < want; n++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const a = rng.range(0, Math.PI * 2);
      const r = radius * Math.sqrt(rng.next());
      const q = { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
      let roll = rng.range(0, total);
      const type = mix.find((m) => (roll -= m.weight) < 0)?.type ?? mix[0].type;
      const size = rng.range(0.8, 1.25);
      const e = C.DECOR.extent[extentKind(type)] ?? { lift: 20, r: 25 };
      if (q.y < C.HUD_STRIP_HEIGHT + 10 || q.x < -20 || q.x > C.STAGE_WIDTH + 20 || q.y > C.STAGE_HEIGHT + 20) continue;
      if (keepClear && (Math.hypot(q.x - home.x, q.y - home.y) < C.DECOR.clearingRadius || !decorFits(scene, type, q, size))) continue;
      if (near.some((d) => Math.hypot(d.x - q.x, d.y - q.y) < SPACING * (extentOf(d).r * (d.type.startsWith('landmark:') ? 1 : d.scale) + e.r * size))) continue;
      const d = { type, variant: rng.int(0, VARIANTS - 1), x: round2(q.x), y: round2(q.y), scale: round3(size), flip: rng.next() < 0.5 };
      map.decor.push(d);
      near.push(d);
      added++;
      break;
    }
  }
  return added;
}

// The erase brush: removes the upright objects (not landmarks) whose base is inside the circle.
export function eraseAt(map, p, radius) {
  const before = map.decor.length;
  map.decor = map.decor.filter((d) => !(isUpright(d) && !d.type.startsWith('landmark:') && Math.hypot(d.x - p.x, d.y - p.y) <= radius));
  return before - map.decor.length;
}

// A starting mix for a level: its most used tree and bush types, and rocks.
export function defaultMix(map) {
  const counts = {};
  for (const d of map.decor) counts[d.type] = (counts[d.type] ?? 0) + 1;
  const top = (re, fallback) => Object.keys(counts).filter((t) => re.test(t)).sort((a, b) => counts[b] - counts[a])[0] ?? fallback;
  return [{ type: top(/Tree$|^tree$/, 'tree'), weight: 60 }, { type: top(/Bush$|^bush$/, 'bush'), weight: 30 }, { type: 'rock', weight: 10 }];
}
