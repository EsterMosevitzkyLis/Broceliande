// A village's own HTML (M6a §2.3): its name and the Trade / Craft tabs. Each tab's controls are the
// trader screen's (traderScreen.js) or the Tinker's Rest's (tinkerScreen.js), shown by those screens
// for the selected tab. Also how dark the scene fade should be. Shown only in the VILLAGE state.

import * as C from './config.js';
import { GameState } from './states.js';
import { villageFade } from './village.js';

// callbacks: { onTab(tab) }
export function createVillageScreen(callbacks) {
  const root = document.getElementById('village-screen');
  const title = document.getElementById('village-title');
  const tabs = [...document.querySelectorAll('#village-tabs button')];
  for (const btn of tabs) btn.addEventListener('click', () => { callbacks.onTab(btn.dataset.tab); btn.blur(); });

  // Returns how dark the scene fade should be (0–1).
  function update(game) {
    const v = game.village;
    root.hidden = game.state !== GameState.VILLAGE || !v;
    if (root.hidden) return 0;
    const name = C.VILLAGES[v.nodeId].name;
    if (title.textContent !== name) title.textContent = name;
    for (const btn of tabs) {
      const on = btn.dataset.tab === v.tab;
      if (btn.classList.contains('selected') !== on) btn.classList.toggle('selected', on);
      btn.disabled = v.leaving !== null;
    }
    return villageFade(game);
  }

  return { update };
}
