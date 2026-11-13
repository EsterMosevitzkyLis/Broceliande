// Known patterns (M2p §2): the item IDs whose recipe the Druid knows. Unlike items, they are
// permanent: kept across runs, defeats and reloads in localStorage, as a list of item IDs. Newly
// learned ones are marked New until the player hovers the map panel's pattern list. If storage is
// unavailable they last for the session only; every read and write is wrapped in try/catch.

import * as C from './config.js';

const KNOWN_KEY = 'broceliande.patterns.v1';
const NEW_KEY = 'broceliande.patternsNew.v1';

function load(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function save(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // No storage (private window, blocked site data): patterns last for this session only.
  }
}

let known = load(KNOWN_KEY);
let fresh = load(NEW_KEY);

// Known pattern IDs that are still items (a renamed or removed item is ignored, not deleted).
export function knownPatterns() {
  return known.filter((id) => C.ITEMS[id]);
}

export function isPatternKnown(id) {
  return known.includes(id);
}

// Patterns learned since the list was last hovered.
export function newPatterns() {
  return fresh.filter((id) => C.ITEMS[id] && known.includes(id));
}

export function totalPatterns() {
  return Object.keys(C.RECIPES).length;
}

// Learns a pattern (marked New). Returns false if it was already known or isn't an item.
export function learnPattern(id) {
  if (!C.RECIPES[id] || known.includes(id)) return false;
  known = [...known, id];
  fresh = [...fresh, id];
  save(KNOWN_KEY, known);
  save(NEW_KEY, fresh);
  return true;
}

// Undoing a pattern bought at a Trader (M3e §5.2), only within the visit: forgotten again.
export function unlearnPattern(id) {
  if (!known.includes(id)) return false;
  known = known.filter((x) => x !== id);
  fresh = fresh.filter((x) => x !== id);
  save(KNOWN_KEY, known);
  save(NEW_KEY, fresh);
  return true;
}

// The pattern list was hovered: its New marks clear.
export function markPatternsSeen() {
  if (fresh.length === 0) return;
  fresh = [];
  save(NEW_KEY, fresh);
}

// A random pattern not known yet (seeded rng), weighted by its recipe's patternWeight (§3.1);
// null if every pattern is known.
export function randomUnknownPattern(rng) {
  const left = Object.keys(C.RECIPES).filter((id) => C.ITEMS[id] && !known.includes(id));
  const total = left.reduce((sum, id) => sum + C.RECIPES[id].patternWeight, 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const id of left) {
    r -= C.RECIPES[id].patternWeight;
    if (r < 0) return id;
  }
  return left[left.length - 1];
}

// Debug (§6): learn every pattern / forget them all.
export function learnAllPatterns() {
  for (const id of Object.keys(C.RECIPES)) learnPattern(id);
}

export function forgetAllPatterns() {
  known = [];
  fresh = [];
  save(KNOWN_KEY, known);
  save(NEW_KEY, fresh);
}
