// A visit to a Tinker's Rest (M2p §4): the TINKER state's own state and its actions. Crafting
// spends the carried pack (run.inventory) directly, as at a Trader; game.resources mirrors it for
// the HUD.
//
// game.tinker: { nodeId (null for debug Shift+K), tab ('all' or a slot), selected (an item ID or
//   null), crafts (undo stack: [{ itemId, cost }]), craftAt (scene time of the last Craft, for the
//   animation), craftItem, appeared (its item has burst out), time (s since arrival, simulation
//   time), crackleAt (the forge's next crackle), crackles, leaving (s since Back to the road, or null) }

import * as C from './config.js';
import { GameState } from './states.js';
import { setState } from './game.js';
import { mapNode, nodeState, addItem } from './run.js';
import { canAfford, deduct, add } from './resources.js';
import { knownPatterns, isPatternKnown } from './patterns.js';
import { events } from './events.js';

// Entering a Tinker's Rest node (MAP → TINKER).
export function enterTinker(game, nodeId) {
  if (game.state !== GameState.MAP || nodeState(game.run, nodeId) !== 'available') return false;
  game.run.currentNodeId = nodeId;
  return openTinker(game, nodeId);
}

// Debug Shift+K on the map (§6): the scene with no node and no map progress.
export function openDebugTinker(game) {
  if (game.state !== GameState.MAP) return false;
  return openTinker(game, null);
}

function openTinker(game, nodeId) {
  if (!setState(game, GameState.TINKER)) return false;
  game.tinker = {
    nodeId, tab: 'all', selected: null, crafts: [], craftAt: -Infinity, craftItem: null, appeared: true,
    time: 0, crackleAt: C.FORGE_CRACKLE_GAPS[0], crackles: 0, leaving: null,
  };
  game.tinker.selected = recipesInTab('all').find(isPatternKnown) ?? null;
  syncResources(game);
  return true;
}

// Every recipe's item ID in the book's order (the recipes tab's), or a slot's only.
export function recipesInTab(tab) {
  return Object.keys(C.RECIPES).filter((id) => C.ITEMS[id] && (tab === 'all' || C.ITEMS[id].slot === tab));
}

// Why this recipe can't be crafted now, or null (§4.3).
export function craftBlocker(run, itemId) {
  if (!isPatternKnown(itemId)) return 'Pattern not known';
  if (run.items.includes(itemId)) return 'Already owned';
  if (!canAfford(run.inventory, C.RECIPES[itemId].cost)) return 'Not enough resources';
  return null;
}

// Known patterns that could be crafted now: the map tooltip's "Craftable now" (§4.1).
export function craftableCount(run) {
  return knownPatterns().filter((id) => C.RECIPES[id] && !craftBlocker(run, id)).length;
}

// Craft and Undo wait while the forge is still at work on the last craft (visual only).
export function isCrafting(game) {
  return game.tinker.time - game.tinker.craftAt < C.CRAFT_ANIM.end;
}

export function selectTab(game, tab) {
  const v = game.tinker;
  if (v.tab === tab) return;
  v.tab = tab;
  if (!recipesInTab(tab).includes(v.selected)) v.selected = recipesInTab(tab).find(isPatternKnown) ?? null;
}

// Only a known recipe opens its page (§4.2); an unknown one stays `???`.
export function selectRecipe(game, itemId) {
  if (isPatternKnown(itemId)) game.tinker.selected = itemId;
}

// Craft (§4.3): pay the recipe, add the item to the run (New in its slot on the map), animate.
export function craft(game) {
  const v = game.tinker;
  const id = v.selected;
  if (!id || v.leaving !== null || isCrafting(game) || craftBlocker(game.run, id)) return false;
  const cost = C.RECIPES[id].cost;
  deduct(game.run.inventory, cost);
  addItem(game.run, id);
  game.run.seenItems = game.run.seenItems.filter((x) => x !== id); // marked New on the map
  v.crafts.push({ itemId: id, cost });
  v.craftAt = v.time;
  v.craftItem = id;
  v.appeared = false;
  syncResources(game);
  events.emit('craftHammer', {});
  return true;
}

// Undo last craft (§4.3): the item goes, the resources come back; repeatable until leaving.
export function undoCraft(game) {
  const v = game.tinker;
  if (v.leaving !== null || isCrafting(game) || !v.crafts.length) return false;
  const { itemId, cost } = v.crafts.pop();
  game.run.items = game.run.items.filter((x) => x !== itemId);
  add(game.run.inventory, cost);
  syncResources(game);
  return true;
}

// Advances the scene's clock: the item's burst, the forge's quiet crackle, and Back to the road
// finishing after the fade.
export function updateTinker(game, dt) {
  const v = game.tinker;
  v.time += dt;
  if (!v.appeared && v.time - v.craftAt >= C.CRAFT_ANIM.appear) {
    v.appeared = true;
    events.emit('craftComplete', {});
  }
  if (v.time >= v.crackleAt) {
    events.emit('forgeAmbience', {});
    v.crackles++;
    v.crackleAt += C.FORGE_CRACKLE_GAPS[v.crackles % C.FORGE_CRACKLE_GAPS.length];
  }
  if (v.leaving === null) return;
  v.leaving += dt;
  if (v.leaving >= C.TINKER_FADE_TIME) finishTinker(game);
}

// Back to the road (§4.3).
export function leaveTinker(game) {
  if (game.tinker.leaving === null) game.tinker.leaving = 0;
}

// The visit is final: the node is completed (its `next` nodes become available); a debug visit
// leaves the map as it was. New items are equipped on the map as usual.
function finishTinker(game) {
  const { nodeId } = game.tinker;
  if (nodeId && !game.run.completedNodeIds.includes(nodeId)) game.run.completedNodeIds.push(nodeId);
  game.tinker = null;
  syncResources(game);
  setState(game, GameState.MAP);
}

function syncResources(game) {
  game.resources = { ...game.run.inventory };
}

export function isTinkerNode(run, nodeId) {
  return mapNode(run, nodeId)?.type === 'tinker';
}
