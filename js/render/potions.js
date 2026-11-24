// Potion icons (Potions addendum §1): the tier sets the vessel, the potion the liquid's colour.
//   Faint      a small clear vial with a cork
//   Potent     a round green flask
//   Sublime    a tall blue bottle
//   Sovereign  an ornate gold decanter with a faceted stopper
// Drawn centred on (cx, cy), fitting a size × size box.

import * as C from '../config.js';
import { potionRow } from '../potions.js';

const CORK = '#a87c4e';
const CORK_DARK = '#7a5432';
const GOLD = '#e2b84a';
const GOLD_DARK = '#9a7424';

// Each tier's vessel: body(ctx, cx, cy, s) traces the glass's outline (neck included); liquid: the
// liquid's top as a fraction of s below cy; glass: the glass's tint; rim: its outline colour.
const VESSELS = {
  faint: {
    glass: 'rgba(230, 240, 245, 0.22)', rim: 'rgba(235, 245, 250, 0.85)', liquid: -0.06,
    body(ctx, cx, cy, s) {
      const w = s * 0.13;
      const top = cy - s * 0.24;
      const bottom = cy + s * 0.34;
      ctx.moveTo(cx - w, top);
      ctx.lineTo(cx - w, bottom - w);
      ctx.arc(cx, bottom - w, w, Math.PI, 0, true);
      ctx.lineTo(cx + w, top);
      ctx.closePath();
    },
    stopper(ctx, cx, cy, s) {
      cork(ctx, cx, cy - s * 0.24, s * 0.12, s * 0.12);
    },
  },
  potent: {
    glass: 'rgba(110, 190, 110, 0.32)', rim: '#9fdc8c', liquid: 0.0,
    body(ctx, cx, cy, s) {
      const r = s * 0.3;
      const by = cy + s * 0.14;
      const neck = s * 0.08;
      const a = Math.asin(neck / r);
      ctx.moveTo(cx - neck, cy - s * 0.3);
      ctx.lineTo(cx - neck, by - r * Math.cos(a));
      ctx.arc(cx, by, r, -Math.PI / 2 - a, -Math.PI / 2 + a, true);
      ctx.lineTo(cx + neck, cy - s * 0.3);
      ctx.closePath();
    },
    stopper(ctx, cx, cy, s) {
      cork(ctx, cx, cy - s * 0.3, s * 0.1, s * 0.12);
    },
  },
  sublime: {
    glass: 'rgba(90, 150, 230, 0.34)', rim: '#8cc4f4', liquid: -0.12,
    body(ctx, cx, cy, s) {
      const w = s * 0.17;
      const neck = s * 0.065;
      const shoulder = cy - s * 0.16;
      const bottom = cy + s * 0.4;
      ctx.moveTo(cx - neck, cy - s * 0.34);
      ctx.lineTo(cx - neck, shoulder - s * 0.08);
      ctx.quadraticCurveTo(cx - w, shoulder - s * 0.06, cx - w, shoulder + s * 0.04);
      ctx.lineTo(cx - w, bottom - s * 0.03);
      ctx.quadraticCurveTo(cx - w, bottom, cx - w + s * 0.03, bottom);
      ctx.lineTo(cx + w - s * 0.03, bottom);
      ctx.quadraticCurveTo(cx + w, bottom, cx + w, bottom - s * 0.03);
      ctx.lineTo(cx + w, shoulder + s * 0.04);
      ctx.quadraticCurveTo(cx + w, shoulder - s * 0.06, cx + neck, shoulder - s * 0.08);
      ctx.lineTo(cx + neck, cy - s * 0.34);
      ctx.closePath();
    },
    stopper(ctx, cx, cy, s) {
      cork(ctx, cx, cy - s * 0.34, s * 0.085, s * 0.1);
    },
  },
  sovereign: {
    glass: 'rgba(240, 210, 140, 0.26)', rim: GOLD, liquid: 0.02,
    body(ctx, cx, cy, s) {
      const rx = s * 0.29;
      const ry = s * 0.24;
      const by = cy + s * 0.13;
      const neck = s * 0.06;
      ctx.moveTo(cx - neck, cy - s * 0.26);
      ctx.quadraticCurveTo(cx - neck, by - ry * 0.7, cx - rx * 0.55, by - ry * 0.8);
      ctx.bezierCurveTo(cx - rx * 1.25, by - ry * 0.5, cx - rx * 1.2, by + ry * 0.9, cx - rx * 0.4, by + ry);
      ctx.lineTo(cx + rx * 0.4, by + ry);
      ctx.bezierCurveTo(cx + rx * 1.2, by + ry * 0.9, cx + rx * 1.25, by - ry * 0.5, cx + rx * 0.55, by - ry * 0.8);
      ctx.quadraticCurveTo(cx + neck, by - ry * 0.7, cx + neck, cy - s * 0.26);
      ctx.closePath();
    },
    stopper(ctx, cx, cy, s) {
      // A gold foot, a band round the belly and the neck's collar, then a faceted stopper.
      const by = cy + s * 0.13;
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.16, by + s * 0.3);
      ctx.lineTo(cx + s * 0.16, by + s * 0.3);
      ctx.lineTo(cx + s * 0.1, by + s * 0.23);
      ctx.lineTo(cx - s * 0.1, by + s * 0.23);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, by + s * 0.02, s * 0.33, s * 0.05, 0, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = Math.max(1, s * 0.035);
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.fillRect(cx - s * 0.085, cy - s * 0.27, s * 0.17, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.47);
      ctx.lineTo(cx + s * 0.09, cy - s * 0.36);
      ctx.lineTo(cx, cy - s * 0.27);
      ctx.lineTo(cx - s * 0.09, cy - s * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 250, 220, 0.7)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.45);
      ctx.lineTo(cx + s * 0.035, cy - s * 0.37);
      ctx.lineTo(cx, cy - s * 0.33);
      ctx.closePath();
      ctx.fill();
    },
  },
};

