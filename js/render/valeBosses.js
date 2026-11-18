// The Vale's mini-bosses (M6b §5): the Broodmother and her egg sacs, and the High-Shaman with his
// relic pulse; its final boss (§6), the Iron Oracle, with his ward, links and Iron Call (his relic
// pylons are drawn by environment.js drawRelicPylon). Same signature and conventions as vale.js.

import * as C from '../config.js';
import { drawShadow } from './environment.js';
import { isGrim, drawCracks, fillPoly } from './entities.js';
import { LIZARD, STRIKE_FLASH, begin, lizardColors, lizardHead, lizardTail } from './vale.js';

const BROOD = {
  body: '#2a1c30', bodyGrim: '#1a1020', leg: '#1e1424', band: '#c8bca8', bandGrim: '#8a6a74', hit: '#bcaed0',
  egg: '#e6dcc4', eggVein: '#a88a7a', fang: '#e0d6c8',
};

// The Broodmother: a huge bloated spider, a pale-banded abdomen with egg clusters on her back,
// long legs folded high. Rears up her front for the wind-up; her abdomen dips as she lays. Radius 50.
export function drawBroodmother(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 1.3, r * 0.3);
  if (e.part === 'shadow') return;
  const grim = isGrim(e);
  const B = BROOD;
  const body = hit === 'strike' ? STRIKE_FLASH : hit ? B.hit : grim ? B.bodyGrim : B.body;
  const laying = Math.max(0, 1 - (anim - (e.layAt ?? -Infinity)) / C.LAY_POSE_TIME);
  const rear = e.attack === 'WINDUP' ? 1 : Math.max(0, 1 - (anim - (e.lastBlowTime ?? -Infinity)) / 0.25) * 0.3;
  begin(ctx, e, 50, lunging, 6);
  const walk = e.stride * 0.12;
  // Eight long legs, knees high; the far ones darker.
  for (const [side, shade] of [[-1, '#120a16'], [1, B.leg]]) {
    ctx.strokeStyle = shade;
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const phase = Math.sin(walk + i * Math.PI * 0.5 + (side > 0 ? Math.PI : 0));
      const hipX = -4 + i * 7;
      const footX = -46 + i * 30 + phase * 6 + side * 4;
      const kneeX = (hipX + footX) / 2 + (i < 2 ? -10 : 10);
      const lift = i === 3 ? rear * 14 : 0;
      ctx.beginPath();
      ctx.moveTo(hipX, -24 - lift * 0.5);
      ctx.lineTo(kneeX, -58 - Math.max(0, phase) * 5 - lift);
      ctx.lineTo(footX + (i === 3 ? rear * 6 : 0), -lift);
      ctx.stroke();
    }
  }
  // Abdomen: bloated, dipping as she lays.
  ctx.save();
  ctx.translate(-22, -30 + laying * 6);
  ctx.rotate(laying * 0.12);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 31, 24, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = grim ? B.bandGrim : B.band;
  ctx.lineWidth = 3;
  for (const k of [-12, 0, 12]) {
    ctx.beginPath();
    ctx.ellipse(k, 2, 5, 20, 0, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  }
  // Egg clusters on her back, pulsing faintly.
  const pulse = 1 + 0.06 * Math.sin(anim * 3 + e.id);
  for (const [x, y, s] of [[-10, -20, 4.5], [-4, -22, 4], [2, -21, 4.5], [-15, -16, 3.6], [8, -18, 3.8], [-7, -16, 3.4], [0, -16, 3.2]]) {
    ctx.fillStyle = B.egg;
    ctx.beginPath();
    ctx.arc(x, y, s * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = B.eggVein;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(x - s * 0.2, y + s * 0.1, s * 0.55, 0.3, 2.2);
    ctx.stroke();
  }
  if (grim) drawCracks(ctx, [[[-22, 4], [-14, 10], [-6, 4], [2, 12]], [[10, -4], [18, 4]]], 2);
  ctx.restore();
  // Head and fangs, raised in the wind-up.
  ctx.save();
  ctx.translate(14, -26);
  ctx.rotate(-rear * 0.35);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(6, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = B.fang;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(20, 6);
  ctx.quadraticCurveTo(26, 10, 22, 17 - rear * 4);
  ctx.moveTo(16, 8);
  ctx.quadraticCurveTo(20, 13, 16, 19 - rear * 4);
  ctx.stroke();
  const glint = 0.6 + 0.4 * Math.sin(anim * 4 + e.id);
  for (const [x, y, s] of [[14, -5, 2.2], [18, -3.5, 2], [16, -1, 1.6], [11, -2.5, 1.5], [20, 0, 1.3], [12, -7, 1.2]]) {
    ctx.fillStyle = grim ? `rgba(255, 120, 60, ${glint})` : `rgba(232, 216, 255, ${glint})`;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

// An egg sac (M6b §5.1): a pale, veined, pulsing sac on a smear of web, pulsing faster and with
// shapes stirring inside as it nears hatching. Radius 12. A Grim one is darker and violet-veined.
export function drawEggSac(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') {
    ctx.fillStyle = 'rgba(220, 220, 230, 0.25)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + r * 0.5, r * 1.4, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.part === 'shadow') return;
  const grim = isGrim(e);
  const ripe = Math.min(1, (e.eggAge ?? 0) / C.BROOD_HATCH_TIME);
  const beat = Math.sin(anim * (3 + ripe * 9) + e.id);
  const k = 1 + beat * (0.03 + ripe * 0.05);
  ctx.save();
  ctx.translate(e.x, e.y + r * 0.5);
  ctx.scale(r / 12, r / 12);
  ctx.scale(1 / k, k);
  ctx.fillStyle = hit === 'strike' ? STRIKE_FLASH : hit ? '#fff4e8' : grim ? '#b8a0b0' : BROOD.egg;
  ctx.beginPath();
  ctx.ellipse(0, -10, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = grim ? '#7a4a7a' : BROOD.eggVein;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-5, -18);
  ctx.quadraticCurveTo(-2, -12, -6, -4);
  ctx.moveTo(2, -20);
  ctx.quadraticCurveTo(5, -12, 2, -2);
  ctx.moveTo(-1, -14);
  ctx.lineTo(4, -10);
  ctx.stroke();
  // Spiders stirring inside as it ripens.
  if (ripe > 0.4) {
    ctx.fillStyle = `rgba(40, 24, 50, ${(ripe - 0.4) * 0.8})`;
    for (let i = 0; i < 3; i++) {
      const a = anim * 2 + i * 2.1 + e.id;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 3, -10 + Math.sin(a * 1.3) * 4, 2.4, 1.6, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (grim) drawCracks(ctx, [[[-3, -16], [0, -12], [-2, -7]]], 0.9);
  ctx.restore();
}

// A sac splitting open: shreds of membrane flying and a smear of goo. progress 0 to 1.
export function drawEggHatch(ctx, h, progress) {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = h.grim ? 'rgba(150, 110, 150, 0.6)' : 'rgba(200, 210, 150, 0.55)';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 6, 10 + progress * 10, 4 + progress * 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = h.grim ? '#b8a0b0' : BROOD.egg;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.15 + 0.7 * (i / 5)) + h.seed;
    const d = 6 + progress * 22;
    ctx.save();
    ctx.translate(h.x + Math.cos(a) * d, h.y - 8 + Math.sin(a) * d * 0.7 + progress * progress * 20);
    ctx.rotate(a + progress * 3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// The High-Shaman: a tall, elaborately crested lizard in a feathered cloak, carrying a large Elder
// relic on a pole that flares in his relic pulse; the pole goes up for the wind-up and slams down.
// Drawn in units of radius 22 (so twice the size at his radius 44).
export function drawHighShaman(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 0.85, r * 0.26);
  if (e.part === 'shadow') return;
  const c = lizardColors(e, hit);
  const pulse = Math.max(0, 1 - (anim - (e.pulseAt ?? -Infinity)) / C.RELIC_PULSE_TIME);
  const windup = e.attack === 'WINDUP' ? 1 : 0;
  const slam = Math.max(0, 1 - (anim - (e.lastBlowTime ?? -Infinity)) / 0.3);
  begin(ctx, e, 22, lunging, 3);
  lizardTail(ctx, c.dark, anim, e.id, 1.1);
  const step = Math.sin(e.stride * 0.1);
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.lineTo(-5 - step * 3, 0);
  ctx.moveTo(3, -8);
  ctx.lineTo(4 + step * 3, 0);
  ctx.stroke();
  // Feathered cloak: layers of feathers from the shoulders to the ground.
  const robe = hit === 'strike' ? STRIKE_FLASH : c.grim ? '#3e2c22' : '#5a3e2a';
  fillPoly(ctx, [[-6, -40], [6, -40], [11, -6], [-11, -5]], robe);
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 5; i++) {
      const x = -9 + i * 4.5 + (row % 2) * 2;
      const y = -36 + row * 8;
      fillPoly(ctx, [[x - 2, y], [x, y + 8], [x + 2, y]], row % 2 ? LIZARD.feather : LIZARD.featherDark);
    }
  }
  if (c.grim) drawCracks(ctx, [[[-3, -30], [0, -24], [-2, -18]]], 1.1);
  // The relic pole: held up beside him, raised for the wind-up, slammed down after a blow.
  const lift = windup * 10 - slam * 4;
  const px = 11;
  const top = -64 - lift;
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(3, -36);
  ctx.lineTo(px - 1, -34 - lift);
  ctx.stroke();
  ctx.strokeStyle = LIZARD.woodDark;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(px, -2 - lift);
  ctx.lineTo(px, top);
  ctx.stroke();
  // The Elder relic: a carved stone ring with a glowing core.
  const glow = 0.5 + 0.2 * Math.sin(anim * 2.5 + e.id) + pulse;
  const g = ctx.createRadialGradient(px, top - 5, 0, px, top - 5, 10 + pulse * 14);
  g.addColorStop(0, `rgba(240, 255, 170, ${Math.min(1, glow)})`);
  g.addColorStop(1, 'rgba(160, 230, 110, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, top - 5, 10 + pulse * 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a8270';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(px, top - 5, 5, 0, Math.PI * 2);
  ctx.stroke();
  fillPoly(ctx, [[px, top - 9], [px + 2.4, top - 5], [px, top - 1], [px - 2.4, top - 5]], '#e0f4a8', '#6a8a3a', 0.6);
  // Head with a great crest and a frill.
  fillPoly(ctx, [[-4, -46], [-10, -54], [-5, -50], [-7, -60], [-1, -52], [0, -62], [3, -51], [5, -46]], c.crest);
  lizardHead(ctx, c, 5, -46, { crest: 0, grim: c.grim });
  fillPoly(ctx, [[-1, -48], [-5, -42], [1, -40]], c.crest);
  // Bone and feather ornaments at the throat.
  ctx.fillStyle = LIZARD.bone;
  for (const [x, y] of [[0, -40], [3, -39], [6, -40]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 1, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// The relic pulse: a ring of green-gold light spreading out to his reach. progress 0 to 1.
export function drawRelicPulse(ctx, p, progress) {
  const R = C.HIGH_SHAMAN_RANGE * (0.15 + 0.85 * Math.sqrt(progress));
  ctx.save();
  ctx.globalAlpha = (1 - progress) * 0.8;
  ctx.strokeStyle = 'rgba(220, 245, 140, 1)';
  ctx.lineWidth = 3 + (1 - progress) * 4;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, R, R * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(170, 230, 120, 0.12)';
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The Iron Oracle (M6b §6)
// ---------------------------------------------------------------------------
const IRON = { plate: '#3a3f46', plateLight: '#66707a', dark: '#1c1f24', robe: '#26272c', robeEdge: '#3c3a40' };
const COLD = (a) => `rgba(228, 242, 255, ${a})`;

// Cold white eyes (instead of the lizardfolk's amber), a pale slit in each.
function coldEye(ctx, x, y, size) {
  ctx.fillStyle = COLD(0.35);
  ctx.beginPath();
  ctx.arc(x, y, size * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2f8ff';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8ea4c0';
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.25, size * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
}

// A gaunt, towering lizard shaman fused with dark metal: an iron mask over half his face, metal
// plates grown into his scales, a long staff of the same metal. The staff goes up for an Iron Call
// and the wind-up, and slams down. Drawn in units of radius 28 (twice the size at his radius 56).
export function drawIronOracle(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 0.75, r * 0.22);
  if (e.part === 'shadow') return;
  const c = lizardColors(e, hit);
  const call = Math.max(0, 1 - (anim - (e.callAt ?? -Infinity)) / C.IRON_CALL_TIME);
  const windup = e.attack === 'WINDUP' ? 1 : 0;
  const slam = Math.max(0, 1 - (anim - (e.lastBlowTime ?? -Infinity)) / 0.3);
  begin(ctx, e, 28, lunging, 3);
  ctx.save();
  ctx.translate(0, -6);
  lizardTail(ctx, c.dark, anim, e.id, 1.3);
  ctx.restore();
  // Long thin legs, metal greaves on the shins.
  const step = e.bound ? 0 : Math.sin(e.stride * 0.08);
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-3, -24);
  ctx.lineTo(-5 - step * 3, 0);
  ctx.moveTo(3, -24);
  ctx.lineTo(4 + step * 3, 0);
  ctx.stroke();
  fillPoly(ctx, [[-6.5 - step * 2, -12], [-3.5 - step * 2, -12], [-4.5 - step * 3, -3], [-7 - step * 3, -3]], IRON.plate);
  fillPoly(ctx, [[3 + step * 2, -12], [6 + step * 2, -12], [6.5 + step * 3, -3], [3.5 + step * 3, -3]], IRON.plate);
  // A tattered dark robe from the shoulders, its hem ragged.
  const robe = hit === 'strike' ? STRIKE_FLASH : IRON.robe;
  fillPoly(ctx, [[-7, -52], [7, -52], [12, -14], [9, -9], [6, -13], [2, -8], [-2, -12], [-6, -8], [-9, -12], [-12, -10]], robe, IRON.robeEdge, 0.8);
  // Scales showing at the chest, plates grown into them.
  fillPoly(ctx, [[-4, -52], [5, -52], [6, -36], [-4, -36]], c.scale);
  fillPoly(ctx, [[-3, -50], [4, -50], [4.5, -43], [-2.5, -42]], IRON.plate, IRON.plateLight, 0.6);
  fillPoly(ctx, [[-2, -41], [5, -41], [5, -37], [-1, -36.5]], IRON.plate, IRON.plateLight, 0.6);
  // Pauldrons: iron plates fused over each shoulder.
  fillPoly(ctx, [[-9, -54], [-2, -56], [-1, -50], [-8, -47]], IRON.plate, IRON.plateLight, 0.7);
  fillPoly(ctx, [[2, -56], [9, -54], [9, -48], [2, -50]], IRON.plate, IRON.plateLight, 0.7);
  ctx.fillStyle = IRON.plateLight;
  for (const [x, y] of [[-6, -51], [-3, -52], [5, -52], [7, -50]]) {
    ctx.beginPath();
    ctx.arc(x, y, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // The staff: dark metal, held out front; raised for a call or the wind-up, slammed down after a blow.
  const lift = Math.max(windup, call) * 12 - slam * 4;
  const px = 13;
  const top = -86 - lift;
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(4, -50);
  ctx.lineTo(px - 1, -46 - lift);
  ctx.stroke();
  ctx.strokeStyle = IRON.dark;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(px, -2 - lift);
  ctx.lineTo(px, top + 6);
  ctx.stroke();
  // Its head: an open iron fork round a cold white point, blazing during a call.
  const glow = 0.45 + 0.15 * Math.sin(anim * 2 + e.id) + call * 0.6;
  const R = 8 + call * 18;
  const g = ctx.createRadialGradient(px, top, 0, px, top, R);
  g.addColorStop(0, COLD(Math.min(1, glow)));
  g.addColorStop(1, 'rgba(170, 200, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, top, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = IRON.plate;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px - 5, top - 6);
  ctx.quadraticCurveTo(px - 5, top + 6, px, top + 6);
  ctx.quadraticCurveTo(px + 5, top + 6, px + 5, top - 6);
  ctx.stroke();
  ctx.fillStyle = '#f4f9ff';
  ctx.beginPath();
  ctx.arc(px, top, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Head, high on a long neck: iron spines for a crest, the mask over its upper half.
  const hx = 5;
  const hy = -62;
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -53);
  ctx.lineTo(hx - 1, hy + 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) fillPoly(ctx, [[hx - 4 - i * 2.4, hy - 2 + i * 1.8], [hx - 5 - i * 2.8, hy - 10 + i * 1.2], [hx - 2 - i * 2.4, hy - 3 + i * 1.8]], IRON.plate);
  lizardHead(ctx, c, hx, hy, { crest: 0 });
  fillPoly(ctx, [[hx - 3.5, hy - 4.6], [hx + 10.6, hy - 0.9], [hx + 10.4, hy + 0.2], [hx + 1, hy + 0.4], [hx - 3.5, hy + 1.4]], IRON.plate, IRON.plateLight, 0.6);
  ctx.strokeStyle = IRON.dark;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(hx + 4.5, hy - 2.6);
  ctx.lineTo(hx + 6, hy + 0.2);
  ctx.stroke();
  coldEye(ctx, hx + 2.2, hy - 1.6, 1.5);
  ctx.restore();
}

// His ward on the perch while any pylon stands: a cold sphere of thin iron-grey hoops round him.
// top: the top of his HP bar (enemyBarY).
export function drawOracleWard(ctx, e, anim, top) {
  const feet = e.y + e.radius * 0.5;
  const R = Math.max((feet - top) * 0.5, e.radius * 1.2);
  const cx = e.x;
  const cy = (feet + top) / 2 + 4;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
  g.addColorStop(0, 'rgba(200, 220, 255, 0)');
  g.addColorStop(1, 'rgba(200, 220, 255, 0.2)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const a = anim * (0.5 + i * 0.2) + i * 2.1;
    ctx.strokeStyle = COLD(0.35 + 0.25 * Math.max(0, Math.sin(anim * 2 + i)));
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * Math.abs(Math.cos(a)) + 1, R, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = COLD(0.5);
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, R * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// The thin bright links from the standing pylons' cores to the bound Oracle, flickering.
export function drawPylonLinks(ctx, cores, chest, anim) {
  ctx.save();
  ctx.lineCap = 'round';
  cores.forEach((p, i) => {
    const flicker = 0.7 + 0.3 * Math.sin(anim * 9 + i * 2.3);
    const mx = (p.x + chest.x) / 2;
    const my = (p.y + chest.y) / 2 - 18 + Math.sin(anim * 1.5 + i) * 4; // a slight sag upward
    for (const [width, alpha] of [[5, 0.15], [1.6, 0.85]]) {
      ctx.strokeStyle = COLD(alpha * flicker);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(mx, my, chest.x, chest.y);
      ctx.stroke();
    }
  });
  ctx.restore();
}

// A snapped link: its two ends whipping back toward the pylon and the Oracle, fading. progress 0 → 1.
export function drawLinkSnap(ctx, s, progress) {
  const left = (1 - progress) * 0.45;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.strokeStyle = COLD(0.9);
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  const wob = Math.sin(progress * 20) * 10 * (1 - progress);
  for (const [ax, ay, bx, by] of [[s.x1, s.y1, s.x2, s.y2], [s.x2, s.y2, s.x1, s.y1]]) {
    const ex = ax + (bx - ax) * left;
    const ey = ay + (by - ay) * left;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + ex) / 2 + wob, (ay + ey) / 2 - wob, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

// A pylon breaking: a crack of light bursting from its core, stone chips falling. progress 0 → 1.
export function drawPylonBreak(ctx, b, progress) {
  const w = b.size;
  const cx = b.x;
  const cy = b.y - w * 2.45;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * (1.5 + progress * 3));
  g.addColorStop(0, COLD(0.9));
  g.addColorStop(1, 'rgba(180, 210, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, w * (1.5 + progress * 3), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLD(1);
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + b.seed;
    const len = w * (1 + progress * 2.5) * (0.7 + 0.3 * ((i * 37) % 5) / 5);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * w * 0.3, cy + Math.sin(a) * w * 0.3);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a7a80';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + b.seed * 2;
    const d = w * (0.6 + progress * 1.8);
    ctx.fillRect(cx + Math.cos(a) * d - 2, cy + Math.sin(a) * d * 0.6 + progress * progress * w * 2.4, 4, 3);
  }
  ctx.restore();
}

// A pylon's small HP bar above it, once damaged.
export function drawPylonHpBar(ctx, p) {
  if (p.broken || p.hp >= p.maxHp) return;
  const w = C.PYLON_HP_BAR.width;
  const y = p.y - p.size * C.PYLON_HP_BAR.lift;
  const f = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = 'rgba(20, 16, 12, 0.85)';
  ctx.fillRect(p.x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = '#b8cce8';
  ctx.fillRect(p.x - w / 2, y, w * f, 4);
}

// An Iron Call: two rings of cold light rolling out over the map from him. progress 0 → 1.
export function drawIronCall(ctx, c, progress) {
  ctx.save();
  for (const [delay, k] of [[0, 1], [0.2, 0.7]]) {
    const q = Math.max(0, (progress - delay) / (1 - delay));
    if (q <= 0) continue;
    const R = 520 * k * (0.1 + 0.9 * Math.sqrt(q));
    ctx.globalAlpha = (1 - q) * 0.7;
    ctx.strokeStyle = COLD(1);
    ctx.lineWidth = 2 + (1 - q) * 4;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, R, R * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
