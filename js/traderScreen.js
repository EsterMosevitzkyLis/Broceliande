// The trader scene's HTML (M2n §4.2, M3e §5): title and speech; the Druid's gold and pack (his
// resources with what the trader pays, his items with their sell price); the trader's goods on the
// blanket (resources with stock, price and tag; item cards; pattern cards); the centre panel with
// the selected deal (quantity, total, before/after, Buy or Sell and why not); Undo last trade and
// Back to the road. Also how dark the scene fade should be. Shown only in the TRADER state. It
// reads game state and calls back for every action; the art is on the canvas (render/trader.js).

import * as C from './config.js';
import { GameState } from './states.js';
import { RESOURCE_ICON_SVG } from './icons.js';
import { MATERIAL_KEYS, resourceName } from './resources.js';
import { drawFramedItemIcon, drawScrollIcon } from './render/items.js';
import { costRowsElement } from './costRows.js';
import { isPatternKnown } from './patterns.js';
import { resourcePrice, sellBundle, itemSellPrice, goodsTag } from './trade.js';
import { currentDeal } from './visit.js';

const CARD_ICON_PX = 52;
const PACK_ICON_PX = 34;
const DEAL_ICON_PX = 92;
const TAGS = { cheap: ['cheap', 'good'], pricey: ['pricey', 'bad'] };

