// Known patterns (M2p §2): the item IDs whose recipe the Druid knows. Unlike items, they are
// permanent: kept across runs, defeats and reloads in localStorage, as a list of item IDs. Newly
// learned ones are marked New until the player hovers the map panel's pattern list. If storage is
// unavailable they last for the session only; every read and write is wrapped in try/catch.
// Potions §7: potion recipes are patterns too, kept in the same list by their potion key
// ('healing:faint'); POTION_RECIPES_KNOWN are known from the start of every run (never stored, never
// forgotten). knownPatterns, newPatterns and totalPatterns count item patterns only; the potion
// recipes have their own counts.

import * as C from './config.js';
import { potionName, potionRow } from './potions.js';

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
  return known.includes(id) || C.POTION_RECIPES_KNOWN.includes(id);
}

// A pattern ID: an item with a recipe, or a potion key (Potions §7).
function isPatternId(id) {
  return !!((C.RECIPES[id] && C.ITEMS[id]) || C.POTIONS[id]);
}

// A pattern's name (the item's or the potion's) and its grade (rarity or tier label).
export function patternName(id) {
  return C.ITEMS[id]?.name ?? potionName(id);
}

export function patternGrade(id) {
  return C.POTIONS[id] ? C.POTION_TIERS[potionRow(id).tier].label : C.RARITY[C.ITEMS[id].rarity].label;
}

// Potion recipes known (Potions §7), in the potions tab's order.
export function knownPotionRecipes() {
  return Object.keys(C.POTIONS).filter(isPatternKnown);
}

export function totalPotionRecipes() {
  return Object.keys(C.POTIONS).length;
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
  if (!isPatternId(id) || isPatternKnown(id)) return false;
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

// A random pattern not known yet (seeded rng), weighted by its recipe's patternWeight (§3.1):
// items' and potion recipes' together (Potions §7; a weight of 0, the Sovereign recipes, is never
// picked); null if none is left.
export function randomUnknownPattern(rng) {
  const weight = (id) => (C.POTIONS[id] ? C.POTIONS[id].patternWeight : C.RECIPES[id].patternWeight);
  const left = [...Object.keys(C.RECIPES).filter((id) => C.ITEMS[id]), ...Object.keys(C.POTIONS)].filter((id) => !isPatternKnown(id) && weight(id) > 0);
  const total = left.reduce((sum, id) => sum + weight(id), 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const id of left) {
    r -= weight(id);
    if (r < 0) return id;
  }
  return left[left.length - 1];
}

// Potions §7: a Sovereign recipe not known yet (they are found only: a region boss's hidden find),
// evenly; null if all are known.
export function randomUnknownSovereignRecipe(rng) {
  const left = Object.keys(C.POTIONS).filter((k) => C.POTIONS[k].tier === 'sovereign' && !isPatternKnown(k));
  return left.length ? left[rng.int(0, left.length - 1)] : null;
}

// Debug (§6): learn every pattern (and potion recipe) / forget them all.
export function learnAllPatterns() {
  for (const id of [...Object.keys(C.RECIPES), ...Object.keys(C.POTIONS)]) learnPattern(id);
}

export function forgetAllPatterns() {
  known = [];
  fresh = [];
  save(KNOWN_KEY, known);
  save(NEW_KEY, fresh);
}
