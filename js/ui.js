// HTML UI: HUD strip, Victory/Defeat overlay, debug panel. Reads state, reports clicks.

import * as C from './config.js';
import { GameState } from './game.js';

function setText(el, text) {
  if (el.textContent !== text) el.textContent = text;
}

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return `${mm}:${ss}`;
}

// callbacks: { onStartCombat(), onRestart() }
export function createUI(callbacks) {
  const el = {
    hud: document.getElementById('hud'),
    phase: document.getElementById('hud-phase'),
    timer: document.getElementById('hud-timer'),
    wolves: document.getElementById('hud-wolves'),
    startCombat: document.getElementById('btn-start-combat'),
    endOverlay: document.getElementById('end-overlay'),
    endTitle: document.getElementById('end-title'),
    endStats: document.getElementById('end-stats'),
    restart: document.getElementById('btn-restart'),
    debugPanel: document.getElementById('debug-panel'),
  };

  el.hud.style.height = `${C.HUD_STRIP_HEIGHT}px`;
  el.startCombat.addEventListener('click', () => callbacks.onStartCombat());
  el.restart.addEventListener('click', () => callbacks.onRestart());

  function update(game, clock, view) {
    updateHud(el, game);
    updateEndOverlay(el, game);
    updateDebugPanel(el, game, clock, view);
  }

  return { update };
}

function updateHud(el, game) {
  const isPrep = game.state === GameState.PREP;
  const isCombat = game.state === GameState.COMBAT;

  setText(el.phase, game.state);
  if (isPrep) {
    // Countdown shows 00:25 at the start and 00:00 only at the moment Combat begins.
    setText(el.timer, formatTime(Math.ceil(game.prepRemaining)));
  } else {
    setText(el.timer, formatTime(game.combatTime));
  }
  setText(el.wolves, isCombat ? `Wolves: ${C.WAVE_TOTAL - game.wolvesKilled} / ${C.WAVE_TOTAL}` : '');
  el.startCombat.hidden = !isPrep;
}

function updateEndOverlay(el, game) {
  const ended = game.state === GameState.VICTORY || game.state === GameState.DEFEAT;
  el.endOverlay.hidden = !ended;
  if (!ended) return;
  setText(el.endTitle, game.state);
  el.endOverlay.dataset.result = game.state;
  setText(el.endStats, `Combat time ${formatTime(game.combatTime)}  ·  Wolves killed ${game.wolvesKilled} / ${C.WAVE_TOTAL}`);
}

function updateDebugPanel(el, game, clock, view) {
  el.debugPanel.hidden = !view.debug;
  if (!view.debug) return;
  const speed = clock.paused ? `PAUSED (×${clock.speed})` : `×${clock.speed}`;
  setText(el.debugPanel, [
    `Seed:   ${game.seed}`,
    `State:  ${game.state}`,
    `Speed:  ${speed}`,
    `FPS:    ${Math.round(view.fps)}`,
  ].join('\n'));
}
