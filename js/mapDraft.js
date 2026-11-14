// Draft generators for a level's ground (M4a §1.3, §5.7): the seeded decoration scatter and mire
// patches that made every level's ground before the map files. The game never runs these: each
// level's ground is fixed in its map file. They stay for the map editor's "Generate draft", which
// runs them for a level without a map file, or for one layer of an existing one.

import * as C from './config.js';
import { createRng } from './rng.js';
import { corridorWidth, regionTwist } from './levelSettings.js';
import { corridorDistance, OCCUPIED_RADIUS } from './scene.js';

// A draft of a scene's ground. scene: a scene (scene.js createScene: lanes, candidates, level);
// opts: the generator's settings, as the old per-level geometry had them: decorSeed, decorDensity,
// decorProps, flats, landmarks, stoneRing, mere, reedWalls, mireCoverage (with a mireGround
// region), and treeKind / bushKind (e.g. 'willowTree', 'thornBush'; default 'tree', 'bush').
// Returns { decor, flats, groundPatches, mire }, in the scene's own shapes.
export function draftGround(scene, opts) {
  const s = { ...scene, level: { decorDensity: 1, ...scene.level, ...opts }, mire: [] };
  s.mire = generateMire(s);
  scatterDecor(s);
  const kinds = { tree: opts.treeKind ?? 'tree', bush: opts.bushKind ?? 'bush' };
  for (const d of s.decor) d.kind = kinds[d.kind] ?? d.kind;
  return { decor: s.decor, flats: s.flats, groundPatches: s.groundPatches, mire: s.mire };
}

// ---------------------------------------------------------------------------
// Decorative forest: deterministic jittered-grid scatter (visual only, M1c §5), seeded with
// decorSeed; the level's decorDensity scales the tree / bush / rock chances. Themed
// decoration (M2b §3) is placed first, from its own stream (decorSeed + 1) so the forest's rolls
// are unchanged: flat patches (water, mist), fixed landmarks (the burial mound), a stone ring
// round the Druid, and the props in water patches. The forest then keeps off their ground.
// ---------------------------------------------------------------------------

// Whether a circle (centre, radius r) stays clear of corridors and of every candidate
// (footprint + jitter + margin).
function circleFits(scene, centre, r) {
  if (corridorDistance(scene.lanes, centre) - corridorWidth(scene.level) / 2 < r + C.DECOR.corridorGap) return false;
  const keepOut = OCCUPIED_RADIUS + C.DECOR_MARGIN + r;
  return scene.candidates.every((c) => Math.hypot(centre.x - c.x, centre.y - c.y) >= keepOut);
}

// Whether a decor object of this kind and size, based at p, stays clear of corridors and of
// every candidate. Tested on its drawn extent, not its base.
function decorFits(scene, kind, p, size) {
  const e = C.DECOR.extent[kind];
  return circleFits(scene, { x: p.x, y: p.y - e.lift * size }, e.r * size);
}

// The same for an ellipse rotated by rot, tested at its middle and at points round its edge.
function ellipseFits(scene, x, y, rx, ry, rot) {
  if (!circleFits(scene, { x, y }, Math.min(rx, ry))) return false;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const ex = Math.cos(a) * rx;
    const ey = Math.sin(a) * ry;
    const p = { x: x + ex * Math.cos(rot) - ey * Math.sin(rot), y: y + ex * Math.sin(rot) + ey * Math.cos(rot) };
    if (!circleFits(scene, p, 4)) return false;
  }
  return true;
}

function shuffled(rng, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// M3d: a landmark { kind, size, near } given no position: the first seeded spot where it fits,
// clear of the landmarks before it (blocked); near 'lane': beside a corridor (its edge just clear
// of it); 'laneStart': the same, at a lane's far end (Bog King's Rest's throne); 'mire': standing
// on a mire patch (The Widow's Mire's tree).
function placeLandmark(scene, spec, rng, blocked) {
  const h = spec.size * 0.45;
  const spots = [];
  if (spec.near === 'mire') {
    for (const b of scene.mire.flatMap((m) => m.blobs)) spots.push({ x: b.x, y: b.y + b.r * 0.3 });
  } else if (spec.near === 'lane' || spec.near === 'laneStart') {
    for (const lane of scene.lanes) {
      const [from, to] = spec.near === 'lane' ? [120, lane.path.length - 200] : [40, 260];
      for (let s = from; s < to; s += 30) {
        const p = lane.path.pointAt(s);
        const n = lane.path.normalAt(s);
        for (const side of [-1, 1]) {
          const off = lane.corridorWidth / 2 + spec.size + 6;
          spots.push({ x: p.x + n.x * off * side, y: p.y + n.y * off * side + h * 0.5 });
        }
      }
    }
  } else {
    for (let x = 100; x < C.STAGE_WIDTH - 100; x += 30) for (let y = C.HUD_STRIP_HEIGHT + 120; y < C.STAGE_HEIGHT - 40; y += 30) spots.push({ x, y });
  }
  const clear = (p) => blocked.every((b) => Math.hypot(b.x - p.x, b.y - (p.y - h * 0.5)) > b.r + spec.size);
  const onScreen = (p) => p.y - h > C.HUD_STRIP_HEIGHT && p.y < C.STAGE_HEIGHT - 10 && p.x > spec.size && p.x < C.STAGE_WIDTH - spec.size;
  const fit = shuffled(rng, spots).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })).find((p) => onScreen(p) && clear(p) && ellipseFits(scene, p.x, p.y - h * 0.5, spec.size, h * 0.6, 0));
  return fit ? { ...spec, ...fit } : null;
}

