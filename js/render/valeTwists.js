// The Lost Vale's twists (M6c), drawing only: the fern clump over a hidden spot, and the
// camouflaged hunter's shimmer, shiver and throw flash.

import * as C from '../config.js';
import { drawShadow } from './environment.js';

const FERN = { dark: '#2c4f26', mid: '#4a7f36', light: '#79ad4e', tip: '#a3cc6a' };

// The fronds of the one clump every hidden spot shares (M6c §1.2: identical, no badge, no type):
// [angle from straight up (rad), length (× r), bend (rad)].
const FRONDS = [
  [-1.25, 0.95, 0.5], [-0.95, 1.2, 0.45], [-0.62, 1.42, 0.35], [-0.3, 1.55, 0.25], [0.02, 1.6, -0.2],
  [0.32, 1.5, -0.3], [0.64, 1.38, -0.38], [0.97, 1.18, -0.45], [1.28, 0.92, -0.5],
  [-0.48, 1.05, 0.3], [0.5, 1.02, -0.32],
];

// One frond from (x, y): a curved stem with leaflets along it, tip lighter.
function frond(ctx, x, y, angle, len, bend, color) {
  const a1 = angle + bend;
  const ex = x + Math.sin(a1) * len;
  const ey = y - Math.cos(a1) * len;
  const cx = x + Math.sin(angle) * len * 0.6;
  const cy = y - Math.cos(angle) * len * 0.75;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
  // The leaflets in two strokes (body colour, then the lighter tip), not one per leaflet.
  ctx.lineWidth = 1.6;
  const n = 7;
  for (const tip of [false, true]) {
    ctx.strokeStyle = tip ? FERN.tip : color;
    ctx.beginPath();
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if ((k > 0.7) !== tip) continue;
      // a point on the curve and its direction
      const px = (1 - k) * (1 - k) * x + 2 * (1 - k) * k * cx + k * k * ex;
      const py = (1 - k) * (1 - k) * y + 2 * (1 - k) * k * cy + k * k * ey;
      const dx = 2 * (1 - k) * (cx - x) + 2 * k * (ex - cx);
      const dy = 2 * (1 - k) * (cy - y) + 2 * k * (ey - cy);
      const d = Math.hypot(dx, dy) || 1;
      const leaf = len * 0.2 * (1 - k * 0.7);
      for (const side of [-1, 1]) {
        ctx.moveTo(px, py);
        ctx.lineTo(px + (-dy / d * side + dx / d * 0.5) * leaf, py + (dx / d * side + dy / d * 0.5) * leaf);
      }
    }
    ctx.stroke();
  }
}

// A hidden spot's fern clump at (x, y), the spot's centre, fitting its footprint. t: seconds (the
// slight sway); progress: 0 standing, 1 gone. Parting (a revealed spot): the fronds spread apart and
// fade; clearing (Combat start, cleared): a quicker sway, then the fade. hovered: a little brighter.
export function drawFernClump(ctx, x, y, t, progress = 0, cleared = false, hovered = false) {
  const r = C.LOCATION_RADIUS;
  const baseY = y + r * 0.45;
  const sway = Math.sin(t * 1.3 + x * 0.013) * C.FERN_SWAY + (cleared ? Math.sin(t * 14) * 0.18 * Math.min(1, progress * 3) : 0);
  const spread = cleared ? 1 : 1 + progress * 0.6;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress * (cleared ? 1 : 1.1));
  if (hovered) ctx.filter = 'brightness(1.18)';
  drawShadow(ctx, x, baseY, r * 0.95, r * 0.32);
  const colors = [FERN.dark, FERN.mid, FERN.light];
  FRONDS.forEach(([a, len, bend], i) => {
    frond(ctx, x + (a * r * 0.12), baseY, a * spread + sway * (0.6 + len * 0.3), len * r, bend, colors[i % 3]);
  });
  ctx.restore();
}

// The hunter is drawn whole into a scratch canvas first and then onto the field at one opacity, so
// its overlapping parts (a Grim's outline is eight offset copies) don't build up into a solid shape.
let scratch = null;

// A camouflaged hunter's look (M6c §2.1, §2.3): draw(c) draws it on context c; it is shown at the
// shimmer's opacity and wobble, resolving to the full hunter as show goes 0 → 1. A soft shiver as
// it resolves (since: s since shiverAt), a short bright flash while it throws (flash: s since its throw).
export function drawCamouflaged(ctx, e, anim, draw) {
  const show = e.camoShow ?? 1;
  const since = anim - (e.shiverAt ?? -Infinity);
  const shiver = since < C.CAMO_SHIVER_TIME ? Math.sin(since * 70) * 2.2 * (1 - since / C.CAMO_SHIVER_TIME) : 0;
  const flash = anim - (e.lastThrowTime ?? -Infinity);
  const wobble = (1 - show) * C.CAMO_WOBBLE;
  const dx = Math.sin(anim * 9 + e.id) * wobble + shiver;
  const dy = Math.cos(anim * 7 + e.id * 1.7) * wobble * 0.5;
  if (show >= 1) {
    ctx.save();
    ctx.translate(dx, dy);
    draw(ctx);
    ctx.restore();
  } else {
    // A box round the hunter, its feet low in it (spear and crest included).
    const half = Math.ceil(e.radius * 5);
    const top = Math.ceil(e.radius * 7);
    const w = half * 2;
    const h = top + Math.ceil(e.radius * 2.5);
    scratch ??= document.createElement('canvas');
    if (scratch.width < w || scratch.height < h) {
      scratch.width = Math.max(scratch.width, w);
      scratch.height = Math.max(scratch.height, h);
    }
    const sx = scratch.getContext('2d');
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, w, h);
    sx.translate(half - e.x, top - e.y);
    draw(sx);
    ctx.save();
    ctx.globalAlpha = C.CAMO_ALPHA + (1 - C.CAMO_ALPHA) * show;
    ctx.drawImage(scratch, 0, 0, w, h, e.x - half + dx, e.y - top + dy, w, h);
    ctx.restore();
  }
  if (flash < C.THROW_FLASH_TIME && show < 1) {
    const k = flash / C.THROW_FLASH_TIME;
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - k);
    ctx.strokeStyle = '#eaf6dc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - e.radius * 0.8, e.radius * (1 + k * 0.6), e.radius * (1.5 + k * 0.8), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
