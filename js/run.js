// Run state (M2a §2.2): a path through the level map, kept apart from the encounter state in
// game.js. M3a: a run crosses the regions in order, each with its own map. In a region the run
// starts on its row 1 node; winning a node makes its `next` nodes available; winning a node with no
// `next` (the region's boss) completes the region, and the last region's completes the run.
// Nothing here is tied to particular nodes.

import * as C from './config.js';
import { emptyResources, RESOURCE_KEYS } from './resources.js';
import { makeRandomSeed, createRng } from './rng.js';
import { rollTrader } from './trade.js';
import { generateMap, mapSeedFor, nodeRadius } from './mapGen.js';

export { nodeRadius };

// run: { seed, regionId, regionVisits, deaths, map, currentNodeId, completedNodeIds, inventory, druidHp,
//        items, equipped, seenItems, traders }
// regionId (M3a): the region the run is in; regionVisits: how many times it has entered one (each
// entry gets a new map); deaths: deaths so far (each death's losses are rolled from it).
// map (M2g): the current region's generated map (mapGen.js), nodes with positions and `next` roads.
// currentNodeId: the node last entered (null before the first). inventory: resources carried
// between encounters. druidHp: used for the next encounter only with CARRY_DRUID_HP. Equipment
// (M2e §5): items owned this run (ITEMS keys), the one equipped in each slot (or null), and the
// owned items the player has looked at (badges and New marks). traders (M2n §5): each Trader node's
// rolled trader (name, multipliers, stock), by node id, rolled with the run.
export function createRun() {
  const seed = C.DEBUG_SEED ?? makeRandomSeed(); // DEBUG_SEED reproduces the whole run
  const run = {
    seed,
    regionId: null,
    regionVisits: 0,
    deaths: 0,
    map: null,
    currentNodeId: null,
    completedNodeIds: [],
    inventory: emptyResources(),
    druidHp: C.DRUID_HP,
    items: [],
    equipped: Object.fromEntries(Object.keys(C.SLOT_TYPES).map((slot) => [slot, null])),
    seenItems: [],
    traders: {},
  };
  enterRegion(run, C.REGION_ORDER[0]);
  return run;
}

// M3a §3, §4: the run arrives in a region (the first, the next after a boss, or Hag's Causeway
// again after a death there): a newly generated map of it, seeded from the run seed and the entry,
// at its row 1 node with nothing won there yet, and the Druid at full HP. Resources, items and
// equipment carry over unchanged.
export function enterRegion(run, regionId) {
  run.regionId = regionId;
  run.regionVisits++;
  run.map = generateMap(mapSeedFor(run.seed, regionId, run.regionVisits), regionId);
  run.currentNodeId = null;
  run.completedNodeIds = [];
  run.druidHp = Infinity; // full: startingDruidHp clamps it to his max HP
  run.traders = rollRunTraders((run.seed + run.regionVisits * 0x1f123) >>> 0, run.map);
}

// The region's first node (§1.2): its node in its lowest row (row 1).
export function regionStartNode(regionId) {
  const nodes = C.MAP_NODES.filter((n) => n.region === regionId);
  return nodes.reduce((a, b) => (C.LEVELS[b.levelId].row < C.LEVELS[a.levelId].row ? b : a)).id;
}

// The region after the run's current one, or null in the last.
export function nextRegionId(run) {
  return C.REGION_ORDER[C.REGION_ORDER.indexOf(run.regionId) + 1] ?? null;
}

// M2n §5: a trader for every Trader node on the map, seeded from the run seed, no name used twice.
// keep: traders already rolled (by node id), kept as they are (debug L, regenerateMap).
function rollRunTraders(seed, map, keep = {}) {
  const rng = createRng((seed ^ 0x7a3d1) >>> 0);
  const nodes = map.nodes.filter((n) => n.type === 'trader');
  const traders = Object.fromEntries(nodes.filter((n) => keep[n.id]).map((n) => [n.id, keep[n.id]]));
  for (const node of nodes) {
    if (!traders[node.id]) traders[node.id] = rollTrader(rng, Object.values(traders).map((t) => t.name));
  }
  return traders;
}

// A node of the run's map (M2g: positions and roads differ per run), or null.
export function mapNode(run, id) {
  return run.map.nodes.find((n) => n.id === id) ?? null;
}

// The last node won, or null at the start of a run.
function lastCompleted(run) {
  return run.completedNodeIds.length ? mapNode(run, run.completedNodeIds[run.completedNodeIds.length - 1]) : null;
}

