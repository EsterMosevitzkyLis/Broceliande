// Drawing hand-drawn sprites (js/sprites.js). drawSprite puts one frame on the canvas with image
// smoothing off and on whole pixels, so its pixels stay crisp, its anchor on the thing's ground
// point, flipped to the way the thing faces. Tints (a hit's flash, a Grim's darkening) touch only the
// sprite's own pixels.
//
// drawSpriteEnemy is an enemy's draw function when its type names a sprite: the same call as the
// procedural ones (enemyLook.js), so the Grim outline and smoke, the rising squash, status marks and
// HP bars all work round it unchanged. e.part: 'shadow' draws only the ground shadow, 'body'
// everything but it.

import * as C from '../config.js';
import { spriteFor, spriteFrame } from '../sprites.js';
import { drawShadow } from './environment.js';
import { EnemyState } from '../entities/enemy.js';

const scratches = new Map(); // "w x h" → a canvas the size of one frame, reused every draw

// One frame of sprite sp (spriteFor) with its anchor at x, y. facing: 1 right, -1 left (flipped when
// the sprite is drawn the other way). size: × its scale. tints: fill colours laid over its pixels.
export function drawSprite(ctx, sp, frame, x, y, { facing = 1, size = 1, tints = [] } = {}) {
  let src = sp.img;
  let sx = frame * sp.frameW;
  if (tints.length) {
    const key = `${sp.frameW}x${sp.frameH}`;
    let c = scratches.get(key);
    if (!c) scratches.set(key, (c = Object.assign(document.createElement('canvas'), { width: sp.frameW, height: sp.frameH })));
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.globalCompositeOperation = 'copy';
    cx.drawImage(sp.img, sx, 0, sp.frameW, sp.frameH, 0, 0, sp.frameW, sp.frameH);
    cx.globalCompositeOperation = 'source-atop';
    for (const fill of tints) {
      cx.fillStyle = fill;
      cx.fillRect(0, 0, sp.frameW, sp.frameH);
    }
    cx.globalCompositeOperation = 'source-over';
    src = c;
    sx = 0;
  }
  const k = sp.scale * size;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing * sp.facing * k, k);
  ctx.drawImage(src, sx, 0, sp.frameW, sp.frameH, -sp.anchorX, -sp.anchorY, sp.frameW, sp.frameH);
  ctx.restore();
}

export function hasSprite(type) {
  return !!spriteFor(C.ENEMY_TYPES[type]?.sprite);
}

// Walking now (else it holds frame 1): on its way, and not rooted.
function isWalking(e) {
  return (e.state === EnemyState.WALKING || e.state === EnemyState.APPROACHING) && e.statuses?.slowed?.mult !== 0;
}

// An enemy from its sprite: on the procedural creature's ground point and shadow; a larger drawn
// radius (a Grim's drawScale) scales it up; a lunge on a bite moves it forward. A Grim drawn from its
// base type's sprite (until it has its own) is darker, with a red glow on the eye (SPRITE_EYES).
export function drawSpriteEnemy(ctx, e, hit, lunging) {
  const t = C.ENEMY_TYPES[e.type];
  const sp = spriteFor(t.sprite);
  const r = e.radius;
  const feet = e.y + r * 0.5;
  if (e.part !== 'body') drawShadow(ctx, e.x, feet, r * 1.1, r * 0.3);
  if (e.part === 'shadow') return;
  const grim = t.variant === 'grim';
  const tints = [];
  if (grim) tints.push(C.SPRITE_GRIM_TINT);
  if (hit) tints.push(hit === 'strike' ? C.SPRITE_STRIKE_FLASH : C.SPRITE_HIT_FLASH); // 'strike': a Druid strike (M1f §4)
  const facing = e.facing ?? 1;
  const size = r / t.radius;
  const x = e.x + (lunging ? 5 * (r / 16) * facing : 0);
  drawSprite(ctx, sp, spriteFrame(sp, { moving: isWalking(e), distance: e.stride ?? 0 }), x, feet, { facing, size, tints });
  const eye = grim && C.SPRITE_EYES[t.sprite];
  if (!eye) return;
  // The eye's frame px, through the same anchor, flip and scale as the sprite.
  const k = sp.scale * size;
  const dir = facing * sp.facing;
  const ex = Math.round(x) + (eye.x + 0.5 - sp.anchorX) * k * dir;
  const ey = Math.round(feet) + (eye.y + 0.5 - sp.anchorY) * k;
  const rad = 3.2 * k;
  ctx.save();
  const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, rad);
  g.addColorStop(0, 'rgba(255, 210, 160, 1)');
  g.addColorStop(0.35, 'rgba(255, 40, 30, 0.95)');
  g.addColorStop(1, 'rgba(255, 20, 20, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(ex - rad, ey - rad, rad * 2, rad * 2);
  ctx.restore();
}
