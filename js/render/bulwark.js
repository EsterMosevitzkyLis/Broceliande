// The Scale Bulwark (M6d §2.7): its emitter on the slot, its wall of overlapping scales across a
// lane (rising, cracked as it weakens, flashing when hit, its HP bar), a broken wall's crumble, the
// thorns' prick, and wall placement mode (reach, lit lanes, the ghost wall and its reason). Visual only.

import * as C from '../config.js';
import { drawShadow } from './environment.js';
import { artBase, spotDrawn, levelRingRadii } from './entities.js';
import { litLanes, wallPlacementAt } from '../systems/wallSystem.js';
import { wallReach } from '../entities/turret.js';

const BULWARK = {
  stone: '#6b675d', stoneLight: '#8a8576', wood: '#5f4429', woodDark: '#3e2c1a',
  scale: ['#4f6a34', '#66803c', '#7f8f42', '#94884a'], scaleEdge: '#2e3a1c', sheen: 'rgba(236, 232, 170, 0.55)',
  ridge: '#8a9a4a', ridgeGlow: 'rgba(200, 240, 140, ALPHA)', thorn: '#d8cfa8', thornDark: '#6e6448',
  ring: '#7f9a44', ringInner: '#c8d888', crack: '#1e2412',
};

// One scale: a rounded shield shape pointing down, centred at (x, y), w wide and h tall.
function scale(ctx, x, y, w, h, fill, edge = BULWARK.scaleEdge, sheen = true) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.35);
  ctx.quadraticCurveTo(x - w / 2, y - h / 2, x, y - h / 2);
  ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h * 0.35);
  ctx.quadraticCurveTo(x + w / 2, y + h * 0.15, x, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h * 0.15, x - w / 2, y - h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!sheen) return;
  ctx.strokeStyle = BULWARK.sheen;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.25, y - h * 0.2);
  ctx.quadraticCurveTo(x - w * 0.1, y - h * 0.36, x + w * 0.12, y - h * 0.34);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// The emitter
// ---------------------------------------------------------------------------

// A squat stone-and-wood base covered in overlapping scales, a ridge of upright scales on top that
// glows faintly while its wall rises. More plates at higher levels; thorny spikes at level 5.
// glow: 0..1 (the ridge's glow); upgrading: drawn faded.
export const drawBulwark = spotDrawn(drawBulwarkArt);