// Nodes the player may enter now (§4.3): the start node at the beginning of a run, then the
// not-yet-won `next` nodes of the last node won.
// Once the player has entered one of them, that choice is made: only it stays available and its
// siblings are bypassed.
export function availableNodeIds(run) {
  const last = lastCompleted(run);
  if (!last) return [regionStartNode(run.regionId)];
  const choices = last.next.filter((id) => !run.completedNodeIds.includes(id));
  return choices.includes(run.currentNodeId) ? [run.currentNodeId] : choices;
}

// Nodes still reachable by following `next` links from the available nodes (not counting them).
function reachableNodeIds(run) {
  const seen = new Set();
  const queue = availableNodeIds(run).flatMap((id) => mapNode(run, id).next);
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...mapNode(run, id).next);
  }
  return seen;
}

// 'available' | 'completed' | 'locked' | 'bypassed', for any map shape (M2b §1.2, replacing
// M2a §4.3): completed = won this run; available = see above; locked = not yet reachable but still
// reachable from where the run stands; bypassed = no longer reachable (e.g. a skipped sibling and
// anything reachable only through it).
export function nodeState(run, id) {
  if (run.completedNodeIds.includes(id)) return 'completed';
  if (availableNodeIds(run).includes(id)) return 'available';
  return reachableNodeIds(run).has(id) ? 'locked' : 'bypassed';
}

// The region is complete when the last node won has no `next` nodes (its boss, §4.1); the run is
// complete when that region is the last (M3a §3).
export function isRegionComplete(run) {
  const last = lastCompleted(run);
  return !!last && last.next.length === 0;
}

export function isRunComplete(run) {
  return isRegionComplete(run) && !nextRegionId(run);
}

// ---------------------------------------------------------------------------
// Dying by region (M3a §4). In a region with deathLossPct 1 a death ends the run. Below 1, the run
// goes on from the region's start: each resource keeps floor(amount × (1 − deathLossPct)) and each
// owned item is lost with chance deathLossPct, rolled in turn from the run seed and the death count
// (so the debug panel's preview is what the next death will take). Patterns are never lost.
// ---------------------------------------------------------------------------
export function regionEndsRunOnDeath(run) {
  return C.REGIONS[run.regionId].deathLossPct >= 1;
}

// What a death now would take: { resources: { id: units lost }, kept: { id: units kept }, items: [ids] },
// or null where a death ends the run. Reads the carried inventory (what the battle started with:
// anything found in the battle is gone anyway).
export function deathLoss(run) {
  if (regionEndsRunOnDeath(run)) return null;
  const pct = C.REGIONS[run.regionId].deathLossPct;
  const rng = createRng((run.seed ^ Math.imul(run.deaths + 1, 0x2c1b3c6d)) >>> 0);
  const kept = {};
  const resources = {};
  for (const k of RESOURCE_KEYS) {
    const have = run.inventory[k] ?? 0;
    kept[k] = Math.floor(have * (1 - pct) + 1e-9);
    resources[k] = have - kept[k];
  }
  const items = run.items.filter(() => rng.next() < pct);
  return { resources, kept, items };
}

// Applies a death's losses (deathLoss) to the run: what was lost is gone and lost items leave their
// slots; kept items stay equipped where they were.
export function applyDeathLoss(run, loss) {
  run.inventory = { ...emptyResources(), ...loss.kept };
  run.items = run.items.filter((id) => !loss.items.includes(id));
  run.seenItems = run.seenItems.filter((id) => run.items.includes(id));
  for (const slot of Object.keys(run.equipped)) if (loss.items.includes(run.equipped[slot])) run.equipped[slot] = null;
  run.deaths++;
}

