// Potion icons (Potions addendum §1): the tier sets the vessel and its glass (the tier colours), the
// potion the liquid's colour.
//   Faint      a small pale grey vial with a cork
//   Potent     a round lilac flask
//   Sublime    a tall violet bottle
//   Sovereign  an ornate magenta decanter with a faceted stopper
// Drawn centred on (cx, cy), fitting a size × size box.

import * as C from '../config.js';
import { potionRow } from '../potions.js';

const CORK = '#a87c4e';
const CORK_DARK = '#7a5432';
const TRIM = '#e070e4';      // the Sovereign decanter's foot, band, collar and stopper (magenta)
const TRIM_DARK = '#8a1c8c';

// Each tier's vessel: body(ctx, cx, cy, s) traces the glass's outline (neck included); liquid: the
// liquid's top as a fraction of s below cy; glass: the glass's tint; rim: its outline colour.
const VESSELS = {
  faint: {
    glass: 'rgba(205, 199, 187, 0.24)', rim: '#d8d2c6', liquid: -0.06,
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
    glass: 'rgba(199, 169, 236, 0.32)', rim: '#cdb2f0', liquid: 0.0,
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
    glass: 'rgba(166, 118, 244, 0.34)', rim: '#b48cf6', liquid: -0.12,
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
    glass: 'rgba(236, 88, 240, 0.26)', rim: TRIM, liquid: 0.02,
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
      ctx.fillStyle = TRIM;
      ctx.strokeStyle = TRIM_DARK;
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
      ctx.strokeStyle = TRIM;
      ctx.lineWidth = Math.max(1, s * 0.035);
      ctx.stroke();
      ctx.fillStyle = TRIM;
      ctx.fillRect(cx - s * 0.085, cy - s * 0.27, s * 0.17, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.47);
      ctx.lineTo(cx + s * 0.09, cy - s * 0.36);
      ctx.lineTo(cx, cy - s * 0.27);
      ctx.lineTo(cx - s * 0.09, cy - s * 0.36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = TRIM_DARK;
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

// Phoenix save (§5): a burst of flame rising round the Druid. k: 0 … 1 through PHOENIX_BURST_TIME.
export function drawPhoenixBurst(ctx, b, k) {
  const r = C.DRUID_RADIUS;
  ctx.save();
  const ring = r * (1.2 + 2.6 * k);
  ctx.globalAlpha = 1 - k;
  const g = ctx.createRadialGradient(b.x, b.y, ring * 0.2, b.x, b.y, ring);
  g.addColorStop(0, 'rgba(255, 236, 160, 0.9)');
  g.addColorStop(0.55, 'rgba(255, 138, 30, 0.55)');
  g.addColorStop(1, 'rgba(200, 40, 10, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, ring, 0, Math.PI * 2);
  ctx.fill();
  // Tongues of flame licking upwards.
  ctx.fillStyle = C.POTION_LIQUID.phoenix;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const fx = b.x + Math.cos(a) * r * (1 + 1.4 * k);
    const fy = b.y + Math.sin(a) * r * 0.6 * (1 + 1.4 * k) - k * r * 2.2;
    const h = r * (0.9 + 0.5 * Math.sin(i * 2.3)) * (1 - k);
    ctx.beginPath();
    ctx.moveTo(fx - h * 0.3, fy);
    ctx.quadraticCurveTo(fx, fy - h * 1.6, fx + h * 0.3, fy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// While a Phoenix save's immunity lasts: a flickering golden ring round the Druid. t: s (animation).
export function drawPhoenixWard(ctx, x, y, t) {
  const r = C.DRUID_RADIUS * 1.6;
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 14);
  ctx.strokeStyle = '#ffc04a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// An aura round the Druid (§5): a soft ring of its radius in the potion's colour, fading out over its
// last AURA_FADE_TIME s (fade 1 … 0). t: s (animation), for a slow shimmer.
export function drawAuraRing(ctx, x, y, a, t) {
  ctx.save();
  const k = a.fade * (0.85 + 0.15 * Math.sin(t * 2.2 + a.radius));
  const g = ctx.createRadialGradient(x, y, a.radius * 0.55, x, y, a.radius);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, a.color);
  ctx.globalAlpha = 0.22 * k;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, a.radius, a.radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55 * k;
  ctx.strokeStyle = a.color;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -t * 12;
  ctx.beginPath();
  ctx.ellipse(x, y, a.radius, a.radius, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// A Rootgrip pulse: a ring of vines spreading from the Druid to the aura's edge. k: 0 … 1.
export function drawAuraPulse(ctx, p, k) {
  ctx.save();
  ctx.globalAlpha = 0.7 * (1 - k);
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 4 * (1 - k) + 1;
  const r = p.radius * (0.3 + 0.7 * k);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Confused (§5): three little stars circling above the enemy's head. t: s (animation).
export function drawConfusedStars(ctx, x, y, t) {
  ctx.save();
  ctx.fillStyle = C.POTION_LIQUID.bewilderAura;
  ctx.strokeStyle = 'rgba(40, 10, 40, 0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = t * 4 + (i * Math.PI * 2) / 3;
    const sx = x + Math.cos(a) * 9;
    const sy = y + Math.sin(a) * 3;
    ctx.beginPath();
    for (let j = 0; j < 10; j++) {
      const r = j % 2 ? 1.6 : 4;
      const b = (j / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// §4.4 aiming: a ring of the flask's radius following the cursor, in its liquid's colour. t: s (animation).
export function drawAimRing(ctx, x, y, radius, color, t) {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -t * 20;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
  ctx.stroke();
  ctx.restore();
}

// A thrown flask in flight (§4.4): its icon tumbling along a short arc from the Druid to the spot.
export function drawFlask(ctx, f) {
  const k = Math.min(1, f.age / f.flight);
  const x = f.from.x + (f.to.x - f.from.x) * k;
  const y = f.from.y + (f.to.y - f.from.y) * k - C.FLASK_ARC_HEIGHT * 4 * k * (1 - k);
  ctx.save();
  // Its shadow on the ground below the arc.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(f.from.x + (f.to.x - f.from.x) * k, f.from.y + (f.to.y - f.from.y) * k + 6, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.translate(x, y);
  ctx.rotate(k * Math.PI * 3);
  drawPotionIcon(ctx, f.key, 0, 0, 26);
  ctx.restore();
}

// A cheap stable pseudo-random number in [0, 1) from integers (drawing only, never the simulation).
function hash(a, b) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// What a broken flask leaves (§5), its glass bursting first. f: a potionFields entry; now: combat
// time; t: s (animation).
export function drawPotionField(ctx, f, now, t) {
  const age = now - f.born;
  const fade = Math.min(1, Math.max(0, (f.until - now) / C.POTION_FIELD_FADE_TIME));
  const grow = Math.min(1, age / 0.25);
  const color = C.POTION_LIQUID[f.id];
  const r = f.radius;
  const seed = Math.round(f.x * 7 + f.y * 13);
  ctx.save();
  if (f.id === 'firebomb') {
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * grow);
    g.addColorStop(0, 'rgba(255, 200, 80, 0.55)');
    g.addColorStop(0.7, 'rgba(255, 90, 26, 0.38)');
    g.addColorStop(1, 'rgba(160, 30, 10, 0)');
    ctx.globalAlpha = fade;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * grow, 0, Math.PI * 2);
    ctx.fill();
    const n = Math.round(r / 5);
    for (let i = 0; i < n; i++) {
      const a = hash(seed, i) * Math.PI * 2;
      const d = Math.sqrt(hash(i, seed)) * r * 0.9 * grow;
      const fx = f.x + Math.cos(a) * d;
      const fy = f.y + Math.sin(a) * d;
      const h = (6 + 8 * hash(i, i + seed)) * (0.7 + 0.3 * Math.sin(t * 9 + i * 1.7));
      ctx.fillStyle = i % 3 ? color : '#ffd24a';
      ctx.beginPath();
      ctx.moveTo(fx - h * 0.35, fy);
      ctx.quadraticCurveTo(fx + Math.sin(t * 6 + i) * 2, fy - h * 1.8, fx + h * 0.35, fy);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (f.id === 'sporecapFlask') {
    const n = Math.round(r / 7);
    for (let i = 0; i < n; i++) {
      const a = hash(seed, i) * Math.PI * 2 + t * 0.25 * (i % 2 ? 1 : -1);
      const d = Math.sqrt(hash(i, seed)) * r * 0.78 * grow;
      const pr = (r * 0.22 + r * 0.12 * hash(i + 3, seed)) * grow;
      ctx.globalAlpha = 0.28 * fade;
      ctx.fillStyle = i % 4 ? color : '#efe4ff';
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - 4 * Math.sin(t * 1.3 + i), pr, 0, Math.PI * 2);
      ctx.fill();
    }
    // Floating spores.
    ctx.fillStyle = '#f6eeff';
    for (let i = 0; i < 14; i++) {
      const a = hash(i, seed + 5) * Math.PI * 2 + t * 0.6;
      const d = hash(seed + 5, i) * r * 0.9 * grow;
      ctx.globalAlpha = 0.7 * fade;
      ctx.beginPath();
      ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - ((t * 10 + i * 7) % 14), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (f.id === 'tanglevineFlask') {
    ctx.globalAlpha = fade;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    const n = Math.round(r / 6);
    for (let i = 0; i < n; i++) {
      const a = hash(seed, i) * Math.PI * 2;
      const d = Math.sqrt(hash(i, seed)) * r * 0.85;
      const vx = f.x + Math.cos(a) * d;
      const vy = f.y + Math.sin(a) * d;
      const h = (10 + 10 * hash(i, i + seed)) * grow;
      const sway = Math.sin(t * 2 + i) * 2;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.bezierCurveTo(vx + 6 + sway, vy - h * 0.4, vx - 6 + sway, vy - h * 0.7, vx + sway, vy - h);
      ctx.stroke();
      ctx.fillStyle = '#5cae4a';
      ctx.beginPath();
      ctx.ellipse(vx + sway + 2, vy - h * 0.6, 3, 1.6, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (f.id === 'acidFlask') {
    const k = Math.min(1, age / C.ACID_SPLASH_TIME);
    ctx.globalAlpha = 0.5 * (1 - k);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * (0.6 + 0.4 * grow), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * (1 - k);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * (0.4 + 0.6 * k), 0, Math.PI * 2);
    ctx.stroke();
  }
  // The glass bursting and the liquid splashing out.
  if (age < C.FLASK_BREAK_TIME) {
    const k = age / C.FLASK_BREAK_TIME;
    ctx.globalAlpha = 1 - k;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + hash(seed, i);
      const d = 6 + 34 * k * (0.6 + 0.4 * hash(i, seed));
      const sx = f.x + Math.cos(a) * d;
      const sy = f.y + Math.sin(a) * d * 0.8 - 14 * Math.sin(k * Math.PI);
      ctx.fillStyle = i % 2 ? color : 'rgba(235, 230, 245, 0.9)';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 3);
      ctx.lineTo(sx + 2.5, sy + 2);
      ctx.lineTo(sx - 2.5, sy + 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

// Rooted (§5, Rootgrip and Tanglevine): vines curling up round the enemy's feet. x, y: its feet.
export function drawRootMarker(ctx, x, y, radius, t, id) {
  const r = radius * C.ROOT_MARKER_SIZE;
  ctx.save();
  ctx.lineCap = 'round';
  // A dark patch of churned earth.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#2e2414';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + hash(id, i);
    const bx = x + Math.cos(a) * r * 0.9;
    const by = y + Math.sin(a) * r * 0.36;
    const h = radius * (0.7 + 0.4 * hash(i, id)) * (0.94 + 0.06 * Math.sin(t * 3 + i));
    const toward = x + Math.cos(a) * r * 0.25;
    ctx.strokeStyle = i % 2 ? '#3f9a52' : '#6a4a26';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + (bx - x) * 0.25, by - h * 0.6, toward, by - h);
    ctx.stroke();
    ctx.fillStyle = '#5cae4a';
    ctx.beginPath();
    ctx.ellipse(toward, by - h, 2.6, 1.4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
