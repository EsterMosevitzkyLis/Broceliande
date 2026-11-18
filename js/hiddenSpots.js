// Hidden spots (M6c §1.1): which of a layout's spots hide under ferns, in a region with
// hiddenSpots. Rolled once per encounter right after the layout, with the same RNG, so a seed always
// hides the same spots (the map editor's Preview a run rolls it the same way). Spots of every role
// can hide: turret slots, resource spots and empty spots.

import { zoneIds, zoneCandidates, isNearZone } from './zones.js';
import { regionTwist, hiddenShare, spotHide } from './levelSettings.js';
import { shuffle } from './layout.js';

// Candidate indices hidden, in index order. Per zone: round(share × its spots), the level's share
// (levels tab) or its region's; spots set to `always` count towards it and are always hidden (even
// past it), `never` ones never are, and the rest is filled from its `auto` spots at random. None
// outside a hiddenSpots region.
export function rollHiddenSpots(rng, level) {
  if (!regionTwist(level, 'hiddenSpots')) return [];
  const spots = level.candidateLocations;
  const hidden = [];
  for (const zone of zoneIds(level)) {
    const here = zoneCandidates(level, zone);
    const want = Math.round(hiddenShare(level, isNearZone(zone)) * here.length);
    const always = here.filter((i) => spotHide(spots[i]) === 'always');
    const auto = shuffle(rng, here.filter((i) => spotHide(spots[i]) === 'auto'));
    hidden.push(...always, ...auto.slice(0, Math.max(0, want - always.length)));
  }
  return hidden.sort((a, b) => a - b);
}