// callbacks: { onSelect(kind, side, id), onStep(delta), onMax(), onDeal(), onUndo(), onLeave() }
export function createTraderScreen(callbacks) {
  const $ = (id) => document.getElementById(id);
  const el = {
    root: $('trader-screen'), title: $('trader-title'), speech: $('trader-speech'),
    goldIcon: $('shop-gold-icon'), gold: $('shop-gold-amount'), packRes: $('shop-pack-res'), packItems: $('shop-pack-items'),
    goodsTitle: $('shop-goods-title'), goodsRes: $('shop-goods-res'), wares: $('shop-wares'),
    centre: $('shop-centre'), hint: $('shop-hint'), deal: $('shop-deal'), dealIcon: $('shop-deal-icon'), dealRes: $('shop-deal-res'),
    dealKind: $('shop-deal-kind'), dealName: $('shop-deal-name'), dealSub: $('shop-deal-sub'), dealDesc: $('shop-deal-desc'), dealCost: $('shop-deal-cost'),
    qty: $('shop-qty'), qtyText: $('shop-qty-text'), less: $('btn-shop-less'), more: $('btn-shop-more'), max: $('btn-shop-max'),
    total: $('shop-total'), preview: $('shop-preview'), action: $('btn-shop-deal'), reason: $('shop-reason'),
    undo: $('btn-trade-undo'), leave: $('btn-trade-leave'),
  };
  el.goldIcon.innerHTML = RESOURCE_ICON_SVG.gold;
  el.dealIcon.width = el.dealIcon.height = DEAL_ICON_PX;
  el.less.addEventListener('click', () => callbacks.onStep(-1));
  el.more.addEventListener('click', () => callbacks.onStep(1));
  el.max.addEventListener('click', () => callbacks.onMax());
  el.action.addEventListener('click', () => callbacks.onDeal());
  el.undo.addEventListener('click', () => callbacks.onUndo());
  el.leave.addEventListener('click', () => callbacks.onLeave());

  const keys = {};
  // Rebuilds a part only when what it shows changes (cheap per-frame comparison).
  const once = (part, key, build) => {
    if (keys[part] === key) return;
    keys[part] = key;
    build();
  };

  // Returns how dark the scene fade should be (0–1) for this screen.
  function update(game) {
    const v = game.visit;
    el.root.hidden = game.state !== GameState.TRADER || !v;
    if (el.root.hidden) {
      for (const k of Object.keys(keys)) delete keys[k];
      return 0;
    }
    const run = game.run;
    const inv = run.inventory;
    const t = v.trader;
    const sel = v.sel;
    const isSel = (kind, side, id) => !!sel && sel.kind === kind && sel.side === side && sel.id === id;
    setText(el.title, `${t.name}'s Cart`);
    setText(el.speech, `“${v.line}”`);
    setText(el.gold, String(inv.gold ?? 0));

    // The Druid's pack: resources he holds (or the trader stocks), then his items.
    const packRes = MATERIAL_KEYS.filter((k) => (inv[k] ?? 0) > 0 || t.offers.includes(k));
    once('packRes', [sel?.kind, sel?.side, sel?.id, ...packRes.map((k) => `${k}${inv[k]}`)].join(','), () => {
      el.packRes.replaceChildren(...packRes.map((k) => {
        const b = sellBundle(t, k);
        const price = b ? `${b.n} → ${b.gold}` : 'Not interested';
        return resourceChip(k, inv[k] ?? 0, price, !!b, null, isSel('resource', 'sell', k), () => callbacks.onSelect('resource', 'sell', k));
      }));
    });
    once('packItems', [sel?.kind, sel?.side, sel?.id, ...run.items.map((id) => `${id}${Object.values(run.equipped).includes(id) ? 'E' : ''}`)].join(','), () => {
      el.packItems.replaceChildren(...(run.items.length ? run.items.map((id) => packItem(id, itemSellPrice(t, id), Object.values(run.equipped).includes(id),
        isSel('item', 'sell', id), () => callbacks.onSelect('item', 'sell', id))) : [emptyNote('No items to sell.')]));
    });

    // The trader's goods: stocked resources, then the item and pattern cards.
    setText(el.goodsTitle, `${t.name}'s goods`);
    once('goodsRes', [sel?.kind, sel?.side, sel?.id, ...t.offers.map((k) => `${k}${t.stock[k]}`)].join(','), () => {
      el.goodsRes.replaceChildren(...t.offers.map((k) => resourceChip(k, t.stock[k], String(resourcePrice(t, k)), true,
        t.stock[k] <= 0 ? ['Sold out', 'poor'] : TAGS[goodsTag(t, k)], isSel('resource', 'buy', k), () => callbacks.onSelect('resource', 'buy', k), t.stock[k] <= 0)));
    });
    const wareState = (kind, id) => (kind === 'item' ? run.items.includes(id) : isPatternKnown(id)) ? 1 : 0;
    const wares = [...t.items.map((g) => ['item', g]), ...t.patterns.map((g) => ['pattern', g])];
    once('wares', [sel?.kind, sel?.side, sel?.id, inv.gold, ...wares.map(([kind, g]) => `${kind}${g.id}${wareState(kind, g.id)}`)].join(','), () => {
      el.wares.replaceChildren(...(wares.length ? wares.map(([kind, g]) => wareCard(kind, g, wareState(kind, g.id), (inv.gold ?? 0) >= g.price,
        isSel(kind, 'buy', g.id), () => callbacks.onSelect(kind, 'buy', g.id))) : [emptyNote('No items or patterns this time.')]));
    });

    // The centre panel: the selected deal.
    const deal = currentDeal(game);
    el.hint.hidden = !!deal;
    el.deal.hidden = !deal;
    const leaving = v.leaving !== null;
    el.undo.disabled = !v.trades.length || leaving;
    el.leave.disabled = leaving;
    if (!deal) {
      setText(el.hint, 'Pick something from his goods to buy, or from your pack to sell.');
      return fade(v);
    }
    once('dealHead', `${deal.kind}|${deal.side}|${deal.id}`, () => fillDealHead(el, deal, inv));
    fillDealBody(el, deal, game, t);
    el.action.disabled = !!deal.blocker || leaving;
    setText(el.reason, deal.blocker ?? '');
    return fade(v);
  }

  return { update };
}

