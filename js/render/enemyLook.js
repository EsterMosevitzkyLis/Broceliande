// An enemy's whole look (M1e §3.4, M2l §2.1), shared by the battlefield, the wave preview icons
// and the map tooltip icons: its base type's draw function at its drawScale, and for a Grim the
// pulsing ember outline round the whole silhouette and the ash smoke with sparks.
//
// The outline: the Grim's body (no ground shadow) is drawn into a scratch canvas; an ember-tinted
// copy is stamped round it in 8 directions, then the body goes on top, so only a thin rim of
// ember shows outside the silhouette. Draw functions take an optional `part` on the enemy:
// 'shadow' draws only the ground shadow, 'body' everything but it.
// M3b: the undead's Grims glow cold green with pale mist; a risen enemy (§3.3) keeps a muddy green
// tint and a slightly torn look, and pulls itself up out of the mire over RISE_ANIM_TIME.

import * as C from '../config.js';
import { drawWolf, drawBear, drawOgre, drawStirge, drawGrimSmoke } from './entities.js';
import { drawThrall, drawBrute, drawKnight, drawBogKing } from './undead.js';

const ENEMY_DRAW = { wolf: drawWolf, bear: drawBear, ogre: drawOgre, stirge: drawStirge, thrall: drawThrall, brute: drawBrute, knight: drawKnight, bogKing: drawBogKing };
const UNDEAD = new Set(['thrall', 'brute', 'knight', 'bogKing']); // M3b §2: cold green outline and mist

// Where the smoke rises from, per base type: top of the body above the feet (× radius), spread
// (× radius) and puff scale (× radius). The Stirge's is measured from its flying body.
const SMOKE = {
  wolf: { top: 1.5, width: 1.6, puff: 1 },
  bear: { top: 1.6, width: 1.4, puff: 1 },
  ogre: { top: 1.9, width: 1.1, puff: 0.7 },
  stirge: { top: 0.4, width: 1, puff: 1 },
  thrall: { top: 1.7, width: 1.2, puff: 0.9 },
  brute: { top: 1.8, width: 1.4, puff: 1 },
  knight: { top: 2.4, width: 0.9, puff: 0.7 },
  bogKing: { top: 2.6, width: 1.1, puff: 0.7 },
};

const SCRATCH_SIZE = 7;     // × radius: side of the square scratch canvas round one enemy
const SCRATCH_ANCHOR = 0.62; // its ground point sits this far down the scratch canvas

const scratches = new Map(); // size → { body, tint } canvases, reused every frame

function scratchPair(size) {
  if (!scratches.has(size)) {
    const make = () => Object.assign(document.createElement('canvas'), { width: size, height: size });
    scratches.set(size, { body: make(), tint: make() });
  }
  return scratches.get(size);
}

// Draws enemy e (an entity, or anything with its fields) with its look. smoke: false leaves out a
// Grim's smoke (small icons, where it would only shrink the creature when cropped).
export function drawEnemyLook(ctx, e, hit, lunging, anim, { smoke = true } = {}) {
  const t = C.ENEMY_TYPES[e.type];
  const s = t.drawScale ?? 1; // drawing only (M2l §2.1), enlarged about its feet
  const d = s === 1 ? e : { ...e, radius: e.radius * s, y: e.y + e.radius * 0.5 * (1 - s) };
  const draw = ENEMY_DRAW[t.baseType];
  const grim = t.variant === 'grim';
  const undead = UNDEAD.has(t.baseType);
  // M3b §3.3: pulling itself up, just risen: squashed into the mire, growing back to full height.
  const rising = e.pullUpAt !== undefined ? Math.min(1, (anim - e.pullUpAt) / C.RISE_ANIM_TIME) : 1; // also the Bog King and his Thralls (§5.3)
  if (rising < 1) {
    const feet = d.y + d.radius * 0.5;
    ctx.save();
    ctx.translate(d.x, feet);
    ctx.scale(1, 0.55 + 0.45 * rising);
    ctx.translate(-d.x, -feet);
  }
  if (!grim && !e.risen) {
    draw(ctx, d, hit, lunging, anim);
    if (rising < 1) ctx.restore();
    return;
  }

  draw(ctx, { ...d, part: 'shadow' }, hit, lunging, anim);
  const size = Math.ceil(d.radius * SCRATCH_SIZE);
  const { body, tint } = scratchPair(size);
  const ox = size / 2;
  const oy = Math.round(size * SCRATCH_ANCHOR);
  const bx = body.getContext('2d');
  bx.clearRect(0, 0, size, size);
  draw(bx, { ...d, x: ox, y: oy, part: 'body' }, hit, lunging, anim);
  if (e.risen) tornAndMuddy(bx, ox, oy, d.radius, e.id);
  const tx = tint.getContext('2d');
  tx.globalCompositeOperation = 'copy';
  tx.drawImage(body, 0, 0);
  tx.globalCompositeOperation = 'source-in';
  tx.fillStyle = undead ? C.UNDEAD_OUTLINE_COLOR : C.GRIM_OUTLINE_COLOR;
  tx.fillRect(0, 0, size, size);
  tx.globalCompositeOperation = 'source-over';

  const left = d.x - ox;
  const top = d.y - oy;
  const pulse = 0.5 + 0.5 * Math.sin((anim / C.GRIM_OUTLINE_PERIOD) * Math.PI * 2 + e.id);
  const [lo, hi] = C.GRIM_OUTLINE_ALPHA;
  if (grim) {
    ctx.save();
    ctx.globalAlpha *= lo + (hi - lo) * pulse;
    const w = C.GRIM_OUTLINE_WIDTH;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.drawImage(tint, left + Math.cos(a) * w, top + Math.sin(a) * w);
    }
    ctx.restore();
  }
  ctx.drawImage(body, left, top);
  if (rising < 1) ctx.restore();

  if (!smoke || !grim) return;
  const puffs = SMOKE[t.baseType];
  const smokeTop = t.flying
    ? d.y - t.flyHeight - d.radius * puffs.top
    : d.y + d.radius * 0.5 - d.radius * puffs.top;
  drawGrimSmoke(ctx, d.x, smokeTop, d.radius * puffs.width, d.radius * puffs.puff, anim, e.id, undead);
}

// M3b §3.3: a risen enemy's body (in its scratch canvas, ground point at ox, oy): a muddy green
// tint over it, and a few torn gaps through it.
function tornAndMuddy(bx, ox, oy, r, seed) {
  bx.save();
  bx.globalCompositeOperation = 'source-atop';
  bx.fillStyle = C.RISEN_TINT;
  bx.fillRect(0, 0, bx.canvas.width, bx.canvas.height);
  bx.globalCompositeOperation = 'destination-out';
  bx.lineWidth = Math.max(1, r * 0.07);
  bx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x = ox + (((seed * 0.37 + i * 0.29) % 1) - 0.5) * r * 1.2;
    const y = oy - r * (0.6 + 0.5 * ((seed * 0.53 + i * 0.41) % 1));
    bx.beginPath();
    bx.moveTo(x - r * 0.12, y - r * 0.08);
    bx.lineTo(x + r * 0.04, y + r * 0.02);
    bx.lineTo(x - r * 0.06, y + r * 0.14);
    bx.stroke();
  }
  bx.restore();
}
