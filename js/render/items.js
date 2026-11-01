// Equipment icons (M2e §2.4): a generic silhouette per slot type (empty slots, the "found"
// message), and per item that silhouette in the item's own colours plus a small distinguishing
// mark. Shared draw functions, like the other icons. (x, y): centre; size: the icon's width.

import * as C from '../config.js';

const SILHOUETTE = { fill: '#e1d7be', line: 'rgba(60, 50, 35, 0.9)' };
const STAFF_WOOD = '#6e4a2a';

// Slot-type silhouette, faded for an empty slot. colors: [main, accent] (default: the plain look).
export function drawSlotIcon(ctx, slot, x, y, size, colors = null, alpha = 1) {
  const [main, accent] = colors ?? [SILHOUETTE.fill, SILHOUETTE.line];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64); // drawn on a 64 × 64 grid centred on (0, 0)
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = main;
  ctx.strokeStyle = colors ? darker(main) : SILHOUETTE.line;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  SHAPES[slot](ctx, main, accent);
  ctx.restore();
}

// An item's own icon: its slot silhouette in its colours, plus its mark.
export function drawItemIcon(ctx, itemId, x, y, size) {
  const item = C.ITEMS[itemId];
  drawSlotIcon(ctx, item.slot, x, y, size, item.colors);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.fillStyle = item.colors[1];
  ctx.strokeStyle = item.colors[1];
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  MARKS[item.mark](ctx);
  ctx.restore();
}