// The deal's picture and words: a resource's icon and price, or an item / pattern shown larger.
function fillDealHead(el, deal, inv) {
  const res = deal.kind === 'resource';
  el.dealRes.hidden = !res;
  el.dealIcon.hidden = res;
  el.dealCost.replaceChildren();
  if (res) {
    el.dealRes.innerHTML = RESOURCE_ICON_SVG[deal.id];
    el.dealName.style.color = '';
    setText(el.dealKind, deal.side === 'buy' ? 'Buy' : 'Sell');
    setText(el.dealName, C.RESOURCES[deal.id].plural);
    setText(el.dealDesc, '');
    return;
  }
  const item = C.ITEMS[deal.id];
  const ctx = el.dealIcon.getContext('2d');
  ctx.clearRect(0, 0, DEAL_ICON_PX, DEAL_ICON_PX);
  if (deal.kind === 'pattern') {
    drawScrollIcon(ctx, DEAL_ICON_PX * 0.3, DEAL_ICON_PX * 0.3, DEAL_ICON_PX * 0.55);
    drawFramedItemIcon(ctx, deal.id, DEAL_ICON_PX * 0.6, DEAL_ICON_PX * 0.6, DEAL_ICON_PX * 0.72);
  } else drawFramedItemIcon(ctx, deal.id, DEAL_ICON_PX / 2, DEAL_ICON_PX / 2, DEAL_ICON_PX - 4);
  setText(el.dealKind, deal.kind === 'pattern' ? 'Pattern: learn to craft' : deal.side === 'buy' ? 'Item' : 'Your item');
  setText(el.dealName, item.name);
  el.dealName.style.color = C.RARITY[item.rarity].frame;
  setText(el.dealDesc, item.description);
  if (deal.kind === 'pattern') {
    const label = document.createElement('div');
    label.className = 'shop-deal-cost-label';
    label.textContent = 'Recipe:';
    el.dealCost.append(label, costRowsElement(C.RECIPES[deal.id].cost, inv));
  }
}

// What changes as the quantity or the purse does: sub-line, stepper, total and before/after.
function fillDealBody(el, deal, game, t) {
  const inv = game.run.inventory;
  const gold = inv.gold ?? 0;
  const res = deal.kind === 'resource';
  const item = res ? null : C.ITEMS[deal.id];
  let sub;
  if (res && deal.side === 'buy') sub = `${deal.price} gold each · ${t.stock[deal.id]} in stock`;
  else if (res) sub = deal.bundle ? `${deal.bundle.n} ${resourceName(deal.id, deal.bundle.n)} → ${deal.bundle.gold} gold` : 'He has no use for these';
  else {
    const equipped = deal.side === 'sell' && Object.values(game.run.equipped).includes(deal.id);
    sub = `${C.RARITY[item.rarity].label} · ${C.SLOT_TYPES[item.slot].label}${equipped ? ' · equipped (selling it unequips it)' : ''}`;
  }
  setText(el.dealSub, sub);
  el.qty.hidden = !res || (!!deal.blocker && deal.max < 1);
  if (res) {
    setText(el.qtyText, `${deal.units} ${resourceName(deal.id, deal.units)}`);
    el.less.disabled = deal.qty <= 1;
    el.more.disabled = deal.max <= deal.qty;
    el.max.disabled = deal.max <= deal.qty;
  }
  const cost = Math.abs(deal.gold);
  setText(el.total, deal.side === 'buy' ? `Price: ${cost} gold` : `He pays: ${cost} gold`);
  const after = gold + deal.gold;
  const parts = [`Gold ${gold} → ${after}`];
  if (res) {
    const have = inv[deal.id] ?? 0;
    parts.push(`${C.RESOURCES[deal.id].plural} ${have} → ${have + (deal.side === 'buy' ? deal.units : -deal.units)}`);
  }
  setText(el.preview, deal.blocker ? '' : parts.join('    '));
  setText(el.action, deal.side === 'buy' ? 'Buy' : 'Sell');
}

// A resource chip: icon, count, a price (with a coin) and a tag. inactive: greyed (sold out).
function resourceChip(k, count, price, coin, tag, selected, onClick, inactive = false) {
  const chip = document.createElement('div');
  chip.className = `shop-chip${selected ? ' selected' : ''}${inactive ? ' soldout' : ''}`;
  chip.title = C.RESOURCES[k].name;
  chip.innerHTML = `<span class="res-icon">${RESOURCE_ICON_SVG[k]}</span><span class="shop-count">${count}</span>`
    + (tag && tag[0] ? `<span class="shop-tag ${tag[1]}">${tag[0]}</span>` : '')
    + `<span class="shop-price${coin ? '' : ' muted'}">${price}${coin ? `<span class="shop-coin">${RESOURCE_ICON_SVG.gold}</span>` : ''}</span>`;
  chip.addEventListener('click', onClick);
  return chip;
}

