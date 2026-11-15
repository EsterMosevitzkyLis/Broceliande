// Generate draft (M4a §5.7): for a level without a map file, every layer; for an existing one, one
// layer (lanes, spots, decoration or mire), from the draft generators in js/mapDraft.js. Always asks
// for confirmation, and is one undo step.

import * as C from '../js/config.js';
import { levelFromMap, lanesFromTab, sectorsFor } from '../js/mapFile.js';
import { sceneFromLevel } from '../js/scene.js';
import { createRng, makeRandomSeed } from '../js/rng.js';
import { encodeMire } from '../js/mire.js';
import { draftLanes, draftSpots, draftDecor, draftMire } from '../js/mapDraft.js';
import { zoneIds, zoneQuota } from '../js/zones.js';
import { defaultMix } from './decor.js';

const LAYERS = { all: 'every layer', lanes: 'the lanes', spots: 'the spots', decoration: 'the decoration', mire: 'the mire' };
const DEFAULT_MIRE_COVERAGE = 0.12; // share of the ground a mire draft covers, to start from (today's mire levels: about 0.1–0.2)

const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

export function createDraftDialog(api) {
  const { ed } = api;
  const dialog = document.getElementById('ed-draft');
  let seed = makeRandomSeed();
  let coverage = DEFAULT_MIRE_COVERAGE;

  function open() {
    if (!ed.map) return;
    const isNew = ed.data.missing.includes(ed.levelId) && !ed.savedText;
    const layer = el('select', {}, ...Object.entries(LAYERS).map(([v, t]) => el('option', { value: v, textContent: t })));
    layer.value = isNew ? 'all' : 'decoration';
    const seedInput = el('input', { type: 'number', value: seed, className: 'ed-seed' });
    const reroll = el('button', { type: 'button', textContent: 'New seed', onclick: () => { seedInput.value = makeRandomSeed(); } });
    const cover = el('input', { type: 'number', min: 0, max: 0.6, step: 0.02, value: coverage, className: 'ed-weight' });
    const go = el('button', { type: 'button', className: 'ed-primary', textContent: 'Generate' });
    const cancel = el('button', { type: 'button', textContent: 'Cancel', onclick: () => { dialog.hidden = true; } });
    go.addEventListener('click', () => {
      seed = Number(seedInput.value) >>> 0;
      coverage = Math.max(0, Math.min(0.6, Number(cover.value) || 0));
      const what = LAYERS[layer.value];
      if (!confirm(`Replace ${what} of ${C.LEVELS[ed.levelId].name} with a generated draft? Undo (Ctrl+Z) brings the current one back.`)) return;
      dialog.hidden = true;
      generate(layer.value, seed, coverage);
    });
    dialog.replaceChildren(
      el('div', { className: 'ed-draft-title', textContent: `Generate draft: ${C.LEVELS[ed.levelId].name}` }),
      el('div', { className: 'ed-note', textContent: isNew
        ? 'This level has no map file yet. A draft of every layer is a starting point; Save writes the file.'
        : 'A starting point from the generators: lanes wind from their entry points to the Druid, spots follow the candidate rules and zone quotas, decoration is the seeded forest scatter (landmarks are kept), mire is seeded patches.' }),
      el('label', { className: 'ed-mix-row' }, 'Replace', layer),
      el('label', { className: 'ed-mix-row' }, 'Seed', seedInput, reroll),
      el('label', { className: 'ed-mix-row' }, 'Mire cover (with every layer or the mire)', cover),
      el('div', { className: 'ed-choice' }, go, cancel),
    );
    dialog.hidden = false;
  }

  // The scene of the map as it stands (each layer's draft builds on the ones before it).
  const sceneOf = (map) => sceneFromLevel(ed.levelId, { ...C.LEVELS[ed.levelId], ...levelFromMap(map) });

  function generate(layer, seed, coverage) {
    const map = ed.map;
    const rng = createRng(seed || 1);
    const all = layer === 'all';
    api.begin();
    if (all || layer === 'lanes') {
      // A new level: lanes from the lanes tab (1 to 4), the map's sector count (3 unless changed in
      // the Druid tool) arranged round them; otherwise the same lanes (ids, names, entry points)
      // rerouted, and the sectors kept.
      const lanes = all && !ed.savedText
        ? lanesFromTab(ed.levelId, ed.data.laneRows)
        : map.lanes.map((l) => ({ id: l.id, name: l.name ?? l.id, entry: { x: l.waypoints[0][0], y: l.waypoints[0][1] } }));
      map.lanes = draftLanes(map.druid, lanes, rng);
      if (all && !ed.savedText) Object.assign(map.sectors, sectorsFor(map.druid, lanes.map((l) => l.entry), map.sectors.angles.length));
    }
    let short = [];
    if (all || layer === 'spots') {
      const scene = sceneOf(map);
      map.candidates = draftSpots(scene, rng);
      // Zones the generator couldn't fill (no lane within turret range there, or no room).
      short = zoneIds(scene.level).map((z) => {
        const q = zoneQuota(scene.level, z);
        const n = map.candidates.filter((c) => c.zone === z).length;
        return n < q.turret + q.feature ? `${z} ${n}/${q.turret + q.feature}` : null;
      }).filter(Boolean);
    }
    if (all || layer === 'decoration') {
      const mix = defaultMix(map);
      const kept = map.decor.filter((d) => d.type.startsWith('landmark:'));
      map.decor = [...draftDecor(sceneOf(map), seed, { treeKind: mix[0].type, bushKind: mix[1].type }), ...kept];
    }
    if ((all && coverage > 0) || layer === 'mire') map.mire = encodeMire(draftMire(sceneOf(map), seed, coverage));
    api.changed(false);
    api.end();
    api.select([]);
    if (short.length) {
      api.status(`Generated a draft of ${LAYERS[layer]} (seed ${seed}), but some zones are short of spots: ${short.join(', ')}. With few lanes some sectors have no lane in turret range: try fewer sectors (Druid tool), or another seed.`, 'error');
    } else {
      api.status(`Generated a draft of ${LAYERS[layer]} (seed ${seed}). Undo brings the previous one back.`, 'ok');
    }
  }

  return { open };
}
