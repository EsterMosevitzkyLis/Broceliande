// A visit to a Wandering Trader (M2n §4, M3e §5): the TRADER state's own state and its actions.
// The player's pack is the run itself (run.inventory with its gold, run.items), changed directly;
// game.resources mirrors the inventory for the HUD.
//
// game.visit: { trader, nodeId (null for debug Shift+T), rng (dialogue), trades (undo stack),
//   sel: { kind: 'resource' | 'item' | 'pattern', side: 'buy' | 'sell', id } or null, qty (units
//   to buy, or bundles to sell, of a resource), line (speech line), time (s since arrival,
//   simulation time), lastTradeAt, leaving (s since Back to the road, or null) }

import * as C from './config.js';
import { GameState } from './states.js';
import { setState } from './game.js';
import { createRng } from './rng.js';
import { mapNode, nodeState, addItem } from './run.js';
import { resourceName } from './resources.js';
import { learnPattern, unlearnPattern, isPatternKnown } from './patterns.js';
import { rollTrader, traderProfileIds, resourcePrice, sellBundle, itemSellPrice, traderLine } from './trade.js';
import { events } from './events.js';

let debugTraders = 0; // Shift+T traders opened this page: the next profile each time (§8)

// Entering a Trader node (MAP → TRADER): its trader as rolled with the map.
export function enterTrader(game, nodeId) {
  if (game.state !== GameState.MAP || nodeState(game.run, nodeId) !== 'available') return false;
  const trader = game.run.traders[nodeId];
  if (!trader) return false;
  game.run.currentNodeId = nodeId;
  return openVisit(game, trader, nodeId);
}

// Debug Shift+T (M3e §8): on the map, a trader scene with no node and no map progress; pressing it
// again (on the map, or in a debug trader's scene) cycles through the profiles.
export function openDebugTrader(game) {
  const inDebugShop = game.state === GameState.TRADER && game.visit && game.visit.nodeId === null && game.visit.leaving === null;
  if (game.state !== GameState.MAP && !inDebugShop) return false;
  const ids = traderProfileIds();
  const profileId = ids[debugTraders % ids.length];
  debugTraders++;
  const rng = createRng((game.run.seed + 104729 * debugTraders) >>> 0);
  const trader = rollTrader(rng, { profileId, regionId: game.run.regionId, ownedItems: game.run.items });
  if (inDebugShop) {
    game.visit = newVisit(game, trader, null);
    events.emit('traderGreet', {});
    return true;
  }
  return openVisit(game, trader, null);
}

function openVisit(game, trader, nodeId) {
  if (!setState(game, GameState.TRADER)) return false;
  game.visit = newVisit(game, trader, nodeId);
  syncResources(game);
  events.emit('traderGreet', {});
  return true;
}

function newVisit(game, trader, nodeId) {
  const rng = createRng((game.run.seed ^ Math.imul(trader.look + 1, 2654435761) ^ Math.imul(game.run.regionVisits, 0x9e3779b1)) >>> 0);
  return { trader, nodeId, rng, trades: [], sel: null, qty: 1, line: traderLine(rng, 'greet', trader.profileId), time: 0, lastTradeAt: -Infinity, leaving: null };
}

// Advances the visit's clock; Back to the road finishes after the fade (TRADER_FADE_TIME).
export function updateVisit(game, dt) {
  const v = game.visit;
  v.time += dt;
  if (v.leaving === null) return;
  v.leaving += dt;
  if (v.leaving >= C.TRADER_FADE_TIME) finishVisit(game);
}

// Click on something in the trader's goods (side 'buy') or the Druid's pack ('sell') (§5.2): the
// centre panel shows it; clicking it again clears it. A sold-out resource or something the player
// can't afford gets a line from the trader.
export function selectGoods(game, kind, side, id) {
  const v = game.visit;
  if (v.leaving !== null) return;
  const same = v.sel && v.sel.kind === kind && v.sel.side === side && v.sel.id === id;
  v.sel = same ? null : { kind, side, id };
  v.qty = 1;
  if (!v.sel || side !== 'buy') return;
  const deal = currentDeal(game);
  if (deal.blocker === 'Sold out') {
    v.line = traderLine(v.rng, 'soldout', v.trader.profileId, resourceName(id, 2));
    events.emit('soldOut', {});
  } else if (deal.blocker === 'Not enough gold') {
    v.line = traderLine(v.rng, 'poor', v.trader.profileId);
  }
}

