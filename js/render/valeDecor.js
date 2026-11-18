// The Lost Vale's decoration (M6e §2): tree ferns and fern clumps for its forest, and each level's
// signature pieces. Upright objects are anchored at their base (x, y). A themed kind's size is a
// multiplier (its drawing is made for size 1); a landmark's size is its half-width in px
// (C.DECOR.landmarkSize). Colours come from the level's palette: the shared keys and its `vale`
// group (stone, moss, gold, web, fungus, wood, foam, paint).

import { drawShadow } from './environment.js';

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  ctx.fill();
}

// One drooping frond from (x, y) at angle a (0 = right), length len, in colour c.
function frond(ctx, x, y, a, len, c, width) {
  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len * 0.55 + len * 0.35;
  ctx.strokeStyle = c;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.55, y + Math.sin(a) * len * 0.3 - len * 0.25, ex, ey);
  ctx.stroke();
  ctx.lineWidth = width * 0.6;
  for (let i = 1; i < 6; i++) {
    const k = i / 6;
    const px = x + (ex - x) * k;
    const py = y + (ey - y) * k - Math.sin(k * Math.PI) * len * 0.22;
    const leaf = len * 0.16 * (1 - k * 0.6);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.sin(a) * leaf, py + leaf * 0.7);
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.sin(a) * leaf * 0.4, py + leaf * 0.8);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// The forest: tree ferns (a tree style) and fern clumps (a bush style)
// ---------------------------------------------------------------------------

// A tree fern: a slender shaggy trunk and a crown of long arching fronds. Variant: its height.
export function drawFernTree(ctx, { x, y, size: s, variant }, P) {
  const h = [56, 64, 48][variant % 3] * s;
  drawShadow(ctx, x, y, 22 * s, 7 * s);
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineWidth = 7 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + (variant - 1) * 5 * s, y - h * 0.5, x + (variant - 1) * 3 * s, y - h);
  ctx.stroke();
  ctx.strokeStyle = P.vale.wood; // shaggy old frond bases on the trunk
  ctx.lineWidth = 2 * s;
  for (let i = 1; i < 5; i++) {
    const ty = y - h * (i / 5);
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, ty);
    ctx.lineTo(x + 4 * s, ty + 3 * s);
    ctx.stroke();
  }
  const cx = x + (variant - 1) * 3 * s;
  const cy = y - h;
  const colors = [P.treeDark.canopy[variant % 3], P.treeLight[variant % 3]];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI + (i % 2 ? 0.1 : -0.1);
    frond(ctx, cx, cy, a, (30 + (i % 3) * 5) * s, colors[i % 2], 3.2 * s);
  }
  ellipse(ctx, cx, cy - 1 * s, 6 * s, 4 * s, P.treeLight[variant % 3]);
}

// A fern clump: low fronds fanning from the ground.
export function drawFernBush(ctx, { x, y, size: s, variant }, P) {
  drawShadow(ctx, x, y, 18 * s, 6 * s);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + 0.2 + (i / (n - 1)) * (Math.PI - 0.4);
    frond(ctx, x, y - 2 * s, a, (18 + ((i + variant) % 3) * 3) * s, i % 2 ? P.vegetation.base : P.vegetation.light, 2.4 * s);
  }
}

// ---------------------------------------------------------------------------
// Emerald Gully: mossy stone steps and the ruined arch
// ---------------------------------------------------------------------------

// Three worn steps, moss on their edges.
export function drawMossSteps(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y + 2 * s, 34 * s, 8 * s);
  for (let i = 0; i < 3; i++) {
    const w = (32 - i * 7) * s;
    const top = y - (i + 1) * 7 * s;
    ctx.fillStyle = V.stoneDark;
    ctx.fillRect(x - w, top + 4 * s, w * 2, 4 * s);
    ctx.fillStyle = i % 2 ? V.stone : V.stoneLight;
    ctx.fillRect(x - w, top, w * 2, 5 * s);
    ellipse(ctx, x - w + (6 + variant * 4) * s, top + 1 * s, 7 * s, 2.2 * s, V.moss);
    ellipse(ctx, x + w - 8 * s, top + 1.5 * s, 5 * s, 1.8 * s, V.mossLight);
  }
}

