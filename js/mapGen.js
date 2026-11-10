// Generated map roads (M2g): each region's map from a seed (M3a §1.2: one map per region, built
// only from that region's levels, with its own Traders and Tinker's Rests). Rows and row heights are fixed (each
// node's row is its level's); what varies is the order and x position of the nodes within a row,
// the roads between adjacent rows and their curves.
//
// The run's Trader nodes (M2n §2) and Tinker's Rests (M2p §4.1) are generated here too: ids
// trader1, trader2…, tinker1…, no level.
// A map: { regionId, nodes: [{ id, levelId, name, type, row, pos: { x, y }, next: [ids] }],
//          roads: [{ from, to, bend }] (bend: px the curve bows sideways, + to the road's left),
//          attempts, failed: [check names the chosen map fails], failCounts: { check: attempts it failed } }.
// Visual and structural only: the rules (states, availability) are in run.js.

import * as C from './config.js';
import { createRng } from './rng.js';

// The whole-map checks (§2.3), plus roads clear of other nodes and labels (§2.4) and every node's
// roads within limits each way (§2.2; a row with a Trader can need more than the sweep allows).
const CHECKS = ['reachable', 'fellAvoidable', 'variety', 'choice', 'roadsClear', 'degrees'];

// Most roads a node may have coming in: 3 (§2.2), but the last row's (the boss) up to
// MAP_BOSS_MAX_ROADS_IN (M2n), so the row under it can hold a Trader beside its three levels.
const maxIn = (rowIndex, rowCount) => (rowIndex === rowCount - 1 ? C.MAP_BOSS_MAX_ROADS_IN : 3);
const MAX_OUT = 3;

// The map for a seed. Each extra node's row (the Traders', M2n §2.1, then the Tinker's Rests',
// M2p §4.1) is picked first, with equal chance among its band's eligible rows; then up to
// MAP_MAX_ATTEMPTS whole maps (order, positions, roads) are tried around that choice, all from one
// RNG stream, the first passing every check winning. Only if none passes does one extra node move
// to another row of its band (each tried in turn, MAP_MAX_ATTEMPTS more each). If nothing passes at
// all: the attempt failing the fewest checks, with a warning.
export function generateMap(seed, regionId) {
  const rng = createRng(seed >>> 0);
  const failCounts = Object.fromEntries(CHECKS.map((c) => [c, 0]));
  const region = C.REGIONS[regionId];
  const rows = levelRows(regionId);
  const extras = [
    ...extraBands(rows, 'trader', region.traders, 1).map((band) => ({ type: 'trader', band })),
    ...extraBands(rows, 'tinker', region.tinkers, rowIndexFrom(rows, region.tinkerMinRow)).map((band) => ({ type: 'tinker', band })),
  ];
  const chosen = chooseExtraRows(rng, rows, extras);
  const tries = [chosen, ...extras.flatMap((x, k) => preferredRows(x, extras, chosen, x.band.filter((r) => r !== chosen[k]))
    .map((r) => chosen.map((c, i) => (i === k ? r : c))).filter((alt) => fitsAll(rows, alt)))];
  let best = null;
  let attempts = 0;
  for (const extraRows of tries) {
    for (let n = 0; n < C.MAP_MAX_ATTEMPTS; n++) {
      attempts++;
      const map = attempt(rng, regionId, extras, extraRows);
      const failed = CHECKS.filter((c) => !CHECK_FNS[c](map));
      for (const c of failed) failCounts[c]++;
      if (!best || failed.length < best.failed.length) best = { map, failed };
      if (!failed.length) break;
    }
    if (!best.failed.length) break;
  }
  if (best.failed.length) console.warn(`Map: no attempt passed every check; using one that fails ${best.failed.join(', ')}`);
  const movedExtra = best.map.extraRows.some((r, k) => r !== chosen[k]);
  return { ...best.map, regionId, attempts, failed: best.failed, failCounts, movedExtra };
}

// The seed a region's map uses (§3): from the run seed, the region and how many times the run has
// entered a region (M3a §4: a return to Hag's Causeway gets a new map), or MAP_FIXED_SEED (one per
// region) when MAP_RANDOMISE is off.
export function mapSeedFor(runSeed, regionId, visit = 1) {
  const order = C.REGIONS[regionId].order;
  if (!C.MAP_RANDOMISE) return (C.MAP_FIXED_SEED + 1000 * (order - 1)) >>> 0;
  return (((runSeed ^ 0x5bd1e995) >>> 0) + Math.imul(order - 1, 0x9e3779b1) + Math.imul(visit - 1, 7919)) >>> 0;
}

