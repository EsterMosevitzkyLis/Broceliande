// Hag's Causeway's undead (M3b §2.2): the Drowned Thrall, the Mirebound Brute and the Drowned
// Knight, side-view like the Cinderwood's enemies (same signature: (ctx, e, hit, lunging, anim),
// e.part 'shadow' / 'body' as in enemyLook.js), all with pale, cold green eyes. A Grim is darker
// and waterlogged, with cold green cracks (its outline and mist come from enemyLook.js).
// Also the rising dead (§3.3): a body slumped in the mire waiting to rise, and a riser burnt to ash.

import * as C from '../config.js';
import { drawShadow } from './environment.js';
import { AttackState } from '../entities/enemy.js';
import { isGrim, drawEyes, drawCracks, fillPoly } from './entities.js';

const STRIKE_FLASH = '#ffffff';

const THRALL = {
  skin: '#6f8290', skinGrim: '#4c5d6a', dark: '#46545e', darkGrim: '#2f3a42', hit: '#c4d0d8',
  rag: '#3e4a44', weed: '#3f5e30', weedLight: '#5f7f44',
};

// The Drowned Thrall: a hunched, waterlogged corpse, grey-blue skin, weed hanging off it, dragging
// one foot. Drawn at radius 16 facing right, feet below its centre.
export function drawThrall(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  const feet = e.y + r * 0.5;
  if (e.part !== 'body') drawShadow(ctx, e.x, feet, r * 0.9, r * 0.28);
  if (e.part === 'shadow') return;
  const grim = isGrim(e);
  const L = THRALL;
  const skin = hit === 'strike' ? STRIKE_FLASH : hit ? L.hit : grim ? L.skinGrim : L.skin;
  const dark = grim ? L.darkGrim : L.dark;
  const step = Math.sin(e.stride * 0.22);
  ctx.save();
  ctx.translate(e.x, feet);
  ctx.scale(e.facing * (r / 16), r / 16);
  if (lunging) ctx.translate(4, 0);
  ctx.lineCap = 'round';
  // Legs: the front one steps, the back one drags behind, its foot sliding along the ground.
  ctx.strokeStyle = dark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, -14);
  ctx.lineTo(5 + step * 4, 0);
  ctx.moveTo(-3, -14);
  ctx.lineTo(-11 - Math.abs(step) * 2, -1);
  ctx.stroke();
  // Hunched torso leaning forward, a rag of a shirt over it.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(0, -21, 8, 10, 0.55, 0, Math.PI * 2);
  ctx.fill();
  fillPoly(ctx, [[-7, -17], [-2, -27], [6, -24], [8, -14], [1, -12], [-4, -9]], L.rag);
  if (grim) drawCracks(ctx, [[[-5, -20], [-2, -16], [1, -19], [4, -15]]], 1.1, C.UNDEAD_CRACK_COLOR);
  // Arms dangling forward.
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(4, -25);
  ctx.quadraticCurveTo(11, -19, 12 + step, -11);
  ctx.stroke();
  // Head, low and forward.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(9, -29, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // Weed hanging off the head and shoulders, swaying a little.
  ctx.strokeStyle = L.weed;
  ctx.lineWidth = 1.4;
  const sway = Math.sin(anim * 2.4 + e.id) * 1.2;
  for (const [x, y, len] of [[6, -33, 9], [10, -34, 7], [-2, -28, 10], [-5, -24, 8]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sway, y + len * 0.5, x - 1 + sway, y + len);
    ctx.stroke();
  }
  ctx.strokeStyle = L.weedLight;
  ctx.beginPath();
  ctx.moveTo(8, -34);
  ctx.quadraticCurveTo(9 + sway, -29, 8 + sway, -25);
  ctx.stroke();
  drawEyes(ctx, 12, -30, 1.5, grim, true);
  ctx.restore();
}

const BRUTE = {
  body: '#5c5e4a', bodyGrim: '#3e4234', dark: '#3b3d2e', darkGrim: '#272a1f', hit: '#c4c6b0',
  root: '#5e4026', rootLight: '#7a5634', peat: '#2c2419', peatLight: '#3e3324',
};

