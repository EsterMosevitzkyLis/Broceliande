// The Tinker's Rest scene art (M2p §4.2), placeholder and procedural, on the place scene template
// (placeScene.js): crumbling stone ruins (a broken arch, pillars, a wall stub, ivy) round an old
// forge with glowing embers, tools hanging from a beam, the anvil on its stump, and the open book
// on a workbench (its pages' text and controls are HTML, tinkerScreen.js). The craft animation
// (§4.3): the forge flares, the hammer strikes the anvil, and the item bursts out in sparks.

import * as C from '../config.js';
import { drawPlaceScene, placePaletteId } from './placeScene.js';
import { drawShadow } from './environment.js';
import { drawFramedItemIcon } from './items.js';

const COLORS = {
  iron: '#3a3836',
  ironLight: '#6a6864',
  ironEdge: '#24221f',
  wood: '#6a4a2c',
  woodDark: '#3e2a18',
  woodLight: '#8a6a40',
  leather: '#5a2e1e',
  leatherDark: '#3a1c12',
  page: '#ead9b0',
  pageShade: '#cbb88a',
  coal: '#2a201a',
  flame: ['#ffe27a', '#ffa040', '#e2551e'],
  spark: '255, 210, 120',
};

// The whole scene for the visit (game.tinker). t: the visit's clock, s. regionId: the run's region (M3a §5.3).
export function drawTinkerScene(ctx, visit, t, regionId) {
  const id = placePaletteId('tinker', regionId);
  const P = C.PLACE_PALETTE[id];
  const age = t - visit.craftAt; // s since the last Craft
  const flare = age >= 0 && age < C.CRAFT_ANIM.end ? Math.sin(Math.min(1, age / C.CRAFT_ANIM.end) * Math.PI) : 0;
  drawPlaceScene(ctx, {
    id,
    drawProps: (c) => {
      drawRuins(c, P);
      drawForge(c, C.TINKER_SCENE.forge, P, t, flare);
      drawBeam(c, C.TINKER_SCENE.beam, t);
      drawWorkbench(c, C.TINKER_SCENE.book);
    },
    drawForeground: (c) => {
      const a = C.TINKER_SCENE.anvil;
      drawAnvil(c, a.x, a.y);
      drawCraft(c, a, visit, age);
    },
  }, t);
}

// ---------------------------------------------------------------------------
// Ruins: a broken arch behind the Druid, two pillars (one snapped), a low wall stub; all stone
// blocks in the palette's rock colours, with ivy.
// ---------------------------------------------------------------------------
function drawRuins(ctx, P) {
  const stone = { base: P.rock.base, light: P.rock.light, dark: P.rock.dark };
  // The broken arch: two pillars, the left one carrying part of the curve.
  drawPillar(ctx, 170, 520, 64, 330, stone);
  drawPillar(ctx, 470, 520, 64, 210, stone);
  ctx.save();
  ctx.strokeStyle = stone.base;
  ctx.lineWidth = 46;
  ctx.beginPath();
  ctx.arc(320, 200, 150, Math.PI, Math.PI * 1.55);
  ctx.stroke();
  ctx.strokeStyle = stone.dark;
  ctx.lineWidth = 3;
  for (let a = Math.PI * 1.08; a < Math.PI * 1.55; a += 0.16) { // the voussoirs' joints
    ctx.beginPath();
    ctx.moveTo(320 + Math.cos(a) * 127, 200 + Math.sin(a) * 127);
    ctx.lineTo(320 + Math.cos(a) * 173, 200 + Math.sin(a) * 173);
    ctx.stroke();
  }
  ctx.restore();
  drawIvy(ctx, 170, 230, 300, P.moss, 1);
  drawIvy(ctx, 470, 330, 170, P.moss, 2);
  // A snapped pillar and a fallen drum beside it, at the clearing's back.
  drawPillar(ctx, 1050, 470, 56, 150, stone);
  drawRubble(ctx, 1120, 478, stone);
  drawIvy(ctx, 1050, 330, 120, P.moss, 3);
  // A low wall stub on the far left.
  for (let i = 0; i < 3; i++) drawBlock(ctx, 20 + i * 52, 500 - (i % 2) * 6, 50, 34, stone);
  for (let i = 0; i < 2; i++) drawBlock(ctx, 46 + i * 52, 466, 50, 34, stone);
}

