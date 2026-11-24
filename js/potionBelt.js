// The potion belt on the wilds screen (Potions addendum §3.3): in the HUD strip beside the HP bar
// (clear of every build spot and the level name label), one socket per belt
// slot with its potion and hotkey (1-5). A click or the key uses the slot. Greyed sockets: the
// shared cooldown (with a sweep), a Prep-only potion in Combat, a potion that can't be used now.
// Hovering a socket shows the potion's tooltip. HTML over the canvas; reads the game and changes it
// only through the onUse callback (main.js).

import * as C from './config.js';
import { GameState } from './states.js';
import { drawPotionIcon } from './render/potions.js';
import { potionName, potionKindLine, potionEffectText, potionRow } from './potions.js';
import { isBeltShown, potionUseBlocker } from './systems/potionSystem.js';

const ICON_PAD = 0.86; // the icon's share of a socket

// callbacks: { onUse(slot) }
export function createPotionBelt(callbacks) {
  const belt = document.getElementById('potion-belt');
  const tip = document.getElementById('potion-tip');
  let sockets = [];
  let key = null;
  let hovered = null;
  let game = null;

  function build(n) {
    sockets = [];
    belt.replaceChildren();
    for (let i = 0; i < n; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'potion-socket';
      btn.style.width = btn.style.height = `${C.POTION_SOCKET_SIZE}px`;
      const icon = document.createElement('canvas');
      icon.width = icon.height = C.POTION_SOCKET_SIZE;
      const cd = document.createElement('span');
      cd.className = 'potion-cd';
      const hotkey = document.createElement('span');
      hotkey.className = 'potion-key';
      hotkey.textContent = String(i + 1);
      btn.append(icon, cd, hotkey);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks.onUse(i);
        btn.blur();
      });
      btn.addEventListener('mouseenter', () => { hovered = i; showTip(); });
      btn.addEventListener('mouseleave', () => { hovered = null; tip.hidden = true; });
      belt.append(btn);
      sockets.push({ btn, icon, cd });
    }
  }

  function showTip() {
    const k = hovered === null ? null : game?.run?.belt[hovered];
    if (!k) {
      tip.hidden = true;
      return;
    }
    const name = div('potion-tip-name', potionName(k));
    name.style.color = C.POTION_TIERS[potionRow(k).tier].color;
    const rows = [name, div('potion-tip-kind', potionKindLine(k)), div('potion-tip-desc', potionEffectText(k))];
    const reason = potionUseBlocker(game, hovered);
    if (reason) rows.push(div('potion-tip-reason', reason));
    tip.replaceChildren(...rows);
    // Under the hovered socket, in stage px (the stage is scaled).
    const stage = document.getElementById('stage').getBoundingClientRect();
    const b = sockets[hovered].btn.getBoundingClientRect();
    tip.style.left = `${(b.left - stage.left) / (stage.width / C.STAGE_WIDTH)}px`;
    tip.hidden = false;
  }

  function update(g) {
    game = g;
    const shown = isBeltShown(game);
    belt.hidden = !shown;
    if (!shown) {
      tip.hidden = true;
      key = null;
      return;
    }
    const run = game.run;
    const blockers = run.belt.map((_, i) => potionUseBlocker(game, i));
    const k = JSON.stringify([run.belt, blockers]);
    if (k !== key) {
      key = k;
      if (sockets.length !== run.belt.length) build(run.belt.length);
      run.belt.forEach((potion, i) => {
        const { btn, icon } = sockets[i];
        const ctx = icon.getContext('2d');
        ctx.clearRect(0, 0, icon.width, icon.height);
        if (potion) drawPotionIcon(ctx, potion, icon.width / 2, icon.height / 2, icon.width * ICON_PAD, !!blockers[i]);
        btn.classList.toggle('filled', !!potion);
        btn.classList.toggle('greyed', !!potion && !!blockers[i]);
      });
      if (hovered !== null) showTip();
    }
    // §3.3: the cooldown sweep, on every filled socket while it runs.
    const frac = game.state === GameState.COMBAT && game.potionCooldown > 0 ? game.potionCooldown / C.POTION_COOLDOWN : 0;
    run.belt.forEach((potion, i) => {
      const cd = sockets[i].cd;
      const bg = potion && frac > 0 ? `conic-gradient(rgba(10, 12, 8, 0.62) ${(frac * 360).toFixed(1)}deg, transparent 0)` : '';
      if (cd.style.background !== bg) cd.style.background = bg;
    });
  }

  return { update };
}

function div(cls, text) {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return d;
}