// The Mirebound Brute: a heavy corpse knotted together with roots and clods of peat, hunched under
// its own weight, long arms dragging. Drawn at radius 27 facing right, feet below its centre.
export function drawBrute(ctx, e, hit, lunging, anim = 0) {
  const r = e.radius;
  const feet = e.y + r * 0.5;
  if (e.part !== 'body') drawShadow(ctx, e.x, feet, r * 1.2, r * 0.32);
  if (e.part === 'shadow') return;
  const grim = isGrim(e);
  const L = BRUTE;
  const body = hit === 'strike' ? STRIKE_FLASH : hit ? L.hit : grim ? L.bodyGrim : L.body;
  const dark = grim ? L.darkGrim : L.dark;
  const step = Math.sin(e.stride * 0.15);
  ctx.save();
  ctx.translate(e.x, feet);
  ctx.scale(e.facing * (r / 27), r / 27);
  if (lunging) ctx.translate(5, 0);
  // Stubby legs.
  ctx.fillStyle = dark;
  for (const [x, dir] of [[-10, 1], [8, -1]]) {
    ctx.beginPath();
    ctx.roundRect(x - 6 + step * dir * 3, -20, 12, 20, 4);
    ctx.fill();
  }
  // Back arm hanging.
  ctx.strokeStyle = dark;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, -40);
  ctx.lineTo(-2 - step * 3, -8);
  ctx.stroke();
  // M3b §2: a Grim's back bristles with broken root spikes.
  if (grim) {
    for (const [x, h] of [[-18, 8], [-10, 11], [-2, 12], [6, 9]]) fillPoly(ctx, [[x - 3, -44], [x - 1, -46 - h], [x + 3, -44]], L.root);
  }
  // The great hunched mass, a lump of shoulder and the peat clods stuck to it.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -32, 24, 17, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, -42, 15, 11, -0.3, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y, rx, ry] of [[-14, -36, 7, 5], [-4, -24, 6, 4], [10, -30, 5, 4], [-16, -26, 5, 4]]) {
    ctx.fillStyle = L.peat;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = L.peatLight;
    ctx.beginPath();
    ctx.ellipse(x - 1, y - 1.5, rx * 0.55, ry * 0.45, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Roots knotted round it.
  ctx.strokeStyle = L.root;
  ctx.lineWidth = grim ? 3.4 : 2.6;
  ctx.beginPath();
  ctx.moveTo(-22, -40);
  ctx.bezierCurveTo(-10, -48, 4, -20, 16, -36);
  ctx.moveTo(-20, -24);
  ctx.bezierCurveTo(-8, -30, 2, -46, 18, -48);
  ctx.moveTo(-6, -16);
  ctx.quadraticCurveTo(0, -28, 10, -22);
  ctx.stroke();
  ctx.strokeStyle = L.rootLight;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-21, -41);
  ctx.bezierCurveTo(-10, -49, 4, -21, 15, -37);
  ctx.stroke();
  if (grim) drawCracks(ctx, [[[-14, -30], [-8, -26], [-3, -31], [3, -27]], [[4, -40], [8, -36], [12, -40]]], 1.5, C.UNDEAD_CRACK_COLOR);
  // Small head sunk low between the shoulders.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(20, -40, 8, 7.5, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Front arm, long, knuckles near the ground.
  ctx.strokeStyle = body;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(12, -40);
  ctx.quadraticCurveTo(24, -26, 22 + step * 3, -6);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(22 + step * 3, -5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  drawEyes(ctx, 24, -42, 1.9, grim, true);
  ctx.restore();
}

const KNIGHT = {
  rust: '#7a4e30', rustGrim: '#4e3424', dark: '#4a3020', darkGrim: '#2e2018', light: '#a06a40', hit: '#d8c4b0',
  barnacle: '#cfc6b0', blade: '#8a8a84', bladeDark: '#5a5a56', visor: '#141a18', water: 'rgba(170, 205, 215, 0.75)', crest: '#b9b4aa',
};