// Themed decoration (M2b §3). Returns { flats, items, blocked }; blocked: circles the forest
// keeps out of.
function themedDecor(scene) {
  const { level } = scene;
  const rng = createRng(level.decorSeed + 1);
  const flats = [];
  const items = [];
  const blocked = [];

  // Fixed landmarks (the burial mound): size = half-width; tested as an ellipse over the hill.
  // M3d: a landmark without x / y is placed here (placeLandmark): beside a lane (the Rotting Ford's
  // footbridge), at a lane's far end, on the mire, or anywhere clear (the Drowned Gallows).
  for (const spec of level.landmarks ?? []) {
    const lm = spec.x === undefined ? placeLandmark(scene, spec, rng, blocked) : spec;
    if (!lm) {
      console.warn(`${scene.levelId}: no room for its ${spec.kind}; left out`);
      continue;
    }
    const h = lm.size * 0.45;
    if (!ellipseFits(scene, lm.x, lm.y - h * 0.5, lm.size, h * 0.6, 0)) {
      console.warn(`${scene.levelId}: landmark ${lm.kind} at (${lm.x}, ${lm.y}) overlaps a corridor or candidate; left out`);
      continue;
    }
    items.push({ kind: lm.kind, x: lm.x, y: lm.y, size: lm.size, variant: lm.variant ?? 0 });
    blocked.push({ x: lm.x, y: lm.y - h * 0.5, r: lm.size });
  }

  // Standing stones (or another kind, e.g. the Heartwood's roots) in a ring round the Druid: one per
  // evenly spaced angle, at the first radius
  // in [min, max] (10 px steps) where it clears corridors, candidates and the stones before it;
  // left out where there is none.
  if (level.stoneRing) {
    const { radius: [rMin, rMax], count, size, kind = 'standingStone' } = level.stoneRing;
    const d = level.druidPos;
    const e = C.DECOR.extent[kind];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rng.range(-0.08, 0.08);
      const variant = rng.int(0, 2);
      for (let r = rMin; r <= rMax; r += 10) {
        const p = { x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r };
        const c = { x: p.x, y: p.y - e.lift * size };
        if (!decorFits(scene, kind, p, size)) continue;
        if (blocked.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < b.r + e.r * size)) continue;
        items.push({ kind, x: p.x, y: p.y, size, variant, angle: a }); // angle: which way a root points
        blocked.push({ x: c.x, y: c.y, r: e.r * size });
        break;
      }
    }
  }

  // M3d (The Sallow Mere): a broad grey mere at the map's edge, partly off screen, clear of the
  // corridors and candidates; sallow trees grow round it with the rest of the forest.
  if (level.mere) {
    const M = level.mere;
    const spots = [];
    for (const k of [0.25, 0.45]) { // its centre a little off screen, or further
      for (let x = 0; x <= C.STAGE_WIDTH; x += 30) spots.push({ x, y: C.STAGE_HEIGHT + M.ry * k }, { x, y: C.HUD_STRIP_HEIGHT + M.ry * (k - 0.1) });
      for (let y = C.HUD_STRIP_HEIGHT; y <= C.STAGE_HEIGHT; y += 30) spots.push({ x: -M.rx * k, y }, { x: C.STAGE_WIDTH + M.rx * k, y });
    }
    const at = shuffled(rng, spots).find((p) => ellipseFits(scene, p.x, p.y, M.rx, M.ry, 0));
    if (at) {
      flats.push({ kind: 'mere', x: at.x, y: at.y, rx: M.rx, ry: M.ry, rot: 0 });
      blocked.push({ x: at.x, y: at.y, r: Math.min(M.rx, M.ry) });
    } else {
      console.warn(`${scene.levelId}: no room for its mere; left out`);
    }
  }

  // M3d (The Corpse Reedbeds): tall, dense reed walls along both sides of every corridor, where
  // they clear the corridors, candidates and the landmarks.
  if (level.reedWalls) {
    const R = level.reedWalls;
    for (const lane of scene.lanes) {
      for (let s = R.spacing; s < lane.path.length; s += R.spacing) {
        const p = lane.path.pointAt(s);
        const n = lane.path.normalAt(s);
        for (const side of [-1, 1]) {
          const off = lane.corridorWidth / 2 + R.offset + rng.range(0, 6);
          const q = { x: p.x + n.x * off * side, y: p.y + n.y * off * side + C.DECOR.extent.reedWall.lift * R.size * 0.5 };
          if (q.y < C.HUD_STRIP_HEIGHT + 20 || !decorFits(scene, 'reedWall', q, R.size)) continue;
          items.push({ kind: 'reedWall', x: q.x, y: q.y, size: R.size * rng.range(0.85, 1.15), variant: rng.int(0, 2) });
        }
      }
    }
  }

  // Low mist: a faint ground tint that may lie anywhere (over corridors too); it never blocks
  // other decoration.
  if (level.flats?.kind === 'mist') {
    const F = level.flats;
    for (let i = 0; i < F.count; i++) {
      const rx = rng.range(F.rx[0], F.rx[1]);
      flats.push({ kind: 'mist', x: rng.range(0, C.STAGE_WIDTH), y: rng.range(C.HUD_STRIP_HEIGHT + 40, C.STAGE_HEIGHT), rx, ry: rng.range(F.ry[0], F.ry[1]), rot: 0 });
    }
  }

  // Water patches, each with a sunken roof or broken fence in it and reeds round its edge (M3a §2:
  // or ash pits, each with its burnt prop and no reeds): placed at random until `count` fit, clear
  // of corridors, candidates, each other and the above.
  if (level.flats?.kind === 'water' || level.flats?.kind === 'ash') {
    const F = level.flats;
    for (let tries = 0; tries < F.count * 40 && flats.length < F.count; tries++) {
      const rx = rng.range(F.rx[0], F.rx[1]);
      const ry = rng.range(F.ry[0], F.ry[1]);
      const rot = rng.range(-0.3, 0.3);
      const x = rng.range(rx, C.STAGE_WIDTH - rx);
      const y = rng.range(C.HUD_STRIP_HEIGHT + ry + 20, C.STAGE_HEIGHT - ry);
      const variant = rng.int(0, 2);
      if (!ellipseFits(scene, x, y, rx + F.edge, ry + F.edge, rot)) continue;
      if (blocked.some((b) => Math.hypot(b.x - x, b.y - y) < b.r + rx)) continue;
      flats.push({ kind: F.kind, x, y, rx, ry, rot, glow: !!F.glow });
      blocked.push({ x, y, r: rx });
      const s = Math.min(1, rx / 70);
      // The water's prop: flats.props cycles through its own list (M2f: sunken causeway stones), else
      // a sunken roof or broken fence, alternating.
      const kinds = F.props ?? ['brokenFence', 'sunkenRoof'];
      items.push({ kind: kinds[flats.length % kinds.length], x: x + rx * 0.1, y: y + ry * 0.3, size: s, variant });
      if (F.kind === 'water') for (const t of [0.1, 0.42, 0.62, 0.85]) {
        const a = t * Math.PI * 2;
        items.push({ kind: 'reeds', x: x + Math.cos(a) * rx * 0.92, y: y + Math.sin(a) * ry * 0.92 + 4, size: 0.9, variant });
      }
    }
  }
  return { flats, items, blocked };
}

