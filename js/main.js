// Bootstrap, stage scaling and the fixed-timestep loop (spec §3.4, §3.5).

import * as C from './config.js';
import { GameState, createGame, startEncounter, startCombat, endEncounter, updateGame, validateConfig } from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './renderer.js';
import { createUI } from './ui.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game-canvas');

// ---------------------------------------------------------------------------
// Stage scaling: fixed 1920×1080 stage, CSS-scaled and letterboxed to 16:9.
// ---------------------------------------------------------------------------
let scale = 1;

function fitStage() {
  scale = Math.min(window.innerWidth / C.STAGE_WIDTH, window.innerHeight / C.STAGE_HEIGHT);
  const left = (window.innerWidth - C.STAGE_WIDTH * scale) / 2;
  const top = (window.innerHeight - C.STAGE_HEIGHT * scale) / 2;
  stage.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}

stage.style.width = `${C.STAGE_WIDTH}px`;
stage.style.height = `${C.STAGE_HEIGHT}px`;
window.addEventListener('resize', fitStage);
fitStage();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
validateConfig();

const game = createGame();
const clock = { speed: 1, paused: false };            // acts on simulation time only
const view = { debug: C.DEBUG_START_ENABLED, clickMarker: null, fps: 0 };

function restart() {
  startEncounter(game);
  view.clickMarker = null;
}

const renderer = createRenderer(canvas);
const ui = createUI({
  onStartCombat: () => startCombat(game),
  onRestart: restart,
});

createInput(stage, canvas, () => scale, {
  onPointerDown(world, button) {
    if (button === 0) view.clickMarker = world;
  },
  onKeyDown(key) {
    switch (key) {
      case 'd': view.debug = !view.debug; break;
      case 'p': clock.paused = !clock.paused; break;
      case '1': case '2': case '4': clock.speed = Number(key); break;
      case 'n': if (game.state === GameState.PREP) startCombat(game); break;
      case 'r': restart(); break;
      default: break;
    }
  },
});

// Temporary console hook so VICTORY/DEFEAT and Restart can be tested before wolves exist:
//   broceliande.forceEnd('VICTORY')  /  broceliande.forceEnd('DEFEAT')
window.broceliande = { game, forceEnd: (result) => endEncounter(game, result) };

startEncounter(game); // START → PREP on page load

// ---------------------------------------------------------------------------
// Loop: fixed simulation step via accumulator, one render per animation frame.
// ---------------------------------------------------------------------------
let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  const realDt = Math.min((now - lastTime) / 1000, C.MAX_FRAME_DT);
  lastTime = now;
  if (realDt > 0) view.fps = view.fps * 0.9 + (1 / realDt) * 0.1;

  if (!clock.paused) accumulator += realDt * clock.speed;

  let steps = 0;
  while (accumulator >= C.SIM_STEP && steps < C.MAX_STEPS_PER_FRAME) {
    updateGame(game, C.SIM_STEP);
    accumulator -= C.SIM_STEP;
    steps++;
  }
  if (steps === C.MAX_STEPS_PER_FRAME) accumulator = 0; // drop backlog rather than spiral

  renderer.render(game, view);
  ui.update(game, clock, view);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