// Blade angles (rad; 0 = straight ahead, positive = downward), as the Ogre's club (M2c §2.8).
const BLADE_DRAG = 1.2;    // walking: dragged along the ground in front
const BLADE_RAISED = -2.2; // wind-up: raised overhead
const BLADE_DOWN = 1.35;   // blow: brought down

// The Drowned Knight: a tall figure in rusted, barnacled plate, water streaming from its joints,
// dragging a heavy, notched blade it raises in its wind-up. Drawn at radius 52 facing right.
export function drawKnight(ctx, e, hit, lunging, anim) {
  const t = C.ENEMY_TYPES[e.type];
  const r = e.radius;
  const feet = e.y + r * 0.5;
  if (e.part !== 'body') drawShadow(ctx, e.x, feet, r * 0.95, r * 0.24);
  if (e.part === 'shadow') return;
  const grim = isGrim(e);
  const L = KNIGHT;
  const plate = hit === 'strike' ? STRIKE_FLASH : hit ? L.hit : grim ? L.rustGrim : L.rust;
  const dark = grim ? L.darkGrim : L.dark;
  let blade = BLADE_DRAG;
  if (e.attack === AttackState.WINDUP) {
    const k = Math.min(1, e.windupElapsed / t.windupTime);
    blade = BLADE_DRAG + (BLADE_RAISED - BLADE_DRAG) * (1 - (1 - k) * (1 - k));
  } else if (anim - e.lastBlowTime < C.OGRE_BLOW_POSE_TIME) {
    blade = BLADE_DOWN;
  }
  const step = Math.sin(e.stride * 0.08);
  ctx.save();
  ctx.translate(e.x, feet);
  ctx.scale(e.facing * (r / 52), r / 52);
  if (lunging) ctx.translate(4, 0);
  ctx.rotate(step * 0.03);
  // Armoured legs.
  for (const [x, dir] of [[-10, 1], [10, -1]]) {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.roundRect(x - 8 + step * dir * 5, -52, 16, 52, 5);
    ctx.fill();
    ctx.fillStyle = plate; // knee plate
    ctx.beginPath();
    ctx.arc(x + step * dir * 5, -28, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Back arm.
  ctx.strokeStyle = dark;
  ctx.lineCap = 'round';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-8, -96);
  ctx.lineTo(-16 - step * 4, -62);
  ctx.stroke();
  // Breastplate and fauld, tall and narrow.
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.roundRect(-20, -112, 40, 52, 12);
  ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-22, -62);
  ctx.lineTo(22, -62);
  ctx.lineTo(18, -48);
  ctx.lineTo(-18, -48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = grim ? L.rust : L.light; // plate seams
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-18, -86);
  ctx.quadraticCurveTo(0, -80, 18, -86);
  ctx.moveTo(0, -110);
  ctx.lineTo(0, -64);
  ctx.stroke();
  // Barnacles crusted on the plate.
  ctx.fillStyle = L.barnacle;
  for (const [x, y, s] of [[-12, -100, 2.6], [-8, -96, 1.8], [10, -70, 2.4], [14, -76, 1.6], [-14, -68, 2]]) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (grim) drawCracks(ctx, [[[-14, -104], [-8, -94], [-12, -84]], [[6, -100], [12, -90], [8, -78]], [[-6, -70], [2, -66], [8, -70]]], 2.2, C.UNDEAD_CRACK_COLOR);
  // Helm with a dark visor slit and the cold green eyes behind it; a Grim's has a broken crest.
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.roundRect(-8, -136, 26, 26, 8);
  ctx.fill();
  if (grim) fillPoly(ctx, [[-4, -136], [0, -150], [4, -138], [8, -152], [12, -136]], L.crest);
  ctx.fillStyle = L.visor;
  ctx.fillRect(4, -126, 15, 5);
  drawEyes(ctx, 13, -123.5, 2.2, grim, true);
  // Water streaming from the joints.
  ctx.strokeStyle = L.water;
  ctx.lineWidth = 1.6;
  for (const [x, y] of [[-20, -62], [20, -62], [-18, -88], [16, -112], [-10, -30], [10, -30]]) {
    const k = (anim * 1.3 + (x + y) * 0.013) % 1;
    ctx.beginPath();
    ctx.moveTo(x, y + k * 10);
    ctx.lineTo(x, y + k * 10 + 6);
    ctx.stroke();
  }
  // Sword arm and the heavy, notched blade along one line from the shoulder.
  const shoulder = { x: 10, y: -100 };
  const dx = Math.cos(blade);
  const dy = Math.sin(blade);
  const hand = { x: shoulder.x + dx * 30, y: shoulder.y + dy * 30 };
  ctx.strokeStyle = plate;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(shoulder.x, shoulder.y);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(blade);
  ctx.fillStyle = dark;
  ctx.fillRect(-4, -9, 6, 18); // crossguard
  ctx.fillStyle = L.blade;
  ctx.beginPath();
  ctx.moveTo(2, -6);
  ctx.lineTo(72, -6);
  ctx.lineTo(80, 0);
  ctx.lineTo(72, 6);
  ctx.lineTo(2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = L.bladeDark; // notches and a fuller
  for (const x of [24, 41, 58]) fillPoly(ctx, [[x - 3, -6], [x, -2], [x + 3, -6]], L.bladeDark);
  ctx.fillRect(6, -1, 56, 2);
  ctx.restore();
  ctx.fillStyle = dark; // gauntlet
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// §3.3: a body waiting to rise, slumped and half sunk in the mire, with bubbles and a faint green
// glow. drawLook: draws the enemy (enemyLook.js). k: its wait so far, 0 → 1.
export function drawBody(ctx, body, k, anim, drawLook) {
  const e = body.enemy;
  const r = e.radius * (C.ENEMY_TYPES[e.type].drawScale ?? 1);
  const feet = e.y + e.radius * 0.5;
  const glow = ctx.createRadialGradient(e.x, feet, 0, e.x, feet, r * 1.6);
  glow.addColorStop(0, `rgba(${C.BODY_GLOW_RGB}, ${0.22 + 0.12 * Math.sin(anim * 5 + e.id)})`);
  glow.addColorStop(1, `rgba(${C.BODY_GLOW_RGB}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(e.x, feet, r * 1.6, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(e.x - r * 4, feet - r * 6, r * 8, r * 6); // nothing below the mire's surface
  ctx.clip();
  ctx.translate(e.x, feet + r * 0.35);
  ctx.rotate(0.5 * e.facing);    // slumped over
  ctx.scale(1, 0.55);
  ctx.translate(-e.x, -feet);
  ctx.globalAlpha *= 0.85;
  drawLook({ ...e, part: 'body' });
  ctx.restore();
  ctx.fillStyle = 'rgba(28, 36, 26, 0.75)'; // the mire round it
  ctx.beginPath();
  ctx.ellipse(e.x, feet, r * 1.15, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200, 235, 210, 0.6)'; // bubbles, quicker as it stirs
  for (let i = 0; i < 4; i++) {
    const p = (anim * (0.9 + k) + i / 4 + e.id * 0.17) % 1;
    ctx.beginPath();
    ctx.arc(e.x + (i - 1.5) * r * 0.45, feet - p * r * 0.8, 1.5 + (1 - p) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// §3.1: a riser that died burning, crumbling to a heap of ash with a few dying embers. k: 0 → 1.
export function drawAsh(ctx, a, k) {
  const r = a.radius;
  const feet = a.y + r * 0.5;
  ctx.save();
  ctx.globalAlpha = 1 - k * k;
  ctx.fillStyle = '#3a3634';
  ctx.beginPath();
  ctx.ellipse(a.x, feet, r * 0.9, r * 0.32, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#6a6460';
  ctx.beginPath();
  ctx.ellipse(a.x - r * 0.15, feet - r * 0.08, r * 0.5, r * 0.18, 0, Math.PI, 0);
  ctx.fill();
  for (let i = 0; i < 5; i++) { // embers dying out, sparks rising
    const p = (k * 1.6 + i / 5) % 1;
    ctx.fillStyle = `rgba(255, ${140 + i * 15}, 50, ${(1 - p) * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(a.x + (i - 2) * r * 0.25, feet - r * 0.1 - p * r * 1.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const BOG_KING = {
  peat: '#211b14', peatLight: '#3a3024', hit: '#b8ae9c', root: '#5a3e24', reed: '#6a6a3a', reedDark: '#4a4a2a',
  antler: '#cfc4a8', antlerEdge: '#7d705a', iron: '#6a4a30', ironLight: '#9a6a40', water: 'rgba(40, 60, 58, 0.8)',
};

// Arm angles from the shoulder (rad; 0 = ahead, positive = downward): dragging his hands through
// the mud as he walks, raised overhead in the wind-up, slammed down in the blow.
const KING_ARM_DRAG = 1.25;
const KING_ARM_RAISED = -1.9;
const KING_ARM_DOWN = 1.0;

// M3b §5.3: the Bog King: huge and hunched, made of black peat, roots and rotting reeds, a crude
// crown of antlers and rusted iron, cold green eyes, dark water trailing off him. Both fists come
// up overhead in his wind-up and slam down in his blow; he spreads his arms wide as he raises
// Thralls. Drawn at radius 60 facing right, feet below his centre.
export function drawBogKing(ctx, e, hit, lunging, anim) {
  const t = C.ENEMY_TYPES[e.type];
  const r = e.radius;
  const feet = e.y + r * 0.5;
  if (e.part !== 'body') drawShadow(ctx, e.x, feet, r * 1.1, r * 0.26);
  if (e.part === 'shadow') return;
  const L = BOG_KING;
  const peat = hit === 'strike' ? STRIKE_FLASH : hit ? L.hit : L.peat;
  let arm = KING_ARM_DRAG;
  let spread = 0; // 0 → 1: arms flung wide (raising Thralls)
  if (e.attack === AttackState.WINDUP) {
    const k = Math.min(1, e.windupElapsed / t.windupTime);
    arm = KING_ARM_DRAG + (KING_ARM_RAISED - KING_ARM_DRAG) * (1 - (1 - k) * (1 - k));
  } else if (anim - e.lastBlowTime < C.OGRE_BLOW_POSE_TIME) {
    arm = KING_ARM_DOWN;
  } else if (e.summonPoseAt !== undefined && anim - e.summonPoseAt < C.BOG_KING_SUMMON_POSE_TIME) {
    spread = Math.sin(Math.min(1, (anim - e.summonPoseAt) / C.BOG_KING_SUMMON_POSE_TIME) * Math.PI);
  }
  const step = Math.sin(e.stride * 0.06);
  ctx.save();
  ctx.translate(e.x, feet);
  ctx.scale(e.facing * (r / 60), r / 60);
  if (lunging) ctx.translate(4, 0);
  ctx.rotate(step * 0.03);
  // Dark water pooling and trailing behind him.
  ctx.fillStyle = L.water;
  ctx.beginPath();
  ctx.ellipse(-30, -2, 46, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Short, thick legs.
  ctx.fillStyle = L.peat;
  for (const [x, dir] of [[-18, 1], [14, -1]]) {
    ctx.beginPath();
    ctx.roundRect(x - 12 + step * dir * 5, -40, 24, 40, 9);
    ctx.fill();
  }
  const shoulder = { x: 16, y: -108 };
  // An arm from its shoulder at `angle`; spread (raising Thralls) swings it wide, up and out
  // to its own side (the far arm backwards).
  const drawArm = (angle, width, color, back) => {
    const sx = shoulder.x - (back ? 30 : 0);
    const wide = back ? Math.PI + 0.55 : -0.55;
    const a = angle + (wide - angle) * spread;
    const hand = { x: sx + Math.cos(a) * 62, y: shoulder.y + Math.sin(a) * 62 };
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, shoulder.y);
    ctx.quadraticCurveTo((sx + hand.x) / 2 + 6, (shoulder.y + hand.y) / 2 + 10, hand.x, hand.y);
    ctx.stroke();
    ctx.fillStyle = color; // a great muddy fist
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, width * 0.8, 0, Math.PI * 2);
    ctx.fill();
    return hand;
  };
  drawArm(arm, 16, L.peatLight, true); // the far arm, behind him
  // The hunched mass of peat, with a knot of roots through it.
  ctx.fillStyle = peat;
  ctx.beginPath();
  ctx.ellipse(-4, -78, 46, 44, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, -112, 30, 24, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.peatLight;
  for (const [x, y, rx, ry] of [[-24, -90, 10, 7], [-8, -60, 9, 6], [14, -84, 8, 6], [-30, -62, 7, 5]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = L.root;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-44, -96);
  ctx.bezierCurveTo(-20, -112, 0, -60, 30, -88);
  ctx.moveTo(-40, -56);
  ctx.bezierCurveTo(-18, -70, 6, -110, 34, -118);
  ctx.stroke();
  // Rotting reeds hanging off his back and shoulders, swaying.
  const sway = Math.sin(anim * 1.6 + e.id) * 2;
  for (const [x, y, len, c] of [[-30, -110, 34, L.reed], [-18, -118, 40, L.reedDark], [-40, -92, 30, L.reed], [-6, -124, 26, L.reedDark], [-46, -74, 24, L.reed]]) {
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 6 + sway, y + len * 0.5, x - 4 + sway, y + len);
    ctx.stroke();
  }
  // His head, low and forward, under the crown of antlers and rusted iron.
  ctx.fillStyle = peat;
  ctx.beginPath();
  ctx.ellipse(34, -118, 16, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.iron; // the iron band
  ctx.fillRect(20, -134, 28, 7);
  ctx.fillStyle = L.ironLight;
  for (const x of [22, 30, 38, 44]) fillPoly(ctx, [[x, -134], [x + 2, -142], [x + 4, -134]], L.ironLight);
  fillPoly(ctx, [[22, -134], [12, -150], [4, -168], [10, -162], [14, -170], [18, -156], [26, -136]], L.antler, L.antlerEdge, 1);
  fillPoly(ctx, [[40, -134], [46, -152], [42, -170], [50, -160], [56, -172], [54, -152], [46, -134]], L.antler, L.antlerEdge, 1);
  drawEyes(ctx, 40, -120, 2.8, true, true);
  drawEyes(ctx, 32, -121, 2.4, true, true);
  // Dark water dripping off him.
  ctx.strokeStyle = L.water;
  ctx.lineWidth = 2;
  for (const [x, y] of [[-40, -60], [-20, -40], [8, -46], [30, -100], [-30, -100]]) {
    const k = (anim * 0.9 + (x - y) * 0.01) % 1;
    ctx.beginPath();
    ctx.moveTo(x, y + k * 16);
    ctx.lineTo(x, y + k * 16 + 8);
    ctx.stroke();
  }
  drawArm(arm, 18, peat, false); // the near arm, in front
  ctx.restore();
}

// §5.3: his lane's entrance before he rises from it: a dark pool spreading, bubbling. k: 0 → 1.
export function drawBossEntrance(ctx, at, k, anim) {
  const r = 30 + 50 * k;
  ctx.save();
  ctx.fillStyle = `rgba(14, 20, 16, ${0.35 + 0.4 * k})`;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  drawBubbles(ctx, at.x, at.y, r, anim, 7);
  ctx.restore();
}

// §5.2: where he sank: a ring of bubbles over the bog.
export function drawSunkRing(ctx, x, y, r, anim) {
  ctx.save();
  ctx.strokeStyle = 'rgba(30, 44, 36, 0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawBubbles(ctx, x, y, r, anim, 10);
  ctx.restore();
}

function drawBubbles(ctx, x, y, r, anim, n) {
  ctx.fillStyle = 'rgba(190, 220, 200, 0.6)';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = (anim * 1.2 + i * 0.37) % 1;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.32 - p * 10, 1.5 + (1 - p) * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
