// Enemy drops (M1d §1, M1e §3.3): resource items left where enemies die, rolled from each
// type's drop table. They stay on the field until a Squirrel collects them (squirrelSystem.js)
// or the encounter ends. A kill's gold is merged into coins (and a big pile of one resource into
// bigger items): each item carries its `amount`, which collecting it adds in full. The items land
// scattered in a circle round the death point; the old lane rows are only a last resort.

import * as C from '../config.js';
import { laneWorldPos, enemyType } from '../entities/enemy.js';
import { emptyResources } from '../resources.js';
import { regionTwist } from '../levelSettings.js';

// Furthest an item's centre may sit from its lane's centreline, so everything drawn for it
// (icon, bob and glow, which reaches 0.6 × icon size; see drawDrop) stays inside its lane's corridor (§1.2, M2b §2).
const maxDropOffset = (lane) => lane.corridorWidth / 2 - C.RESOURCE_ICON_SIZE * C.DROP_ICON_SCALE * 0.6;

export function emptyDropStats() {
  return { dropped: emptyResources(), collected: emptyResources(), lost: emptyResources() }; // lost: to the mire (M3b §4)
}

// Roll each resource independently with the seeded RNG (§1.1). Chances are multiplied by the
// effective drops.chanceMult (M2p, Gleaner's Belt) and the debug drop multiplier (key X), capped
// at certainty. Returns one resource key per unit.
function rollDrops(game, table) {
  const units = [];
  for (const { resource, chance, min, max } of table) {
    if (game.rng.next() >= Math.min(1, chance * game.stats['drops.chanceMult'] * game.dropMult)) continue;
    const amount = game.rng.int(min, max);
    for (let i = 0; i < amount; i++) units.push(resource);
  }
  return units;
}

const SEARCH_STEP = 2; // px along the lane when looking for the next item position

// The death point in lane coordinates { s, offset }, with the offset clamped so items stay
// inside the corridor. An enemy that died off its lane (attacking the Druid) maps onto the nearest
// point of its lane, which is near the lane end, i.e. near the Druid (§1.2).
function laneAnchor(lane, p) {
  const q = lane.path.closestPoint(p);
  const n = lane.path.normalAt(q.s);
  const offset = (p.x - q.x) * n.x + (p.y - q.y) * n.y;
  const max = maxDropOffset(lane);
  return { s: q.s, offset: Math.max(-max, Math.min(max, offset)) };
}

// The old lane-row placement, now only scatterPositions' last resort.

// Next position along the lane (dir ±1) at the same offset that is at least `spacing` from
// `from`, or null if the lane ends first.
function nextAlong(lane, offset, from, dir, spacing) {
  for (let s = from.s + dir * SEARCH_STEP; s >= 0 && s <= lane.path.length; s += dir * SEARCH_STEP) {
    const p = laneWorldPos(lane, s, offset);
    if (Math.hypot(p.x - from.p.x, p.y - from.p.y) >= spacing) return { s, p };
  }
  return null;
}

// Up to n positions in one row centred on s, following the lane at a fixed offset so every
// item is inside the corridor, each `spacing` from its neighbour even on bends. Fewer if the
// lane runs out at both ends.
function onePassRow(lane, s, offset, n, spacing) {
  const first = { s, p: laneWorldPos(lane, s, offset) };
  const out = [first.p];
  const ends = { 1: first, [-1]: first };
  let dir = 1;
  while (out.length < n) {
    const next = nextAlong(lane, offset, ends[dir], dir, spacing) ?? nextAlong(lane, offset, ends[-dir], -dir, spacing);
    if (!next) break;
    const used = next.s > s ? 1 : -1;
    ends[used] = next;
    out.push(next.p);
    dir = -dir;
  }
  return out;
}

// n positions centred on the anchor. A big drop (the Bog King's ~100 items) can outrun the
// lane, so further rows go beside the first one, `spacing` apart across the corridor and
// alternating sides; if even those run out, the rest stack on the positions already used.
function rowPositions(lane, anchor, n, spacing) {
  const max = maxDropOffset(lane);
  const offsets = [anchor.offset];
  for (let k = 1; offsets.length < 2 * max / spacing + 1 && k < 100; k++) {
    for (const o of [anchor.offset + k * spacing, anchor.offset - k * spacing]) {
      if (Math.abs(o) <= max) offsets.push(o);
    }
  }
  const out = [];
  for (const offset of offsets) {
    if (out.length >= n) break;
    out.push(...onePassRow(lane, anchor.s, offset, n - out.length, spacing));
  }
  const used = out.length;
  for (let i = used; i < n; i++) out.push(out[i % used]);
  return out;
}

// Splits a total into coins of DROP_COIN_VALUES, largest first. With maxItems, while that makes
// too many, the smallest coin's value is raised by 1 (once it passes the others it becomes the
// largest, and the next smallest rises, so a big total ends in a few big coins); whatever the
// smallest coin can't make exactly is added to the last coin, so the coins always add up to the total.
export function splitIntoCoins(total, maxItems = Infinity) {
  const values = [...C.DROP_COIN_VALUES];
  for (;;) {
    values.sort((a, b) => b - a);
    const coins = [];
    let left = total;
    for (const v of values) for (; left >= v; left -= v) coins.push(v);
    if (left > 0) {
      if (coins.length) coins[coins.length - 1] += left;
      else coins.push(left);
    }
    if (coins.length <= maxItems) return coins;
    values[values.length - 1]++;
  }
}