// An Elder arch, its top broken away: two mossy pillars and a span with a gap.
export function drawRuinedArch(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  const h = w * 1.5;
  drawShadow(ctx, x, y, w * 1.05, w * 0.22);
  for (const side of [-1, 1]) {
    const px = x + side * w * 0.72;
    ctx.fillStyle = V.stoneDark;
    ctx.fillRect(px - w * 0.18, y - h, w * 0.36, h);
    ctx.fillStyle = V.stone;
    ctx.fillRect(px - w * 0.15, y - h, w * 0.26, h);
    for (let i = 1; i < 5; i++) { // stone courses
      ctx.fillStyle = V.stoneDark;
      ctx.fillRect(px - w * 0.15, y - h * (i / 5), w * 0.3, w * 0.02);
    }
    ellipse(ctx, px, y - h * 0.2, w * 0.2, w * 0.08, V.moss);
  }
  // The span: from the left pillar over the top, broken short of the right.
  ctx.strokeStyle = V.stone;
  ctx.lineWidth = w * 0.22;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.arc(x, y - h, w * 0.72, Math.PI, Math.PI * 1.72);
  ctx.stroke();
  ctx.strokeStyle = V.stoneLight;
  ctx.lineWidth = w * 0.06;
  ctx.beginPath();
  ctx.arc(x, y - h, w * 0.8, Math.PI, Math.PI * 1.7);
  ctx.stroke();
  ellipse(ctx, x - w * 0.45, y - h - w * 0.5, w * 0.22, w * 0.09, V.moss, -0.6); // the moss crown
  ellipse(ctx, x + w * 0.1, y - h - w * 0.68, w * 0.14, w * 0.06, V.mossLight, -0.2);
  ctx.fillStyle = V.stone; // a fallen block at its foot
  ctx.fillRect(x + w * 0.2, y - w * 0.16, w * 0.3, w * 0.16);
  ellipse(ctx, x + w * 0.35, y - w * 0.16, w * 0.12, w * 0.04, V.moss);
}

// ---------------------------------------------------------------------------
// Serpent's Rest: the coiled serpent statue and warm basking stones
// ---------------------------------------------------------------------------

export function drawSerpentStatue(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, w * 1.05, w * 0.3);
  // Coils, back to front, half sunk in roots.
  for (let i = 0; i < 3; i++) {
    const cy = y - w * 0.12 - i * w * 0.2;
    const r = w * (0.9 - i * 0.22);
    ctx.strokeStyle = V.stoneDark;
    ctx.lineWidth = w * 0.24;
    ctx.beginPath();
    ctx.ellipse(x, cy, r, r * 0.32, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = i % 2 ? V.stoneLight : V.stone;
    ctx.lineWidth = w * 0.17;
    ctx.beginPath();
    ctx.ellipse(x, cy - w * 0.02, r, r * 0.32, 0, Math.PI * 0.05, Math.PI * 0.95);
    ctx.stroke();
  }
  // The raised neck and head.
  ctx.strokeStyle = V.stone;
  ctx.lineWidth = w * 0.18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y - w * 0.62);
  ctx.quadraticCurveTo(x + w * 0.4, y - w * 1.2, x + w * 0.1, y - w * 1.45);
  ctx.stroke();
  ellipse(ctx, x - w * 0.02, y - w * 1.5, w * 0.24, w * 0.14, V.stoneLight, -0.25);
  ellipse(ctx, x - w * 0.12, y - w * 1.53, w * 0.035, w * 0.025, V.gold); // a worn gold eye
  // Roots over the coils and moss.
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineWidth = w * 0.06;
  for (const [a, b] of [[-0.9, -0.2], [0.5, 0.95]]) {
    ctx.beginPath();
    ctx.moveTo(x + a * w, y);
    ctx.quadraticCurveTo(x + (a + b) * 0.5 * w, y - w * 0.55, x + b * w, y - w * 0.05);
    ctx.stroke();
  }
  ellipse(ctx, x - w * 0.55, y - w * 0.3, w * 0.18, w * 0.06, V.moss);
}

