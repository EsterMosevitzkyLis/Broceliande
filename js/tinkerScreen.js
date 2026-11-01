// The Tinker's Rest's HTML (M2p §4.2–4.3): the open book's slot tabs, its recipe list (left page)
// and the selected recipe's page (right page) with Craft; Undo last craft and Back to the road;
// plus how dark the scene fade should be. Shown only in the TINKER state. It reads game state and
// calls back for every action; the art is on the canvas (render/tinker.js).

import * as C from './config.js';
import { GameState } from './states.js';
import { drawSlotIcon, drawFramedItemIcon } from './render/items.js';
import { costRowsElement, costRowsKey } from './costRows.js';
import { isPatternKnown, knownPatterns, totalPatterns } from './patterns.js';
import { recipesInTab, craftBlocker, isCrafting } from './tinker.js';

const TABS = ['all', ...Object.keys(C.SLOT_TYPES)];
const TAB_ICON_PX = 30;
const ROW_ICON_PX = 26;
const DETAIL_ICON_PX = 120;
// Rarity colours for text on the book's parchment: the rarity frame colours (C.RARITY), darkened
// so they read on the pale page.
const PAGE_RARITY_COLOR = { 0: '#6a3aa8', 1: '#7a4a22', 2: '#2f7a2c', 3: '#94700c' };

// callbacks: { onTab(tab), onSelect(itemId), onCraft(), onUndo(), onLeave() }
export function createTinkerScreen(callbacks) {
  const $ = (id) => document.getElementById(id);
  const el = {
    root: $('tinker-screen'), book: $('tinker-book'), tabs: $('tinker-tabs'), count: $('tinker-count'), list: $('tinker-list'),
    detail: $('tinker-detail'), empty: $('tinker-empty'), icon: $('tinker-icon'), name: $('tinker-name'),
    rarity: $('tinker-rarity'), desc: $('tinker-desc'), cost: $('tinker-cost'), craft: $('btn-craft'),
    reason: $('tinker-reason'), undo: $('btn-craft-undo'), leave: $('btn-tinker-leave'),
  };
  const B = C.TINKER_SCENE.book;
  Object.assign(el.book.style, { left: `${B.x}px`, top: `${B.y}px`, width: `${B.w}px`, height: `${B.h}px` });
  el.icon.width = el.icon.height = DETAIL_ICON_PX;
  const tabEls = buildTabs(el.tabs, callbacks);
  el.craft.addEventListener('click', () => callbacks.onCraft());
  el.undo.addEventListener('click', () => callbacks.onUndo());
  el.leave.addEventListener('click', () => callbacks.onLeave());

  let listKey = null;
  let detailKey = null;
  let costKey = null;

  // Returns how dark the scene fade should be (0–1) for this screen.
  function update(game) {
    const v = game.tinker;
    el.root.hidden = game.state !== GameState.TINKER || !v;
    if (el.root.hidden) {
      listKey = detailKey = costKey = null;
      return 0;
    }
    const run = game.run;
    for (const tab of TABS) {
      if (tabEls[tab].classList.contains('selected') !== (v.tab === tab)) tabEls[tab].classList.toggle('selected', v.tab === tab);
    }
    setText(el.count, `Patterns known: ${knownPatterns().filter((id) => C.RECIPES[id]).length} / ${totalPatterns()}`);

    // The left page: every recipe of the tab, rebuilt only when what it shows changes.
    const ids = recipesInTab(v.tab);
    const key = [v.tab, v.selected, ...ids.map((id) => `${id}:${isPatternKnown(id) ? 1 : 0}${craftBlocker(run, id) ? 0 : 1}${run.items.includes(id) ? 1 : 0}`)].join(',');
    if (key !== listKey) {
      listKey = key;
      renderList(el.list, ids, v.selected, run, callbacks);
    }

    // The right page: the selected known recipe.
    const id = v.selected;
    el.empty.hidden = !!id;
    el.detail.hidden = !id;
    if (!id) {
      setText(el.empty, knownPatterns().length ? 'Choose a pattern from the list.' : 'You know no patterns yet. Search the wilds for them.');
      return fade(v);
    }
    if (id !== detailKey) {
      detailKey = id;
      const item = C.ITEMS[id];
      const ctx = el.icon.getContext('2d');
      ctx.clearRect(0, 0, DETAIL_ICON_PX, DETAIL_ICON_PX);
      drawFramedItemIcon(ctx, id, DETAIL_ICON_PX / 2, DETAIL_ICON_PX / 2, DETAIL_ICON_PX - 4);
      setText(el.name, item.name);
      setText(el.rarity, `${C.RARITY[item.rarity].label} · ${C.SLOT_TYPES[item.slot].label}`);
      el.rarity.style.color = PAGE_RARITY_COLOR[item.rarity];
      setText(el.desc, item.description);
    }
    const cost = C.RECIPES[id].cost;
    const ck = `${id}|${costRowsKey(cost, run.inventory)}`;
    if (ck !== costKey) {
      costKey = ck;
      el.cost.replaceChildren(costRowsElement(cost, run.inventory));
    }
    const blocker = craftBlocker(run, id);
    const leaving = v.leaving !== null;
    const busy = isCrafting(game);
    el.craft.disabled = !!blocker || leaving || busy;
    setText(el.reason, blocker ?? '');
    el.undo.disabled = !v.crafts.length || leaving || busy;
    el.leave.disabled = leaving;
    return fade(v);
  }

  return { update };
}

