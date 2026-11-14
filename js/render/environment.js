// Placeholder forest: floor, corridors, Druid clearing and decorative objects (spec §5.3), in
// the level's palette.
// Upright objects are anchored at their base (x, y) so they can be y-sorted.

import * as C from '../config.js';
import { corridorWidth } from '../levelSettings.js';

// Scene colours come from the level's palette (M2a §5.5); only the ground shadow is shared, since
// entities use it too.
const SHADOW = 'rgba(0, 0, 0, 0.28)';

export function drawFloor(ctx, scene) {
  const P = scene.level.palette;
  ctx.fillStyle = P.floor;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  for (const p of scene.groundPatches) {
    ctx.fillStyle = p.light ? P.floorAccent.light : P.floorAccent.dark;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function strokeLane(ctx, lane, width, color) {
  const pts = lane.path.points;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

// Broad dirt corridors plus the open clearing around the Druid where they meet.
export function drawCorridors(ctx, scene) {
  const P = scene.level.palette;
  const d = scene.level.druidPos;
  const clearing = C.DECOR.clearingRadius;
  const W = corridorWidth(scene.level); // the level's corridor width (M2b §2)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Dark rim under everything, then the dirt, then a worn centre track.
  for (const lane of scene.lanes) strokeLane(ctx, lane, W + 10, P.corridorEdge);
  ctx.fillStyle = P.corridorEdge;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, clearing * 0.8 + 5, clearing * 0.65 + 5, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const lane of scene.lanes) strokeLane(ctx, lane, W, P.corridor.base);
  ctx.fillStyle = P.corridor.base;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, clearing * 0.8, clearing * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const lane of scene.lanes) strokeLane(ctx, lane, W * 0.4, P.corridor.worn);
  ctx.restore();
}

export function drawShadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// One decoration object from the level's map file (M4a §1.2), by its kind: the tree and bush
// styles (gnarled, bare, charred, willow, orchard; thorn, wormwood) are kinds of their own.
// item.flip mirrors it about its base.
const DECOR_DRAW = {
  tree: drawTree, gnarledTree: drawGnarledTree, bareTree: drawBareTree, charredTree: drawCharredTree,
  willowTree: drawWillowTree, orchardTree: drawOrchardTree,
  bush: drawBush, thornBush: drawThornBush, wormwoodBush: drawWormwoodBush,
  rock: drawRock,
};
export function drawDecor(ctx, item, level) {
  const draw = DECOR_DRAW[item.kind] ?? THEMED[item.kind];
  if (!item.flip) return draw(ctx, item, level.palette);
  ctx.save();
  ctx.translate(item.x * 2, 0);
  ctx.scale(-1, 1);
  draw(ctx, item, level.palette);
  ctx.restore();
}

// Whether the map file has a drawing for this decoration kind (start-up check, M4a §1.3).
export const isDecorKind = (kind) => !!(DECOR_DRAW[kind] ?? THEMED[kind]);

// Flat ground decoration (M2b §3): water and mist patches (M3a §2: and ash pits), drawn over the
// floor and under the corridors. Each avoids corridors and candidates (scene.js).
export function drawFlats(ctx, scene) {
  const P = scene.level.palette;
  for (const f of scene.flats) {
    if (f.kind === 'ash') {
      drawAshPit(ctx, f, P);
    } else if (f.kind === 'mere') {
      drawMere(ctx, f, P);
    } else if (f.kind === 'water') {
      ctx.fillStyle = P.water.rim;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx + 6, f.ry + 5, f.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.water.deep;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, f.rx, f.ry, f.rot, 0, Math.PI * 2);
      ctx.fill();
      // A few pale ripples.
      ctx.strokeStyle = P.water.ripple;
      ctx.lineWidth = 2;
      for (const [dx, dy, w] of [[-0.35, -0.25, 0.22], [0.2, 0.15, 0.3], [-0.05, 0.45, 0.16]]) {
        ctx.beginPath();
        ctx.ellipse(f.x + dx * f.rx, f.y + dy * f.ry, w * f.rx, w * f.ry * 0.35, f.rot, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    } else {
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx);
      g.addColorStop(0, P.mist);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(1, f.ry / f.rx);
      ctx.translate(-f.x, -f.y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// M3a §2: an ash pit: a sooty rim, a dark hollow, pale ash drifts and, on The Ember Road, a faint
// ember glow at its heart.
function drawAshPit(ctx, f, P) {
  ctx.fillStyle = P.pit.rim;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, f.rx + 6, f.ry + 5, f.rot, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.pit.deep;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, f.rx, f.ry, f.rot, 0, Math.PI * 2);
  ctx.fill();
  if (f.glow) {
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rx * 0.7);
    g.addColorStop(0, P.ember);
    g.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(1, f.ry / f.rx);
    ctx.translate(-f.x, -f.y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.rx * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = P.ash;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [dx, dy, w] of [[-0.4, -0.2, 0.25], [0.15, 0.25, 0.3], [0.3, -0.35, 0.15]]) {
    ctx.beginPath();
    ctx.ellipse(f.x + dx * f.rx, f.y + dy * f.ry, w * f.rx, w * f.ry * 0.3, f.rot, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
}

// Themed decoration kinds (M2b §3). Each fits its DECOR.extent entry.
const THEMED = {
  sunkenRoof: drawSunkenRoof,
  brokenFence: drawBrokenFence,
  reeds: drawReeds,
  mushrooms: drawMushrooms,
  standingStone: drawStandingStone,
  gravestone: drawGravestone,
  slab: drawSlab,
  mound: drawMound,
  kiln: drawKiln,
  chapelWall: drawChapelWall,
  sunkenStones: drawSunkenStones,
  cairn: drawCairn,
  bell: drawBell,
  stump: drawStump,
  weepingStone: drawWeepingStone,
  root: drawRoot,
  charredRoof: drawCharredRoof,
  tallowCandles: drawTallowCandles,
  leechStones: drawLeechStones,
  lanternPole: drawLanternPole,
  reedWall: drawReedWall,
  footbridge: drawFootbridge,
  gallows: drawGallows,
  tanneryVats: drawTanneryVats,
  dryingRack: drawDryingRack,
  ossuary: drawOssuary,
  widowTree: drawWidowTree,
  plagueCart: drawPlagueCart,
  sluiceGate: drawSluiceGate,
  sunkenBelfry: drawSunkenBelfry,
  altarStone: drawAltarStone,
  peatThrone: drawPeatThrone,
  charredBeams: drawCharredBeams,
  scorchedStones: drawScorchedStones,
};

// M3a §2 (The Burnt Hamlet): a cottage roof fallen into its ash pit, charred black, its rafters
// showing through the burnt thatch.
function drawCharredRoof(ctx, { x, y, size: s, variant }, P) {
  const tilt = (variant - 1) * 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = P.roof.dark;
  ctx.beginPath();
  ctx.moveTo(-32 * s, 0);
  ctx.lineTo(-10 * s, -24 * s);
  ctx.lineTo(4 * s, -18 * s);   // a burnt gap in the ridge
  ctx.lineTo(20 * s, -26 * s);
  ctx.lineTo(34 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.roof.light; // bare rafters
  ctx.lineWidth = 2.2 * s;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-24 * s + i * 14 * s, -2 * s);
    ctx.lineTo(-14 * s + i * 10 * s, -20 * s + (i % 2) * 4 * s);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = P.ash;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y, 36 * s, 6 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// M3a §2 (The Burnt Hamlet): blackened beams fallen across each other.
function drawCharredBeams(ctx, { x, y, size: s, variant }, P) {
  ctx.lineCap = 'round';
  for (const [dx, rot, len] of [[-6, -0.35 + variant * 0.1, 30], [8, 0.4, 26], [0, 0.05, 34]]) {
    ctx.save();
    ctx.translate(x + dx * s, y - 6 * s);
    ctx.rotate(rot);
    ctx.strokeStyle = P.roof.dark;
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.moveTo(-len * s * 0.5, 0);
    ctx.lineTo(len * s * 0.5, 0);
    ctx.stroke();
    ctx.strokeStyle = P.roof.light; // a scorched edge
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(-len * s * 0.45, -2 * s);
    ctx.lineTo(len * s * 0.3, -2 * s);
    ctx.stroke();
    ctx.restore();
  }
}

// M3a §2 (The Ember Road): scorched road stones tumbled at a pit's edge, ash at their feet.
function drawScorchedStones(ctx, { x, y, size: s, variant }, P) {
  for (const [dx, dy, rot] of [[-20, 2, -0.2], [0, -2, 0.1], [20, 3, 0.3]]) {
    ctx.save();
    ctx.translate(x + dx * s, y + dy * s);
    ctx.rotate(rot + (variant - 1) * 0.1);
    ctx.fillStyle = P.rock.dark;
    ctx.fillRect(-9 * s, -12 * s, 18 * s, 12 * s);
    ctx.fillStyle = P.rock.base;
    ctx.fillRect(-8 * s, -12 * s, 16 * s, 4 * s);
    ctx.fillStyle = P.treeDark.trunk; // soot on the stone's face
    ctx.fillRect(-8 * s, -6 * s, 10 * s, 5 * s);
    ctx.restore();
  }
  ctx.strokeStyle = P.ash;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * s, 5 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// M3a §2 (Blackbark Orchard): a fruit tree burnt to its bones: a dark, twisted, leafless trunk with
// crooked charred branches and a few dull ochre leaves still clinging on.
function drawCharredTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 22 * s, 7 * s);
  const bend = (variant - 1) * 8;
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + (10 + bend) * s, y - 14 * s, x - (12 - bend) * s, y - 26 * s, x + bend * 0.5 * s, y - 40 * s);
  ctx.stroke();
  const tips = [[-26, -58], [24, -60], [4, -72], [-12, -48], [14, -46]];
  for (const [i, [ex, ey]] of tips.entries()) {
    ctx.lineWidth = (i < 3 ? 4 : 2.5) * s;
    ctx.beginPath();
    ctx.moveTo(x + bend * 0.5 * s, y - 40 * s);
    ctx.quadraticCurveTo(x + ex * 0.3 * s, y + (ey + 12) * s, x + ex * s, y + ey * s);
    ctx.stroke();
  }
  ctx.fillStyle = P.treeLight[variant];
  for (const [ex, ey] of tips.slice(0, 2 + variant)) {
    ctx.beginPath();
    ctx.ellipse(x + ex * s, y + ey * s, 4 * s, 2.5 * s, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// M2f §4.8: a pale, leafless tree: a bleached trunk with bare forking branches (Bone Orchard).
function drawBareTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 22 * s, 7 * s);
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 7 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (variant - 1) * 3 * s, y - 42 * s);
  ctx.stroke();
  ctx.strokeStyle = P.treeLight[variant];
  for (const [ex, ey, w] of [[-26, -66, 4], [22, -72, 4], [2, -84, 3.5], [-14, -50, 3], [16, -54, 3]]) {
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(x + (variant - 1) * 3 * s, y - 40 * s);
    ctx.quadraticCurveTo(x + ex * 0.4 * s, y + (ey + 16) * s, x + ex * s, y + ey * s);
    ctx.stroke();
  }
}

// M2f §4.6: a large moss-covered cairn of piled stones. size = half-width.
function drawCairn(ctx, { x, y, size: w }, P) {
  const h = w * 0.45;
  drawShadow(ctx, x, y, w * 1.02, h * 0.2);
  const stones = [[-0.6, 0.18, 0.36], [0, 0.2, 0.42], [0.6, 0.18, 0.36], [-0.3, 0.55, 0.34], [0.32, 0.55, 0.34], [0, 0.85, 0.3]];
  for (const [dx, dy, r] of stones) {
    ctx.fillStyle = P.rock.dark;
    ctx.beginPath();
    ctx.ellipse(x + dx * w, y - dy * h * 1.4, r * w * 0.8, r * h * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.rock.base;
    ctx.beginPath();
    ctx.ellipse(x + dx * w - r * w * 0.12, y - dy * h * 1.4 - r * h * 0.25, r * w * 0.62, r * h * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.moss; // moss over the top of each stone
    ctx.beginPath();
    ctx.ellipse(x + dx * w, y - dy * h * 1.4 - r * h * 0.55, r * w * 0.55, r * h * 0.45, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

// M2f §4.10: a cracked bronze bell, half buried and tilted. size = half-width.
function drawBell(ctx, { x, y, size: w }, P) {
  const h = w * 0.9;
  drawShadow(ctx, x, y, w * 1.1, w * 0.2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.fillStyle = P.bronze.dark;
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 0.75, -h * 0.4, -w * 0.5, -h);
  ctx.quadraticCurveTo(0, -h * 1.2, w * 0.5, -h);
  ctx.quadraticCurveTo(w * 0.75, -h * 0.4, w, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.bronze.base;
  ctx.beginPath();
  ctx.moveTo(-w * 0.8, -h * 0.05);
  ctx.quadraticCurveTo(-w * 0.6, -h * 0.45, -w * 0.38, -h * 0.95);
  ctx.quadraticCurveTo(-w * 0.05, -h * 1.05, w * 0.1, -h * 0.95);
  ctx.lineTo(-w * 0.2, -h * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.bronze.light;
  ctx.lineWidth = 3;
  ctx.beginPath(); // the lip ring
  ctx.moveTo(-w * 0.95, -h * 0.12);
  ctx.lineTo(w * 0.95, -h * 0.12);
  ctx.stroke();
  ctx.strokeStyle = '#1a120a';
  ctx.lineWidth = 2;
  ctx.beginPath(); // the crack
  ctx.moveTo(w * 0.15, -h * 0.95);
  ctx.lineTo(w * 0.05, -h * 0.6);
  ctx.lineTo(w * 0.22, -h * 0.42);
  ctx.lineTo(w * 0.12, -h * 0.15);
  ctx.stroke();
  ctx.restore();
  // Earth heaped over its lower side.
  ctx.fillStyle = P.vegetation.base;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.2, y + 2, w * 1.05, w * 0.22, 0, Math.PI, Math.PI * 2);
  ctx.fill();
}

// M2f §4.7: a burnt tree stump, black with a faint ember glow in its top.
function drawStump(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 14 * s, 5 * s);
  ctx.fillStyle = P.treeDark.trunk;
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y);
  ctx.lineTo(x - 7 * s, y - (14 + variant * 3) * s);
  ctx.lineTo(x - 2 * s, y - (10 + variant * 2) * s);
  ctx.lineTo(x + 3 * s, y - (17 + variant * 2) * s);
  ctx.lineTo(x + 8 * s, y - 12 * s);
  ctx.lineTo(x + 10 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.ember;
  ctx.beginPath();
  ctx.arc(x + 1 * s, y - 11 * s, 2.5 * s, 0, Math.PI * 2);
  ctx.fill();
}

// M2f §4.9: a tall standing stone with dark wet streaks running down it.
function drawWeepingStone(ctx, item, P) {
  drawStandingStone(ctx, item, P);
  const { x, y, size: s, variant } = item;
  const h = (46 + variant * 6) * s;
  ctx.strokeStyle = P.streak;
  ctx.lineWidth = 2.5 * s;
  ctx.lineCap = 'round';
  for (const dx of [-6, 1, 7]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y - h * 0.8);
    ctx.quadraticCurveTo(x + (dx + 2) * s, y - h * 0.45, x + (dx - 1) * s, y - h * 0.08);
    ctx.stroke();
  }
}

// M2f §4.11: a huge ancient root arching out of the ground, pointing away from the Druid.
function drawRoot(ctx, { x, y, size: s, angle = 0 }, P) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle) * 0.5;
  ctx.lineCap = 'round';
  for (const [w, color, lift] of [[18, P.root.dark, 0], [13, P.root.base, 2], [5, P.root.light, 5]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(x - dx * 40 * s, y - dy * 40 * s);
    ctx.quadraticCurveTo(x, y - (24 + lift) * s, x + dx * 40 * s, y + dy * 40 * s);
    ctx.stroke();
  }
}

// M2f §4.2: a shallow stream across the map, drawn before the corridors so they cross it as
// fords. Each of scene.streams: { points: [{ x, y }, …], width }. Decoration only.
export function drawStream(ctx, scene) {
  const P = scene.level.palette;
  for (const s of scene.streams) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [w, color] of [[s.width + 10, P.water.rim], [s.width, P.water.deep], [s.width * 0.35, P.water.ripple]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }
    ctx.restore();
  }
}

// M2f §4.7: very subtle ash flecks drifting slowly over the ground (level.ashFlecks of them). Each
// fleck's path comes from its index and the real-time clock, so it needs no state. Visual only.
export function drawAshFlecks(ctx, scene, t) {
  const n = scene.level.ashFlecks;
  if (!n) return;
  const P = scene.level.palette;
  ctx.save();
  ctx.fillStyle = P.ash;
  for (let i = 0; i < n; i++) {
    const h1 = Math.sin(i * 12.9898) * 43758.5453;
    const h2 = Math.sin(i * 78.233) * 12345.678;
    const fx = h1 - Math.floor(h1);
    const fy = h2 - Math.floor(h2);
    const span = C.STAGE_HEIGHT - C.HUD_STRIP_HEIGHT;
    const x = (fx * C.STAGE_WIDTH + t * (8 + fx * 10) + Math.sin(t * 0.7 + i) * 12) % C.STAGE_WIDTH;
    const y = C.HUD_STRIP_HEIGHT + ((fy * span + t * (5 + fy * 6)) % span);
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + i * 2.1) ** 2;
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + fx * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// M2f §4.11: a sickly glow at each lane entrance (palette.laneGlow = 'r, g, b'), slowly breathing.
export function drawLaneGlow(ctx, p, rgb, t) {
  const a = 0.28 + 0.1 * Math.sin(t * 1.2);
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120);
  g.addColorStop(0, `rgba(${rgb}, ${a})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 120, 0, Math.PI * 2);
  ctx.fill();
}

// M2f §4.1: a charcoal kiln, a low domed mound of earth with a faint orange glow at its vent.
function drawKiln(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 26 * s, 7 * s);
  ctx.fillStyle = P.kiln.dark;
  ctx.beginPath();
  ctx.ellipse(x, y, 24 * s, 20 * s, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.kiln.light;
  ctx.beginPath();
  ctx.ellipse(x - 5 * s, y - 4 * s, 15 * s, 12 * s, 0, Math.PI * 1.05, Math.PI * 1.8);
  ctx.fill();
  const vx = x + (variant - 1) * 6 * s;
  const g = ctx.createRadialGradient(vx, y - 3 * s, 0, vx, y - 3 * s, 12 * s);
  g.addColorStop(0, P.ember);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(vx, y - 3 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.ellipse(vx, y - 2 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// M2f §4.3: a ruined chapel wall with a pointed window, overgrown with briars. size = half-width.
function drawChapelWall(ctx, { x, y, size: w }, P) {
  const h = w * 0.45;
  drawShadow(ctx, x, y, w * 1.02, h * 0.18);
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w, y - h * 0.55);
  ctx.lineTo(x - w * 0.55, y - h * 0.8);
  ctx.lineTo(x - w * 0.2, y - h * 1.05);
  ctx.lineTo(x + w * 0.25, y - h * 0.7);
  ctx.lineTo(x + w * 0.7, y - h * 0.45);
  ctx.lineTo(x + w, y - h * 0.2);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(x - w * 0.95, y - h * 0.5, w * 1.9, h * 0.08);
  // Pointed window, dark inside.
  ctx.fillStyle = '#141a12';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, y - h * 0.15);
  ctx.lineTo(x - w * 0.12, y - h * 0.6);
  ctx.quadraticCurveTo(x - w * 0.02, y - h * 0.85, x + w * 0.08, y - h * 0.6);
  ctx.lineTo(x + w * 0.08, y - h * 0.15);
  ctx.closePath();
  ctx.fill();
  // Briars climbing it, with red berries.
  ctx.strokeStyle = P.vegetation.base;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const [sx, top] of [[-0.85, 0.65], [-0.45, 0.85], [0.35, 0.6], [0.8, 0.35]]) {
    ctx.beginPath();
    ctx.moveTo(x + w * sx, y);
    ctx.quadraticCurveTo(x + w * (sx + 0.15), y - h * top * 0.5, x + w * (sx - 0.05), y - h * top);
    ctx.stroke();
  }
  ctx.fillStyle = P.berry;
  for (const [bx, by] of [[-0.8, 0.4], [-0.4, 0.6], [0.4, 0.45], [0.75, 0.25], [-0.55, 0.2]]) {
    ctx.beginPath();
    ctx.arc(x + w * bx, y - h * by, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// M2f §4.4: broken causeway stones half under water: three tilted slabs with a water line.
function drawSunkenStones(ctx, { x, y, size: s, variant }, P) {
  for (const [dx, dy, rot] of [[-20, 2, -0.2], [0, -2, 0.1], [20, 3, 0.3]]) {
    ctx.save();
    ctx.translate(x + dx * s, y + dy * s);
    ctx.rotate(rot + (variant - 1) * 0.1);
    ctx.fillStyle = P.rock.dark;
    ctx.fillRect(-9 * s, -12 * s, 18 * s, 12 * s);
    ctx.fillStyle = P.rock.base;
    ctx.fillRect(-8 * s, -12 * s, 16 * s, 5 * s);
    ctx.restore();
  }
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * s, 5 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// A cottage roof poking out of dark water at a slant: the gable, its ridge and the water line.
function drawSunkenRoof(ctx, { x, y, size: s, variant }, P) {
  const tilt = (variant - 1) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = P.roof.dark;
  ctx.beginPath();
  ctx.moveTo(-30 * s, 0);
  ctx.lineTo(-8 * s, -30 * s);
  ctx.lineTo(24 * s, -30 * s);
  ctx.lineTo(34 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.roof.light;
  ctx.beginPath();
  ctx.moveTo(-30 * s, 0);
  ctx.lineTo(-8 * s, -30 * s);
  ctx.lineTo(4 * s, 0);
  ctx.closePath();
  ctx.fill();
  // Thatch lines.
  ctx.strokeStyle = P.roof.dark;
  ctx.lineWidth = 1.5 * s;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-30 * s + i * 8 * s, 0);
    ctx.lineTo(-8 * s + i * 3 * s, -30 * s + i * 2 * s);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y, 36 * s, 6 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// Leaning fence posts with one broken rail, half in water.
function drawBrokenFence(ctx, { x, y, size: s, variant }, P) {
  ctx.strokeStyle = P.roof.dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * s;
  const posts = [[-22, 0.15], [-4, -0.1], [16, 0.3]];
  for (const [dx, lean] of posts) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y);
    ctx.lineTo(x + (dx + lean * 20) * s, y - (22 + variant * 3) * s);
    ctx.stroke();
  }
  ctx.lineWidth = 3 * s;
  ctx.strokeStyle = P.roof.light;
  ctx.beginPath();
  ctx.moveTo(x - 20 * s, y - 14 * s);
  ctx.lineTo(x + 2 * s, y - 17 * s);
  ctx.lineTo(x + 8 * s, y - 8 * s); // the broken end dips into the water
  ctx.stroke();
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x - 3 * s, y, 26 * s, 4 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// A tuft of reeds with brown cat-tail heads.
function drawReeds(ctx, { x, y, size: s, variant }, P) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 4 * s;
    const h = (18 + ((i * 5 + variant * 3) % 9)) * s;
    const lean = (i - 2) * 0.12;
    ctx.strokeStyle = P.vegetation.light;
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.lineTo(x + dx + lean * h, y - h);
    ctx.stroke();
    if (i % 2 === 0) {
      ctx.strokeStyle = P.roof.dark;
      ctx.lineWidth = 3.5 * s;
      ctx.beginPath();
      ctx.moveTo(x + dx + lean * h * 0.75, y - h * 0.75);
      ctx.lineTo(x + dx + lean * h * 0.95, y - h * 0.95);
      ctx.stroke();
    }
  }
}

// Twisted trunk with crooked branches and a few dark leaf clumps.
function drawGnarledTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 24 * s, 8 * s);
  const bend = (variant - 1) * 8;
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + (10 + bend) * s, y - 14 * s, x - (12 - bend) * s, y - 26 * s, x + bend * 0.5 * s, y - 40 * s);
  ctx.stroke();
  ctx.lineWidth = 4 * s;
  for (const [ex, ey] of [[-24, -54], [22, -56], [4, -68]]) {
    ctx.beginPath();
    ctx.moveTo(x + bend * 0.5 * s, y - 40 * s);
    ctx.quadraticCurveTo(x + ex * 0.3 * s, y + (ey + 12) * s, x + ex * s, y + ey * s);
    ctx.stroke();
  }
  ctx.fillStyle = P.treeDark.canopy[variant];
  for (const [dx, dy, r] of [[-24, -56, 13], [22, -58, 13], [4, -70, 12]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.treeLight[variant];
  ctx.beginPath();
  ctx.arc(x + 1 * s, y - 74 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

// A little cluster of glowing mushrooms.
function drawMushrooms(ctx, { x, y, size: s, variant }, P) {
  const g = ctx.createRadialGradient(x, y - 5 * s, 0, x, y - 5 * s, 16 * s);
  g.addColorStop(0, P.glow);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 5 * s, 16 * s, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, h, r] of [[-6, 7, 4.5], [3, 10, 5.5], [9, 5, 3.5]].slice(0, 2 + (variant % 2))) {
    ctx.fillStyle = P.mushroom.stem;
    ctx.fillRect(x + (dx - 1) * s, y - h * s, 2 * s, h * s);
    ctx.fillStyle = P.mushroom.cap;
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y - h * s, r * s, r * 0.6 * s, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }
}

// A tall weathered standing stone with a faintly glowing rune.
function drawStandingStone(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 16 * s, 5 * s);
  const w = (12 + variant * 2) * s;
  const h = (46 + variant * 6) * s;
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w * 0.8, y - h * 0.85);
  ctx.quadraticCurveTo(x, y - h * 1.08, x + w * 0.75, y - h * 0.9);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.75, y - 2 * s);
  ctx.lineTo(x - w * 0.6, y - h * 0.82);
  ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.98, x + w * 0.1, y - h * 0.9);
  ctx.lineTo(x, y - 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.glow;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y - h * 0.62);
  ctx.lineTo(x + 3 * s, y - h * 0.5);
  ctx.lineTo(x - 3 * s, y - h * 0.38);
  ctx.stroke();
}

// An old upright grave-stone, round-topped, a little tilted.
function drawGravestone(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 12 * s, 4 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((variant - 1) * 0.12);
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.moveTo(-9 * s, 0);
  ctx.lineTo(-9 * s, -20 * s);
  ctx.arc(0, -20 * s, 9 * s, Math.PI, 0);
  ctx.lineTo(9 * s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(-6 * s, -22 * s, 9 * s, 20 * s);
  ctx.strokeStyle = P.rock.dark;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-4 * s, -16 * s);
  ctx.lineTo(1 * s, -16 * s);
  ctx.moveTo(-1.5 * s, -20 * s);
  ctx.lineTo(-1.5 * s, -9 * s);
  ctx.stroke();
  ctx.restore();
}

// A flat, cracked stone slab lying in the grass.
function drawSlab(ctx, { x, y, size: s, variant }, P) {
  ctx.save();
  ctx.translate(x, y - 4 * s);
  ctx.rotate((variant - 1) * 0.3);
  ctx.fillStyle = P.rock.dark;
  ctx.fillRect(-20 * s, -8 * s, 40 * s, 15 * s);
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(-19 * s, -9 * s, 38 * s, 13 * s);
  ctx.strokeStyle = P.rock.dark;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-6 * s, -9 * s);
  ctx.lineTo(-2 * s, -2 * s);
  ctx.lineTo(-8 * s, 4 * s);
  ctx.stroke();
  ctx.restore();
}

// The great burial mound: a long grassy hill with a dark stone-framed doorway at its foot.
// size = its half-width in px; it is about 0.45 × as tall.
function drawMound(ctx, { x, y, size: w }, P) {
  const h = w * 0.45;
  drawShadow(ctx, x, y, w * 1.02, h * 0.22);
  ctx.fillStyle = P.mound.dark;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.mound.light;
  ctx.beginPath();
  ctx.ellipse(x - w * 0.12, y - h * 0.1, w * 0.78, h * 0.8, 0, Math.PI * 1.05, Math.PI * 1.85);
  ctx.fill();
  // Doorway: two upright stones, a lintel and the dark opening.
  const dw = w * 0.11;
  const dh = h * 0.42;
  ctx.fillStyle = '#1a1612';
  ctx.beginPath();
  ctx.moveTo(x - dw, y);
  ctx.lineTo(x - dw, y - dh * 0.75);
  ctx.quadraticCurveTo(x, y - dh * 1.05, x + dw, y - dh * 0.75);
  ctx.lineTo(x + dw, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(x - dw - 9, y - dh, 9, dh);
  ctx.fillRect(x + dw, y - dh, 9, dh);
  ctx.fillStyle = P.rock.light;
  ctx.fillRect(x - dw - 13, y - dh - 9, dw * 2 + 26, 10);
}

// Thorn bush: a tangle of dark spiky stems, each with small thorns, over a low dark mass. Fits
// the same drawn extent as a bush (DECOR.extent.bush), so decoration placement is unchanged.
function drawThornBush(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 18 * s, 6 * s);
  ctx.fillStyle = P.vegetation.base;
  ctx.beginPath();
  ctx.ellipse(x, y - 8 * s, 14 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.vegetation.light;
  ctx.lineCap = 'round';
  const stems = 7;
  for (let i = 0; i < stems; i++) {
    const a = -Math.PI * (0.12 + 0.76 * (i / (stems - 1))) + (variant - 1) * 0.08;
    const len = (17 + ((i * 7 + variant * 3) % 6)) * s;
    const bx = x + Math.cos(a) * 3 * s;
    const by = y - 8 * s;
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len;
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // Two thorns along each stem, alternating sides.
    ctx.lineWidth = 1.4 * s;
    for (const [t, side] of [[0.45, 1], [0.75, -1]]) {
      const tx = bx + (ex - bx) * t;
      const ty = by + (ey - by) * t;
      const ta = a + side * 0.9;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(ta) * 4.5 * s, ty + Math.sin(ta) * 4.5 * s);
      ctx.stroke();
    }
  }
}

function drawTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 24 * s, 8 * s);
  ctx.fillStyle = P.treeDark.trunk;
  ctx.fillRect(x - 4 * s, y - 26 * s, 8 * s, 26 * s);

  if (variant === 2) {
    // Pine: stacked triangles.
    ctx.fillStyle = P.treeDark.canopy[variant];
    for (let i = 0; i < 3; i++) {
      const baseY = y - 18 * s - i * 18 * s;
      const w = (26 - i * 6) * s;
      ctx.beginPath();
      ctx.moveTo(x - w, baseY);
      ctx.lineTo(x + w, baseY);
      ctx.lineTo(x, baseY - 34 * s);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  // Broadleaf: cluster of circles with a lighter highlight.
  const cy = y - 46 * s;
  ctx.fillStyle = P.treeDark.canopy[variant];
  for (const [dx, dy, r] of [[-14, 6, 18], [14, 6, 18], [0, -8, 22]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, cy + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.treeLight[variant];
  ctx.beginPath();
  ctx.arc(x - 6 * s, cy - 12 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx, { x, y, size: s }, P) {
  drawShadow(ctx, x, y, 18 * s, 6 * s);
  ctx.fillStyle = P.vegetation.base;
  for (const [dx, dy, r] of [[-9, -8, 10], [9, -8, 10], [0, -15, 11]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.vegetation.light;
  ctx.beginPath();
  ctx.arc(x - 3 * s, y - 19 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx, { x, y, size: s }, P) {
  drawShadow(ctx, x, y, 15 * s, 5 * s);
  ctx.fillStyle = P.rock.dark;
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.rock.base;
  ctx.beginPath();
  ctx.ellipse(x - 1 * s, y - 9 * s, 12 * s, 7.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.rock.light;
  ctx.beginPath();
  ctx.ellipse(x - 4 * s, y - 12 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

// M3c §3.1, M3d: mire ground: darker and wetter than the ground round it, with a soft, slightly
// lighter muddy rim, a sheen on the water, reeds along its borders and the occasional slow bubble.
// Over the floor, under everything upright; obvious at a glance without overpowering the scene.
export function drawMire(ctx, scene, t) {
  const M = C.MIRE_COLORS;
  const insideOther = (p, x, y) => p.blobs.some((o) => Math.hypot(x - o.x, (y - o.y) / 0.8) < o.r - 2);
  for (const p of scene.mire) {
    // The muddy rim: a soft band round the whole patch, fading outwards.
    for (const [grow, color] of [[14, M.rimOuter], [8, M.rim]]) {
      ctx.fillStyle = color;
      for (const b of p.blobs) {
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.r + grow, (b.r + grow) * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The wet body: dark, a little darker again towards each blob's middle.
    ctx.fillStyle = M.base;
    for (const b of p.blobs) {
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = M.deep;
    for (const b of p.blobs) {
      ctx.beginPath();
      ctx.ellipse(b.x + b.r * 0.05, b.y + b.r * 0.04, b.r * 0.62, b.r * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = M.sheen;
    ctx.lineWidth = 2;
    p.blobs.forEach((b, i) => {
      ctx.beginPath();
      ctx.ellipse(b.x - b.r * 0.2, b.y - b.r * 0.15, b.r * 0.45, b.r * 0.16, -0.1, Math.PI * (1.1 + (i % 3) * 0.05), Math.PI * 1.8);
      ctx.stroke();
    });
    // Reeds along the border: tufts round each blob's edge where it isn't inside another blob.
    ctx.strokeStyle = M.reed;
    ctx.lineCap = 'round';
    p.blobs.forEach((b, i) => {
      for (let k = 0; k < 5; k++) {
        const a = ((p.seed % 97) * 0.07 + i * 1.3 + k * 1.26) % (Math.PI * 2);
        const x = b.x + Math.cos(a) * (b.r + 3);
        const y = b.y + Math.sin(a) * (b.r + 3) * 0.8;
        if ((k + i + p.seed) % 2 || insideOther(p, x, y)) continue;
        ctx.lineWidth = 1.6;
        for (let j = -1; j <= 1; j++) {
          ctx.beginPath();
          ctx.moveTo(x + j * 3, y);
          ctx.lineTo(x + j * 4.5, y - 13 - (j === 0 ? 5 : 0));
          ctx.stroke();
        }
      }
    });
    // An occasional slow bubble: one blob at a time, swelling and popping.
    const cycle = 4.5; // s per bubble
    const k = ((t + (p.seed % 50) * 0.37) % cycle) / cycle;
    const b = p.blobs[Math.floor((t + (p.seed % 50) * 0.37) / cycle) % p.blobs.length];
    if (k < 0.35) {
      const r = 2 + (k / 0.35) * 5;
      ctx.strokeStyle = M.bubble;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(b.x + b.r * 0.15, b.y - b.r * 0.1, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Hag's Causeway's signature decoration (M3d §2). Each fits its DECOR.extent entry.
// ---------------------------------------------------------------------------

// Tallow Fen: pale candles of fat floating on a pool, a few lit, each with a soft glow.
function drawTallowCandles(ctx, { x, y, size: s, variant }, P) {
  for (const [dx, dy, h, lit] of [[-12, 2, 9, true], [4, -3, 12, variant > 0], [15, 4, 7, true]]) {
    const cx = x + dx * s;
    const cy = y + dy * s;
    if (lit) {
      const g = ctx.createRadialGradient(cx, cy - h * s, 0, cx, cy - h * s, 14 * s);
      g.addColorStop(0, 'rgba(255, 220, 140, 0.45)');
      g.addColorStop(1, 'rgba(255, 220, 140, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy - h * s, 14 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e8e0c8';
    ctx.fillRect(cx - 2.5 * s, cy - h * s, 5 * s, h * s);
    ctx.fillStyle = '#c8bfa4';
    ctx.fillRect(cx + 0.5 * s, cy - h * s, 2 * s, h * s);
    if (lit) {
      ctx.fillStyle = P.glow;
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * s - 3 * s, 1.6 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = P.water.ripple;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 5 * s, 1.5 * s, 0, 0, Math.PI);
    ctx.stroke();
  }
}

// The Leechwater Pools: stones at a pool's edge with dark leeches clinging to them.
function drawLeechStones(ctx, { x, y, size: s, variant }, P) {
  for (const [dx, dy, r] of [[-14, 2, 9], [6, -2, 11], [20, 4, 7]]) {
    ctx.fillStyle = P.rock.dark;
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s - r * 0.4 * s, r * s, r * 0.7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = P.rock.base;
    ctx.beginPath();
    ctx.ellipse(x + dx * s - r * 0.2 * s, y + dy * s - r * 0.6 * s, r * 0.6 * s, r * 0.35 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#1a1210';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6 * s;
  for (const [dx, dy, a] of [[-16, -2, 0.6], [-10, 0, -0.4], [4, -6, 0.9], [9, -3, -0.2], [18, 2, 0.5 + variant * 0.3]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y + dy * s);
    ctx.quadraticCurveTo(x + (dx + Math.cos(a) * 3) * s, y + (dy + Math.sin(a) * 3 - 2) * s, x + (dx + Math.cos(a) * 6) * s, y + (dy + Math.sin(a) * 6) * s);
    ctx.stroke();
  }
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y + 4 * s, 30 * s, 5 * s, 0, 0, Math.PI);
  ctx.stroke();
}

// The Lantern Fen: a crooked pole with a lantern hanging from its crook, some lit (variant).
function drawLanternPole(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 8 * s, 3 * s);
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 4 * s, y - 30 * s, x + 2 * s, y - 52 * s);
  ctx.lineTo(x + 14 * s, y - 56 * s);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 13 * s, y - 56 * s);
  ctx.lineTo(x + 13 * s, y - 48 * s);
  ctx.stroke();
  const lit = variant !== 1;
  if (lit) {
    const g = ctx.createRadialGradient(x + 13 * s, y - 42 * s, 0, x + 13 * s, y - 42 * s, 20 * s);
    g.addColorStop(0, 'rgba(255, 210, 120, 0.5)');
    g.addColorStop(1, 'rgba(255, 210, 120, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + 13 * s, y - 42 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = P.roof.dark;
  ctx.fillRect(x + 9 * s, y - 48 * s, 8 * s, 2 * s);
  ctx.fillStyle = lit ? P.glow : P.roof.light;
  ctx.fillRect(x + 10 * s, y - 46 * s, 6 * s, 8 * s);
  ctx.fillStyle = P.roof.dark;
  ctx.fillRect(x + 9 * s, y - 38 * s, 8 * s, 2 * s);
}

// The Corpse Reedbeds: a tall, dense clump of reeds walling a corridor.
function drawReedWall(ctx, { x, y, size: s, variant }, P) {
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const dx = (i - 4) * 3 * s;
    const h = (30 + ((i * 7 + variant * 5) % 14)) * s;
    const lean = (i - 4) * 0.06 + (variant - 1) * 0.08;
    ctx.strokeStyle = i % 3 === 0 ? P.vegetation.base : P.vegetation.light;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.lineTo(x + dx + lean * h, y - h);
    ctx.stroke();
    if (i % 3 === 1) {
      ctx.strokeStyle = P.roof.dark;
      ctx.lineWidth = 3.4 * s;
      ctx.beginPath();
      ctx.moveTo(x + dx + lean * h * 0.8, y - h * 0.8);
      ctx.lineTo(x + dx + lean * h * 0.95, y - h * 0.95);
      ctx.stroke();
    }
  }
}

// The Rotting Ford: a rotted wooden footbridge, planks missing, sagging on its posts. size: half-width.
function drawFootbridge(ctx, { x, y, size: w }, P) {
  const h = w * 0.25;
  drawShadow(ctx, x, y + 4, w * 1.05, h * 0.5);
  ctx.strokeStyle = P.roof.dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = w * 0.06;
  for (const px of [-0.85, -0.3, 0.3, 0.85]) {
    ctx.beginPath();
    ctx.moveTo(x + px * w, y + h * 0.3);
    ctx.lineTo(x + px * w, y - h * 0.6);
    ctx.stroke();
  }
  for (let i = 0; i < 11; i++) {
    if (i === 3 || i === 7) continue; // missing planks
    const px = x - w + (i + 0.5) * (2 * w / 11);
    const sag = Math.sin(((i + 0.5) / 11) * Math.PI) * h * 0.25;
    ctx.fillStyle = i % 2 ? P.roof.dark : P.roof.light;
    ctx.save();
    ctx.translate(px, y - h * 0.5 + sag);
    ctx.rotate((i % 3 - 1) * 0.08);
    ctx.fillRect(-w * 0.08, -h * 0.35, w * 0.16, h * 0.7);
    ctx.restore();
  }
  ctx.strokeStyle = P.roof.light; // a sagging handrail
  ctx.lineWidth = w * 0.035;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.85, y - h * 1.6);
  ctx.quadraticCurveTo(x, y - h * 1.0, x + w * 0.85, y - h * 1.7);
  ctx.stroke();
}

// The Drowned Gallows: a half-sunken gallows, its beam leaning, frayed ropes hanging. size: half-width.
function drawGallows(ctx, { x, y, size: w }, P) {
  ctx.fillStyle = P.water.rim;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.water.deep;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.9, w * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.roof.dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = w * 0.09;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.lineTo(x - w * 0.46, y - w * 1.25); // the post, leaning a little
  ctx.lineTo(x + w * 0.55, y - w * 1.12); // the beam
  ctx.moveTo(x - w * 0.47, y - w * 0.95);
  ctx.lineTo(x - w * 0.18, y - w * 1.2); // the brace
  ctx.stroke();
  ctx.strokeStyle = '#b8a888'; // frayed ropes
  ctx.lineWidth = w * 0.025;
  for (const [rx, len] of [[0.05, 0.45], [0.42, 0.62]]) {
    const top = { x: x + rx * w, y: y - w * (1.18 - rx * 0.12) };
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x + w * 0.02, top.y + w * len);
    ctx.lineTo(top.x - w * 0.03, top.y + w * (len + 0.06));
    ctx.moveTo(top.x + w * 0.02, top.y + w * len);
    ctx.lineTo(top.x + w * 0.05, top.y + w * (len + 0.07));
    ctx.stroke();
  }
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x - w * 0.5, y, w * 0.18, w * 0.05, 0, 0, Math.PI);
  ctx.stroke();
}

// The Sallow Mere: a broad grey lake at the map's edge, its rim reedy, a faint sheen.
function drawMere(ctx, f, P) {
  ctx.fillStyle = P.water.rim;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, f.rx + 14, f.ry + 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.water.deep;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, f.rx, f.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  for (const [dx, dy, k] of [[-0.3, -0.2, 0.35], [0.2, 0.1, 0.45], [-0.05, 0.35, 0.25]]) {
    ctx.beginPath();
    ctx.ellipse(f.x + dx * f.rx, f.y + dy * f.ry, k * f.rx, k * f.ry * 0.18, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
}

// Bonewhite Willows / the Sallow Mere: a willow, its long strands drooping to the ground, in the
// palette's tree colours (bone-white in Bonewhite Willows).
function drawWillowTree(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 26 * s, 8 * s);
  const lean = (variant - 1) * 6;
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s, y - 24 * s, x + lean * 0.5 * s, y - 44 * s);
  ctx.stroke();
  const top = { x: x + lean * 0.5 * s, y: y - 46 * s };
  ctx.fillStyle = P.treeDark.canopy[variant];
  ctx.beginPath();
  ctx.ellipse(top.x, top.y, 26 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -5; i <= 5; i++) { // drooping strands
    ctx.strokeStyle = P.treeLight[(i + 6) % 3];
    ctx.lineWidth = 2.4 * s;
    const sx = top.x + i * 4.6 * s;
    ctx.beginPath();
    ctx.moveTo(sx, top.y - 6 * s);
    ctx.quadraticCurveTo(sx + i * 3 * s, top.y + 4 * s, sx + i * 3.6 * s, top.y + (30 - Math.abs(i) * 1.5) * s);
    ctx.stroke();
  }
}

// Wormwood Hollow: a feathery grey-green wormwood bush.
function drawWormwoodBush(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 18 * s, 5 * s);
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i - 5.5) * 0.2;
    const len = (14 + ((i * 5 + variant * 3) % 7)) * s;
    ctx.strokeStyle = i % 2 ? P.vegetation.light : P.vegetation.base;
    ctx.lineWidth = 2.2 * s;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(x + (i - 5.5) * 1.2 * s, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 1.2 * s; // feathery side shoots
    for (const k of [0.45, 0.7]) {
      const px = x + (ex - x) * k;
      const py = y + (ey - y) * k;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 3.5 * s * Math.sign(i - 5.5 || 1), py - 3 * s);
      ctx.stroke();
    }
  }
}

// Carrion Orchard: a twisted orchard tree hung with black, rotting fruit.
function drawOrchardTree(ctx, item, P) {
  drawGnarledTree(ctx, item, P);
  const { x, y, size: s, variant } = item;
  ctx.fillStyle = '#1c1418';
  for (const [dx, dy] of [[-30, -48], [-18, -50], [16, -50], [28, -52], [-2, -60], [10, -64], [-26, -62]].slice(0, 5 + variant)) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, 2.6 * s, 3.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(28, 20, 24, 0.7)'; // fallen fruit
  for (const dx of [-14, 9, 20].slice(0, 1 + variant)) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + 3 * s, 3 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A pool of still water under a sunken landmark. w: half-width.
function drawSunkPool(ctx, x, y, w, P) {
  ctx.fillStyle = P.water.rim;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.water.deep;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.9, w * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The Drowned Tannery: three tanning vats sunk to their rims in water, and a drying rack with a
// hide. size: half-width.
function drawTanneryVats(ctx, { x, y, size: w }, P) {
  drawSunkPool(ctx, x, y, w, P);
  drawDryingRack(ctx, { x: x - w * 0.15, y: y - w * 0.2, size: w / 60, variant: 1 }, P);
  for (const [dx, dy, r] of [[-0.5, 0.02, 0.24], [0.08, 0.08, 0.27], [0.58, 0, 0.2]]) {
    const cx = x + dx * w;
    const cy = y + dy * w;
    ctx.fillStyle = P.roof.dark; // the staves
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * w, r * w * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a16'; // the brown liquor
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * w * 0.04, r * w * 0.8, r * w * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = P.roof.light;
    ctx.lineWidth = Math.max(1.5, w * 0.025);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * w, r * w * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The Drowned Tannery: a drying rack, two posts and a pole, a stiff hide hanging over it.
function drawDryingRack(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 20 * s, 4 * s);
  ctx.strokeStyle = P.roof.dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, y);
  ctx.lineTo(x - 15 * s, y - 30 * s);
  ctx.moveTo(x + 16 * s, y);
  ctx.lineTo(x + 15 * s, y - 29 * s);
  ctx.moveTo(x - 19 * s, y - 29 * s);
  ctx.lineTo(x + 19 * s, y - 30 * s);
  ctx.stroke();
  ctx.fillStyle = variant === 2 ? '#8a7254' : '#7a5e42'; // the hide
  ctx.beginPath();
  ctx.moveTo(x - 11 * s, y - 29 * s);
  ctx.lineTo(x + 10 * s, y - 29 * s);
  ctx.lineTo(x + 12 * s, y - 14 * s);
  ctx.lineTo(x + 5 * s, y - 11 * s);
  ctx.lineTo(x - 3 * s, y - 15 * s);
  ctx.lineTo(x - 12 * s, y - 12 * s);
  ctx.closePath();
  ctx.fill();
}

// The Sunken Ossuary: a stone bone-house tilted into the bog, skulls in the niches of its front.
// size: half-width.
function drawOssuary(ctx, { x, y, size: w }, P) {
  drawSunkPool(ctx, x + w * 0.1, y, w * 0.95, P);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.12);
  const bw = w * 0.62;
  const bh = w * 0.62;
  ctx.fillStyle = P.rock.dark;
  ctx.fillRect(-bw, -bh, bw * 2, bh);
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(-bw, -bh, bw * 2, bh * 0.82);
  ctx.fillStyle = P.rock.light; // the gable
  ctx.beginPath();
  ctx.moveTo(-bw * 1.12, -bh);
  ctx.lineTo(0, -bh * 1.6);
  ctx.lineTo(bw * 1.12, -bh);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 3; i++) { // niches, a skull in each
    const nx = -bw * 0.62 + i * bw * 0.62;
    const ny = -bh * 0.62;
    ctx.fillStyle = '#141616';
    ctx.beginPath();
    ctx.moveTo(nx - bw * 0.2, ny + bh * 0.3);
    ctx.lineTo(nx - bw * 0.2, ny - bh * 0.05);
    ctx.arc(nx, ny - bh * 0.05, bw * 0.2, Math.PI, 0);
    ctx.lineTo(nx + bw * 0.2, ny + bh * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8d2bc';
    ctx.beginPath();
    ctx.arc(nx, ny + bh * 0.08, bw * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(nx - bw * 0.06, ny + bh * 0.14, bw * 0.12, bh * 0.08);
    ctx.fillStyle = '#141616';
    ctx.fillRect(nx - bw * 0.07, ny + bh * 0.06, bw * 0.05, bw * 0.05);
    ctx.fillRect(nx + bw * 0.02, ny + bh * 0.06, bw * 0.05, bw * 0.05);
  }
  ctx.restore();
  ctx.fillStyle = P.water.deep; // the bog swallows its lower edge
  ctx.beginPath();
  ctx.ellipse(x + w * 0.1, y + w * 0.04, w * 0.8, w * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// The Widow's Mire: a lone dead tree shaped like a veiled woman, grey moss hanging like a veil
// from a head-like knot, two branches held out like arms. size: half-width.
function drawWidowTree(ctx, { x, y, size: w }, P) {
  drawShadow(ctx, x, y, w * 0.8, w * 0.22);
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineCap = 'round';
  ctx.lineWidth = w * 0.28;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w * 0.1, y - w * 1.2, x, y - w * 2.1);
  ctx.stroke();
  ctx.lineWidth = w * 0.1; // arms
  ctx.beginPath();
  ctx.moveTo(x, y - w * 1.6);
  ctx.quadraticCurveTo(x - w * 0.5, y - w * 1.5, x - w * 0.75, y - w * 1.15);
  ctx.moveTo(x, y - w * 1.55);
  ctx.quadraticCurveTo(x + w * 0.45, y - w * 1.6, x + w * 0.7, y - w * 1.25);
  ctx.stroke();
  ctx.fillStyle = P.treeDark.trunk; // the head
  ctx.beginPath();
  ctx.ellipse(x, y - w * 2.2, w * 0.22, w * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 200, 192, 0.55)'; // the veil of moss
  ctx.beginPath();
  ctx.moveTo(x - w * 0.24, y - w * 2.35);
  ctx.quadraticCurveTo(x, y - w * 2.6, x + w * 0.24, y - w * 2.35);
  ctx.quadraticCurveTo(x + w * 0.5, y - w * 1.7, x + w * 0.42, y - w * 1.0);
  ctx.lineTo(x + w * 0.2, y - w * 1.15);
  ctx.lineTo(x + w * 0.05, y - w * 0.95);
  ctx.lineTo(x - w * 0.15, y - w * 1.12);
  ctx.lineTo(x - w * 0.4, y - w * 0.98);
  ctx.quadraticCurveTo(x - w * 0.5, y - w * 1.7, x - w * 0.24, y - w * 2.35);
  ctx.fill();
}

// The Plague Carts: an overturned cart, its box on its side, sacking spilling out, one wheel in the
// air and one fallen. size: half-width; variant: which way it lies.
function drawPlagueCart(ctx, { x, y, size: w, variant }, P) {
  drawShadow(ctx, x, y, w, w * 0.25);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(variant === 1 ? -1 : 1, 1);
  ctx.rotate(variant === 2 ? 0.08 : -0.05);
  ctx.fillStyle = P.roof.dark; // the box on its side
  ctx.fillRect(-w * 0.75, -w * 0.62, w * 1.2, w * 0.62);
  ctx.strokeStyle = P.roof.light;
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.75, -w * 0.62 + i * w * 0.155);
    ctx.lineTo(w * 0.45, -w * 0.62 + i * w * 0.155);
    ctx.stroke();
  }
  ctx.fillStyle = '#9a8a68'; // sacking spilling out
  for (const [dx, r] of [[0.6, 0.2], [0.82, 0.16], [0.7, 0.13]]) {
    ctx.beginPath();
    ctx.ellipse(dx * w, -r * w * 0.8, r * w, r * w * 0.75, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = P.roof.dark; // a shaft
  ctx.lineWidth = w * 0.06;
  ctx.beginPath();
  ctx.moveTo(-w * 0.75, -w * 0.1);
  ctx.lineTo(-w * 1.15, w * 0.05);
  ctx.stroke();
  const wheel = (cx, cy, r, squash) => {
    ctx.strokeStyle = P.roof.light;
    ctx.lineWidth = w * 0.05;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = w * 0.025;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r * squash);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * squash);
      ctx.stroke();
    }
  };
  wheel(-w * 0.2, -w * 0.82, w * 0.3, 0.35); // up in the air
  wheel(variant === 2 ? w * 0.75 : -w * 0.45, w * 0.06, w * 0.26, 0.3); // fallen flat
  ctx.restore();
}

// The Weeping Sluice: a broken wooden sluice gate between two posts, water running through the
// gaps into a pool below. size: half-width.
function drawSluiceGate(ctx, { x, y, size: w }, P) {
  drawSunkPool(ctx, x, y + w * 0.05, w, P);
  ctx.fillStyle = P.roof.dark;
  ctx.fillRect(x - w * 0.62, y - w * 0.95, w * 0.12, w * 0.95);
  ctx.fillRect(x + w * 0.5, y - w * 0.95, w * 0.12, w * 0.95);
  ctx.fillRect(x - w * 0.7, y - w * 1.0, w * 1.4, w * 0.1);
  for (let i = 0; i < 5; i++) { // planks, one missing, one hanging, one broken short
    if (i === 2) continue;
    ctx.save();
    ctx.translate(x - w * 0.5, y - w * 0.82 + i * w * 0.16);
    if (i === 3) ctx.rotate(0.12);
    ctx.fillStyle = i % 2 ? P.roof.light : P.roof.dark;
    ctx.fillRect(0, 0, w * (i === 4 ? 0.62 : 1), w * 0.13);
    ctx.restore();
  }
  ctx.strokeStyle = P.water.ripple; // water through the gap and the cracks
  ctx.lineCap = 'round';
  for (const [sx, sy, len] of [[-0.3, -0.48, 0.5], [-0.05, -0.48, 0.52], [0.2, -0.48, 0.5], [0.0, -0.18, 0.2], [0.35, -0.04, 0.12]]) {
    const k = (sx * 3 + 3.4) % 1; // ripple sizes vary along the gate
    ctx.lineWidth = w * 0.04;
    ctx.beginPath();
    ctx.moveTo(x + sx * w, y + sy * w);
    ctx.quadraticCurveTo(x + (sx + 0.04) * w, y + (sy + len * 0.5) * w, x + (sx + 0.06) * w, y + (sy + len) * w);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x + (sx + 0.06) * w, y + (sy + len) * w + 2, 3 + k * 8, (3 + k * 8) * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The Drowned Bell Tower: the top of a bell tower standing out of the water, its arched opening
// dark, the bell hanging inside, its spire broken. size: half-width.
function drawSunkenBelfry(ctx, { x, y, size: w }, P) {
  drawSunkPool(ctx, x, y, w * 1.1, P);
  const tw = w * 0.42;
  ctx.fillStyle = P.rock.dark;
  ctx.fillRect(x - tw, y - w * 1.3, tw * 2, w * 1.3);
  ctx.fillStyle = P.rock.base;
  ctx.fillRect(x - tw, y - w * 1.3, tw * 1.4, w * 1.3);
  ctx.fillStyle = '#121616'; // the arched opening
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.55, y - w * 0.45);
  ctx.lineTo(x - tw * 0.55, y - w * 0.9);
  ctx.arc(x, y - w * 0.9, tw * 0.55, Math.PI, 0);
  ctx.lineTo(x + tw * 0.55, y - w * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6e8a6e'; // the bell, green with age
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.3, y - w * 0.58);
  ctx.quadraticCurveTo(x - tw * 0.28, y - w * 1.02, x, y - w * 1.02);
  ctx.quadraticCurveTo(x + tw * 0.28, y - w * 1.02, x + tw * 0.3, y - w * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.roof.dark; // the broken spire
  ctx.beginPath();
  ctx.moveTo(x - tw * 1.15, y - w * 1.3);
  ctx.lineTo(x - tw * 0.1, y - w * 2.0);
  ctx.lineTo(x + tw * 0.25, y - w * 1.75);
  ctx.lineTo(x + tw * 0.45, y - w * 1.85);
  ctx.lineTo(x + tw * 1.15, y - w * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.water.ripple;
  ctx.lineWidth = 2;
  for (const k of [1.2, 1.6]) {
    ctx.beginPath();
    ctx.ellipse(x, y, tw * k, tw * k * 0.25, 0, 0, Math.PI);
    ctx.stroke();
  }
}

// The Blackwater Shrine: a low altar stone on two supports in black water, mossed over, with
// carved spirals. size: half-width.
function drawAltarStone(ctx, { x, y, size: w }, P) {
  drawSunkPool(ctx, x, y + w * 0.05, w, P);
  ctx.fillStyle = P.rock.dark;
  ctx.fillRect(x - w * 0.5, y - w * 0.35, w * 0.18, w * 0.35);
  ctx.fillRect(x + w * 0.32, y - w * 0.35, w * 0.18, w * 0.35);
  ctx.fillStyle = P.rock.base; // the slab
  ctx.beginPath();
  ctx.ellipse(x, y - w * 0.45, w * 0.72, w * 0.2, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.rock.light;
  ctx.beginPath();
  ctx.ellipse(x - w * 0.05, y - w * 0.5, w * 0.6, w * 0.13, -0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.vegetation.light; // moss
  for (const [dx, dy, r] of [[-0.45, -0.46, 0.14], [0.38, -0.5, 0.11], [-0.1, -0.38, 0.09], [0.46, -0.3, 0.07]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * w, y + dy * w, r * w, r * w * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = P.rock.dark; // carved spirals
  ctx.lineWidth = Math.max(1.2, w * 0.025);
  for (const cx of [-0.18, 0.16]) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.3) {
      const r = (a / (Math.PI * 5)) * w * 0.1;
      const px = x + cx * w + Math.cos(a) * r;
      const py = y - w * 0.5 + Math.sin(a) * r * 0.45;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

// Bog King's Rest: a throne heaped up from peat blocks, with a high back, roots twisting through
// it. size: half-width.
function drawPeatThrone(ctx, { x, y, size: w }, P) {
  drawShadow(ctx, x, y, w, w * 0.25);
  const peat = ['#2a1e14', '#36271a', '#20170f'];
  for (const [dx, dy, bw, bh, i] of [
    [-0.75, -0.3, 1.5, 0.3, 0], [-0.65, -0.55, 0.4, 0.25, 1], [0.25, -0.55, 0.4, 0.25, 2], // the base and arms
    [-0.45, -0.62, 0.9, 0.16, 1],                                                             // the seat
    [-0.45, -1.4, 0.9, 0.8, 2], [-0.38, -1.75, 0.76, 0.36, 0], [-0.2, -2.0, 0.4, 0.26, 1],      // the high back
  ]) {
    ctx.fillStyle = peat[i];
    ctx.fillRect(x + dx * w, y + dy * w, bw * w, bh * w);
  }
  ctx.strokeStyle = P.treeDark.trunk; // roots
  ctx.lineCap = 'round';
  ctx.lineWidth = w * 0.06;
  for (const [x0, y0, x1, y1, x2, y2] of [[-0.8, 0, -0.5, -0.9, -0.3, -1.9], [0.8, 0, 0.55, -0.8, 0.28, -1.7], [-0.2, -2.0, 0, -2.3, 0.2, -2.05]]) {
    ctx.beginPath();
    ctx.moveTo(x + x0 * w, y + y0 * w);
    ctx.quadraticCurveTo(x + x1 * w, y + y1 * w, x + x2 * w, y + y2 * w);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200, 160, 80, 0.35)'; // a dull gleam of old gold in the peat
  ctx.beginPath();
  ctx.arc(x, y - w * 1.15, w * 0.07, 0, Math.PI * 2);
  ctx.fill();
}