// Two or three flat, sun-warmed stones.
export function drawBaskingStones(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, 30 * s, 8 * s);
  const stones = [[-12, -2, 16, 6], [10, 0, 14, 5], [0, -7, 11, 4]].slice(0, 2 + (variant % 2));
  for (const [dx, dy, rx, ry] of stones) {
    ellipse(ctx, x + dx * s, y + dy * s, rx * s, ry * s + 2 * s, V.stoneDark);
    ellipse(ctx, x + dx * s, y + dy * s - 2 * s, rx * s, ry * s, V.stoneLight);
    ellipse(ctx, x + (dx - 3) * s, y + (dy - 3) * s, rx * 0.4 * s, ry * 0.35 * s, 'rgba(255, 230, 160, 0.25)');
  }
}

// ---------------------------------------------------------------------------
// Fernbound Court: the dry fountain and broken flagstones
// ---------------------------------------------------------------------------

export function drawDryFountain(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, w * 1.05, w * 0.32);
  ellipse(ctx, x, y - w * 0.1, w, w * 0.34, V.stoneDark);
  ellipse(ctx, x, y - w * 0.2, w, w * 0.34, V.stone);
  ellipse(ctx, x, y - w * 0.2, w * 0.82, w * 0.25, V.stoneDark); // the dry bowl
  ellipse(ctx, x + w * 0.1, y - w * 0.16, w * 0.5, w * 0.12, P.floorAccent.dark);
  // The broken central column with a cracked basin.
  ctx.fillStyle = V.stone;
  ctx.fillRect(x - w * 0.1, y - w * 0.95, w * 0.2, w * 0.78);
  ctx.fillStyle = V.stoneLight;
  ctx.fillRect(x - w * 0.1, y - w * 0.95, w * 0.06, w * 0.78);
  ellipse(ctx, x, y - w * 0.98, w * 0.3, w * 0.1, V.stoneLight);
  ctx.fillStyle = V.stoneDark; // the broken lip
  ctx.beginPath();
  ctx.moveTo(x + w * 0.05, y - w * 1.02);
  ctx.lineTo(x + w * 0.3, y - w * 1.0);
  ctx.lineTo(x + w * 0.18, y - w * 0.92);
  ctx.closePath();
  ctx.fill();
  // Ferns grown into the bowl.
  for (const [dx, a] of [[-0.5, -2.4], [-0.45, -1.2], [0.55, -0.6], [0.5, -2]]) frond(ctx, x + dx * w, y - w * 0.18, a, w * 0.35, P.vegetation.light, w * 0.04);
}

// A few broken paving slabs, tilted and mossy.
export function drawFlagstones(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  for (const [dx, dy, rot] of [[-14, -2, 0.1], [8, 2, -0.15], [-2, -10, 0.25], [18, -8, 0]].slice(0, 3 + (variant % 2))) {
    ctx.save();
    ctx.translate(x + dx * s, y + dy * s);
    ctx.rotate(rot);
    ctx.fillStyle = V.stoneDark;
    ctx.fillRect(-10 * s, -5 * s + 1.5 * s, 20 * s, 10 * s);
    ctx.fillStyle = V.stone;
    ctx.fillRect(-10 * s, -5 * s, 20 * s, 10 * s);
    ctx.strokeStyle = V.stoneDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4 * s, -5 * s);
    ctx.lineTo(1 * s, 2 * s);
    ctx.lineTo(-2 * s, 5 * s);
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, x + (dx + 6) * s, y + (dy + 4) * s, 4 * s, 1.6 * s, V.moss);
  }
}

// ---------------------------------------------------------------------------
// The Whispering Canopy: giant trunks, hanging vines and a rope bridge between two trunks
// ---------------------------------------------------------------------------

// The foot of a giant tree: a massive trunk rising out of the picture with buttress roots.
export function drawGiantTrunk(ctx, { x, y, size: w }, P) {
  drawShadow(ctx, x, y, w * 1.1, w * 0.3);
  ctx.fillStyle = P.treeDark.trunk;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.45, y - w * 0.2, x - w * 0.42, y - w * 0.8);
  ctx.lineTo(x - w * 0.38, y - w * 3.2);
  ctx.lineTo(x + w * 0.38, y - w * 3.2);
  ctx.lineTo(x + w * 0.42, y - w * 0.8);
  ctx.quadraticCurveTo(x + w * 0.45, y - w * 0.2, x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'; // bark furrows
  ctx.lineWidth = w * 0.03;
  for (const dx of [-0.25, -0.05, 0.18]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * w, y - w * 0.3);
    ctx.lineTo(x + (dx + 0.03) * w, y - w * 3.1);
    ctx.stroke();
  }
  ellipse(ctx, x - w * 0.3, y - w * 1.4, w * 0.1, w * 0.4, P.vale.moss);
  ellipse(ctx, x + w * 0.6, y - w * 0.12, w * 0.25, w * 0.07, P.vale.moss);
  // Vines down the trunk.
  ctx.strokeStyle = P.vegetation.light;
  ctx.lineWidth = w * 0.035;
  for (const dx of [0.1, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * w, y - w * 3.2);
    ctx.bezierCurveTo(x + (dx - 0.15) * w, y - w * 2.4, x + (dx + 0.12) * w, y - w * 1.6, x + dx * w, y - w * 0.9);
    ctx.stroke();
  }
}