function scatterDecor(scene) {
  const D = C.DECOR;
  const { level } = scene;
  const themed = themedDecor(scene);
  const rng = createRng(level.decorSeed);
  const top = C.HUD_STRIP_HEIGHT;
  const home = level.druidPos;
  const inClearing = (p) => Math.hypot(p.x - home.x, p.y - home.y) < D.clearingRadius;
  const density = level.decorDensity;
  // Themed props (decorProps: kind → chance per cell, × decorDensity), taken from the same roll
  // after trees, bushes and rocks, so levels without them are unchanged.
  const props = Object.entries(level.decorProps ?? {});
  const onThemed = (kind, p, size) => {
    const e = D.extent[kind];
    const c = { x: p.x, y: p.y - e.lift * size };
    return themed.blocked.some((b) => Math.hypot(b.x - c.x, b.y - c.y) < b.r + e.r * size);
  };

  const decor = [...themed.items];
  for (let gy = top; gy < C.STAGE_HEIGHT + D.cellSize; gy += D.cellSize) {
    for (let gx = -D.cellSize / 2; gx < C.STAGE_WIDTH + D.cellSize / 2; gx += D.cellSize) {
      // Draw every random value up front so each cell's rolls never depend on the checks below.
      const p = { x: gx + rng.range(0, D.cellSize), y: gy + rng.range(0, D.cellSize) };
      const roll = rng.next();
      const size = rng.range(0.8, 1.25);
      const variant = rng.int(0, 2);
      if (inClearing(p)) continue;

      const edge = Math.min(p.x, C.STAGE_WIDTH - p.x, p.y - top, C.STAGE_HEIGHT - p.y);
      const treeChance = edge < D.edgeBand ? 1 : D.treeChance * density;
      const bushChance = D.bushChance * density;
      const rockChance = D.rockChance * density;

      let kind = null;
      if (roll < treeChance) kind = 'tree';
      else if (roll < treeChance + bushChance) kind = 'bush';
      else if (roll < treeChance + bushChance + rockChance) kind = 'rock';
      else {
        let sum = treeChance + bushChance + rockChance;
        for (const [k, chance] of props) {
          sum += chance * density;
          if (roll < sum) {
            kind = k;
            break;
          }
        }
      }
      if (!kind) continue;
      // Trees need canopy room below the HUD strip.
      if (kind === 'tree' && p.y < top + 60) kind = 'bush';
      // A tree with no room becomes a bush if that fits.
      if (kind === 'tree' && (!decorFits(scene, kind, p, size) || onThemed(kind, p, size))) kind = 'bush';
      if (!decorFits(scene, kind, p, size) || onThemed(kind, p, size)) continue;

      decor.push({ kind, x: p.x, y: p.y, size, variant });
    }
  }
  scene.decor = decor;
  scene.flats = themed.flats;

  scene.groundPatches = [];
  for (let i = 0; i < D.groundPatches; i++) {
    scene.groundPatches.push({
      x: rng.range(0, C.STAGE_WIDTH),
      y: rng.range(top, C.STAGE_HEIGHT),
      rx: rng.range(60, 180),
      ry: rng.range(30, 90),
      light: rng.next() < 0.5,
    });
  }
}

