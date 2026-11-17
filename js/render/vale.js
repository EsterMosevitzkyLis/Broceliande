// The Lost Vale's enemies (M6b §1, §4): spiders, and the lizardfolk (Lizardmen, Lizard Hunters,
// Giant Lizards, Lizard Shamans), side-view like the other regions' (signature (ctx, e, hit,
// lunging, anim), e.part 'shadow' / 'body' as in enemyLook.js). Lizardfolk have green-bronze
// scales, crests and frills, bone and feather ornaments and amber slit-pupil eyes; spiders black-
// violet carapaces, long legs and a cluster of small glinting eyes. A Grim is darker, with ember
// cracks and one silhouette feature (its outline and smoke come from enemyLook.js).
// Also the shield bubble and its shatter (M6b §3), the shamans' threads, spears (§4.2), and a
// turret's HP bar, wreck and collapse debris (§2).

import * as C from '../config.js';
import { drawShadow } from './environment.js';
import { isGrim, drawCracks, fillPoly } from './entities.js';

const STRIKE_FLASH = '#f4f0ff';

const LIZARD = {
  scale: '#6f8a3e', scaleGrim: '#46582a', belly: '#c4b27a', bellyGrim: '#8a7c52', dark: '#3f5224', darkGrim: '#283318',
  bronze: '#a47a3a', crest: '#b5552c', crestGrim: '#7a2f1c', hit: '#d8e4b8',
  bone: '#e2d6b6', boneEdge: '#8a7a5a', feather: '#c8a04a', featherDark: '#7a3a24', wood: '#7a5a34', woodDark: '#4e3820',
};

const SPIDER = { body: '#2a1f33', bodyGrim: '#1a1220', leg: '#1e1626', band: '#5a3f6e', hit: '#bcaed0', eye: '#e8d8ff' };

