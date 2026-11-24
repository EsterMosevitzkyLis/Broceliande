// The potion belt and inventory on the map (Potions addendum §3.2): sockets on the belt of the
// equipment portrait, one per slot, and under them the potion inventory panel. Hidden until the run
// owns its first potion. In the equipment panel (panel px), shown with it, in the MAP state.
//   Belt: a click opens / closes the inventory; with it open, a click on a filled socket unequips.
//   Inventory: a click equips into the first free slot (nothing if the belt is full).
//   Right-click a potion (slot or inventory): Equip / Unequip and Consume (Healing only, §3.2).
// It reads the run and changes it only through the callbacks (main.js).

import * as C from './config.js';
import { GameState } from './states.js';
import { drawPotionIcon } from './render/potions.js';
import { fitText } from './fitText.js';
import { potionName, potionKindLine, potionEffectText, potionRow, potionStacks } from './potions.js';
import { consumeBlocker, runDruidHp } from './run.js';

const ROW_ICON_PX = 40;
// The portrait's belt (render/equipment.js): its centre in panel px.
const BELT_CENTRE = { x: C.EQUIP_PORTRAIT.x + C.EQUIP_PORTRAIT.w * 0.5 + 12, y: C.EQUIP_PORTRAIT.y + 244 };
const SOCKET_GAP = 4;

