// The Wandering Trader's shop (M3e §3–§4, replacing M2n's barter): traders as fixed characters
// (profiles), each visit's rolled stock, prices and goods, and the shop's gold prices. Pure state
// and rules, no drawing; the visit (visit.js) changes the run, the scene (traderScreen.js,
// render/trader.js) reads it.
//
// A trader: { profileId, name, look, mult: { resource: price multiplier }, stock: { resource: count },
//   offers: [resources stocked], items: [{ id, price }], patterns: [{ id, price }],
//   rolls: { itemCount, patternCount } (as rolled, before any empty pool skipped a slot) }

import * as C from './config.js';
import { MATERIAL_KEYS } from './resources.js';
import { isPatternKnown } from './patterns.js';

// §4: a resource is sold back in bundles of 1 to this many units.
const MAX_BUNDLE = 10;

// The profiles a trader can be (not `default`, the fallback), in the tab's order.
export function traderProfileIds() {
  return Object.keys(C.TRADER_PROFILES).filter((id) => id !== 'default');
}

// §3.1: a profile for a Trader node, from those allowed in the region and not yet used this run;
// if every allowed one is used, any allowed one (and `default` if the region allows none).
export function pickProfile(rng, regionId, used = []) {
  const allowed = traderProfileIds().filter((id) => !C.TRADER_PROFILES[id].regions || C.TRADER_PROFILES[id].regions.includes(regionId));
  const free = allowed.filter((id) => !used.includes(id));
  const pool = free.length ? free : allowed;
  return pool.length ? pool[rng.int(0, pool.length - 1)] : 'default';
}

// A profile's weighted table (§3.2) or stock line (§3.3), else `default`'s; a stock line `default`
// lacks too falls back to the trade tab's stock columns at price ×1.
function table(profileId, name) {
  return C.TRADER_PROFILES[profileId].tables[name] ?? C.TRADER_PROFILES.default.tables[name] ?? [];
}

function stockLine(profileId, k) {
  return C.TRADER_PROFILES[profileId].stock[k] ?? C.TRADER_PROFILES.default.stock[k]
    ?? { stockMin: C.TRADE[k].stockMin, stockMax: C.TRADE[k].stockMax, priceMin: 1, priceMax: 1 };
}

// A value from a weighted table ([{ value, weight }]), or null if no row has weight.
function weighted(rng, rows) {
  const total = rows.reduce((sum, r) => sum + Math.max(0, r.weight), 0);
  if (total <= 0) return null;
  let x = rng.next() * total;
  for (const r of rows) {
    x -= Math.max(0, r.weight);
    if (x < 0) return r.value;
  }
  return rows[rows.length - 1].value;
}

// Rolls a visit to a trader of `profileId` (§3.2, §3.3), from a seeded rng. regionId: where it
// stands (Peat is stocked only where the trade tab allows); ownedItems: the run's items (never sold).
export function rollTrader(rng, { profileId, regionId, ownedItems = [] }) {
  const profile = C.TRADER_PROFILES[profileId];
  const mult = {};
  const stock = {};
  const offers = [];
  for (const k of MATERIAL_KEYS) {
    const line = stockLine(profileId, k);
    mult[k] = rng.range(line.priceMin, line.priceMax);
    stock[k] = rng.int(line.stockMin, line.stockMax);
    if (C.TRADE[k].regions && !C.TRADE[k].regions.includes(regionId)) stock[k] = 0;
    else offers.push(k);
  }
  const rolls = {};
  // Items: rarity 1–3 only (Crafted items are never sold), not owned, not already in this shop.
  const items = rollGoods(rng, profileId, 'item', rolls,
    (rarity, taken) => Object.keys(C.ITEMS).filter((id) => rarity > 0 && C.ITEMS[id].rarity === rarity && !ownedItems.includes(id) && !taken.includes(id)),
    (id) => shopPrice(itemBasePrice(id), profile.itemPriceMult, rng));
  // Patterns: any rarity (Crafted ones too), not known, not already in this shop.
  const patterns = rollGoods(rng, profileId, 'pattern', rolls,
    (rarity, taken) => Object.keys(C.RECIPES).filter((id) => C.ITEMS[id]?.rarity === rarity && !isPatternKnown(id) && !taken.includes(id)),
    (id) => shopPrice(patternBasePrice(id), profile.patternPriceMult, rng));
  const look = Math.max(0, traderProfileIds().indexOf(profileId));
  return { profileId, name: profile.name || 'Wandering Trader', look, mult, stock, offers, items, patterns, rolls };
}