// Vines hanging from out of the picture, with leaves.
export function drawHangingVines(ctx, { x, y, size: s, variant }, P) {
  ctx.strokeStyle = P.vegetation.base;
  ctx.lineWidth = 2 * s;
  for (let i = 0; i < 3; i++) {
    const vx = x + (i - 1) * 9 * s;
    const len = (46 + ((i + variant) % 3) * 8) * s;
    ctx.beginPath();
    ctx.moveTo(vx, y - 70 * s);
    ctx.quadraticCurveTo(vx + 6 * s, y - 70 * s + len * 0.5, vx - 2 * s, y - 70 * s + len);
    ctx.stroke();
    for (let k = 1; k < 5; k++) ellipse(ctx, vx + (k % 2 ? 3 : -3) * s, y - 70 * s + len * (k / 5), 3.5 * s, 2 * s, P.vegetation.light, k % 2 ? 0.5 : -0.5);
  }
  drawShadow(ctx, x, y, 12 * s, 3 * s);
}

// A rope bridge high between two trunks, its middle sagging.
export function drawRopeBridge(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  const top = y - w * 1.6;
  for (const side of [-1, 1]) {
    const px = x + side * w * 0.85;
    drawShadow(ctx, px, y, w * 0.22, w * 0.07);
    ctx.fillStyle = P.treeDark.trunk;
    ctx.fillRect(px - w * 0.12, top - w * 0.3, w * 0.24, y - top + w * 0.3);
    ellipse(ctx, px, top - w * 0.3, w * 0.2, w * 0.1, P.treeDark.canopy[1]);
  }
  ctx.strokeStyle = V.wood; // planks along the sagging walkway
  ctx.lineWidth = w * 0.05;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const px = x - w * 0.73 + t * w * 1.46;
    const py = top + Math.sin(t * Math.PI) * w * 0.25;
    ctx.beginPath();
    ctx.moveTo(px, py - w * 0.03);
    ctx.lineTo(px, py + w * 0.03);
    ctx.stroke();
  }
  ctx.strokeStyle = P.roof.light; // the hand ropes
  ctx.lineWidth = w * 0.02;
  for (const dy of [-0.18, 0]) {
    ctx.beginPath();
    ctx.moveTo(x - w * 0.73, top + dy * w);
    ctx.quadraticCurveTo(x, top + w * 0.5 + dy * w, x + w * 0.73, top + dy * w);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// The Blackstone Steps: the basalt stair and glyph stones
// ---------------------------------------------------------------------------

export function drawBasaltSteps(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, w * 1.05, w * 0.2);
  for (let i = 0; i < 5; i++) {
    const sw = w * (1 - i * 0.1);
    const top = y - (i + 1) * w * 0.14;
    ctx.fillStyle = '#16181a';
    ctx.fillRect(x - sw, top + w * 0.08, sw * 2, w * 0.07);
    ctx.fillStyle = i % 2 ? '#2a2d30' : '#232629';
    ctx.fillRect(x - sw, top, sw * 2, w * 0.09);
    ctx.fillStyle = V.gold; // a carved glyph on every other step
    if (i % 2 === 0) {
      ctx.globalAlpha = 0.55;
      ctx.fillRect(x - w * 0.05, top + w * 0.02, w * 0.1, w * 0.02);
      ctx.fillRect(x - w * 0.01, top + w * 0.01, w * 0.02, w * 0.05);
      ctx.globalAlpha = 1;
    }
  }
  ellipse(ctx, x - w * 0.7, y - w * 0.12, w * 0.16, w * 0.04, V.moss);
  ellipse(ctx, x + w * 0.55, y - w * 0.4, w * 0.1, w * 0.03, V.moss);
}