// callbacks: { onEquip(key), onUnequip(slot), onConsume(key, slot | null) }
export function createPotionPanel(callbacks) {
  const beltEl = document.getElementById('potion-belt-map');
  const inv = document.getElementById('potion-inv');
  const menu = document.getElementById('potion-menu');
  const tip = document.getElementById('potion-inv-tip');
  beltEl.style.top = `${BELT_CENTRE.y - C.POTION_MAP_SOCKET_SIZE / 2}px`;

  let run = null;
  let open = false;
  let key = null;

  beltEl.addEventListener('contextmenu', (e) => e.preventDefault());
  inv.addEventListener('contextmenu', (e) => e.preventDefault());
  // A click outside closes the menu; outside the belt and inventory, the inventory too.
  window.addEventListener('mousedown', (e) => {
    if (!menu.contains(e.target)) menu.hidden = true;
    if (!beltEl.contains(e.target) && !inv.contains(e.target) && !menu.contains(e.target)) setOpen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    menu.hidden = true;
    setOpen(false);
  });

  function setOpen(v) {
    if (open === v) return;
    open = v;
    key = null; // redraw
    tip.hidden = true;
  }

  function renderBelt() {
    const n = run.belt.length;
    const s = C.POTION_MAP_SOCKET_SIZE;
    beltEl.style.left = `${BELT_CENTRE.x - (n * s + (n - 1) * SOCKET_GAP) / 2}px`;
    beltEl.classList.toggle('open', open);
    beltEl.replaceChildren(...run.belt.map((potion, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'potion-map-socket' + (potion ? ' filled' : '');
      btn.style.width = btn.style.height = `${s}px`;
      const icon = document.createElement('canvas');
      icon.width = icon.height = s;
      if (potion) drawPotionIcon(icon.getContext('2d'), potion, s / 2, s / 2, s * 0.9);
      btn.append(icon);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (open && potion) callbacks.onUnequip(i);
        else setOpen(!open);
        btn.blur();
      });
      btn.addEventListener('mousedown', (e) => {
        if (e.button !== 2 || !potion) return;
        e.stopPropagation();
        showMenu(potion, i, btn);
      });
      if (potion) {
        btn.addEventListener('mouseenter', () => showTip(potion, btn));
        btn.addEventListener('mouseleave', () => { tip.hidden = true; });
      }
      return btn;
    }));
  }

  function renderInventory() {
    inv.hidden = !open;
    if (!open) return;
    inv.style.top = `${BELT_CENTRE.y + C.POTION_MAP_SOCKET_SIZE / 2 + 10}px`;
    const free = run.belt.filter((k) => !k).length;
    const rows = [div('potion-inv-title', 'Potions'), div('potion-inv-sub', `Belt: ${run.belt.length - free} / ${run.belt.length} slots filled`)];
    const stacks = potionStacks(run);
    if (!stacks.length) rows.push(div('potion-inv-empty', 'No potions in your pack.'));
    for (const { key: k, count } of stacks) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'potion-inv-item' + (free ? '' : ' full');
      const icon = document.createElement('canvas');
      icon.width = icon.height = ROW_ICON_PX;
      drawPotionIcon(icon.getContext('2d'), k, ROW_ICON_PX / 2, ROW_ICON_PX / 2, ROW_ICON_PX * 0.92);
      const name = div('potion-inv-name', potionName(k));
      name.style.color = C.POTION_TIERS[potionRow(k).tier].color;
      row.append(icon, name, div('potion-inv-count', `x${count}`));
      fitText(name); // fitted once the panel is laid out
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onEquip(k);
      });
      row.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;
        e.stopPropagation();
        showMenu(k, null, row);
      });
      row.addEventListener('mouseenter', () => showTip(k, row));
      row.addEventListener('mouseleave', () => { tip.hidden = true; });
      rows.push(row);
    }
    rows.push(div('potion-inv-hint', 'Click: put on the belt. Right-click: more.'));
    inv.replaceChildren(...rows);
    inv.style.left = `${BELT_CENTRE.x - inv.offsetWidth / 2}px`;
  }

  // The tooltip: name, tier, what it does with this tier's numbers (§3.2), beside the element.
  function showTip(k, el) {
    if (!menu.hidden) return;
    const name = div('potion-tip-name', potionName(k));
    name.style.color = C.POTION_TIERS[potionRow(k).tier].color;
    tip.replaceChildren(name, div('potion-tip-kind', potionKindLine(k)), div('potion-tip-desc', potionEffectText(k)));
    const r = panelRect(el);
    tip.style.left = `${r.right + 12}px`;
    tip.style.top = `${r.top}px`;
    tip.hidden = false;
  }

  // Right-click menu: Equip or Unequip, and Consume (greyed with its reason as the tooltip).
  function showMenu(k, slot, el) {
    tip.hidden = true;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    if (slot === null) {
      toggle.textContent = 'Equip';
      toggle.disabled = !run.belt.includes(null);
      if (toggle.disabled) toggle.title = 'The belt is full';
      toggle.addEventListener('click', () => { menu.hidden = true; callbacks.onEquip(k); });
    } else {
      toggle.textContent = 'Unequip';
      toggle.addEventListener('click', () => { menu.hidden = true; callbacks.onUnequip(slot); });
    }
    const consume = document.createElement('button');
    consume.type = 'button';
    consume.textContent = 'Consume';
    const reason = consumeBlocker(run, k);
    consume.disabled = !!reason;
    consume.title = reason ?? potionEffectText(k);
    consume.addEventListener('click', () => { menu.hidden = true; callbacks.onConsume(k, slot); });
    menu.replaceChildren(div('potion-menu-title', potionName(k)), toggle, consume);
    if (reason) menu.append(div('potion-menu-reason', reason)); // also shown, as a disabled button's tooltip may not be
    const r = panelRect(el);
    menu.style.left = `${r.left + 8}px`;
    menu.style.top = `${r.bottom - 4}px`;
    menu.hidden = false;
  }

  // An element's box in panel px (the stage is scaled).
  function panelRect(el) {
    const panel = document.getElementById('equip-panel').getBoundingClientRect();
    const s = panel.width / C.EQUIP_PANEL_WIDTH;
    const b = el.getBoundingClientRect();
    return { left: (b.left - panel.left) / s, top: (b.top - panel.top) / s, right: (b.right - panel.left) / s, bottom: (b.bottom - panel.top) / s };
  }

  function update(game) {
    const shown = game.state === GameState.MAP && !!game.run?.hasPotions;
    beltEl.hidden = !shown;
    if (!shown) {
      inv.hidden = true;
      menu.hidden = true;
      tip.hidden = true;
      open = false;
      key = null;
      return;
    }
    run = game.run;
    const k = JSON.stringify([run.belt, run.potions, open, runDruidHp(run).hp]);
    if (k === key) return;
    key = k;
    renderBelt();
    renderInventory();
  }

  return { update };
}

function div(cls, text) {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return d;
}