// Rarity frame (M2p §1.1): a thin ring in the item's rarity colour round its icon, at the icon's
// edge. (x, y): centre; size: the icon's width, as for drawItemIcon.
export function drawRarityFrame(ctx, itemId, x, y, size) {
  const rarity = C.RARITY[C.ITEMS[itemId].rarity];
  if (!rarity) return;
  const w = C.RARITY_FRAME_WIDTH * size / 64;
  ctx.save();
  ctx.strokeStyle = rarity.frame;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(x, y, size / 2 - w / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// An item's icon inside its rarity frame, shrunk a little so the frame clears it.
export function drawFramedItemIcon(ctx, itemId, x, y, size) {
  drawItemIcon(ctx, itemId, x, y, size * 0.8);
  drawRarityFrame(ctx, itemId, x, y, size);
}

function darker(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * 0.55);
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

const fillStroke = (ctx) => { ctx.fill(); ctx.stroke(); };

// Silhouettes on the 64-unit grid.
const SHAPES = {
  // Crown charm: a three-pointed crown on a band, set on the staff top.
  crown(ctx) {
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-11, 2);
    ctx.lineTo(0, -20);
    ctx.lineTo(11, 2);
    ctx.lineTo(24, -12);
    ctx.lineTo(22, 14);
    ctx.closePath();
    fillStroke(ctx);
    ctx.beginPath();
    ctx.roundRect(-23, 12, 46, 9, 3);
    fillStroke(ctx);
  },
  // Grip charm: a wrapped band round a short length of staff.
  grip(ctx, main) {
    ctx.fillStyle = STAFF_WOOD;
    ctx.beginPath();
    ctx.roundRect(-5, -28, 10, 56, 4);
    ctx.fill();
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.roundRect(-14, -16, 28, 32, 7);
    fillStroke(ctx);
    ctx.beginPath(); // wrapping
    for (const y of [-6, 4]) {
      ctx.moveTo(-14, y);
      ctx.lineTo(14, y + 4);
    }
    ctx.stroke();
  },
  // Ferrule charm: a pointed metal cap on the staff foot.
  ferrule(ctx) {
    ctx.beginPath();
    ctx.moveTo(-13, -22);
    ctx.lineTo(13, -22);
    ctx.lineTo(11, 8);
    ctx.lineTo(0, 26);
    ctx.lineTo(-11, 8);
    ctx.closePath();
    fillStroke(ctx);
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(12, -12);
    ctx.stroke();
  },
  // Necklace: a chain arc and a round pendant.
  necklace(ctx, main) {
    const rim = ctx.strokeStyle;
    ctx.beginPath();
    ctx.arc(0, -10, 22, Math.PI * 0.05, Math.PI * 0.95);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = main;
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rim;
    ctx.beginPath();
    ctx.arc(0, 17, 11, 0, Math.PI * 2);
    fillStroke(ctx);
  },
  // Belt: a strap with a square buckle.
  belt(ctx) {
    ctx.beginPath();
    ctx.roundRect(-28, -8, 56, 16, 4);
    fillStroke(ctx);
    ctx.beginPath();
    ctx.roundRect(-9, -13, 18, 26, 3);
    ctx.lineWidth = 4;
    ctx.stroke();
  },
  // Shoes: a side-on boot.
  shoes(ctx) {
    ctx.beginPath();
    ctx.moveTo(-14, -24);
    ctx.lineTo(4, -24);
    ctx.lineTo(4, 2);
    ctx.quadraticCurveTo(22, 4, 26, 14);
    ctx.lineTo(26, 20);
    ctx.lineTo(-16, 20);
    ctx.closePath();
    fillStroke(ctx);
  },
};

// Distinguishing marks, in the item's accent colour.
const MARKS = {
  feather(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 4, 4, 10, 0.5, 0, Math.PI * 2);
    ctx.fill();
  },
  talon(ctx) {
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(4, -2, 6, 10);
    ctx.quadraticCurveTo(0, 4, -6, 8);
    ctx.closePath();
    ctx.fill();
  },
  nut(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 2, 7, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  paw(ctx) {
    ctx.beginPath();
    ctx.arc(0, 5, 5, 0, Math.PI * 2);
    for (const [dx, dy] of [[-6, -4], [0, -7], [6, -4]]) ctx.arc(dx, dy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  },
  moss(ctx) {
    for (const [dx, dy] of [[-5, -6], [4, -2], [-2, 6]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  roots(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 14);
    ctx.moveTo(0, 4);
    ctx.lineTo(7, 14);
    ctx.stroke();
  },
  acorn(ctx) {
    ctx.beginPath();
    ctx.ellipse(0, 19, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  drop(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.quadraticCurveTo(6, 18, 0, 23);
    ctx.quadraticCurveTo(-6, 18, 0, 9);
    ctx.fill();
  },
  hammer(ctx) {
    ctx.fillRect(-2, -4, 4, 9);
    ctx.fillRect(-6, -7, 12, 5);
  },
  pouch(ctx) {
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();
  },
  fern(ctx) {
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.quadraticCurveTo(-6, -4, -4, -18);
    for (const t of [-12, -6, 0, 6]) {
      ctx.moveTo(-6, t);
      ctx.lineTo(-1, t - 3);
    }
    ctx.stroke();
  },
  ears(ctx) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-5 + side * 3, -30, 2.6, 8, side * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  // M2p §1.3 items.
  nest(ctx) { // Eyrie Crown: a twig nest with an egg
    ctx.beginPath();
    ctx.ellipse(0, 9, 10, 4, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 4, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  bolt(ctx) { // Stormfeather Crown: a lightning bolt
    ctx.beginPath();
    ctx.moveTo(3, -8);
    ctx.lineTo(-5, 4);
    ctx.lineTo(1, 4);
    ctx.lineTo(-3, 14);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  },
  coins(ctx) { // Hoarder's Grip: two stacked coins
    for (const [dx, dy] of [[-3, 4], [3, -3]]) {
      ctx.beginPath();
      ctx.ellipse(dx, dy, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  thorns(ctx) { // Thornwood Grip: thorns sticking out of the wrap
    ctx.beginPath();
    for (const [x, y, d] of [[-14, -10, -1], [-14, 8, -1], [14, -4, 1], [14, 12, 1]]) {
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x + d * 7, y);
      ctx.lineTo(x, y + 3);
    }
    ctx.fill();
  },
  wind(ctx) { // Swiftroot Ferrule: speed lines
    ctx.beginPath();
    for (const [y, w] of [[-6, 14], [0, 18], [6, 12]]) {
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
    }
    ctx.stroke();
  },
  heart(ctx) { // Heartroot Ferrule: a heart
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-12, -1, -6, -11, 0, -4);
    ctx.bezierCurveTo(6, -11, 12, -1, 0, 8);
    ctx.fill();
  },
  torc(ctx) { // Ward Torc: an open ring on the pendant
    ctx.beginPath();
    ctx.arc(0, 17, 6, Math.PI * 0.65, Math.PI * 2.35);
    ctx.lineWidth = 3;
    ctx.stroke();
  },
  leafheart(ctx) { // Heartwood Amulet: a heart-shaped leaf on the pendant
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.bezierCurveTo(-9, 17, -5, 9, 0, 13);
    ctx.bezierCurveTo(5, 9, 9, 17, 0, 24);
    ctx.fill();
  },
  wheat(ctx) { // Gleaner's Belt: an ear of wheat on the buckle
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -8);
    ctx.stroke();
    for (const y of [-6, -1, 4]) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * 2.5, y, 1.8, 3, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  anvil(ctx) { // Wildwright's Belt: a small anvil on the buckle
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(7, -5);
    ctx.lineTo(4, 0);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
  },
  wing(ctx) { // Strider Boots: a little wing on the heel
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.quadraticCurveTo(-26, -14, -28, -4);
    ctx.quadraticCurveTo(-22, -6, -20, 0);
    ctx.quadraticCurveTo(-18, -4, -14, -2);
    ctx.closePath();
    ctx.fill();
  },
  star(ctx) { // Pathfinder's Shoes: a four-point compass star
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 2.5 : 8;
      ctx.lineTo(-4 + Math.cos(a) * r, -6 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  },
};

// A pattern (M2p §3.2): a rolled parchment scroll tied with a ribbon. (x, y): centre; size: width.
export function drawScrollIcon(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.rotate(-0.35);
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(80, 60, 30, 0.95)';
  ctx.fillStyle = '#e9d9a8';
  ctx.beginPath(); // the rolled sheet
  ctx.roundRect(-24, -11, 48, 22, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d4bf86';
  for (const side of [-1, 1]) { // the rolled ends
    ctx.beginPath();
    ctx.ellipse(side * 24, 0, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#9c3a2e'; // ribbon and seal
  ctx.fillRect(-3, -11, 6, 22);
  ctx.beginPath();
  ctx.arc(0, 12, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// The "item found" floater (M2e §3.2): the slot-type silhouette (or, for a pattern, the scroll,
// M2p §3.2) with a soft golden glow, rising and fading like the resource floaters. t: 0 → 1 over FLOATER_TIME.
export function drawSlotFloater(ctx, f, t) {
  const size = C.ITEM_FLOATER_SIZE;
  const y = f.y - C.FLOATER_RISE_PX * (1 - (1 - t) * (1 - t));
  ctx.save();
  ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
  const g = ctx.createRadialGradient(f.x, y, 0, f.x, y, size * 0.8);
  g.addColorStop(0, 'rgba(255, 230, 140, 0.7)');
  g.addColorStop(1, 'rgba(255, 230, 140, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.x, y, size * 0.8, 0, Math.PI * 2);
  ctx.fill();
  if (f.pattern) drawScrollIcon(ctx, f.x, y, size);
  else drawSlotIcon(ctx, f.slot, f.x, y, size);
  ctx.restore();
}
