// The dialogue box (M5a §3): a dark overlay with the two characters' portraits and name plates,
// the line in a storybook text box, a continue marker and Skip. The speaker is lit and hops on
// each new line; the listener is dimmed. Typewriter text; a left click, Space or Enter completes
// the line, then advances; Skip or Esc closes. While it's open it takes every click and key, so
// nothing reaches the game (main.js also pauses the simulation). UI only: its timings are
// wall-clock (performance.now), never simulation time.

import * as C from './config.js';
import { events } from './events.js';
import { CHARACTERS, DIALOGUES } from './narrative.js';
import { setDialogueLine, dialogueClosed } from './dialogue.js';
import { drawDialoguePortrait } from './render/dialoguePortraits.js';

const RESOLUTION = 2; // portrait canvas pixels per stage px, so they stay sharp when the stage scales
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

export function createDialogueBox() {
  const root = document.getElementById('dialogue');
  const text = document.getElementById('dialogue-text');
  const typed = document.createElement('span');
  const rest = document.createElement('span'); // the line's untyped part, laid out but invisible, so words never jump lines
  rest.className = 'dialogue-untyped';
  text.replaceChildren(typed, rest);
  const marker = document.getElementById('dialogue-continue');
  const skipButton = document.getElementById('btn-dialogue-skip');
  const sides = {};
  for (const side of ['left', 'right']) {
    const el = root.querySelector(`.dialogue-side[data-side="${side}"]`);
    const canvas = el.querySelector('canvas');
    canvas.width = C.DIALOGUE_PORTRAIT_W * RESOLUTION;
    canvas.height = C.DIALOGUE_PORTRAIT_H * RESOLUTION;
    sides[side] = { el, canvas, name: el.querySelector('.dialogue-name'), character: null };
  }
  root.style.setProperty('--dialogue-dim', String(C.DIALOGUE_DIM_BRIGHTNESS));
  root.style.setProperty('--dialogue-hop-time', `${C.DIALOGUE_HOP_TIME}s`);

  let entry = null;     // the open dialogue ({ dialogue, left, right }), or null
  let lines = [];
  let index = 0;
  let lineStart = 0;    // performance.now() when the line began typing
  let complete = false; // the whole line is shown
  let shown = -1;       // characters shown

  function open(next) {
    entry = next;
    lines = DIALOGUES[entry.dialogue];
    for (const side of ['left', 'right']) {
      const s = sides[side];
      s.character = entry[side];
      const ctx = s.canvas.getContext('2d');
      ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);
      drawDialoguePortrait(ctx, s.character, C.DIALOGUE_PORTRAIT_W, C.DIALOGUE_PORTRAIT_H);
      s.name.textContent = CHARACTERS[s.character]?.name ?? s.character;
      s.el.classList.remove('speaking', 'listening');
    }
    root.hidden = false;
    events.emit('dialogueOpen', {});
    showLine(0);
  }

  // §3.2: the speaker lights up and hops; the other dims. The first line opens with its hop.
  function showLine(i) {
    index = i;
    setDialogueLine(i);
    lineStart = performance.now();
    complete = false;
    shown = -1;
    const speaker = lines[i].speaker;
    const speakingSide = sides.left.character === speaker ? 'left' : 'right';
    for (const side of ['left', 'right']) {
      const speaking = side === speakingSide;
      sides[side].el.classList.toggle('speaking', speaking);
      sides[side].el.classList.toggle('listening', !speaking);
    }
    hop(sides[speakingSide].canvas);
    typed.textContent = '';
    rest.textContent = lines[i].text;
    marker.hidden = true;
  }

  function hop(el) {
    if (reducedMotion?.matches || !el.animate) return; // reduced motion: only the lighting changes
    el.animate([
      { transform: 'translateY(0)', easing: 'ease-out' },
      { transform: `translateY(${-C.DIALOGUE_HOP_HEIGHT}px)`, easing: 'ease-in', offset: 0.5 },
      { transform: 'translateY(0)' },
    ], { duration: C.DIALOGUE_HOP_TIME * 1000 });
  }

  // §3.3: complete the line, else the next line, else close.
  function advance() {
    if (!entry) return;
    if (!complete) {
      complete = true;
      return;
    }
    events.emit('dialogueAdvance', {});
    if (index + 1 < lines.length) showLine(index + 1);
    else close();
  }

  function close() {
    if (!entry) return;
    entry = null;
    root.hidden = true;
    dialogueClosed();
  }

  // Typewriter (§3.3): DIALOGUE_TYPE_SPEED characters per second until the line is complete.
  function update(now) {
    if (!entry) return;
    const line = lines[index].text;
    if (!complete && (now - lineStart) / 1000 * C.DIALOGUE_TYPE_SPEED >= line.length) complete = true;
    const n = complete ? line.length : Math.floor((now - lineStart) / 1000 * C.DIALOGUE_TYPE_SPEED);
    if (n !== shown) {
      shown = n;
      typed.textContent = line.slice(0, n);
      rest.textContent = line.slice(n);
    }
    marker.hidden = !complete;
  }

  // Input: the overlay takes every click; keys are caught before the game's handlers (capture).
  root.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    if (e.button === 0) advance();
  });
  skipButton.addEventListener('mousedown', (e) => e.stopPropagation());
  skipButton.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });
  window.addEventListener('keydown', (e) => {
    if (!entry) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    if (e.key === ' ' || e.key === 'Enter') advance();
    else if (e.key === 'Escape') close();
  }, true);

  return { open, update, isOpen: () => entry !== null };
}