// Mire (M3c §3.1): clusters of overlapping round blobs covering roughly mireCoverage of the
// battlefield, never on a corridor.
const CELL = 16; // px, the grid that estimates how much ground is covered

function generateMire(scene) {
  const level = scene.level;
  if (!regionTwist(level, 'mireGround') || !(level.mireCoverage > 0)) return [];
  const rng = createRng((level.decorSeed + C.MIRE_SEED_OFFSET) >>> 0);
  const top = C.HUD_STRIP_HEIGHT;
  const target = (C.STAGE_WIDTH * (C.STAGE_HEIGHT - top) * level.mireCoverage) / (CELL * CELL);
  const covered = new Set();
  const mark = (b) => {
    for (let gx = Math.floor((b.x - b.r) / CELL); gx <= Math.ceil((b.x + b.r) / CELL); gx++) {
      for (let gy = Math.floor((b.y - b.r) / CELL); gy <= Math.ceil((b.y + b.r) / CELL); gy++) {
        if (Math.hypot(gx * CELL - b.x, gy * CELL - b.y) <= b.r) covered.add(`${gx},${gy}`);
      }
    }
  };
  const patches = [];
  for (let tries = 0; tries < 300 && covered.size < target; tries++) {
    const cx = rng.range(0, C.STAGE_WIDTH);
    const cy = rng.range(top + 30, C.STAGE_HEIGHT);
    const blobs = [];
    const n = rng.int(C.MIRE_BLOBS[0], C.MIRE_BLOBS[1]);
    for (let i = 0; i < n; i++) {
      const b = { x: cx + rng.range(-C.MIRE_PATCH_SPREAD, C.MIRE_PATCH_SPREAD), y: cy + rng.range(-C.MIRE_PATCH_SPREAD, C.MIRE_PATCH_SPREAD) * 0.6, r: rng.range(C.MIRE_BLOB_RADIUS[0], C.MIRE_BLOB_RADIUS[1]) };
      if (b.y - b.r * 0.5 > top && clearOfCorridors(scene, b)) blobs.push(b);
    }
    if (blobs.length < 2) continue;
    patches.push({ blobs, seed: rng.int(0, 1e6) });
    blobs.forEach(mark);
  }
  return patches;
}

function clearOfCorridors(scene, b) {
  return scene.lanes.every((lane) => lane.path.distanceTo(b) >= lane.corridorWidth / 2 + b.r + C.MIRE_CORRIDOR_GAP);
}