// The region's level nodes' rows, bottom to top: [[node, …], …], each node a fresh copy with its row.
function levelRows(regionId) {
  const byRow = new Map();
  for (const n of C.MAP_NODES.filter((m) => m.region === regionId)) {
    const row = C.LEVELS[n.levelId].row;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ id: n.id, levelId: n.levelId, name: n.name, type: n.type, row, pos: null, next: [] });
  }
  return [...byRow.keys()].sort((a, b) => a - b).map((r) => byRow.get(r));
}

// The index of the first row numbered `row` or higher.
function rowIndexFrom(rows, row) {
  const i = rows.findIndex((r) => r[0].row >= row);
  return i < 0 ? rows.length : i;
}

// The rows with the run's extra nodes added: extras[k] in rows[extraRows[k]] (none if null), with
// ids trader1, trader2, tinker1… and their type's label as name.
function rowsWithExtras(regionId, extras, extraRows) {
  const rows = levelRows(regionId);
  const counts = {};
  extras.forEach((x, k) => {
    const index = extraRows[k];
    counts[x.type] = (counts[x.type] ?? 0) + 1;
    if (index === null) return;
    rows[index].push({ id: `${x.type}${counts[x.type]}`, levelId: null, name: C.NODE_TYPES[x.type].label, type: x.type, row: rows[index][0].row, pos: null, next: [] });
  });
  return rows;
}

// Whether every row can still be connected with these extra nodes added (indexes into rows, null
// for none): each row's nodes can all get a road in from the row below (at most MAX_OUT each) and
// a road up to the row above (at most maxIn each).
function fitsAll(rows, extraRows) {
  const n = rows.map((r) => r.length);
  for (const i of extraRows) if (i !== null) n[i]++;
  for (let i = 1; i < n.length; i++) if (n[i] > MAX_OUT * n[i - 1]) return false;
  for (let i = 0; i + 1 < n.length; i++) if (n[i] > maxIn(i + 1, n.length) * n[i + 1]) return false;
  return true;
}

// Each extra node's band, bottom to top (indexes into rows): the rows from `from` to the one under
// the last (never the first row) split into `count` bands. With 2 Traders and rows 2–7: rows 2–4
// and 5–7 (M2n §2.1); with 2 Tinker's Rests from row 4: rows 4–5 and 6–7 (M2p §4.1). A row is
// eligible only if it can take one more node (fitsAll). A band with no eligible row gets none
// (with a warning).
function extraBands(rows, type, count, from) {
  const inner = rows.map((_, i) => i).slice(Math.max(1, from), -1);
  const n = Math.min(count, inner.length);
  const bands = [];
  for (let k = 0; k < n; k++) {
    const band = inner.slice(Math.floor((k * inner.length) / n), Math.floor(((k + 1) * inner.length) / n))
      .filter((i) => fitsAll(rows, [i]));
    if (band.length) bands.push(band);
    else console.warn(`Map: no row in ${C.NODE_TYPES[type].label} band ${k + 1} can take one`);
  }
  return bands;
}

// A Tinker's Rest prefers rows without a Trader (M2p §4.1): the candidates without one first.
function preferredRows(x, extras, chosen, candidates) {
  if (x.type !== 'tinker') return candidates;
  const traderRows = chosen.filter((r, j) => extras[j].type === 'trader');
  return [...candidates.filter((r) => !traderRows.includes(r)), ...candidates.filter((r) => traderRows.includes(r))];
}

// Each extra node's row, in order: equal chances among its band's rows that still fit with the
// ones already chosen; a Tinker's Rest among those without a Trader if there are any.
function chooseExtraRows(rng, rows, extras) {
  const chosen = [];
  extras.forEach((x) => {
    const fits = x.band.filter((r) => fitsAll(rows, [...chosen, r]));
    const traderRows = chosen.filter((r, j) => extras[j].type === 'trader');
    const free = x.type === 'tinker' ? fits.filter((r) => !traderRows.includes(r)) : fits;
    const pool = free.length ? free : fits;
    if (!pool.length) console.warn(`Map: no row left for a ${C.NODE_TYPES[x.type].label}`);
    chosen.push(pool.length ? pool[rng.int(0, pool.length - 1)] : null);
  });
  return chosen;
}

