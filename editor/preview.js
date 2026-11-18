// Preview a run (M4a §5.5): the level's layout rolled with a seed as the game rolls it at an
// encounter's start (generateLayout: jitter, zone roles, feature types, the layout constraints with
// rerolls and fallback; M4b: pinned spots keep their roles), drawn with the game's own slot pads and
// resource spots. Purely a preview: nothing is saved.

import * as C from '../js/config.js';
import { generateLayout } from '../js/layout.js';
import { laneMinTurretSlots } from '../js/levelSettings.js';
import { createRng } from '../js/rng.js';
import { createFeatures } from '../js/entities/searchableFeature.js';
import { rollHiddenSpots } from '../js/hiddenSpots.js';
import { regionTwist } from '../js/levelSettings.js';

// The layout for a scene and seed: { slots, features (as the game makes them), vacant (candidate
// indices left empty), hidden (M6c §1.1: candidate indices under ferns, rolled right after the layout
// from the same RNG, as the game does), layout (generateLayout's result) }.
export function previewLayout(scene, seed) {
  const rng = createRng(seed);
  const layout = generateLayout(rng, scene, { quiet: true });
  const vacant = layout.roles.map((r, i) => (r.kind === 'vacant' ? i : -1)).filter((i) => i >= 0);
  const hidden = rollHiddenSpots(rng, scene.level);
  return { slots: layout.slots, features: createFeatures(layout), vacant, hidden, layout };
}

// Lines for the preview panel: what failed, how often, and what came of it.
export function previewSummary(p, scene) {
  const L = p.layout;
  const lines = [];
  if (!L.randomised) lines.push(`RANDOMISE_LAYOUT is off: every seed gives the same layout (FIXED_LAYOUT_SEED ${C.FIXED_LAYOUT_SEED}).`);
  const failures = Object.entries(L.failures).map(([k, n]) => `${k.replace('coverage:', 'cover ')} ${n}`).join(', ');
  lines.push(L.fallback
    ? `No draw passed in ${L.attempts}: the best one is used, failing ${L.failed.join(', ')}.`
    : `Draw ${L.attempts} passed${L.attempts > 1 ? ` (${L.attempts - 1} rerolled)` : ''}.`);
  lines.push(`Constraint failures over those draws: ${failures || 'none'}.`);
  lines.push(`${p.slots.length} turret slots, ${p.features.length} resource spots, ${p.vacant.length} empty; feature route ${L.routeCost} steps.`);
  lines.push(`Lane coverage: ${scene.lanes.map((l) => `${l.name} ${L.coverage[l.id]}`).join(', ')} (needs ${laneMinTurretSlots(scene.level)}).`);
  if (regionTwist(scene.level, 'hiddenSpots')) { // M6c §1.1
    const of = (kind) => p.hidden.filter((i) => L.roles[i].kind === kind).length;
    lines.push(`Hidden under ferns: ${p.hidden.length} (${of('slot')} turret slots, ${of('feature')} resource spots, ${of('vacant')} empty).`);
  }
  return lines;
}
