// A village's scene art (M6a §2.3, Rootkeeper Grove), placeholder and procedural, on the place
// scene template (placeScene.js), palette `village`: tree ferns and mist at the back, timber
// dwellings on platforms round two living trees, a sagging rope walkway between them hung with
// lanterns, a workshop with half-finished carvings and wood shavings, and the Rootkeeper craftsman
// on the right. The Trade tab adds the goods blanket and the Druid's coins (as at a Trader); the
// Craft tab the book on its workbench and the anvil the craft animation plays on (as at a Tinker's
// Rest). Both tabs' text and controls are HTML (traderScreen.js, tinkerScreen.js, villageScreen.js).

import * as C from '../config.js';
import { createRng } from '../rng.js';
import { drawPlaceScene } from './placeScene.js';
import { drawShadow } from './environment.js';
import { drawBlanket, drawLantern, drawCoinPile } from './trader.js';
import { drawAnvil, drawCraft, drawWorkbench } from './tinker.js';

const COLORS = {
  plank: '#7a5532',
  plankDark: '#4a301a',
  plankLight: '#a47a48',
  rope: '#b89a62',
  robe: '#6e4a2a',
  robeDark: '#4a301a',
  apron: '#8a6238',
  apronDark: '#5e3e20',
  skin: '#c89a74',
  beard: '#d8d0c0',
  bead: ['#b07a3e', '#7a5028', '#d0a060'],
  iron: '#4a4844',
  shaving: '#e0c08a',
};

// The whole scene for game.village (its visit and tinker are its two tabs). t: the village's clock, s.
export function drawVillageScene(ctx, village, visit, tinker, t, gold = 0) {
  const P = C.PLACE_PALETTE.village;
  const age = tinker.time - tinker.craftAt; // s since the last Craft
  drawPlaceScene(ctx, {
    id: 'village',
    drawProps: (c) => {
      drawBackFerns(c, P, t);
      drawLivingTrees(c, P);
      drawWalkway(c, t);
      drawWorkshop(c, P);
      for (const k of C.VILLAGE_SCENE.carvings) drawCarving(c, k);
      drawShavings(c);
      if (village.tab === 'craft') drawWorkbench(c, C.TINKER_SCENE.book);
    },
    drawHost: (c, x, y) => { if (village.tab === 'trade') drawRootkeeper(c, x, y, t); }, // the book covers his spot on the Craft tab
    drawForeground: (c) => {
      if (village.tab === 'trade') {
        drawBlanket(c, C.TRADER_SCENE.blanket);
        drawCoinPile(c, C.TRADER_SCENE.coins.x, C.TRADER_SCENE.coins.y, gold);
      } else {
        const a = C.TINKER_SCENE.anvil;
        drawAnvil(c, a.x, a.y);
        drawCraft(c, a, tinker, age);
      }
      drawMist(c, P, t);
    },
  }, t);
}

