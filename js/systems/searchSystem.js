// Searching features (spec §8.4): seeded yield roll on completion.

import * as C from '../config.js';
import { RESOURCE_KEYS, add } from '../resources.js';
import { addResourceFloaters } from '../effects.js';
import { events } from '../events.js';

export function searchTime(feature) {
  return C.FEATURE_TYPES[feature.type].searchTime;
}

// Integers rolled uniformly within each range, inclusive; each resource independently (§8.2).
function rollYield(rng, type) {
  const gained = {};
  for (const [res, [min, max]] of Object.entries(C.FEATURE_TYPES[type].yields)) gained[res] = rng.int(min, max);
  return gained;
}

export function completeSearch(game, featureIndex) {
  const feature = game.features[featureIndex];
  if (feature.exhausted) return;
  const gained = rollYield(game.rng, feature.type);
  // Forager's Belt (M2e §2.3): extra units of the spot's main resource, even if it rolled 0.
  const bonus = game.stats['search.mainBonus'];
  if (bonus > 0) {
    const main = C.FEATURE_TYPES[feature.type].mainResource;
    gained[main] = (gained[main] ?? 0) + bonus;
  }
  // M3c §5, Peatcutter's Belt: extra Peat from a Peat Bog.
  if (C.FEATURE_TYPES[feature.type].mainResource === 'peat' && game.stats['features.peatBonus'] > 0) gained.peat = (gained.peat ?? 0) + game.stats['features.peatBonus'];
  add(game.resources, gained);
  game.doubleStats.boughsGained += gained.boughs ?? 0; // M1i §4 debug figure
  feature.exhausted = true;

  const found = RESOURCE_KEYS.filter((k) => gained[k] > 0);
  if (found.length) events.emit('resourcesGained', { resources: found }); // one chime per resource found
  const shown = addResourceFloaters(game, gained, feature.x, feature.y - C.LOCATION_RADIUS - 20); // M2d §1
  if (game.hiddenFind && game.hiddenFind.featureIndex === featureIndex && !game.hiddenFind.found) {
    findItem(game, feature, shown);
  }
}

// M2e §3.2: the spot held the battle's hidden find. A message names its slot type (not the item),
// or for a pattern (M2p §3.2) just "a Pattern"; a slot-silhouette (or rolled-scroll) floater rises
// after the resource floaters, a "magic find" sound plays, and the HUD shows a reminder (from
// hiddenFind.found). The item joins the run, or the pattern is learned, only on Victory.
function findItem(game, feature, floatersBefore) {
  const h = game.hiddenFind;
  h.found = true;
  const pattern = h.kind === 'pattern';
  const slot = pattern ? null : C.ITEMS[h.itemId].slot;
  game.itemMessage = { slot, pattern, age: 0 };
  game.floaters.push({
    slot, pattern, x: feature.x, y: feature.y - C.LOCATION_RADIUS - 20 - floatersBefore * C.FLOATER_STACK_PX,
    delay: floatersBefore * C.FLOATER_STAGGER, age: 0,
  });
  events.emit('magicFound', { slot, pattern });
}