// One of the Druid's items: icon (rarity frame), name, equipped mark and what the trader pays.
function packItem(id, price, equipped, selected, onClick) {
  const row = document.createElement('div');
  row.className = `shop-pack-item${selected ? ' selected' : ''}`;
  row.append(itemCanvas(id, PACK_ICON_PX));
  const name = document.createElement('span');
  name.className = 'shop-pack-name';
  name.textContent = C.ITEMS[id].name;
  name.style.color = C.RARITY[C.ITEMS[id].rarity].frame;
  row.append(name);
  if (equipped) {
    const mark = document.createElement('span');
    mark.className = 'shop-equipped';
    mark.textContent = 'E';
    mark.title = 'Equipped';
    row.append(mark);
  }
  row.append(goldPrice(price));
  row.addEventListener('click', onClick);
  return row;
}

// An item or pattern card on the blanket: icon, name, rarity and slot, effect, (recipe) and price.
// state 1: already owned / known.
function wareCard(kind, good, state, affordable, selected, onClick) {
  const item = C.ITEMS[good.id];
  const card = document.createElement('div');
  card.className = `shop-card ${kind}${selected ? ' selected' : ''}${state ? ' owned' : ''}`;
  const icon = document.createElement('canvas');
  icon.width = icon.height = CARD_ICON_PX;
  const ctx = icon.getContext('2d');
  if (kind === 'pattern') drawScrollIcon(ctx, CARD_ICON_PX / 2, CARD_ICON_PX / 2, CARD_ICON_PX - 2);
  else drawFramedItemIcon(ctx, good.id, CARD_ICON_PX / 2, CARD_ICON_PX / 2, CARD_ICON_PX - 2);
  const head = document.createElement('div');
  head.className = 'shop-card-head';
  const words = document.createElement('div');
  words.innerHTML = `<div class="shop-card-name"></div><div class="shop-card-sub"></div>`;
  words.firstChild.textContent = item.name;
  words.firstChild.style.color = kind === 'pattern' ? '' : C.RARITY[item.rarity].frame;
  words.lastChild.textContent = `${kind === 'pattern' ? 'Pattern · ' : ''}${C.RARITY[item.rarity].label} · ${C.SLOT_TYPES[item.slot].label}`;
  head.append(icon, words);
  const desc = document.createElement('div');
  desc.className = 'shop-card-desc';
  desc.textContent = item.description;
  const foot = document.createElement('div');
  foot.className = 'shop-card-foot';
  if (kind === 'pattern') foot.append(costRowsElement(C.RECIPES[good.id].cost, C.RECIPES[good.id].cost)); // the recipe, never marked short here
  else foot.append(document.createElement('span'));
  if (state) {
    const owned = document.createElement('span');
    owned.className = 'shop-owned';
    owned.textContent = kind === 'pattern' ? 'known' : 'owned';
    foot.append(owned);
  } else foot.append(goldPrice(good.price, !affordable));
  card.append(head, desc, foot);
  card.addEventListener('click', onClick);
  return card;
}

function itemCanvas(id, px) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  drawFramedItemIcon(c.getContext('2d'), id, px / 2, px / 2, px - 2);
  return c;
}

function goldPrice(n, short = false) {
  const span = document.createElement('span');
  span.className = `shop-price${short ? ' short' : ''}`;
  span.innerHTML = `${n}<span class="shop-coin">${RESOURCE_ICON_SVG.gold}</span>`;
  return span;
}

function emptyNote(text) {
  const d = document.createElement('div');
  d.className = 'shop-empty';
  d.textContent = text;
  return d;
}

// The fade (M2n §1): from black as the scene opens, to black while leaving.
function fade(v) {
  const opacity = v.leaving !== null ? v.leaving / C.TRADER_FADE_TIME : 1 - v.time / C.TRADER_FADE_TIME;
  return Math.max(0, Math.min(1, opacity));
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