// Tree ferns along the clearing's back edge (a thin trunk under a crown of arching fronds), and
// the soft gold light falling through them.
function drawBackFerns(ctx, P, t) {
  const S = C.VILLAGE_SCENE;
  const rng = createRng(7171);
  for (let i = 0; i < S.ferns; i++) {
    const x = (i + 0.5) * (C.STAGE_WIDTH / S.ferns) + rng.range(-50, 50);
    const base = C.PLACE_SCENE.horizonY + rng.range(-20, 15);
    const h = rng.range(150, 230);
    drawTreeFern(ctx, x, base, h, P, Math.sin(t * 0.4 + i) * 0.03);
  }
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const x = 200 + i * 460;
    const g = ctx.createLinearGradient(x, 0, x + 120, C.PLACE_SCENE.horizonY + 200);
    g.addColorStop(0, 'rgba(255, 220, 140, 0.12)');
    g.addColorStop(1, 'rgba(255, 220, 140, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x + 260, C.PLACE_SCENE.horizonY + 200);
    ctx.lineTo(x + 140, C.PLACE_SCENE.horizonY + 200);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// A tree fern: trunk from (x, base) up h px, a crown of fronds arching out and down. sway: radians.
export function drawTreeFern(ctx, x, base, h, P, sway = 0) {
  const top = { x: x + h * 0.05, y: base - h };
  ctx.save();
  ctx.strokeStyle = P.treeDark.trunk;
  ctx.lineWidth = Math.max(3, h * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x - h * 0.04, base - h * 0.5, top.x, top.y);
  ctx.stroke();
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI + (i / (fronds - 1)) * Math.PI + sway; // left to right over the top
    const len = h * (0.55 + 0.15 * Math.sin(i * 1.7));
    const tip = { x: top.x + Math.cos(a) * len, y: top.y + Math.sin(a) * len * 0.45 + len * 0.35 };
    const mid = { x: top.x + Math.cos(a) * len * 0.5, y: top.y + Math.sin(a) * len * 0.5 - len * 0.05 };
    ctx.strokeStyle = i % 2 ? P.vegetation.light : P.vegetation.base;
    ctx.lineWidth = Math.max(2, h * 0.035);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
    ctx.stroke();
    // Leaflets along the frond.
    ctx.lineWidth = Math.max(1, h * 0.012);
    for (let k = 0.3; k < 1; k += 0.14) {
      const px = top.x + (tip.x - top.x) * k;
      const py = top.y + (mid.y - top.y) * 2 * k * (1 - k) + (tip.y - top.y) * k * k;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - 6 * (1 - k) * h * 0.02, py + 9 * (1 - k) * h * 0.02);
      ctx.moveTo(px, py);
      ctx.lineTo(px + 6 * (1 - k) * h * 0.02, py + 9 * (1 - k) * h * 0.02);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// The living trees with their platforms and timber dwellings, ladders down to the ground.
function drawLivingTrees(ctx, P) {
  const S = C.VILLAGE_SCENE;
  S.trees.forEach((tr, i) => {
    drawShadow(ctx, tr.x, tr.base, tr.width * 0.9, 16);
    ctx.fillStyle = P.treeDark.trunk;
    ctx.beginPath();
    ctx.moveTo(tr.x - tr.width / 2 - 26, tr.base);
    ctx.quadraticCurveTo(tr.x - tr.width / 2, tr.base - 60, tr.x - tr.width * 0.4, 0);
    ctx.lineTo(tr.x + tr.width * 0.4, 0);
    ctx.quadraticCurveTo(tr.x + tr.width / 2, tr.base - 60, tr.x + tr.width / 2 + 26, tr.base);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'; // bark furrows
    ctx.lineWidth = 3;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(tr.x + k * tr.width * 0.16, tr.base - 10);
      ctx.quadraticCurveTo(tr.x + k * tr.width * 0.12 + 6, tr.base * 0.5, tr.x + k * tr.width * 0.13, 0);
      ctx.stroke();
    }
    ctx.fillStyle = P.moss;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.ellipse(tr.x - tr.width * 0.25, tr.base - 120, tr.width * 0.22, 50, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawHut(ctx, S.huts[i], P);
  });
}

// A timber dwelling on a platform round a trunk: posts, a plank floor, walls, a shingled roof, a
// lit window and a ladder.
function drawHut(ctx, { x, y, w, h }, P) {
  ctx.save();
  ctx.fillStyle = COLORS.plankDark;               // posts under the platform
  for (const dx of [-w * 0.55, w * 0.55]) ctx.fillRect(x + dx - 6, y, 12, 120);
  ctx.fillStyle = COLORS.plank;                   // the platform
  ctx.fillRect(x - w * 0.7, y - 6, w * 1.4, 16);
  ctx.fillStyle = COLORS.plankLight;
  ctx.fillRect(x - w * 0.7, y - 6, w * 1.4, 4);
  ctx.fillStyle = COLORS.plank;                   // walls, either side of the trunk
  ctx.fillRect(x - w / 2, y - h, w, h - 6);
  ctx.strokeStyle = COLORS.plankDark;
  ctx.lineWidth = 2;
  for (let py = y - h + 16; py < y - 6; py += 16) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, py);
    ctx.lineTo(x + w / 2, py);
    ctx.stroke();
  }
  ctx.fillStyle = P.roof.dark;                    // the roof
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 30, y - h + 4);
  ctx.lineTo(x, y - h - 70);
  ctx.lineTo(x + w / 2 + 30, y - h + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.roof.light;
  ctx.lineWidth = 3;
  for (let k = 1; k <= 3; k++) {
    const yy = y - h - 70 + k * 18;
    const half = (w / 2 + 30) * (k * 18) / 74;
    ctx.beginPath();
    ctx.moveTo(x - half, yy);
    ctx.lineTo(x + half, yy);
    ctx.stroke();
  }
  ctx.fillStyle = P.glow;                         // a lit window
  ctx.fillRect(x + w * 0.18, y - h * 0.7, 30, 26);
  ctx.strokeStyle = COLORS.plankDark;
  ctx.strokeRect(x + w * 0.18, y - h * 0.7, 30, 26);
  ctx.strokeStyle = COLORS.plankLight;            // the ladder
  ctx.lineWidth = 4;
  const lx = x - w * 0.42;
  ctx.beginPath();
  ctx.moveTo(lx, y + 8);
  ctx.lineTo(lx - 16, y + 150);
  ctx.moveTo(lx + 26, y + 8);
  ctx.lineTo(lx + 10, y + 150);
  for (let k = 1; k < 7; k++) {
    const yy = y + 8 + k * 20;
    const off = (k * 20) / 142 * 16;
    ctx.moveTo(lx - off, yy);
    ctx.lineTo(lx + 26 - off, yy);
  }
  ctx.stroke();
  ctx.restore();
}

// The rope walkway between the two platforms: two sagging ropes, planks between, lanterns hung under it.
function drawWalkway(ctx, t) {
  const W = C.VILLAGE_SCENE.walkway;
  const at = (k, dy = 0) => ({
    x: W.from.x + (W.to.x - W.from.x) * k,
    y: W.from.y + (W.to.y - W.from.y) * k + W.sag * 4 * k * (1 - k) + dy,
  });
  ctx.save();
  ctx.strokeStyle = COLORS.plank;
  ctx.lineWidth = 5;
  for (let k = 0.03; k < 1; k += 0.035) {
    const p = at(k);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 2);
    ctx.lineTo(p.x, p.y + 6);
    ctx.stroke();
  }
  ctx.strokeStyle = COLORS.rope;
  ctx.lineWidth = 3;
  for (const dy of [0, -34]) {
    ctx.beginPath();
    for (let k = 0; k <= 1.0001; k += 0.05) {
      const p = at(k, dy);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1.5; // the hand-rope's ties
  for (let k = 0.1; k < 1; k += 0.1) {
    const p = at(k);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - 34);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 1; i <= W.lanterns; i++) {
    const p = at(i / (W.lanterns + 1));
    drawLantern(ctx, p.x, p.y + 4, t + i * 1.3);
  }
}

// The workshop: an open-fronted timber shed with a shingled roof, a sawhorse, planks leaning on it.
function drawWorkshop(ctx, P) {
  const { x, y, w, h } = C.VILLAGE_SCENE.workshop;
  ctx.save();
  drawShadow(ctx, x, y + 4, w * 0.6, 18);
  ctx.fillStyle = 'rgba(20, 12, 6, 0.55)';        // the dark inside
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = COLORS.plankDark;               // corner posts
  for (const dx of [-w / 2, w / 2 - 14]) ctx.fillRect(x + dx, y - h, 14, h);
  ctx.fillStyle = P.roof.dark;                    // the lean-to roof
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 34, y - h + 10);
  ctx.lineTo(x - w / 2 + 20, y - h - 50);
  ctx.lineTo(x + w / 2 + 34, y - h - 30);
  ctx.lineTo(x + w / 2 + 34, y - h + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.roof.light;
  ctx.fillRect(x - w / 2 - 34, y - h + 4, w + 68, 6);
  ctx.strokeStyle = COLORS.iron;                  // tools on the back wall
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    const tx = x - w / 2 + 50 + i * 48;
    ctx.beginPath();
    ctx.moveTo(tx, y - h + 30);
    ctx.lineTo(tx, y - h + 80 + (i % 2) * 16);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.plankLight;              // planks leaning on the post
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(x + w / 2 + 10 + i * 12, y);
    ctx.rotate(-0.25);
    ctx.fillRect(-5, -h * 0.85, 10, h * 0.85);
    ctx.restore();
  }
  ctx.strokeStyle = COLORS.plank;                 // a sawhorse with a log on it
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 70, y);
  ctx.lineTo(x - 40, y - 50);
  ctx.lineTo(x - 10, y);
  ctx.moveTo(x + 30, y);
  ctx.lineTo(x + 60, y - 50);
  ctx.lineTo(x + 90, y);
  ctx.stroke();
  ctx.fillStyle = P.treeDark.trunk;
  ctx.fillRect(x - 80, y - 66, 190, 22);
  ctx.fillStyle = COLORS.plankLight;
  ctx.beginPath();
  ctx.ellipse(x + 110, y - 55, 6, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A half-finished totem: a log, its top carved into a face, its lower part still rough bark.
function drawCarving(ctx, { x, y, h }) {
  const w = h * 0.3;
  ctx.save();
  drawShadow(ctx, x, y, w * 0.8, 8);
  ctx.fillStyle = COLORS.robeDark;                // rough bark
  ctx.fillRect(x - w / 2, y - h * 0.45, w, h * 0.45);
  ctx.fillStyle = COLORS.plankLight;              // the carved part
  ctx.fillRect(x - w / 2, y - h, w, h * 0.55);
  ctx.strokeStyle = COLORS.plankDark;
  ctx.lineWidth = 2;
  ctx.beginPath();                                // brow, eyes, mouth
  ctx.moveTo(x - w * 0.4, y - h * 0.82);
  ctx.lineTo(x + w * 0.4, y - h * 0.82);
  ctx.stroke();
  for (const ex of [-0.2, 0.2]) {
    ctx.beginPath();
    ctx.ellipse(x + ex * w, y - h * 0.74, w * 0.1, h * 0.03, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeRect(x - w * 0.22, y - h * 0.62, w * 0.44, h * 0.06);
  ctx.strokeStyle = COLORS.shaving;               // the line where the carving stops
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.45);
  ctx.lineTo(x - w * 0.1, y - h * 0.48);
  ctx.lineTo(x + w / 2, y - h * 0.44);
  ctx.stroke();
  ctx.restore();
}

// Curls of wood shavings on the ground round the workshop and the carvings (fixed positions).
function drawShavings(ctx) {
  const rng = createRng(5151);
  ctx.save();
  ctx.strokeStyle = COLORS.shaving;
  ctx.lineWidth = 2;
  for (let i = 0; i < C.VILLAGE_SCENE.shavings; i++) {
    const nearShop = i % 2 === 0;
    const x = nearShop ? rng.range(1460, 1880) : rng.range(820, 1000);
    const y = nearShop ? rng.range(450, 520) : rng.range(455, 500);
    const r = rng.range(3, 6);
    ctx.beginPath();
    ctx.arc(x, y, r, rng.range(0, 3), rng.range(3.5, 6.5));
    ctx.stroke();
  }
  ctx.restore();
}

// Low bands of mist drifting in front of the back of the scene.
function drawMist(ctx, P, t) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const y = C.PLACE_SCENE.horizonY - 40 + i * 40;
    const x = ((t * (8 + i * 3) + i * 600) % (C.STAGE_WIDTH + 800)) - 400;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 420);
    g.addColorStop(0, P.mist);
    g.addColorStop(1, 'rgba(220, 235, 215, 0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.18);
    ctx.translate(-x, -y);
    ctx.beginPath();
    ctx.arc(x, y, 420, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// The Rootkeeper craftsman (unscaled; feet at (x, y)): wood-brown robes, a leather apron, tools at
// the belt (a mallet and a chisel), a string of carved wooden beads, a grey beard; now and then he
// turns the small carving in his hands.
function drawRootkeeper(ctx, x, y, t) {
  ctx.save();
  drawShadow(ctx, x, y, 32, 9);
  ctx.fillStyle = COLORS.robe;                    // robes: a long bell shape
  ctx.beginPath();
  ctx.moveTo(x - 27, y);
  ctx.quadraticCurveTo(x - 26, y - 52, x - 13, y - 70);
  ctx.lineTo(x + 13, y - 70);
  ctx.quadraticCurveTo(x + 26, y - 52, x + 27, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.robeDark;                // the hem
  ctx.fillRect(x - 27, y - 5, 54, 5);
  ctx.fillStyle = COLORS.apron;                   // the leather apron
  ctx.beginPath();
  ctx.moveTo(x - 13, y - 60);
  ctx.lineTo(x + 13, y - 60);
  ctx.lineTo(x + 17, y - 10);
  ctx.lineTo(x - 17, y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.apronDark;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 8, y - 38, 16, 10);          // its pocket
  ctx.fillStyle = COLORS.apronDark;               // the belt
  ctx.fillRect(x - 20, y - 46, 40, 5);
  ctx.fillStyle = COLORS.plankLight;              // a mallet at the belt
  ctx.fillRect(x + 18, y - 46, 4, 22);
  ctx.fillStyle = COLORS.plank;
  ctx.fillRect(x + 14, y - 26, 12, 9);
  ctx.fillStyle = COLORS.iron;                    // and a chisel
  ctx.fillRect(x - 23, y - 44, 3, 18);
  ctx.fillStyle = COLORS.plankLight;
  ctx.fillRect(x - 24, y - 48, 5, 6);
  ctx.fillStyle = COLORS.skin;                    // head
  ctx.beginPath();
  ctx.arc(x, y - 82, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.beard;                   // beard and brows
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 80);
  ctx.quadraticCurveTo(x, y - 56, x + 10, y - 80);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 8, y - 89, 6, 2);
  ctx.fillRect(x + 2, y - 89, 6, 2);
  ctx.fillStyle = COLORS.robeDark;                // a soft cap
  ctx.beginPath();
  ctx.ellipse(x, y - 92, 13, 6, 0, Math.PI, 0);
  ctx.fill();
  if ((t % 5.1) > 0.15) {                         // eyes, with a blink now and then
    ctx.fillStyle = '#2a1c10';
    for (const ex of [-5, 5]) {
      ctx.beginPath();
      ctx.arc(x + ex, y - 84, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  COLORS.bead.forEach((c, i) => {                 // carved wooden beads
    for (let k = i; k < 9; k += 3) {
      const a = Math.PI * (0.15 + 0.7 * (k / 8));
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 14, y - 70 + Math.sin(a) * 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const turn = Math.sin(t * 0.9) * 0.4;           // hands with a small carving, turned slowly
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(x - 9, y - 50, 4, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 50, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - 54);
  ctx.rotate(turn);
  ctx.fillStyle = COLORS.plankLight;
  ctx.fillRect(-4, -9, 8, 14);
  ctx.fillStyle = COLORS.plankDark;
  ctx.fillRect(-2, -6, 4, 2);
  ctx.restore();
  ctx.restore();
}