function cork(ctx, cx, neckTop, halfW, h) {
  ctx.fillStyle = CORK;
  ctx.beginPath();
  ctx.moveTo(cx - halfW * 0.85, neckTop + h * 0.35);
  ctx.lineTo(cx - halfW, neckTop - h * 0.65);
  ctx.lineTo(cx + halfW, neckTop - h * 0.65);
  ctx.lineTo(cx + halfW * 0.85, neckTop + h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CORK_DARK;
  ctx.fillRect(cx - halfW, neckTop - h * 0.65, halfW * 2, h * 0.18);
}

// key: a potion-tier ('healing:faint'). dim: drawn faded (a greyed socket).
export function drawPotionIcon(ctx, key, cx, cy, size, dim = false) {
  const p = potionRow(key);
  if (!p) return;
  const v = VESSELS[p.tier] ?? VESSELS.faint;
  const liquid = C.POTION_LIQUID[p.id] ?? '#9a9a9a';
  const s = size;
  ctx.save();
  if (dim) ctx.globalAlpha *= 0.45;
  ctx.lineJoin = 'round';
  // Glass, then the liquid inside it (clipped to the glass), then a shine and the outline.
  ctx.beginPath();
  v.body(ctx, cx, cy, s);
  ctx.fillStyle = v.glass;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const top = cy + s * v.liquid;
  ctx.fillStyle = liquid;
  ctx.fillRect(cx - s, top, s * 2, s);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(cx - s, top, s * 2, Math.max(1, s * 0.03)); // the surface
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(cx + s * 0.04, top, s, s); // shade on the right
  ctx.restore();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.08, cy - s * 0.02);
  ctx.lineTo(cx - s * 0.08, cy + s * 0.16);
  ctx.stroke();
  ctx.beginPath();
  v.body(ctx, cx, cy, s);
  ctx.strokeStyle = v.rim;
  ctx.lineWidth = Math.max(1, s * 0.035);
  ctx.stroke();
  v.stopper(ctx, cx, cy, s);
  ctx.restore();
}