function drawBulwarkArt(ctx, turret, upgrading, glow = 0) {
  const { x, y } = artBase(turret);
  const level = turret.level ?? 1;
  ctx.save();
  if (level >= 2) {
    for (const r of levelRingRadii(level)) {
      for (const [width, color] of [[3.5, BULWARK.ring], [1.5, BULWARK.ringInner]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  if (upgrading) ctx.globalAlpha = 0.5;
  drawShadow(ctx, x, y, 24, 8);
  // The stone footing and a wooden collar.
  ctx.fillStyle = BULWARK.stone;
  ctx.beginPath();
  ctx.roundRect(x - 21, y - 12, 42, 14, 5);
  ctx.fill();
  ctx.fillStyle = BULWARK.stoneLight;
  for (const [sx, sy] of [[-13, -6], [0, -8], [13, -5]]) {
    ctx.beginPath();
    ctx.ellipse(x + sx, y + sy, 5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = BULWARK.woodDark;
  ctx.fillRect(x - 18, y - 16, 36, 5);
  // The scaled body: a low dome of rows of scales, more rows at higher levels.
  ctx.fillStyle = BULWARK.wood;
  ctx.beginPath();
  ctx.ellipse(x, y - 20, 18, 12, 0, Math.PI, 0);
  ctx.fill();
  const rows = Math.min(4, 2 + Math.floor((level - 1) / 2));
  for (let r = 0; r < rows; r++) {
    const ry = y - 15 - r * 6;
    const n = 5 - Math.floor(r / 2);
    const span = 30 - r * 5;
    for (let i = 0; i < n; i++) {
      const sx = x - span / 2 + (span * (i + 0.5)) / n;
      scale(ctx, sx, ry, 9, 9, BULWARK.scale[(i + r) % 4]);
    }
  }
  // The ridge of upright scales on top.
  const top = y - 15 - rows * 6;
  if (glow > 0) {
    const g = ctx.createRadialGradient(x, top - 6, 2, x, top - 6, 22);
    g.addColorStop(0, BULWARK.ridgeGlow.replace('ALPHA', String(0.55 * glow)));
    g.addColorStop(1, BULWARK.ridgeGlow.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, top - 6, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [dx, h] of [[-9, 8], [-3, 11], [3, 11], [9, 8]]) {
    ctx.fillStyle = BULWARK.ridge;
    ctx.strokeStyle = BULWARK.scaleEdge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + dx - 3, top + 2);
    ctx.lineTo(x + dx, top - h);
    ctx.lineTo(x + dx + 3, top + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Level 5, the Thornscale Bastion: thorny spikes round the body.
  if (level >= 5) {
    for (const [dx, dy, a] of [[-19, -18, -2.4], [19, -18, -0.7], [-14, -27, -2], [14, -27, -1.1], [0, -31, -1.57]]) {
      const ex = x + dx + Math.cos(a) * 8;
      const ey = y + dy + Math.sin(a) * 8;
      ctx.fillStyle = BULWARK.thorn;
      ctx.strokeStyle = BULWARK.thornDark;
      ctx.beginPath();
      ctx.moveTo(x + dx + Math.cos(a + 1.57) * 2.2, y + dy + Math.sin(a + 1.57) * 2.2);
      ctx.lineTo(ex, ey);
      ctx.lineTo(x + dx + Math.cos(a - 1.57) * 2.2, y + dy + Math.sin(a - 1.57) * 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The wall
// ---------------------------------------------------------------------------

const WALL_HEIGHT = 30;   // px the wall stands
const SCALE_W = 15;       // px, a wall scale's size
const BULGE = 7;          // px its middle curves toward the enemies' side

// Points along the wall's base, from one corridor edge to the other: { x, y } for u in [-1, 1],
// curving toward where enemies come from (−tangent).
function basePoint(w, u) {
  const nx = -w.ty;
  const ny = w.tx;
  const bulge = (1 - u * u) * BULGE;
  return { x: w.x + nx * w.half * u - w.tx * bulge, y: w.y + ny * w.half * u - w.ty * bulge };
}

// A wall: rows of large overlapping scales spanning the corridor; rise: 0..1 (rising from the
// ground); hit: just hit (it flashes); cracks show as its HP falls (frac: HP / max). ghost: a colour
// for the placement ghost (drawn flat in that colour), or null.
export function drawWall(ctx, w, { rise = 1, frac = 1, hit = false, ghost = null, seed = 0 } = {}) {
  const height = WALL_HEIGHT * rise;
  if (height <= 0.5) return;
  const n = Math.max(3, Math.round((w.half * 2) / (SCALE_W * 0.7)));
  ctx.save();
  if (!ghost) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const p = basePoint(w, -1 + (2 * i) / 16);
      if (i === 0) ctx.moveTo(p.x, p.y + 3); else ctx.lineTo(p.x, p.y + 3);
    }
    ctx.stroke();
  }
  if (hit && !ghost) ctx.filter = 'brightness(1.6)';
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    const lift = height - (r + 0.5) * (height / rows); // top row first, the lower rows overlap it
    for (let i = 0; i < n + (r % 2 ? 0 : 1); i++) {
      const u = -1 + (2 * (i + (r % 2 ? 0.5 : 0))) / n;
      if (u < -1.01 || u > 1.01) continue;
      const p = basePoint(w, Math.max(-1, Math.min(1, u)));
      const fill = ghost ?? BULWARK.scale[(i * 3 + r + seed) % 4];
      scale(ctx, p.x, p.y - lift, SCALE_W, (height / rows) * 1.5, fill, ghost ? 'rgba(20, 30, 10, 0.5)' : BULWARK.scaleEdge, !ghost);
    }
  }
  ctx.filter = 'none';
  // Cracks as it weakens: one below two thirds, two below one third.
  if (!ghost && frac < 2 / 3) {
    ctx.strokeStyle = BULWARK.crack;
    ctx.lineWidth = 1.6;
    for (const u0 of frac < 1 / 3 ? [-0.45, 0.35] : [0.1]) {
      const p = basePoint(w, u0);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - height + 3);
      ctx.lineTo(p.x + 4, p.y - height * 0.66);
      ctx.lineTo(p.x - 3, p.y - height * 0.4);
      ctx.lineTo(p.x + 2, p.y - 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// A damaged wall's HP bar, above its middle.
export function drawWallHpBar(ctx, w, hp, maxHp) {
  if (hp >= maxHp || hp <= 0) return;
  const bw = C.WALL_HP_BAR.width;
  const y = w.y - WALL_HEIGHT - C.WALL_HP_BAR.above + 20;
  const f = Math.max(0, hp / maxHp);
  ctx.fillStyle = 'rgba(20, 16, 12, 0.85)';
  ctx.fillRect(w.x - bw / 2 - 1, y - 1, bw + 2, 6);
  ctx.fillStyle = f > 0.5 ? '#8cc850' : f > 0.25 ? '#e0b040' : '#d8502c';
  ctx.fillRect(w.x - bw / 2, y, bw * f, 4);
}

// A broken wall's crumble: scale pieces thrown out along its length, falling and fading. progress 0 → 1.
export function drawWallCrumble(ctx, c, progress) {
  const rnd = (i) => ((Math.sin(c.seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  for (let i = 0; i < 14; i++) {
    const p = basePoint(c, -1 + 2 * rnd(i));
    const a = -Math.PI * (0.15 + 0.7 * rnd(i + 20));
    const v = 40 + rnd(i + 40) * 60;
    const x = p.x + Math.cos(a) * v * progress;
    const y = p.y - WALL_HEIGHT * 0.5 + Math.sin(a) * v * progress + 110 * progress * progress;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(progress * (rnd(i + 60) - 0.5) * 8);
    scale(ctx, 0, 0, 9, 9, BULWARK.scale[i % 4], BULWARK.scaleEdge, false);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(140, 130, 100, 0.4)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.half * (0.6 + progress * 0.6), 10 + progress * 10, Math.atan2(c.tx, -c.ty), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Thorns pricking a wall's attacker: a few pale spikes flashing at it. progress 0 → 1.
export function drawThornPrick(ctx, p, progress) {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.strokeStyle = BULWARK.thorn;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const r0 = 4 + progress * 4;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0);
    ctx.lineTo(p.x + Math.cos(a) * (r0 + 6), p.y + Math.sin(a) * (r0 + 6));
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Wall placement mode (§2.4)
// ---------------------------------------------------------------------------

// The reach round the slot, the lit lane pieces inside it, and the ghost wall at the pointer
// (green, or red with its reason); a hint above the slot.
export function drawWallPlacement(ctx, game, placing, pointer) {
  const slot = game.slots[placing.slotIndex];
  const reach = wallReach(placing.type);
  ctx.save();
  ctx.fillStyle = 'rgba(190, 220, 150, 0.07)';
  ctx.strokeStyle = C.WALL_REACH_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, reach, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = C.WALL_LIT_LANE_COLOR;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const run of litLanes(game, placing.slotIndex, placing.type)) {
    ctx.beginPath();
    run.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(240, 240, 220, 0.95)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 3;
  const hint = 'Click a lit lane to place the wall · Esc to cancel';
  ctx.strokeText(hint, slot.x, slot.y - C.LOCATION_RADIUS - 18);
  ctx.fillText(hint, slot.x, slot.y - C.LOCATION_RADIUS - 18);
  ctx.restore();
  if (!pointer) return;
  const spot = wallPlacementAt(game, placing.slotIndex, placing.type, pointer);
  if (!spot) return;
  const ghost = { ...spot, half: game.lanes.find((l) => l.id === spot.laneId).corridorWidth / 2 };
  ctx.save();
  ctx.globalAlpha = 0.85;
  drawWall(ctx, ghost, { ghost: spot.valid ? C.WALL_GHOST_VALID : C.WALL_GHOST_INVALID });
  ctx.restore();
  if (spot.valid) return;
  ctx.save();
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#ffb0a0';
  ctx.strokeText(spot.reason, spot.x, spot.y - WALL_HEIGHT - 12);
  ctx.fillText(spot.reason, spot.x, spot.y - WALL_HEIGHT - 12);
  ctx.restore();
}
