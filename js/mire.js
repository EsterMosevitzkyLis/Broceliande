// Mire ground (M3c §3; M4a §1.2): soft ground on a level's battlefield, fixed in its map file as a
// grid of square cells (16 px), painted in the map editor, never on a corridor (it may cover
// candidate spots). Travel inside it costs MIRE_STEP_MULT × as many steps (stepSystem.js).
//
// A mire in memory: { cell (px), cols, rows, cells (Uint8Array, 1 = mire, row by row), count }.
// In the map file: { cell, rows: ["<n><.|#>…", …] }: each row run-length encoded, runs of empty
// ('.') and mire ('#') cells left to right; a row's trailing empty run is left out, and so are the
// grid's trailing empty rows.

import * as C from './config.js';

export const MIRE_CELL = 16; // px, the grid of new map files

export function emptyMire(cell = MIRE_CELL) {
  const cols = Math.ceil(C.STAGE_WIDTH / cell);
  const rows = Math.ceil(C.STAGE_HEIGHT / cell);
  return { cell, cols, rows, cells: new Uint8Array(cols * rows), count: 0 };
}

const RUN = /(\d+)([.#])/g;

// The map file's mire → a mire. Throws on a row it can't read (mapFile.js reports it).
export function decodeMire(file) {
  const mire = emptyMire(file.cell);
  file.rows.forEach((row, r) => {
    if (r >= mire.rows) throw new Error(`mire has more than ${mire.rows} rows`);
    if (!/^(\d+[.#])*$/.test(row)) throw new Error(`mire row ${r} isn't runs like "12.5#"`);
    let c = 0;
    for (const [, n, ch] of row.matchAll(RUN)) {
      if (ch === '#') mire.cells.fill(1, r * mire.cols + c, r * mire.cols + Math.min(mire.cols, c + Number(n)));
      c += Number(n);
    }
  });
  mire.count = mire.cells.reduce((a, b) => a + b, 0);
  return mire;
}

// A mire → its map file form.
export function encodeMire(mire) {
  const rows = [];
  for (let r = 0; r < mire.rows; r++) {
    let row = '';
    let c = 0;
    while (c < mire.cols) {
      const v = mire.cells[r * mire.cols + c];
      let n = 1;
      while (c + n < mire.cols && mire.cells[r * mire.cols + c + n] === v) n++;
      if (v || c + n < mire.cols) row += `${n}${v ? '#' : '.'}`;
      c += n;
    }
    rows.push(row);
  }
  while (rows.length && rows[rows.length - 1] === '') rows.pop();
  return { cell: mire.cell, rows };
}

export const hasMire = (mire) => !!mire && mire.count > 0;

export function inMire(mire, x, y) {
  if (!hasMire(mire)) return false;
  const c = Math.floor(x / mire.cell);
  const r = Math.floor(y / mire.cell);
  return c >= 0 && r >= 0 && c < mire.cols && r < mire.rows && mire.cells[r * mire.cols + c] === 1;
}

// Centre of cell (c, r).
export const cellCentre = (mire, c, r) => ({ x: (c + 0.5) * mire.cell, y: (r + 0.5) * mire.cell });

// Whether a cell is too close to a corridor to be mire: its centre within half the corridor width,
// MIRE_CORRIDOR_GAP and half a cell of a lane's centreline. lanes: scene lanes (smoothed paths).
export function cellOnCorridor(mire, lanes, c, r) {
  const p = cellCentre(mire, c, r);
  return lanes.some((lane) => lane.path.distanceTo(p) < lane.corridorWidth / 2 + C.MIRE_CORRIDOR_GAP + mire.cell / 2);
}

// Sets (value 1) or clears (0) every cell whose centre is within radius of (x, y); painting skips
// cells on a corridor. Returns how many cells changed.
export function paintMire(mire, lanes, x, y, radius, value) {
  let changed = 0;
  const c0 = Math.max(0, Math.floor((x - radius) / mire.cell));
  const c1 = Math.min(mire.cols - 1, Math.floor((x + radius) / mire.cell));
  const r0 = Math.max(0, Math.floor((y - radius) / mire.cell));
  const r1 = Math.min(mire.rows - 1, Math.floor((y + radius) / mire.cell));
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const p = cellCentre(mire, c, r);
      const i = r * mire.cols + c;
      if (Math.hypot(p.x - x, p.y - y) > radius || mire.cells[i] === value) continue;
      if (value && cellOnCorridor(mire, lanes, c, r)) continue;
      mire.cells[i] = value;
      mire.count += value ? 1 : -1;
      changed++;
    }
  }
  return changed;
}

// Clears the cells a corridor now covers (after a lane or the corridor width changed). Returns how
// many cells it cleared.
export function clipMire(mire, lanes) {
  let cleared = 0;
  for (let r = 0; r < mire.rows; r++) {
    for (let c = 0; c < mire.cols; c++) {
      const i = r * mire.cols + c;
      if (mire.cells[i] && cellOnCorridor(mire, lanes, c, r)) {
        mire.cells[i] = 0;
        mire.count--;
        cleared++;
      }
    }
  }
  return cleared;
}

// A mire from round blobs [{ x, y, r }] (the draft generator's patches): every cell whose centre is
// inside one, except those on a corridor.
export function mireFromBlobs(blobs, lanes, cell = MIRE_CELL) {
  const mire = emptyMire(cell);
  for (const b of blobs) {
    for (let r = Math.max(0, Math.floor((b.y - b.r) / cell)); r <= Math.min(mire.rows - 1, Math.floor((b.y + b.r) / cell)); r++) {
      for (let c = Math.max(0, Math.floor((b.x - b.r) / cell)); c <= Math.min(mire.cols - 1, Math.floor((b.x + b.r) / cell)); c++) {
        const p = cellCentre(mire, c, r);
        const i = r * mire.cols + c;
        if (!mire.cells[i] && Math.hypot(p.x - b.x, p.y - b.y) < b.r) {
          mire.cells[i] = 1;
          mire.count++;
        }
      }
    }
  }
  clipMire(mire, lanes);
  return mire;
}

// Length of the straight line a → b that lies inside the mire (sampled every MIRE_SAMPLE_PX).
export function mireLength(mire, a, b) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (!hasMire(mire) || len === 0) return 0;
  const n = Math.max(1, Math.ceil(len / C.MIRE_SAMPLE_PX));
  let inside = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    if (inMire(mire, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) inside++;
  }
  return (len * inside) / n;
}

// §3.2: the step cost formula's distance: outside + mult × inside, and the two parts.
// mult: MIRE_STEP_MULT, its extra part scaled by the mire.stepMult stat (Bogwalker Boots: 0).
export function travelDistance(mire, a, b, mult) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const inside = mireLength(mire, a, b);
  return { weighted: len - inside + mult * inside, outside: len - inside, inside };
}

export function mireMult(statMult = 1) {
  return 1 + (C.MIRE_STEP_MULT - 1) * statMult;
}