// The selected deal (§5.2), or null: { kind, side, id, price (gold per unit, bundle or good),
// bundle ({ n, gold } when selling a resource), qty, max, units (resource units moved), gold
// (gold the player gains, negative when paying), blocker (why it can't be made now, or null) }.
export function currentDeal(game) {
  const v = game.visit;
  const s = v.sel;
  if (!s) return null;
  const run = game.run;
  const gold = run.inventory.gold ?? 0;
  const t = v.trader;
  if (s.kind === 'resource' && s.side === 'buy') {
    const price = resourcePrice(t, s.id);
    const max = Math.min(t.stock[s.id], Math.floor(gold / price));
    const qty = clampQty(v.qty, max);
    const blocker = t.stock[s.id] <= 0 ? 'Sold out' : gold < price ? 'Not enough gold' : null;
    return { ...s, price, qty, max, units: qty, gold: -price * qty, blocker };
  }
  if (s.kind === 'resource') {
    const bundle = sellBundle(t, s.id);
    if (!bundle) return { ...s, bundle, qty: 1, max: 0, units: 0, gold: 0, blocker: 'Not interested' };
    const max = Math.floor((run.inventory[s.id] ?? 0) / bundle.n);
    const qty = clampQty(v.qty, max);
    const blocker = max < 1 ? `You need ${bundle.n} ${resourceName(s.id, bundle.n)} to sell` : null;
    return { ...s, bundle, price: bundle.gold, qty, max, units: bundle.n * qty, gold: bundle.gold * qty, blocker };
  }
  if (s.side === 'sell') {
    const price = itemSellPrice(t, s.id);
    return { ...s, price, qty: 1, max: 1, units: 0, gold: price, blocker: run.items.includes(s.id) ? null : 'No longer in your pack' };
  }
  const good = (s.kind === 'item' ? t.items : t.patterns).find((g) => g.id === s.id);
  const blocker = s.kind === 'item' && run.items.includes(s.id) ? 'Already owned'
    : s.kind === 'pattern' && isPatternKnown(s.id) ? 'Already known'
      : gold < good.price ? 'Not enough gold' : null;
  return { ...s, price: good.price, qty: 1, max: 1, units: 0, gold: -good.price, blocker };
}

function clampQty(qty, max) {
  return Math.max(1, Math.min(qty, Math.max(1, max)));
}

// − / + / Max (§5.2): the quantity between 1 and the most possible (resources only).
export function stepQty(game, delta) {
  const deal = currentDeal(game);
  if (deal) game.visit.qty = clampQty(deal.qty + delta, deal.max);
}

export function maxQty(game) {
  const deal = currentDeal(game);
  if (deal) game.visit.qty = clampQty(deal.max, deal.max);
}

// Buy / Sell (§5.2): makes the selected deal and keeps it for Undo.
export function makeDeal(game) {
  const v = game.visit;
  const deal = currentDeal(game);
  if (v.leaving !== null || !deal || deal.blocker) return false;
  const trade = { kind: deal.kind, side: deal.side, id: deal.id, units: deal.units, gold: deal.gold };
  if (deal.kind === 'item' && deal.side === 'sell') {
    trade.slot = Object.keys(game.run.equipped).find((slot) => game.run.equipped[slot] === deal.id) ?? null;
    trade.seen = game.run.seenItems.includes(deal.id);
  }
  applyTrade(game.run, v.trader, trade, 1);
  v.trades.push(trade);
  v.lastTradeAt = v.time;
  const name = deal.kind === 'resource' ? resourceName(deal.id, 2) : C.ITEMS[deal.id].name;
  v.line = traderLine(v.rng, deal.side, v.trader.profileId, name);
  if (deal.kind !== 'resource' || deal.side === 'sell') v.sel = null; // a good changed hands: nothing left to show
  else v.qty = clampQty(v.qty, currentDeal(game).max);
  syncResources(game);
  events.emit(deal.side === 'buy' ? 'shopBuy' : 'shopSell', { pattern: deal.kind === 'pattern' });
  return true;
}

// Undo last trade (§5.2): repeatable back to the start of the visit; a bought pattern is unlearned.
export function undoVisitTrade(game) {
  const v = game.visit;
  if (v.leaving !== null || !v.trades.length) return false;
  applyTrade(game.run, v.trader, v.trades.pop(), -1);
  syncResources(game);
  events.emit('tradeUndo', {});
  return true;
}

// sign 1 makes the trade, −1 undoes it.
function applyTrade(run, trader, trade, sign) {
  const { kind, side, id, units, gold } = trade;
  run.inventory.gold = (run.inventory.gold ?? 0) + sign * gold;
  if (kind === 'resource') {
    const got = side === 'buy' ? units : -units;
    run.inventory[id] += sign * got;
    if (side === 'buy') trader.stock[id] -= sign * units; // what the player sells doesn't join the stock
    return;
  }
  if (kind === 'pattern') {
    if (sign > 0) learnPattern(id);
    else unlearnPattern(id);
    return;
  }
  const gains = (side === 'buy') === (sign > 0);
  if (gains) {
    addItem(run, id);
    if (side === 'buy') run.seenItems = run.seenItems.filter((x) => x !== id); // New on the map
    else {
      if (trade.seen && !run.seenItems.includes(id)) run.seenItems.push(id);
      if (trade.slot) run.equipped[trade.slot] = id;
    }
  } else {
    run.items = run.items.filter((x) => x !== id);
    run.seenItems = run.seenItems.filter((x) => x !== id);
    for (const slot of Object.keys(run.equipped)) if (run.equipped[slot] === id) run.equipped[slot] = null; // selling unequips it
  }
}

// Back to the road (§4.4): a farewell line, the fade, then the map.
export function leaveVisit(game) {
  const v = game.visit;
  if (v.leaving !== null) return;
  v.leaving = 0;
  v.line = traderLine(v.rng, 'leave', v.trader.profileId);
}

// The visit is final: a Trader node is completed (its `next` nodes become available); a debug
// trader leaves the map as it was.
function finishVisit(game) {
  const { nodeId } = game.visit;
  if (nodeId && !game.run.completedNodeIds.includes(nodeId)) game.run.completedNodeIds.push(nodeId);
  game.visit = null;
  syncResources(game);
  setState(game, GameState.MAP);
}

function syncResources(game) {
  game.resources = { ...game.run.inventory };
}

export function isTraderNode(run, nodeId) {
  return mapNode(run, nodeId)?.type === 'trader';
}