// The fade (M2n §1): from black as the scene opens, to black while leaving.
function fade(v) {
  const opacity = v.leaving !== null ? v.leaving / C.TINKER_FADE_TIME : 1 - v.time / C.TINKER_FADE_TIME;
  return Math.max(0, Math.min(1, opacity));
}

// The tabs along the top of the book: All, then one per slot with its icon.
function buildTabs(box, callbacks) {
  const out = {};
  for (const tab of TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tinker-tab';
    if (tab !== 'all') {
      const icon = document.createElement('canvas');
      icon.width = icon.height = TAB_ICON_PX;
      drawSlotIcon(icon.getContext('2d'), tab, TAB_ICON_PX / 2, TAB_ICON_PX / 2, TAB_ICON_PX);
      btn.append(icon);
    }
    const label = document.createElement('span');
    label.textContent = tab === 'all' ? 'All' : C.SLOT_TYPES[tab].label.split(' ')[0];
    btn.append(label);
    btn.addEventListener('click', () => { callbacks.onTab(tab); btn.blur(); });
    box.append(btn);
    out[tab] = btn;
  }
  return out;
}

// One row per recipe: a known one shows the item's name in its rarity colour, ticked if it can be
// crafted now ("owned" if the run has it); an unknown one shows a greyed ??? with its slot icon.
function renderList(list, ids, selected, run, callbacks) {
  list.replaceChildren();
  for (const id of ids) {
    const item = C.ITEMS[id];
    const known = isPatternKnown(id);
    const row = document.createElement('div');
    row.className = `tinker-row${known ? '' : ' unknown'}${id === selected ? ' selected' : ''}`;
    const icon = document.createElement('canvas');
    icon.width = icon.height = ROW_ICON_PX;
    const ctx = icon.getContext('2d');
    if (known) drawFramedItemIcon(ctx, id, ROW_ICON_PX / 2, ROW_ICON_PX / 2, ROW_ICON_PX);
    else drawSlotIcon(ctx, item.slot, ROW_ICON_PX / 2, ROW_ICON_PX / 2, ROW_ICON_PX, null, 0.45);
    const name = document.createElement('span');
    name.className = 'tinker-row-name';
    name.textContent = known ? item.name : '???';
    if (known) name.style.color = PAGE_RARITY_COLOR[item.rarity];
    const mark = document.createElement('span');
    mark.className = 'tinker-row-mark';
    if (known && run.items.includes(id)) mark.textContent = 'owned';
    else if (known && !craftBlocker(run, id)) {
      mark.textContent = '✓';
      mark.classList.add('tick');
    }
    row.append(icon, name, mark);
    if (known) row.addEventListener('click', () => callbacks.onSelect(id));
    list.append(row);
  }
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