function attempt(rng, regionId, extras, extraRows) {
  const rows = rowsWithExtras(regionId, extras, extraRows);
  rows.forEach((row, i) => {
    shuffle(rng, row);                // §2.1: order within the row
    placeRow(rng, row, i, rows.length, (k) => Math.max(...rows[k].map(nodeRadius))); // x positions, the row's height with a little jitter
    row.sort((a, b) => a.pos.x - b.pos.x);
  });
  const roads = [];
  for (let i = 0; i + 1 < rows.length; i++) roads.push(...connectRows(rng, rows[i], rows[i + 1], maxIn(i + 1, rows.length)));
  const nodes = rows.flat();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const r of roads) byId[r.from].next.push(r.to);
  const rowsOf = (type) => extraRows.filter((r, k) => extras[k].type === type && r !== null);
  const map = { nodes, roads, rows, extraRows, traderRows: rowsOf('trader'), tinkerRows: rowsOf('tinker') };
  for (const r of roads) r.bend = roadBend(rng, map, byId[r.from], byId[r.to]);
  return map;
}

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
}

// A row's height: the rows evenly spread from the bottom one (its label MAP_BOTTOM_MARGIN above the
// screen's bottom edge) to the top one (its node, rim included, MAP_TOP_MARGIN below the HUD
// strip). Those two rows get no jitter, so the margins hold. radius(k): row k's largest node radius.
const RIM = 3; // px, half the widest node rim (the boss's) outside its radius

function rowY(index, rowCount, radius) {
  const bottom = C.STAGE_HEIGHT - C.MAP_BOTTOM_MARGIN - C.MAP_LABEL_FONT_PX - 8 - radius(0); // one-line label under the node
  const top = C.HUD_STRIP_HEIGHT + C.MAP_TOP_MARGIN + RIM + radius(rowCount - 1);
  return rowCount > 1 ? bottom - (index * (bottom - top)) / (rowCount - 1) : bottom;
}

// §2.1: nodes anywhere across the map area, at least MAP_MIN_NODE_GAP apart, not centred or evenly
// spread (n sorted random offsets in the free room, plus the gaps); a single node near the centre.
// Its height is the row's (rowY), with a little jitter.
function placeRow(rng, row, index, rowCount, nodeRadiusOfRow) {
  const left = C.EQUIP_PANEL_WIDTH + C.MAP_X_MARGIN;
  const right = C.STAGE_WIDTH - C.MAP_X_MARGIN;
  const y = () => rowY(index, rowCount, nodeRadiusOfRow) + (index === 0 || index === rowCount - 1 ? 0 : rng.range(-C.MAP_Y_JITTER, C.MAP_Y_JITTER));
  if (row.length === 1) {
    row[0].pos = { x: (left + right) / 2 + rng.range(-C.MAP_SINGLE_NODE_SPREAD, C.MAP_SINGLE_NODE_SPREAD), y: y() };
    return;
  }
  const room = Math.max(0, right - left - (row.length - 1) * C.MAP_MIN_NODE_GAP);
  const offsets = row.map(() => rng.range(0, room)).sort((a, b) => a - b);
  row.forEach((n, i) => { n.pos = { x: left + offsets[i] + i * C.MAP_MIN_NODE_GAP, y: y() }; });
}

const reach = (a, b) => Math.exp(-Math.abs(a.pos.x - b.pos.x) / C.MAP_ROAD_REACH);

