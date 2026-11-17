// The Vale's mini-bosses (M6b §5): the Broodmother and her egg sacs, and the High-Shaman with his
// relic pulse. Same signature and conventions as vale.js.

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