// §3.2 steps 1–5: roll the count, then a rarity per slot and a random good of it. A rarity whose
// pool is empty is passed over for the others with weight; with none left the slot is skipped.
function rollGoods(rng, profileId, kind, rolls, pool, price) {
  const count = weighted(rng, table(profileId, `${kind}Count`)) ?? 0;
  rolls[`${kind}Count`] = count;
  const goods = [];
  for (let i = 0; i < count; i++) {
    const taken = goods.map((g) => g.id);
    const rarity = weighted(rng, table(profileId, `${kind}Rarity`).filter((r) => r.weight > 0 && pool(r.value, taken).length));
    if (rarity === null) continue;
    const ids = pool(rarity, taken);
    const id = ids[rng.int(0, ids.length - 1)];
    goods.push({ id, price: price(id) });
  }
  return goods;
}

// ---------------------------------------------------------------------------
// Prices (§4)
// ---------------------------------------------------------------------------

// An item's (or pattern's) base price: its own cell, else its rarity's default.
export function itemBasePrice(id) {
  return C.ITEMS[id].price ?? C.ITEM_PRICE[C.ITEMS[id].rarity];
}

export function patternBasePrice(id) {
  return C.RECIPES[id].patternPrice ?? C.PATTERN_PRICE[C.ITEMS[id].rarity];
}

// What the trader sells it for: base × the profile's multiplier × this visit's jitter, to the nearest 5.
function shopPrice(base, mult, rng) {
  const j = C.SHOP_PRICE_JITTER;
  return Math.max(5, Math.round((base * mult * rng.range(1 - j, 1 + j)) / 5) * 5);
}

// What the trader pays for one of the player's items: base × ITEM_SELL_FRACTION × the profile's
// itemBuyMult, rounded down to 5 (at least 5).
export function itemSellPrice(trader, id) {
  const value = itemBasePrice(id) * C.ITEM_SELL_FRACTION * C.TRADER_PROFILES[trader.profileId].itemBuyMult;
  return Math.max(5, Math.floor(value / 5 + 1e-9) * 5);
}

// Gold for one unit bought from the trader.
export function resourcePrice(trader, k) {
  return Math.ceil(C.TRADE[k].baseValue * C.GOLD_PER_VALUE * trader.mult[k] - 1e-9);
}

// The bundle the trader buys a resource in: { n, gold } (n units → gold), or null when even
// MAX_BUNDLE units are worth less than a coin ("Not interested"). The unit is worth price ×
// RESOURCE_SELL_FRACTION; the bundle is the smallest whose worth is closest to a whole number of
// gold without going over.
export function sellBundle(trader, k) {
  const unit = resourcePrice(trader, k) * C.RESOURCE_SELL_FRACTION;
  let best = null;
  for (let n = 1; n <= MAX_BUNDLE; n++) {
    const gold = Math.floor(n * unit + 1e-9);
    if (gold < 1) continue;
    const waste = n * unit - gold;
    if (!best || waste < best.waste - 1e-9) best = { n, gold, waste };
  }
  return best && { n: best.n, gold: best.gold };
}

// Price tag on the trader's goods (§5.1): 'cheap', 'pricey' or null, from the multiplier.
export function goodsTag(trader, k) {
  const m = trader.mult[k];
  return m <= C.TRADE_TAG_CHEAP ? 'cheap' : m >= C.TRADE_TAG_PRICEY ? 'pricey' : null;
}

// The map tooltip's hints (§5.3): "1 item (Rare), 2 patterns (Common, Crafted)" and the cheap resources.
export function shopSummary(trader) {
  const part = (goods, word) => {
    if (!goods.length) return null;
    const rarities = [...new Set(goods.map((g) => C.ITEMS[g.id].rarity))].sort((a, b) => (a || 4) - (b || 4));
    return `${goods.length} ${word}${goods.length > 1 ? 's' : ''} (${rarities.map((r) => C.RARITY[r].label).join(', ')})`;
  };
  return [part(trader.items, 'item'), part(trader.patterns, 'pattern')].filter(Boolean).join(', ') || 'resources only';
}

export function cheapResources(trader) {
  return trader.offers.filter((k) => goodsTag(trader, k) === 'cheap');
}

// A random line of `kind` (§7) for this trader: their own lines of that kind if they have any,
// else the generic ones; {resource} is filled with `name`.
export function traderLine(rng, kind, profileId, name = '') {
  const all = C.TRADER_TEXT[kind] ?? [];
  const own = all.filter((l) => l.trader === profileId);
  const lines = own.length ? own : all.filter((l) => !l.trader);
  if (!lines.length) return '';
  return lines[rng.int(0, lines.length - 1)].text.replaceAll('{resource}', name);
}