// §2.2: roads from a lower row up to the next, both sorted left to right. A sweep links the
// current pair and moves the lower pointer, the upper one or both (weighted toward the shorter
// next road, and never giving a node a 4th road while another move is possible), so every node gets
// a road and none cross; then a few extra roads that cross none and keep every degree within its
// limit (MAX_OUT up; capIn in: 3, or more into the boss).
function connectRows(rng, lower, upper, capIn) {
  const links = []; // [i, j]: lower[i] → upper[j]
  let i = 0;
  let j = 0;
  links.push([0, 0]);
  while (i < lower.length - 1 || j < upper.length - 1) {
    const moves = [];
    if (i < lower.length - 1) moves.push([i + 1, j]);
    if (j < upper.length - 1) moves.push([i, j + 1]);
    if (i < lower.length - 1 && j < upper.length - 1) moves.push([i + 1, j + 1]);
    // Moving one pointer alone adds a road to the node the other stays on.
    const roomy = moves.filter(([a, b]) => (a === i ? outCount(links, i) < MAX_OUT : true) && (b === j ? inCount(links, j) < capIn : true));
    [i, j] = pickWeighted(rng, roomy.length ? roomy : moves, ([a, b]) => reach(lower[a], upper[b]));
    links.push([i, j]);
  }
  for (let a = 0; a < lower.length; a++) {
    for (let b = 0; b < upper.length; b++) {
      if (links.some(([p, q]) => p === a && q === b)) continue;
      if (rng.next() >= C.MAP_EXTRA_ROAD_CHANCE * reach(lower[a], upper[b])) continue;
      const crosses = links.some(([p, q]) => (p < a && q > b) || (p > a && q < b));
      const full = outCount(links, a) >= MAX_OUT || inCount(links, b) >= capIn;
      if (!crosses && !full) links.push([a, b]);
    }
  }
  return links.map(([a, b]) => ({ from: lower[a].id, to: upper[b].id, bend: 0 }));
}

const outCount = (links, a) => links.filter(([p]) => p === a).length;
const inCount = (links, b) => links.filter(([, q]) => q === b).length;

function pickWeighted(rng, options, weight) {
  const w = options.map(weight);
  let roll = rng.next() * w.reduce((s, x) => s + x, 0);
  for (let k = 0; k < options.length; k++) {
    roll -= w[k];
    if (roll <= 0) return options[k];
  }
  return options[options.length - 1];
}

// ---------------------------------------------------------------------------
// Road curves (§2.4): a quadratic curve bowing `bend` px sideways at its middle. A seeded bend;
// if the curve would pass through another node or its label, a smaller or flipped bend; null
// if none is clear (that attempt then fails roadsClear).
// ---------------------------------------------------------------------------
export function roadCurve(a, b, bend) {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const len = Math.hypot(dx, dy);
  // Control point: the midpoint pushed sideways; a quadratic's middle bows half as far, so × 2.
  const ctrl = { x: (a.pos.x + b.pos.x) / 2 + (-dy / len) * bend * 2, y: (a.pos.y + b.pos.y) / 2 + (dx / len) * bend * 2 };
  return { from: a.pos, ctrl, to: b.pos };
}

export function curvePoint(c, t) {
  const u = 1 - t;
  return { x: u * u * c.from.x + 2 * u * t * c.ctrl.x + t * t * c.to.x, y: u * u * c.from.y + 2 * u * t * c.ctrl.y + t * t * c.to.y };
}

// A map node's radius: MAP_NODE_RADIUS, × MAP_BOSS_SCALE for a large node type (M2f §2).
export function nodeRadius(node) {
  return C.MAP_NODE_RADIUS * (C.NODE_TYPES[node.type]?.large ? C.MAP_BOSS_SCALE : 1);
}

// The area a node's name takes under its circle, estimated from its length (no canvas here): one
// line, or two when wider than MAP_LABEL_MAX_WIDTH, as render/map.js wraps it.
const LABEL_CHAR_PX = 0.47; // × MAP_LABEL_FONT_PX: average italic Georgia character width

function labelBox(n) {
  const full = n.name.length * C.MAP_LABEL_FONT_PX * LABEL_CHAR_PX;
  const lines = full > C.MAP_LABEL_MAX_WIDTH && n.name.includes(' ') ? 2 : 1;
  const half = Math.min(full / lines, C.MAP_LABEL_MAX_WIDTH) / 2 + 4;
  const top = n.pos.y + nodeRadius(n) + 8;
  return { left: n.pos.x - half, right: n.pos.x + half, top, bottom: top + lines * (C.MAP_LABEL_FONT_PX + 2) };
}