// Each encounter's seed, derived from the run seed and the node ID (§2.2), so a fixed run seed
// reproduces every encounter of the run.
export function encounterSeed(run, nodeId) {
  let h = run.seed >>> 0;
  for (let i = 0; i < nodeId.length; i++) h = Math.imul(h ^ nodeId.charCodeAt(i), 2654435761) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

// On Victory (§3): the node is won and the resources (all four) are carried; with
// CARRY_DRUID_HP, the Druid's HP too.
export function recordVictory(run, resources, druidHp) {
  if (run.currentNodeId && !run.completedNodeIds.includes(run.currentNodeId)) run.completedNodeIds.push(run.currentNodeId);
  run.inventory = { ...emptyResources(), ...resources };
  run.druidHp = druidHp;
}

// HP the Druid starts the next encounter with: full (his effective max HP, M2e §5), or with
// CARRY_DRUID_HP the HP he won with, clamped to that max (it may have dropped after unequipping;
// on entering a region it is Infinity, so full).
export function startingDruidHp(run, maxHp) {
  return C.CARRY_DRUID_HP ? Math.min(run.druidHp, maxHp) : maxHp;
}

// The available node under p (for hover and clicks), or null. Locked, completed and bypassed
// nodes do not react.
export function availableNodeAt(run, p) {
  for (const id of availableNodeIds(run)) {
    const n = mapNode(run, id);
    if (Math.hypot(p.x - n.pos.x, p.y - n.pos.y) <= nodeRadius(n) * C.MAP_HOVER_SCALE) return id;
  }
  return null;
}

// Start-up check of MAP_NODES (M2a §4.1, M2c §1.1, M2g §1, M3a §1.2): unique IDs, known levels and
// types, every node in a row (its level's); in each region, its start node alone in its lowest row
// and rows numbered without gaps.
export function validateMap() {
  const ids = C.MAP_NODES.map((n) => n.id);
  if (new Set(ids).size !== ids.length) console.error(`MAP_NODES has duplicate IDs: ${ids.join(', ')}`);
  for (const n of C.MAP_NODES) {
    if (!C.LEVELS[n.levelId]) console.error(`Map node ${n.id}: unknown level "${n.levelId}"`);
    else if (!Number.isInteger(C.LEVELS[n.levelId].row)) console.error(`Map node ${n.id}: its level "${n.levelId}" has no row (levels tab)`);
    if (!C.NODE_TYPES[n.type]) console.error(`Map node ${n.id}: unknown type "${n.type}" (NODE_TYPES)`);
  }
  for (const regionId of C.REGION_ORDER) {
    const rows = C.MAP_NODES.filter((n) => n.region === regionId).map((n) => C.LEVELS[n.levelId]?.row).filter(Number.isInteger);
    if (!rows.length) continue;
    const lowest = Math.min(...rows);
    if (rows.filter((r) => r === lowest).length !== 1) console.error(`Map (${regionId}): the region's start must be alone in its lowest row`);
    for (let r = lowest; r <= Math.max(...rows); r++) if (!rows.includes(r)) console.error(`Map (${regionId}): no node in row ${r} (rows must not skip)`);
  }
}

// ---------------------------------------------------------------------------
// Equipment (M2e §5). Items fit only their own slot; one per slot; swapping is free (on the map).
// ---------------------------------------------------------------------------

// A random item the run doesn't own yet (seeded rng), or null if none is left. The hidden find
// (M2p §3.1): never a Crafted (rarity 0) item, weighted by RARITY_WEIGHT_1/2/3. anyItem (debug
// key I): every unowned item, Crafted ones included, with equal chances.
export function randomUnownedItem(run, rng, { anyItem = false } = {}) {
  const weight = (id) => (anyItem ? 1 : [0, C.RARITY_WEIGHT_1, C.RARITY_WEIGHT_2, C.RARITY_WEIGHT_3][C.ITEMS[id].rarity] ?? 0);
  const left = Object.keys(C.ITEMS).filter((id) => !run.items.includes(id) && weight(id) > 0);
  const total = left.reduce((sum, id) => sum + weight(id), 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const id of left) {
    r -= weight(id);
    if (r < 0) return id;
  }
  return left[left.length - 1];
}

export function addItem(run, itemId) {
  if (!C.ITEMS[itemId] || run.items.includes(itemId)) return false;
  run.items.push(itemId);
  return true;
}

// Equip an owned item in its slot, replacing whatever was there.
export function equipItem(run, itemId) {
  const item = C.ITEMS[itemId];
  if (!item || !run.items.includes(itemId)) return false;
  run.equipped[item.slot] = itemId;
  return true;
}

export function unequipSlot(run, slot) {
  if (!(slot in run.equipped)) return false;
  run.equipped[slot] = null;
  return true;
}

// The player has looked at a slot's items (its popover opened, M2e §4.4): they lose their New
// marks and the slot's badge clears.
export function markSlotSeen(run, slot) {
  for (const id of run.items) {
    if (C.ITEMS[id].slot === slot && !run.seenItems.includes(id)) run.seenItems.push(id);
  }
}

// Debug L on the map (M2g §4): the map again from a new seed. The run's progress stays only if
// the node last entered still exists in the same row (else false: the caller starts a new run).
export function regenerateMap(run, seed) {
  const was = run.currentNodeId ? mapNode(run, run.currentNodeId) : null;
  run.map = generateMap(seed, run.regionId);
  run.traders = rollRunTraders(seed, run.map, run.traders); // M2n §5: the same traders where their nodes remain
  if (!was) return true;
  const now = mapNode(run, was.id);
  return !!now && now.row === was.row;
}