// A black standing stone carved with faintly glowing gold glyphs.
export function drawGlyphStone(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, 14 * s, 4 * s);
  const h = (36 + variant * 5) * s;
  ctx.fillStyle = '#1e2124';
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y);
  ctx.lineTo(x - 8 * s, y - h);
  ctx.lineTo(x + 3 * s, y - h - 5 * s);
  ctx.lineTo(x + 10 * s, y - h + 4 * s);
  ctx.lineTo(x + 11 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = V.gold;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.4 * s;
  for (let i = 0; i < 3; i++) {
    const gy = y - h * (0.3 + i * 0.22);
    ctx.beginPath();
    ctx.arc(x, gy, 3 * s, Math.PI * 0.2, Math.PI * 1.6);
    ctx.moveTo(x - 4 * s, gy + 5 * s);
    ctx.lineTo(x + 4 * s, gy + 5 * s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Broodmother's Hollow: cocoons, webs and pale fungus light
// ---------------------------------------------------------------------------

// A dead snag with silk cocoons hanging from it.
export function drawCocoons(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, 14 * s, 4 * s);
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineWidth = 5 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 2 * s, y - 58 * s);
  ctx.moveTo(x + 2 * s, y - 50 * s);
  ctx.lineTo(x + 20 * s, y - 62 * s);
  ctx.moveTo(x + 1 * s, y - 40 * s);
  ctx.lineTo(x - 16 * s, y - 52 * s);
  ctx.stroke();
  for (const [cx, cy, len] of [[16, -60, 18], [-13, -50, 14], [8, -56, 12]].slice(0, 2 + (variant % 2))) {
    ctx.strokeStyle = V.web;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + cx * s, y + cy * s);
    ctx.lineTo(x + cx * s, y + (cy + 6) * s);
    ctx.stroke();
    ellipse(ctx, x + cx * s, y + (cy + 6 + len / 2) * s, 5 * s, (len / 2) * s, 'rgba(225, 222, 210, 0.9)');
    ctx.strokeStyle = 'rgba(150, 145, 130, 0.6)';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + (cx - 5) * s, y + (cy + 9 + k * len * 0.28) * s);
      ctx.lineTo(x + (cx + 5) * s, y + (cy + 11 + k * len * 0.28) * s);
      ctx.stroke();
    }
  }
}

