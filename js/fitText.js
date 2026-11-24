// Long names in tight rows (the Tinker book's list, the potion inventory, the Trader's cards): the
// name's font shrinks step by step until it fits on one line, down to FIT_TEXT_MIN of its normal size;
// if it still doesn't fit, it wraps and its row grows, so rows never overlap. An element not laid out
// yet (just built, or its screen hidden) is fitted on a later frame.

import * as C from './config.js';

const STEP = 0.5; // px per try
const MAX_TRIES = 60; // frames to wait for the element to be laid out

export function fitText(el, tries = 0) {
  if (!el.isConnected || el.clientWidth === 0) {
    if (tries < MAX_TRIES) requestAnimationFrame(() => fitText(el, tries + 1));
    return;
  }
  el.style.fontSize = '';
  el.style.whiteSpace = 'nowrap';
  const base = parseFloat(getComputedStyle(el).fontSize);
  const min = base * C.FIT_TEXT_MIN;
  let size = base;
  while (el.scrollWidth > el.clientWidth + 0.5 && size > min) {
    size = Math.max(min, size - STEP);
    el.style.fontSize = `${size}px`;
  }
  if (el.scrollWidth > el.clientWidth + 0.5) el.style.whiteSpace = 'normal'; // wraps; its row grows
}