function curveClear(map, a, b, bend) {
  const c = roadCurve(a, b, bend);
  const m = C.MAP_ROAD_CLEARANCE;
  const others = map.nodes.filter((n) => n !== a && n !== b);
  for (let k = 1; k < 40; k++) {
    const p = curvePoint(c, k / 40);
    for (const n of others) {
      if (Math.hypot(p.x - n.pos.x, p.y - n.pos.y) < nodeRadius(n) + m) return false;
    }
    // Labels of the other nodes (a road always enters its upper node from below, past its label).
    for (const n of others) {
      const L = labelBox(n);
      if (p.x > L.left - m && p.x < L.right + m && p.y > L.top - m && p.y < L.bottom + m) return false;
    }
  }
  return true;
}

function roadBend(rng, map, a, b) {
  const bend = rng.range(-C.MAP_ROAD_BEND, C.MAP_ROAD_BEND);
  for (const k of [1, -1, 0.5, -0.5, 0]) if (curveClear(map, a, b, bend * k)) return bend * k;
  return null;
}

// ---------------------------------------------------------------------------
// Whole-map checks (§2.3)
// ---------------------------------------------------------------------------
const startOf = (map) => map.rows[0];
const endsOf = (map) => map.rows[map.rows.length - 1];
const byIdOf = (map) => Object.fromEntries(map.nodes.map((n) => [n.id, n]));

// Ids reachable from `from` following roads, never entering `avoid`.
function reachableFrom(map, fromIds, avoid = null) {
  const byId = byIdOf(map);
  const seen = new Set();
  const queue = fromIds.filter((id) => id !== avoid);
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of byId[id].next) if (next !== avoid) queue.push(next);
  }
  return seen;
}

// Full paths from the start row to the end row (each node's count from the top down).
function pathCount(map) {
  const count = {};
  for (let r = map.rows.length - 1; r >= 0; r--) {
    for (const n of map.rows[r]) count[n.id] = r === map.rows.length - 1 ? 1 : n.next.reduce((s, id) => s + count[id], 0);
  }
  return startOf(map).reduce((s, n) => s + count[n.id], 0);
}

const CHECK_FNS = {
  // 1. Every node reachable from the start, and every node leads to the end.
  reachable(map) {
    const fromStart = reachableFrom(map, startOf(map).map((n) => n.id));
    if (map.nodes.some((n) => !fromStart.has(n.id))) return false;
    const ends = new Set(endsOf(map).map((n) => n.id));
    return map.nodes.every((n) => [...reachableFrom(map, [n.id])].some((id) => ends.has(id)));
  },
  // 2. Each Fell Wilds node has a start-to-end path around it.
  fellAvoidable(map) {
    return map.nodes.filter((n) => n.type === 'fell').every((f) => {
      const seen = reachableFrom(map, startOf(map).map((n) => n.id), f.id);
      return endsOf(map).some((n) => seen.has(n.id));
    });
  },
  // 3. At least 2 nodes with exactly one road up; at least 1 with three where a row above has
  // three nodes; not every node with the same number.
  variety(map) {
    const ups = map.rows.slice(0, -1).flat().map((n) => n.next.length);
    if (ups.filter((d) => d === 1).length < 2) return false;
    if (map.rows.slice(1).some((row) => row.length >= 3) && !ups.includes(3)) return false;
    return new Set(ups).size > 1;
  },
  // 4. At least 3 distinct full paths.
  choice(map) {
    return pathCount(map) >= 3;
  },
  // §2.4: every road has a curve clear of other nodes and labels.
  roadsClear(map) {
    return map.roads.every((r) => r.bend !== null);
  },
  // §2.2: 1–3 roads up from every node but the last row's, 1–3 in to every node but the first row's
  // (up to MAP_BOSS_MAX_ROADS_IN into the last row's).
  degrees(map) {
    const deg = nodeDegrees(map);
    const last = map.rows.length - 1;
    return map.rows.every((row, r) => row.every((n) => (r === last || (deg[n.id].out >= 1 && deg[n.id].out <= MAX_OUT)) && (r === 0 || (deg[n.id].in >= 1 && deg[n.id].in <= maxIn(r, map.rows.length)))));
  },
};

// Debug overlay (§4): each node's in and out degree.
export function nodeDegrees(map) {
  const inDeg = Object.fromEntries(map.nodes.map((n) => [n.id, 0]));
  for (const r of map.roads) inDeg[r.to]++;
  return Object.fromEntries(map.nodes.map((n) => [n.id, { in: inDeg[n.id], out: n.next.length }]));
}

export function pathTotal(map) {
  return pathCount(map);
}