// The kill's rolled units as items { resource, amount }, in the order first rolled: gold always
// merged into at most DROP_GOLD_MAX_ITEMS coins; another resource merged the same way only past
// DROP_MERGE_OVER units.
function mergeUnits(units) {
  const counts = {};
  for (const r of units) counts[r] = (counts[r] ?? 0) + 1;
  const items = [];
  for (const [resource, n] of Object.entries(counts)) {
    const amounts = resource === 'gold' ? splitIntoCoins(n, C.DROP_GOLD_MAX_ITEMS)
      : n > C.DROP_MERGE_OVER ? splitIntoCoins(n) : Array(n).fill(1);
    for (const amount of amounts) items.push({ resource, amount });
  }
  return items;
}

// Whether a drop's icon (glow included) at p would overlap the level name label (scene.labelArea,
// stage coordinates, set by main.js at start-up from the UI's measurement).
function underLabel(scene, p, margin) {
  const r = scene.labelArea;
  return !!r && p.x > r.left - margin && p.x < r.right + margin && p.y > r.top - margin && p.y < r.bottom + margin;
}

// n resting spots scattered round the death point: each at a random angle and a distance up to
// min(DROP_SCATTER_BASE + DROP_SCATTER_PER × √n, DROP_SCATTER_MAX), √random so they spread evenly
// over the circle (a lone item lands DROP_SINGLE_OFFSET away, so it still arcs). They may leave the
// lane; clamped to the map, off the level name label, and DROP_MIN_GAP from the kill's other items
// where DROP_PLACE_TRIES tries allow (then the last clear spot is accepted). A spot that can't get
// clear of the label takes the old lane-row position instead (rowPositions).
function scatterPositions(game, enemy, n) {
  const radius = Math.min(C.DROP_SCATTER_BASE + C.DROP_SCATTER_PER * Math.sqrt(n), C.DROP_SCATTER_MAX);
  const m = C.RESOURCE_ICON_SIZE * C.DROP_ICON_SCALE * 0.6; // the icon and its glow stay on the map
  const out = [];
  let rows = null;
  for (let i = 0; i < n; i++) {
    let chosen = null;
    for (let t = 0; t < C.DROP_PLACE_TRIES; t++) {
      const angle = game.rng.next() * Math.PI * 2;
      const dist = n === 1 ? game.rng.range(C.DROP_SINGLE_OFFSET[0], C.DROP_SINGLE_OFFSET[1]) : radius * Math.sqrt(game.rng.next());
      const p = {
        x: Math.max(m, Math.min(C.STAGE_WIDTH - m, enemy.x + Math.cos(angle) * dist)),
        y: Math.max(C.HUD_STRIP_HEIGHT + m, Math.min(C.STAGE_HEIGHT - m, enemy.y + Math.sin(angle) * dist)),
      };
      if (underLabel(game.scene, p, m)) continue;
      chosen = p;
      if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= C.DROP_MIN_GAP)) break;
    }
    if (!chosen) {
      // Last resort: the lane rows, DROP_SPACING apart (or the type's dropSpacing), stacking if full.
      rows ??= rowPositions(enemy.lane, laneAnchor(enemy.lane, enemy), n, enemyType(enemy).dropSpacing ?? C.DROP_SPACING);
      chosen = rows[i];
    }
    out.push(chosen);
  }
  return out;
}

// Called when an enemy dies: the rolled units, merged, scattered round the death point.
// Items pop out of the death point and arc to their resting spot (M1g §1): (x, y) is where the
// item comes to rest; (fromX, fromY) where it was launched from. They launch DROP_POP_STAGGER
// apart, and only count as on the ground (for Squirrels) once landed.
export function dropLoot(game, enemy) {
  const items = mergeUnits(rollDrops(game, enemyType(enemy).drops));
  if (items.length === 0) return;
  const positions = scatterPositions(game, enemy, items.length);
  items.forEach(({ resource, amount }, i) => {
    const p = positions[i];
    game.drops.push({
      id: game.nextEntityId++, resource, amount, x: p.x, y: p.y, lane: enemy.lane.id, claimedBy: null,
      fromX: enemy.x, fromY: enemy.y, delay: i * C.DROP_POP_STAGGER, age: 0,
    });
    game.dropStats.dropped[resource] += amount;
  });
}

// Whether a drop has finished its pop and lies on the ground (M1g §1.3).
export function isLanded(drop) {
  return drop.age >= drop.delay + C.DROP_POP_TIME;
}

// Drops age in simulation time during Combat only, so they respect pause and speed and freeze
// in the air during ENDING (M1g §1.3). M3b §4: in a region with sinkingDrops, a landed drop sinks
// into the mire (drop.sunk: s since it landed) and is gone after DROP_SINK_TIME; sinking pauses
// in ENDING with everything else, and the Victory sweep takes only what is left.
export function updateDrops(game, dt) {
  const sinking = regionTwist(game.scene.level, 'sinkingDrops');
  for (const drop of game.drops) {
    drop.age += dt;
    if (sinking && isLanded(drop)) {
      drop.sunk = (drop.sunk ?? 0) + dt;
      drop.sinkLimit = sinkTime(game); // s it lasts (drawing and debug)
    }
  }
  if (!sinking) return;
  const lost = game.drops.filter((d) => d.sunk >= sinkTime(game));
  if (!lost.length) return;
  for (const d of lost) game.dropStats.lost[d.resource] += d.amount;
  game.drops = game.drops.filter((d) => !lost.includes(d)); // a Squirrel heading for one picks another
}

// s a landed drop lasts in the mire: DROP_SINK_TIME × drops.sinkTimeMult (M3c §5, Peatcutter's Belt).
export function sinkTime(game) {
  return C.DROP_SINK_TIME * game.stats['drops.sinkTimeMult'];
}

// Debug key X (§3): drop chances ×1 ↔ ×DEBUG_DROP_MULT. Kept across restarts.
export function toggleDropMult(game) {
  game.dropMult = game.dropMult === 1 ? C.DEBUG_DROP_MULT : 1;
}
