// A visit to a village (M6a §2.3, Rootkeeper Grove): the VILLAGE state's own state and its actions.
// Its two tabs are the Wandering Trader's shop (visit.js, with the village's trader as rolled with
// the map) and the Tinker's Rest book (tinker.js); both run on game.visit and game.tinker as in their
// own scenes, but with no node of their own: the village completes its node on leaving. One Undo
// stack covers both tabs until you leave.
//
// game.village: { nodeId, tab ('trade' | 'craft'), history (the undo stack: 'trade' or 'craft' per
//   deal or craft, newest last), time (s since arrival, simulation time), leaving (s since Back to
//   the road, or null) }

import * as C from './config.js';
import { GameState } from './states.js';
import { setState } from './game.js';
import { mapNode, nodeState } from './run.js';
import { newVisit, makeDeal, undoVisitTrade, updateVisit } from './visit.js';
import { newTinkerVisit, craft, undoCraft, updateTinker, isCrafting } from './tinker.js';
import { traderLine } from './trade.js';
import { events } from './events.js';

export const VILLAGE_TABS = ['trade', 'craft'];

// Entering a village node (MAP → VILLAGE), on its Trade tab.
export function enterVillage(game, nodeId) {
  if (game.state !== GameState.MAP || nodeState(game.run, nodeId) !== 'available') return false;
  const trader = game.run.traders[nodeId];
  if (!trader || !setState(game, GameState.VILLAGE)) return false;
  game.run.currentNodeId = nodeId;
  game.village = { nodeId, tab: 'trade', history: [], time: 0, leaving: null };
  game.visit = newVisit(game, trader, null);
  game.tinker = newTinkerVisit(null);
  game.tinker.crackleAt = Infinity; // no forge here: its crackle is the Tinker's Rest's
  syncResources(game);
  events.emit('traderGreet', {});
  return true;
}

export function isVillageNode(run, nodeId) {
  return mapNode(run, nodeId)?.type === 'village';
}

export function selectVillageTab(game, tab) {
  if (VILLAGE_TABS.includes(tab) && game.village.leaving === null) game.village.tab = tab;
}

// Buy / Sell and Craft, each kept on the shared undo stack.
export function villageDeal(game) {
  if (game.village.leaving !== null || !makeDeal(game)) return false;
  game.village.history.push('trade');
  return true;
}

export function villageCraft(game) {
  if (game.village.leaving !== null || !craft(game)) return false;
  game.village.history.push('craft');
  return true;
}

// Undo (either tab's button): the last deal or craft, whichever tab it was made in.
export function canUndoVillage(game) {
  const v = game.village;
  const last = v.history[v.history.length - 1];
  return v.leaving === null && !!last && !(last === 'craft' && isCrafting(game));
}

export function undoVillage(game) {
  if (!canUndoVillage(game)) return false;
  const last = game.village.history.pop();
  const done = last === 'trade' ? undoVisitTrade(game) : undoCraft(game);
  if (!done) game.village.history.push(last);
  return done;
}

// Back to the road: the trader's farewell line, the fade, then the map with the node completed.
export function leaveVillage(game) {
  const v = game.village;
  if (v.leaving !== null) return;
  v.leaving = 0;
  game.visit.line = traderLine(game.visit.rng, 'leave', game.visit.trader.profileId);
}

// Advances the scene's clock (both tabs': the trader's lines, the craft animation's sound cues);
// Back to the road finishes after the fade.
export function updateVillage(game, dt) {
  const v = game.village;
  v.time += dt;
  updateVisit(game, dt);
  updateTinker(game, dt);
  if (v.leaving === null) return;
  v.leaving += dt;
  if (v.leaving >= C.TRADER_FADE_TIME) finishVillage(game);
}

// The fade (M2n §1): from black as the scene opens, to black while leaving.
export function villageFade(game) {
  const v = game.village;
  if (!v) return 0;
  const opacity = v.leaving !== null ? v.leaving / C.TRADER_FADE_TIME : 1 - v.time / C.TRADER_FADE_TIME;
  return Math.max(0, Math.min(1, opacity));
}

function finishVillage(game) {
  const { nodeId } = game.village;
  if (!game.run.completedNodeIds.includes(nodeId)) game.run.completedNodeIds.push(nodeId);
  game.village = null;
  game.visit = null;
  game.tinker = null;
  syncResources(game);
  setState(game, GameState.MAP);
}

function syncResources(game) {
  game.resources = { ...game.run.inventory };
}