// Amber slit-pupil eyes (M6b §1): an amber disc with a faint glow and a black vertical slit; a
// Grim's glows hotter. size: the eye's radius in the draw function's units.
export function drawSlitEye(ctx, x, y, size, grim) {
  ctx.fillStyle = grim ? 'rgba(255, 150, 40, 0.45)' : 'rgba(255, 190, 60, 0.3)';
  ctx.beginPath();
  ctx.arc(x, y, size * (grim ? 2.6 : 2), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grim ? '#ffb020' : '#f0b030';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1008';
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.28, size * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
}

function lizardColors(e, hit) {
  const grim = isGrim(e);
  const L = LIZARD;
  return {
    grim,
    scale: hit === 'strike' ? STRIKE_FLASH : hit ? L.hit : grim ? L.scaleGrim : L.scale,
    belly: hit === 'strike' ? STRIKE_FLASH : grim ? L.bellyGrim : L.belly,
    dark: grim ? L.darkGrim : L.dark,
    crest: grim ? L.crestGrim : L.crest,
  };
}

function begin(ctx, e, base, lunging, lunge = 4) {
  ctx.save();
  ctx.translate(e.x, e.y + e.radius * 0.5);
  ctx.scale(e.facing * (e.radius / base), e.radius / base);
  if (lunging) ctx.translate(lunge, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// A few scale marks along a curve of the body: small arcs, darker than the scales.
function scaleMarks(ctx, points, color, size = 1.6) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  for (const [x, y] of points) {
    ctx.beginPath();
    ctx.arc(x, y, size, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// The Spider: a low, black-violet body on eight long legs, a pale band on the abdomen and a
// cluster of glinting eyes. Drawn at radius 13 facing right. A Grim bristles with spines.
// ---------------------------------------------------------------------------
export function drawSpider(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 1.3, r * 0.32);
  if (e.part === 'shadow') return;
  const grim = isGrim(e);
  const S = SPIDER;
  const body = hit === 'strike' ? STRIKE_FLASH : hit ? S.hit : grim ? S.bodyGrim : S.body;
  begin(ctx, e, 13, lunging, 3);
  const walk = e.stride * 0.45;
  // Eight legs, four a side, in two alternating sets; the far side's drawn first, darker.
  for (const [side, shade] of [[-1, '#120c18'], [1, S.leg]]) {
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const phase = Math.sin(walk + i * Math.PI * 0.5 + (side > 0 ? Math.PI : 0));
      const hipX = -1 + i * 2.2;
      const footX = -15 + i * 9 + phase * 2.5 + side * 1.5;
      const kneeX = (hipX + footX) / 2 + (i < 2 ? -2 : 2);
      ctx.beginPath();
      ctx.moveTo(hipX, -8);
      ctx.lineTo(kneeX, -15 - Math.max(0, phase) * 2);
      ctx.lineTo(footX, 0);
      ctx.stroke();
    }
  }
  // Abdomen and head.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-8, -10, 9, 7, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4, -8, 5.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = S.band;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(-8, -10, 5, -2.4, -0.6);
  ctx.stroke();
  if (grim) {
    ctx.strokeStyle = '#3a2a40';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const [x, y, dx, dy] of [[-14, -14, -3, -5], [-10, -16, -1, -6], [-5, -16, 1, -6], [-1, -13, 3, -5]]) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
    }
    ctx.stroke();
    drawCracks(ctx, [[[-13, -9], [-9, -12], [-5, -8]]], 1);
  }
  // Fangs and the eye cluster, glinting.
  ctx.strokeStyle = '#d8cfe0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8.5, -6);
  ctx.lineTo(9.5, -3.5);
  ctx.stroke();
  const glint = 0.6 + 0.4 * Math.sin(anim * 5 + e.id);
  for (const [x, y, s] of [[6.5, -10.5, 1], [8.3, -9.6, 0.9], [7.2, -8.6, 0.7], [5.4, -9.2, 0.7]]) {
    ctx.fillStyle = grim ? `rgba(255, 120, 60, ${glint})` : `rgba(232, 216, 255, ${glint})`;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Shared lizardfolk parts: legs, a tail, the torso and the head with its crest.
function lizardLegs(ctx, k, dark, stride, spread = 1) {
  const step = Math.sin(stride);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(-3, -15);
  ctx.quadraticCurveTo(-6 * spread + step * 2, -8, -5 * spread - step * 4, 0);
  ctx.moveTo(2, -15);
  ctx.quadraticCurveTo(5 * spread - step * 2, -8, 4 * spread + step * 4, 0);
  ctx.stroke();
  // Clawed feet.
  ctx.lineWidth = 1.2;
  for (const fx of [-5 * spread - step * 4, 4 * spread + step * 4]) {
    ctx.beginPath();
    ctx.moveTo(fx, 0);
    ctx.lineTo(fx + 3, 0.5);
    ctx.stroke();
  }
  return k;
}

function lizardTail(ctx, color, anim, seed, len = 1) {
  const sway = Math.sin(anim * 3 + seed) * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-4, -20);
  ctx.quadraticCurveTo(-14 * len, -16 + sway * 0.5, -22 * len, -3 + sway);
  ctx.quadraticCurveTo(-13 * len, -10, -3, -13);
  ctx.closePath();
  ctx.fill();
}

// Head at (hx, hy): a long snout, a frill and crest behind it, an amber slit eye.
function lizardHead(ctx, c, hx, hy, { crest = 3, grim = false } = {}) {
  // Crest: a row of spines from the back of the head.
  const spines = [];
  for (let i = 0; i < crest; i++) spines.push([hx - 3 - i * 2.2, hy - 4 + i * 1.6]);
  ctx.fillStyle = c.crest;
  for (const [x, y] of spines) fillPoly(ctx, [[x - 1.6, y + 1], [x - 1, y - 5 - (grim ? 2 : 0)], [x + 1.6, y + 1]], c.crest);
  ctx.fillStyle = c.scale;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5.2, 4.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Snout and jaw line.
  fillPoly(ctx, [[hx + 2, hy - 3], [hx + 10, hy - 0.5], [hx + 10, hy + 1.5], [hx + 2, hy + 3.5]], c.scale);
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx + 3, hy + 1.6);
  ctx.lineTo(hx + 9.6, hy + 1);
  ctx.stroke();
  drawSlitEye(ctx, hx + 2.2, hy - 1.4, 1.5, grim);
}

// ---------------------------------------------------------------------------
// The Lizardman: an upright lizard warrior with a stone axe and a bone necklace. Radius 17.
// A Grim wears a bone pauldron (its armor) and a taller crest.
// ---------------------------------------------------------------------------
export function drawLizardman(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 0.9, r * 0.28);
  if (e.part === 'shadow') return;
  const c = lizardColors(e, hit);
  begin(ctx, e, 17, lunging);
  lizardTail(ctx, c.dark, anim, e.id);
  lizardLegs(ctx, 0, c.dark, e.stride * 0.24);
  // Torso, leaning a little forward, pale belly.
  ctx.fillStyle = c.scale;
  ctx.beginPath();
  ctx.ellipse(0, -24, 7, 11, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.belly;
  ctx.beginPath();
  ctx.ellipse(2.5, -22, 3.2, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  scaleMarks(ctx, [[-3, -28], [-4, -23], [-2, -18], [-5, -31]], c.dark);
  // Back arm, the axe arm raised a little when it has just struck.
  const swing = lunging ? -0.9 : Math.sin(anim * 2 + e.id) * 0.1;
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, -30);
  ctx.lineTo(-5, -19);
  ctx.stroke();
  ctx.save();
  ctx.translate(4, -30);
  ctx.rotate(0.6 + swing);
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, 4);
  ctx.stroke();
  ctx.strokeStyle = LIZARD.woodDark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(6, 7);
  ctx.lineTo(8, -8);
  ctx.stroke();
  fillPoly(ctx, [[7, -9], [13, -11], [12, -4], [7.5, -5]], '#8c8a80', '#4e4c44', 0.8); // stone head
  ctx.restore();
  // Bone necklace.
  ctx.fillStyle = LIZARD.bone;
  for (const [x, y] of [[1, -32], [3.5, -31], [5.5, -29.5]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 1, 1.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (c.grim) {
    fillPoly(ctx, [[-6, -33], [0, -36], [3, -32], [-2, -29], [-7, -29]], LIZARD.bone, LIZARD.boneEdge, 0.8);
    drawCracks(ctx, [[[-4, -24], [-1, -20], [-3, -16]], [[2, -27], [4, -23]]], 1.1);
  }
  lizardHead(ctx, c, 6, -37, { crest: c.grim ? 4 : 3, grim: c.grim });
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The Lizard Hunter: leaner, crouched, feathers in its crest, a spear with a bone tip. While it
// throws: the spear drawn back just before, the hand empty just after (M6b §4.2). Radius 15.
// A Grim carries two more spears on its back and a darker feather mantle.
// ---------------------------------------------------------------------------
export function drawHunter(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 0.9, r * 0.28);
  if (e.part === 'shadow') return;
  const c = lizardColors(e, hit);
  const t = C.ENEMY_TYPES[e.type];
  const since = anim - (e.lastThrowTime ?? -Infinity);
  const thrown = since < 0.35;                                               // hand empty, arm forward
  const drawing = !thrown && e.throwing && (e.sinceThrow ?? 0) > t.attackInterval - 0.45; // spear drawn back
  begin(ctx, e, 15, lunging);
  lizardTail(ctx, c.dark, anim, e.id, 0.9);
  lizardLegs(ctx, 0, c.dark, e.stride * 0.26, 1.2);
  if (c.grim) { // spare spears across its back
    ctx.strokeStyle = LIZARD.woodDark;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(4, -38);
    ctx.moveTo(-8, -15);
    ctx.lineTo(7, -36);
    ctx.stroke();
  }
  // Crouched torso.
  ctx.fillStyle = c.scale;
  ctx.beginPath();
  ctx.ellipse(1, -21, 6, 9, 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.belly;
  ctx.beginPath();
  ctx.ellipse(3.5, -19.5, 2.6, 6.5, 0.45, 0, Math.PI * 2);
  ctx.fill();
  scaleMarks(ctx, [[-2, -24], [-3, -19], [0, -27]], c.dark);
  // Feather mantle on the shoulders.
  fillPoly(ctx, [[-4, -27], [2, -30], [5, -26], [1, -23], [-5, -22]], c.grim ? LIZARD.featherDark : LIZARD.feather);
  if (c.grim) drawCracks(ctx, [[[-1, -20], [1, -16], [-1, -13]]], 1);
  // Spear arm.
  const armAngle = drawing ? -2.4 : thrown ? 0.1 : -0.5;
  ctx.save();
  ctx.translate(3, -27);
  ctx.rotate(armAngle);
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, 0);
  ctx.stroke();
  ctx.restore();
  if (!thrown) {
    const hand = { x: 3 + Math.cos(armAngle) * 7, y: -27 + Math.sin(armAngle) * 7 };
    const aim = drawing ? -0.25 : -1.1;
    drawSpearShape(ctx, hand.x - Math.cos(aim) * 8, hand.y - Math.sin(aim) * 8, aim, 1);
  }
  lizardHead(ctx, c, 8, -31, { crest: 2, grim: c.grim });
  // Feathers in the crest.
  ctx.strokeStyle = LIZARD.feather;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4, -35);
  ctx.quadraticCurveTo(0, -42, -4, -43);
  ctx.stroke();
  ctx.strokeStyle = LIZARD.featherDark;
  ctx.beginPath();
  ctx.moveTo(5, -35);
  ctx.quadraticCurveTo(3, -42, 0, -45);
  ctx.stroke();
  ctx.restore();
}

// A spear in the draw function's units: shaft from (x, y) along `angle`, a bone tip at the front.
function drawSpearShape(ctx, x, y, angle, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = LIZARD.wood;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(16, 0);
  ctx.stroke();
  fillPoly(ctx, [[16, -1.6], [21, 0], [16, 1.6]], LIZARD.bone, LIZARD.boneEdge, 0.5);
  ctx.strokeStyle = LIZARD.feather;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(-8, -2);
  ctx.moveTo(-5, 0);
  ctx.lineTo(-8, 2);
  ctx.stroke();
  ctx.restore();
}

// A spear in flight (M6b §4.2), in world space, pointing where it flies.
export function drawSpear(ctx, s) {
  drawSpearShape(ctx, s.x - Math.cos(s.angle) * 12, s.y - Math.sin(s.angle) * 12, s.angle, 1.1);
}

// ---------------------------------------------------------------------------
// The Giant Lizard: a long, low, heavy lizard on four splayed legs, bony plates down its back (its
// armor), a big blunt head. Radius 28. A Grim's plates are larger and spiked.
// ---------------------------------------------------------------------------
export function drawGiantLizard(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 1.35, r * 0.3);
  if (e.part === 'shadow') return;
  const c = lizardColors(e, hit);
  begin(ctx, e, 28, lunging, 5);
  const step = Math.sin(e.stride * 0.14);
  // Tail, long and swinging.
  const sway = Math.sin(anim * 1.8 + e.id) * 3;
  ctx.fillStyle = c.dark;
  ctx.beginPath();
  ctx.moveTo(-14, -18);
  ctx.quadraticCurveTo(-32, -14, -44, -4 + sway);
  ctx.quadraticCurveTo(-30, -6, -14, -9);
  ctx.closePath();
  ctx.fill();
  // Far legs, then body, then near legs: splayed, bent at the elbow.
  const leg = (x, dir, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, -12);
    ctx.lineTo(x + 5 + step * dir * 4, -6);
    ctx.lineTo(x + 3 + step * dir * 5, 0);
    ctx.stroke();
  };
  leg(-8, -1, c.dark);
  leg(14, 1, c.dark);
  ctx.fillStyle = c.scale;
  ctx.beginPath();
  ctx.ellipse(0, -14, 20, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = c.belly;
  ctx.beginPath();
  ctx.ellipse(1, -9, 16, 3, 0, 0, Math.PI);
  ctx.fill();
  scaleMarks(ctx, [[-12, -15], [-6, -13], [0, -15], [6, -13], [12, -15], [-9, -10], [3, -10]], c.dark, 2);
  leg(-12, 1, c.scale);
  leg(10, -1, c.scale);
  // Back plates.
  const plate = c.grim ? 1.5 : 1;
  for (let i = 0; i < 6; i++) {
    const x = -14 + i * 5.5;
    const y = -21.5 + Math.abs(i - 2.5) * 0.6;
    fillPoly(ctx, [[x - 2.6, y + 1.6], [x, y - 3.2 * plate], [x + 2.6, y + 1.6]], LIZARD.bronze, c.dark, 0.8);
  }
  if (c.grim) drawCracks(ctx, [[[-10, -13], [-5, -10], [0, -14], [5, -11]]], 1.4);
  // Head: heavy and blunt, low in front.
  ctx.fillStyle = c.scale;
  ctx.beginPath();
  ctx.ellipse(22, -14, 8, 6, 0.15, 0, Math.PI * 2);
  ctx.fill();
  fillPoly(ctx, [[25, -18], [36, -13], [36, -9], [25, -8]], c.scale);
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(26, -10.5);
  ctx.lineTo(35.5, -10.5);
  ctx.stroke();
  // A frill behind the head.
  fillPoly(ctx, [[15, -20], [18, -25], [21, -21], [17, -11]], c.crest);
  drawSlitEye(ctx, 25.5, -15.5, 1.9, c.grim);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The Lizard Shaman: a robed lizard with a staff topped by a glowing relic shard (green-gold).
// Casting (M6b §4.3): the staff raised high and the shard flaring for SHAMAN_CAST_TIME. Radius 16.
// A Grim wears a horned skull headdress.
// ---------------------------------------------------------------------------
export function drawShaman(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  if (e.part !== 'body') drawShadow(ctx, e.x, e.y + r * 0.5, r * 0.9, r * 0.28);
  if (e.part === 'shadow') return;
  const c = lizardColors(e, hit);
  const cast = castProgress(e, anim);
  begin(ctx, e, 16, lunging);
  lizardTail(ctx, c.dark, anim, e.id, 0.8);
  // Robe: a long tattered bell shape over the legs, the feet just showing.
  const step = Math.sin(e.stride * 0.22);
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-3, -6);
  ctx.lineTo(-4 - step * 3, 0);
  ctx.moveTo(2, -6);
  ctx.lineTo(3 + step * 3, 0);
  ctx.stroke();
  const robe = hit === 'strike' ? STRIKE_FLASH : c.grim ? '#4a3626' : '#6e5238';
  fillPoly(ctx, [[-4, -32], [4, -32], [8, -5], [5, -3], [2, -6], [-1, -3], [-4, -6], [-8, -4]], robe);
  ctx.strokeStyle = LIZARD.feather;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(7, -12);
  ctx.stroke();
  // Bone charms on the belt.
  ctx.fillStyle = LIZARD.bone;
  for (const x of [-3, 1, 5]) {
    ctx.beginPath();
    ctx.ellipse(x, -10, 0.9, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (c.grim) drawCracks(ctx, [[[-2, -26], [1, -21], [-1, -16]]], 1);
  // Staff: held forward, raised overhead while casting.
  const lift = cast > 0 ? Math.sin(Math.min(1, cast * 2) * Math.PI * 0.5) : 0;
  const sx = 8 - lift * 2;
  const top = -40 - lift * 9;
  ctx.strokeStyle = c.scale;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(2, -27);
  ctx.lineTo(sx - 1, -24 - lift * 10);
  ctx.stroke();
  ctx.strokeStyle = LIZARD.woodDark;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(sx, 0 - lift * 9);
  ctx.lineTo(sx, top);
  ctx.stroke();
  // The relic shard and its glow.
  const glow = 0.55 + 0.25 * Math.sin(anim * 3 + e.id) + cast * 0.8;
  const g = ctx.createRadialGradient(sx, top - 3, 0, sx, top - 3, 7 + cast * 5);
  g.addColorStop(0, `rgba(230, 255, 170, ${Math.min(1, glow)})`);
  g.addColorStop(1, 'rgba(150, 230, 120, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(sx, top - 3, 7 + cast * 5, 0, Math.PI * 2);
  ctx.fill();
  fillPoly(ctx, [[sx, top - 7], [sx + 2.2, top - 3], [sx, top + 0.5], [sx - 2.2, top - 3]], '#d8f0a0', '#6a8a3a', 0.6);
  // Hood and head.
  lizardHead(ctx, c, 4, -35, { crest: 0, grim: c.grim });
  fillPoly(ctx, [[-5, -34], [-2, -41], [4, -40], [1, -35], [-3, -30]], robe);
  if (c.grim) { // horned skull headdress
    fillPoly(ctx, [[-1, -40], [4, -42], [6, -39], [1, -37]], LIZARD.bone, LIZARD.boneEdge, 0.6);
    ctx.strokeStyle = LIZARD.bone;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -41);
    ctx.quadraticCurveTo(-4, -46, -2, -50);
    ctx.stroke();
  }
  ctx.restore();
}

// 0 … 1 through a shaman's cast pose, or 0 when not casting.
function castProgress(e, anim) {
  const age = anim - (e.castAt ?? -Infinity);
  return age >= 0 && age < C.SHAMAN_CAST_TIME ? 1 - age / C.SHAMAN_CAST_TIME : 0;
}

// Where a shaman's relic shard is (world space), for its threads.
export function shamanShardPos(e) {
  const k = e.radius / 16;
  return { x: e.x + e.facing * 7 * k, y: e.y + e.radius * 0.5 - 50 * k };
}

// Thin green-gold threads from a casting shaman's shard to each ally it shielded, fading with the
// cast (M6b §4.3). debug: the faint shield links shown with the debug overlay (all the time).
export function drawShamanThreads(ctx, e, targets, anim, debug = false) {
  const k = castProgress(e, anim);
  if (k <= 0 && !debug) return;
  const from = shamanShardPos(e);
  ctx.save();
  ctx.lineWidth = k > 0 ? 1.4 : 1;
  ctx.strokeStyle = k > 0 ? `rgba(210, 240, 140, ${0.85 * k})` : 'rgba(120, 235, 200, 0.45)';
  if (k <= 0) ctx.setLineDash([4, 4]);
  for (const t of targets) {
    const to = { x: t.x, y: t.y - C.ENEMY_TYPES[t.type].hitHeight };
    const mx = (from.x + to.x) / 2;
    const my = Math.min(from.y, to.y) - 18;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(mx, my + Math.sin(anim * 6 + t.id) * 3, to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Shields (M6b §3)
// ---------------------------------------------------------------------------
// A shimmering bubble of overlapping translucent scales round a shielded enemy, its centre at the
// body's middle, fainter as the shield wears down.
// top: the top of its HP bar (enemyBarY), so the bubble wraps the whole figure.
export function drawShieldBubble(ctx, e, shield, anim, top) {
  const feet = e.y + e.radius * 0.5;
  const R = Math.max((feet - top) * 0.47, e.radius * 1.15);
  const cx = e.x;
  const cy = (feet + top) / 2 + 2;
  const strength = 0.45 + 0.55 * Math.min(1, shield.amount / Math.max(1, shield.max));
  ctx.save();
  ctx.globalAlpha = strength;
  const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
  g.addColorStop(0, 'rgba(120, 235, 200, 0)');
  g.addColorStop(1, 'rgba(120, 235, 200, 0.22)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  // Overlapping scales round the rim, a highlight wandering over them.
  const n = 14;
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + anim * 0.4;
    const shine = 0.35 + 0.45 * Math.max(0, Math.sin(a * 2 - anim * 3));
    ctx.strokeStyle = `rgba(160, 255, 220, ${shine})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9, R * 0.26, a + Math.PI * 0.35, a + Math.PI * 1.65, true);
    ctx.stroke();
  }
  ctx.restore();
}

// A shield breaking: scale fragments flying out and fading. progress 0 → 1.
export function drawShieldShatter(ctx, s, progress) {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = 'rgba(160, 255, 220, 0.9)';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + s.seed;
    const d = s.r * (1 + progress * 1.6);
    const x = s.x + Math.cos(a) * d;
    const y = s.y + Math.sin(a) * d * 0.8 + progress * progress * 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + progress * 4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Turrets (M6b §2)
// ---------------------------------------------------------------------------
// A damaged turret's small HP bar under it.
export function drawTurretHpBar(ctx, turret, hp, maxHp) {
  if (hp >= maxHp) return;
  const w = C.TURRET_HP_BAR.width;
  const y = turret.y + C.TURRET_HP_BAR.below;
  const f = Math.max(0, hp / maxHp);
  ctx.fillStyle = 'rgba(20, 16, 12, 0.85)';
  ctx.fillRect(turret.x - w / 2 - 1, y - 1, w + 2, 6);
  ctx.fillStyle = f > 0.5 ? '#8cc850' : f > 0.25 ? '#e0b040' : '#d8502c';
  ctx.fillRect(turret.x - w / 2, y, w * f, 4);
}

const WRECK = { wood: '#5e4a34', woodDark: '#3a2c1e', stone: '#7a766c', stoneDark: '#4c4942', moss: '#4f6a30' };

// A wreck: a small pile of broken pieces on the slot (planks, stones, a bent cup), seeded by the
// turret's id so it stays the same.
export function drawWreck(ctx, w) {
  const x = w.x;
  const y = w.y + C.TURRET_BASE_OFFSET * C.SPOT_SCALE * 0.6;
  const k = C.SPOT_SCALE;
  const rnd = (i) => ((Math.sin(w.seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
  drawShadow(ctx, x, y + 3 * k, 20 * k, 6 * k);
  for (let i = 0; i < 5; i++) {
    const px = x + (rnd(i) - 0.5) * 30 * k;
    const py = y + (rnd(i + 9) - 0.5) * 8 * k;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((rnd(i + 3) - 0.5) * 2.4);
    ctx.fillStyle = i % 2 ? WRECK.wood : WRECK.woodDark;
    ctx.fillRect(-8 * k, -2 * k, 16 * k, 4 * k);
    ctx.restore();
  }
  for (let i = 0; i < 4; i++) {
    const px = x + (rnd(i + 20) - 0.5) * 26 * k;
    const py = y + (rnd(i + 30) - 0.5) * 6 * k - 2 * k;
    ctx.fillStyle = i % 2 ? WRECK.stone : WRECK.stoneDark;
    ctx.beginPath();
    ctx.ellipse(px, py, 4.5 * k, 3.2 * k, rnd(i + 40), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = WRECK.moss;
  ctx.beginPath();
  ctx.ellipse(x + 6 * k, y - 3 * k, 3 * k, 1.6 * k, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// A collapse's debris: splinters and grit flying out and falling. progress 0 → 1.
export function drawDebris(ctx, d, progress) {
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI * (0.1 + 0.8 * (i / 9));
    const v = 50 + ((d.seed * 7 + i * 13) % 5) * 12;
    const x = d.x + Math.cos(a) * v * progress;
    const y = d.y - 10 + Math.sin(a) * v * progress + 90 * progress * progress;
    ctx.fillStyle = i % 3 ? WRECK.wood : WRECK.stone;
    ctx.fillRect(x - 2, y - 1, 4, 2.4);
  }
  ctx.fillStyle = 'rgba(150, 130, 100, 0.5)';
  ctx.beginPath();
  ctx.arc(d.x, d.y, 10 + progress * 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