// A web strung between two stalks, dew-bright.
export function drawWeb(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  const h = 40 * s;
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineWidth = 2.5 * s;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 24 * s, y);
    ctx.lineTo(x + side * (20 + variant * 2) * s, y - h - 6 * s);
    ctx.stroke();
  }
  const cx = x;
  const cy = y - h * 0.6;
  ctx.strokeStyle = V.web;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 22 * s, cy + Math.sin(a) * 18 * s);
    ctx.stroke();
  }
  for (let r = 5; r <= 20; r += 5) {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * TAU;
      const px = cx + Math.cos(a) * r * s;
      const py = cy + Math.sin(a) * r * 0.82 * s;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

// A cluster of pale, faintly glowing fungus.
export function drawGlowFungus(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  const g = ctx.createRadialGradient(x, y - 6 * s, 1, x, y - 6 * s, 22 * s);
  g.addColorStop(0, 'rgba(190, 240, 210, 0.3)');
  g.addColorStop(1, 'rgba(190, 240, 210, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - 6 * s, 22 * s, 0, TAU);
  ctx.fill();
  for (const [dx, h, r] of [[-7, 9, 5], [3, 12, 6], [10, 6, 4], [-1, 5, 3.5]].slice(0, 3 + (variant % 2))) {
    ctx.fillStyle = 'rgba(220, 225, 210, 0.9)';
    ctx.fillRect(x + dx * s - 1 * s, y - h * s, 2 * s, h * s);
    ctx.fillStyle = V.fungus;
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y - h * s, r * s, r * 0.55 * s, 0, Math.PI, 0);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Sunken Atrium: Elder columns standing in the water, lily pads
// ---------------------------------------------------------------------------

// A fluted column; variant 0 whole with a capital, 1 broken short, 2 snapped and leaning.
export function drawElderColumn(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  const h = [70, 42, 56][variant % 3] * s;
  ellipse(ctx, x, y, 14 * s, 4 * s, P.water?.ripple ?? 'rgba(0, 0, 0, 0.2)');
  ctx.save();
  ctx.translate(x, y);
  if (variant % 3 === 2) ctx.rotate(0.18);
  ctx.fillStyle = V.stoneDark;
  ctx.fillRect(-9 * s, -h, 18 * s, h);
  ctx.fillStyle = V.stone;
  ctx.fillRect(-9 * s, -h, 13 * s, h);
  ctx.fillStyle = V.stoneLight;
  for (const fx of [-6, -1]) ctx.fillRect(fx * s, -h, 1.6 * s, h);
  if (variant % 3 === 0) {
    ctx.fillStyle = V.stoneLight;
    ctx.fillRect(-13 * s, -h - 6 * s, 26 * s, 6 * s);
  } else {
    ctx.fillStyle = V.stoneDark; // the broken top
    ctx.beginPath();
    ctx.moveTo(-9 * s, -h);
    ctx.lineTo(-3 * s, -h - 6 * s);
    ctx.lineTo(3 * s, -h - 2 * s);
    ctx.lineTo(9 * s, -h - 7 * s);
    ctx.lineTo(9 * s, -h);
    ctx.closePath();
    ctx.fill();
  }
  ellipse(ctx, -2 * s, -h * 0.35, 7 * s, 3 * s, V.moss);
  ctx.restore();
}

// Lily pads floating, one with a pale flower.
export function drawLilyPads(ctx, { x, y, size: s, variant }, P) {
  for (const [dx, dy, r] of [[-10, 0, 8], [6, 4, 7], [12, -6, 6], [-2, -8, 5]].slice(0, 3 + (variant % 2))) {
    ctx.fillStyle = P.vegetation.base;
    ctx.beginPath();
    ctx.ellipse(x + dx * s, y + dy * s, r * s, r * 0.5 * s, 0, 0.3, TAU - 0.3);
    ctx.lineTo(x + dx * s, y + dy * s);
    ctx.fill();
  }
  ellipse(ctx, x + 6 * s, y + 2 * s, 3 * s, 2 * s, '#f0e6f0');
  ellipse(ctx, x + 6 * s, y + 1.5 * s, 1.2 * s, 0.8 * s, P.vale.gold);
}

// ---------------------------------------------------------------------------
// The Moss-Crowned Gate: the colossal gateway and tribal totems
// ---------------------------------------------------------------------------

export function drawMossGate(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  const h = w * 1.25;
  drawShadow(ctx, x, y, w * 1.05, w * 0.18);
  for (const side of [-1, 1]) { // two great jambs
    const px = x + side * w * 0.78;
    ctx.fillStyle = V.stoneDark;
    ctx.fillRect(px - w * 0.2, y - h, w * 0.4, h);
    ctx.fillStyle = V.stone;
    ctx.fillRect(px - w * 0.17, y - h, w * 0.28, h);
    ctx.strokeStyle = V.gold; // carved serpent bands, worn
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = w * 0.02;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(px - w * 0.15, y - h * (i / 4));
      ctx.quadraticCurveTo(px, y - h * (i / 4) - w * 0.06, px + w * 0.1, y - h * (i / 4));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = V.stoneDark; // the lintel
  ctx.fillRect(x - w, y - h - w * 0.22, w * 2, w * 0.24);
  ctx.fillStyle = V.stone;
  ctx.fillRect(x - w, y - h - w * 0.22, w * 2, w * 0.16);
  // The crown of moss and ferns along the top, hanging over the edge.
  for (let i = 0; i < 9; i++) {
    const mx = x - w * 0.9 + (i / 8) * w * 1.8;
    ellipse(ctx, mx, y - h - w * 0.22, w * 0.14, w * 0.08, i % 2 ? V.moss : V.mossLight);
    if (i % 2 === 0) {
      ctx.strokeStyle = V.moss;
      ctx.lineWidth = w * 0.02;
      ctx.beginPath();
      ctx.moveTo(mx, y - h - w * 0.18);
      ctx.lineTo(mx + w * 0.02, y - h + w * 0.12 + (i % 3) * w * 0.06);
      ctx.stroke();
    }
  }
  for (const [dx, a] of [[-0.6, -2.2], [-0.3, -1.4], [0.2, -1.9], [0.7, -0.9]]) frond(ctx, x + dx * w, y - h - w * 0.26, a, w * 0.3, P.vegetation.light, w * 0.03);
}

// A carved tribal totem: stacked lizard faces, red-painted, a feather-and-scale crest.
export function drawTotem(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  drawShadow(ctx, x, y, 10 * s, 3 * s);
  const h = (60 + variant * 6) * s;
  ctx.fillStyle = V.wood;
  ctx.fillRect(x - 7 * s, y - h, 14 * s, h);
  for (let i = 0; i < 3; i++) {
    const fy = y - h + 10 * s + i * 18 * s;
    ctx.fillStyle = i % 2 ? V.paint : P.roof.dark;
    ctx.fillRect(x - 8 * s, fy, 16 * s, 12 * s);
    ellipse(ctx, x - 3.5 * s, fy + 4 * s, 2 * s, 1.4 * s, V.gold);
    ellipse(ctx, x + 3.5 * s, fy + 4 * s, 2 * s, 1.4 * s, V.gold);
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x - 5 * s, fy + 8 * s, 10 * s, 1.6 * s);
  }
  ctx.strokeStyle = V.mossLight; // the crest
  ctx.lineWidth = 2 * s;
  for (const a of [-2.2, -1.57, -0.9]) {
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + Math.cos(a) * 12 * s, y - h + Math.sin(a) * 12 * s);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Glasswater Basin: the waterfall and stepping stones
// ---------------------------------------------------------------------------

// A waterfall pouring from a mossy rock face into a foaming pool.
export function drawWaterfall(ctx, { x, y, size: w }, P) {
  const V = P.vale;
  const h = w * 1.6;
  ellipse(ctx, x, y - w * 0.05, w, w * 0.3, P.water.rim);
  ellipse(ctx, x, y - w * 0.08, w * 0.9, w * 0.24, P.water.deep);
  ctx.fillStyle = V.stoneDark; // the rock face
  ctx.beginPath();
  ctx.moveTo(x - w * 0.95, y - w * 0.2);
  ctx.lineTo(x - w * 0.8, y - h);
  ctx.lineTo(x - w * 0.2, y - h - w * 0.15);
  ctx.lineTo(x + w * 0.4, y - h - w * 0.05);
  ctx.lineTo(x + w * 0.9, y - h * 0.8);
  ctx.lineTo(x + w * 0.95, y - w * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = V.stone;
  for (const [dx, dy, rx, ry] of [[-0.6, -0.9, 0.22, 0.3], [0.6, -0.7, 0.2, 0.28], [-0.55, -0.4, 0.18, 0.15]]) ellipse(ctx, x + dx * w, y + dy * h * 0.6, rx * w, ry * w, V.stone);
  ellipse(ctx, x - w * 0.5, y - h + w * 0.05, w * 0.3, w * 0.08, V.moss);
  ellipse(ctx, x + w * 0.55, y - h * 0.8, w * 0.22, w * 0.07, V.mossLight);
  // The falling water and foam.
  const g = ctx.createLinearGradient(0, y - h, 0, y - w * 0.15);
  g.addColorStop(0, 'rgba(200, 235, 230, 0.85)');
  g.addColorStop(1, 'rgba(225, 248, 245, 0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(x - w * 0.25, y - h - w * 0.08, w * 0.5, h - w * 0.05);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = w * 0.02;
  for (const dx of [-0.15, -0.02, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * w, y - h);
    ctx.lineTo(x + dx * w, y - w * 0.2);
    ctx.stroke();
  }
  for (const [dx, r] of [[-0.25, 0.14], [0, 0.18], [0.25, 0.13], [-0.1, 0.1], [0.14, 0.1]]) ellipse(ctx, x + dx * w, y - w * 0.15, r * w, r * w * 0.5, V.foam);
}

// A line of flat stepping stones across shallow water.
export function drawSteppingStones(ctx, { x, y, size: s, variant }, P) {
  const V = P.vale;
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * 13 * s;
    const dy = ((i + variant) % 2 ? 3 : -3) * s;
    ellipse(ctx, x + dx, y + dy + 1.5 * s, 6.5 * s, 3.5 * s, P.water.ripple);
    ellipse(ctx, x + dx, y + dy, 6 * s, 3.2 * s, V.stone);
    ellipse(ctx, x + dx - 1.5 * s, y + dy - 1 * s, 3 * s, 1.4 * s, V.stoneLight);
  }
}