function drawBlock(ctx, x, y, w, h, stone) {
  ctx.fillStyle = stone.base;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = stone.light;
  ctx.fillRect(x, y, w, 5);
  ctx.strokeStyle = stone.dark;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

// A pillar of stacked drums standing on (x, base), `height` tall, with a jagged top.
function drawPillar(ctx, x, base, width, height, stone) {
  drawShadow(ctx, x, base, width * 0.8, 10);
  const drums = Math.round(height / 52);
  const h = height / drums;
  for (let i = 0; i < drums; i++) {
    const y = base - (i + 1) * h;
    const w = width * (1 - i * 0.01);
    ctx.fillStyle = stone.base;
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = stone.light;
    ctx.fillRect(x - w / 2, y, w * 0.28, h);
    ctx.strokeStyle = stone.dark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w / 2, y, w, h);
  }
  // The broken top.
  const top = base - height;
  ctx.fillStyle = stone.base;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, top);
  ctx.lineTo(x - width * 0.2, top - 14);
  ctx.lineTo(x + width * 0.05, top - 4);
  ctx.lineTo(x + width * 0.3, top - 18);
  ctx.lineTo(x + width / 2, top);
  ctx.closePath();
  ctx.fill();
}

function drawRubble(ctx, x, y, stone) {
  ctx.fillStyle = stone.base;
  ctx.strokeStyle = stone.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 18, 34, 20, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = stone.light;
  ctx.beginPath();
  ctx.ellipse(x - 26, y - 6, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Ivy trailing down from (x, top) over `length` px: a wandering stem with leaves on both sides.
function drawIvy(ctx, x, top, length, color, seed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let d = 0; d <= length; d += 6) {
    const px = x + Math.sin(d * 0.05 + seed) * 14;
    if (d === 0) ctx.moveTo(px, top + d);
    else ctx.lineTo(px, top + d);
  }
  ctx.stroke();
  for (let d = 10; d < length; d += 16) {
    const px = x + Math.sin(d * 0.05 + seed) * 14;
    const side = (d / 16 + seed) % 2 < 1 ? -1 : 1;
    ctx.beginPath();
    ctx.ellipse(px + side * 9, top + d, 9, 6, side * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The forge: a stone hearth with a hood and chimney, a bed of embers glowing in its mouth (brighter
// while crafting: flare 0 → 1).
// ---------------------------------------------------------------------------
function drawForge(ctx, { x, y }, P, t, flare) {
  const stone = { base: P.rock.base, light: P.rock.light, dark: P.rock.dark };
  // The glow on the ground and the stone round it.
  const glow = 0.35 + 0.08 * Math.sin(t * 3.1) + 0.05 * Math.sin(t * 7.3) + 0.5 * flare;
  const g = ctx.createRadialGradient(x, y - 60, 10, x, y - 60, 260 + 120 * flare);
  g.addColorStop(0, `rgba(255, 150, 70, ${glow})`);
  g.addColorStop(1, 'rgba(255, 150, 70, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 60, 260 + 120 * flare, 0, Math.PI * 2);
  ctx.fill();
  drawShadow(ctx, x, y, 140, 18);
  // Chimney and hood.
  ctx.fillStyle = stone.dark;
  ctx.fillRect(x - 34, y - 330, 68, 150);
  ctx.fillStyle = stone.base;
  ctx.beginPath();
  ctx.moveTo(x - 120, y - 150);
  ctx.lineTo(x - 50, y - 210);
  ctx.lineTo(x + 50, y - 210);
  ctx.lineTo(x + 120, y - 150);
  ctx.closePath();
  ctx.fill();
  // The hearth: stacked blocks with a dark mouth.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 4; i++) {
      const off = row % 2 ? 26 : 0;
      drawBlock(ctx, x - 130 + off + i * 56, y - 50 * (row + 1), 54, 50, stone);
    }
  }
  ctx.fillStyle = COLORS.coal;
  ctx.beginPath();
  ctx.moveTo(x - 62, y - 30);
  ctx.lineTo(x - 62, y - 92);
  ctx.quadraticCurveTo(x, y - 140, x + 62, y - 92);
  ctx.lineTo(x + 62, y - 30);
  ctx.closePath();
  ctx.fill();
  // Embers, flickering; tongues of flame when it flares.
  for (let i = 0; i < 9; i++) {
    const ex = x - 48 + i * 12;
    const flick = 0.5 + 0.5 * Math.sin(t * (4 + i * 0.7) + i * 1.9);
    ctx.fillStyle = i % 3 === 0 ? COLORS.flame[0] : P.ember;
    ctx.globalAlpha = 0.55 + 0.45 * flick;
    ctx.beginPath();
    ctx.arc(ex, y - 40 - (i % 2) * 5, 6 + flick * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (flare > 0.05) {
    for (let i = 0; i < 3; i++) {
      const h = (40 + 30 * Math.sin(t * 11 + i * 2)) * flare;
      ctx.fillStyle = COLORS.flame[i];
      ctx.beginPath();
      ctx.moveTo(x - 40 + i * 4, y - 36);
      ctx.quadraticCurveTo(x - 10 + Math.sin(t * 9 + i) * 8, y - 40 - h * 1.6, x + 40 - i * 4, y - 36);
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// The beam over the forge with the tools hanging from it (tongs, a hammer, a saw, a horseshoe),
// swaying a little; one post holds its left end, the chimney its right.
// ---------------------------------------------------------------------------
function drawBeam(ctx, { x1, x2, y }, t) {
  ctx.fillStyle = COLORS.woodDark;
  ctx.fillRect(x1 - 12, y, 24, 300);                  // the post
  ctx.fillStyle = COLORS.wood;
  ctx.fillRect(x1 - 30, y - 14, x2 - x1 + 50, 26);    // the beam
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(x1 - 30, y - 14, x2 - x1 + 50, 6);
  const tools = [drawTongs, drawHangingHammer, drawSaw, drawHorseshoe];
  tools.forEach((draw, i) => {
    const hx = x1 + 60 + i * 52;
    const sway = Math.sin(t * 0.9 + i * 1.7) * 0.05;
    ctx.save();
    ctx.translate(hx, y + 12);
    ctx.rotate(sway);
    ctx.strokeStyle = COLORS.ironEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 18);
    ctx.stroke();
    draw(ctx);
    ctx.restore();
  });
}

function drawTongs(ctx) {
  ctx.strokeStyle = COLORS.iron;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 20); ctx.lineTo(4, 110); ctx.lineTo(-2, 124);
  ctx.moveTo(6, 20); ctx.lineTo(-4, 110); ctx.lineTo(2, 124);
  ctx.stroke();
}

function drawHangingHammer(ctx) {
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(-4, 18, 8, 80);
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(-18, 92, 36, 20);
}

function drawSaw(ctx) {
  ctx.fillStyle = COLORS.ironLight;
  ctx.beginPath();
  ctx.moveTo(-10, 40); ctx.lineTo(10, 40); ctx.lineTo(6, 120); ctx.lineTo(-6, 120);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.wood;
  ctx.fillRect(-12, 18, 24, 24);
}

function drawHorseshoe(ctx) {
  ctx.strokeStyle = COLORS.ironLight;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 40, 18, Math.PI * 0.9, Math.PI * 2.1, true);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// The anvil on its stump (base at x, y); the craft animation plays on its face.
// ---------------------------------------------------------------------------
const ANVIL_TOP = 92; // px from the stump's base to the anvil's face

function drawAnvil(ctx, x, y) {
  drawShadow(ctx, x, y, 90, 16);
  ctx.fillStyle = COLORS.woodDark;                   // the stump
  ctx.fillRect(x - 46, y - 50, 92, 50);
  ctx.fillStyle = COLORS.wood;
  ctx.beginPath();
  ctx.ellipse(x, y - 50, 46, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.iron;                       // the anvil
  ctx.beginPath();
  ctx.moveTo(x - 30, y - 52);
  ctx.lineTo(x - 18, y - 72);
  ctx.lineTo(x - 50, y - ANVIL_TOP);
  ctx.quadraticCurveTo(x - 90, y - ANVIL_TOP - 2, x - 104, y - ANVIL_TOP - 14); // the horn
  ctx.quadraticCurveTo(x - 80, y - ANVIL_TOP - 20, x - 50, y - ANVIL_TOP - 18);
  ctx.lineTo(x + 66, y - ANVIL_TOP - 18);
  ctx.lineTo(x + 66, y - ANVIL_TOP);
  ctx.lineTo(x + 18, y - 72);
  ctx.lineTo(x + 30, y - 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.ironLight;
  ctx.fillRect(x - 50, y - ANVIL_TOP - 18, 116, 5);
  // The hammer lies by the stump when not in use (it is drawn swinging during a craft).
}

// The craft (§4.3): the hammer swings down on the anvil at each strike with a spray of sparks,
// then the item rises from the anvil in a burst of sparks and a soft glow, and settles.
function drawCraft(ctx, anvil, visit, age) {
  const face = { x: anvil.x + 10, y: anvil.y - ANVIL_TOP - 18 };
  const A = C.CRAFT_ANIM;
  const crafting = age >= 0 && age < A.end;
  drawHammer(ctx, face, crafting ? hammerAngle(age) : null);
  if (!crafting) return;
  for (const s of A.strikes) {
    const k = (age - s) / 0.45;
    if (k >= 0 && k < 1) drawSparks(ctx, face.x, face.y, k, 12, 90, s * 17);
  }
  const k = (age - A.appear) / (A.end - A.appear);
  if (k < 0 || !visit.craftItem) return;
  const y = face.y - 70 - 60 * Math.min(1, k * 2);
  const pop = k < 0.2 ? 0.6 + 2 * k : 1;
  ctx.save();
  ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
  const g = ctx.createRadialGradient(face.x, y, 0, face.x, y, 90);
  g.addColorStop(0, 'rgba(255, 230, 150, 0.8)');
  g.addColorStop(1, 'rgba(255, 230, 150, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(face.x, y, 90, 0, Math.PI * 2);
  ctx.fill();
  drawFramedItemIcon(ctx, visit.craftItem, face.x, y, 84 * pop);
  ctx.restore();
  if (k < 0.6) drawSparks(ctx, face.x, y, k / 0.6, 20, 150, 3);
}

// The hammer's swing: raised (−1.4 rad) between strikes, down on the face (0) at each strike time.
function hammerAngle(age) {
  const [s1, s2] = C.CRAFT_ANIM.strikes;
  const down = (from, to, u) => from + (to - from) * u * u;
  if (age < s1) return down(-0.3, 0, age / s1) - 1.4 * Math.sin((age / s1) * Math.PI) * 0.8;
  if (age < s2) {
    const u = (age - s1) / (s2 - s1);
    return -1.4 * Math.sin(u * Math.PI);
  }
  return -Math.min(1.1, (age - s2) * 3); // lifted away after the last strike
}

// A hammer whose head rests on the face at angle 0, swinging about a pivot up and to the right;
// at rest (angle null) it leans on the stump.
function drawHammer(ctx, face, angle) {
  ctx.save();
  if (angle === null) {
    ctx.translate(face.x + 80, face.y + 110);
    ctx.rotate(0.35);
  } else {
    ctx.translate(face.x + 120, face.y - 30);
    ctx.rotate(angle);
    ctx.translate(-100, 0);
  }
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(0, -5, 104, 10);
  ctx.fillStyle = COLORS.iron;
  ctx.fillRect(-14, -16, 30, 32);
  ctx.fillStyle = COLORS.ironLight;
  ctx.fillRect(-14, -16, 30, 6);
  ctx.restore();
}

// A spray of n sparks from (x, y), flying out up to `reach` px and fading as k goes 0 → 1;
// directions fixed from `seed` (no randomness needed).
function drawSparks(ctx, x, y, k, n, reach, seed) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + Math.sin(i * 2.39 + seed) * 1.5;
    const r = reach * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7 + seed))) * Math.sqrt(k);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r + 60 * k * k; // they fall a little
    ctx.fillStyle = `rgba(${COLORS.spark}, ${1 - k})`;
    ctx.beginPath();
    ctx.arc(px, py, 3.2 * (1 - k * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The workbench and the open book on it (the pages' contents are HTML over them).
// ---------------------------------------------------------------------------
function drawWorkbench(ctx, { x, y, w, h }) {
  const top = y + h - 30;
  drawShadow(ctx, x + w / 2, top + 130, w * 0.55, 24);
  ctx.fillStyle = COLORS.woodDark;                   // legs
  ctx.fillRect(x + 40, top + 20, 30, 120);
  ctx.fillRect(x + w - 70, top + 20, 30, 120);
  ctx.fillStyle = COLORS.wood;                       // the top
  ctx.fillRect(x - 20, top, w + 40, 34);
  ctx.fillStyle = COLORS.woodLight;
  ctx.fillRect(x - 20, top, w + 40, 7);
  // The cover, then the two pages with a crease and a soft shade towards it.
  ctx.fillStyle = COLORS.leatherDark;
  ctx.beginPath();
  ctx.roundRect(x - 14, y - 10, w + 28, h + 24, 14);
  ctx.fill();
  ctx.fillStyle = COLORS.leather;
  ctx.beginPath();
  ctx.roundRect(x - 8, y - 6, w + 16, h + 14, 12);
  ctx.fill();
  for (const side of [0, 1]) {
    const px = x + side * w / 2;
    const g = ctx.createLinearGradient(px, 0, px + w / 2, 0);
    g.addColorStop(side ? 0 : 0.85, side ? COLORS.pageShade : COLORS.page);
    g.addColorStop(side ? 0.15 : 1, side ? COLORS.page : COLORS.pageShade);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(px + (side ? 0 : 4), y, w / 2 - 4, h, side ? [0, 8, 8, 0] : [8, 0, 0, 8]);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(80, 55, 30, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + 4);
  ctx.lineTo(x + w / 2, y + h - 4);
  ctx.stroke();
}
