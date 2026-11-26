// An enemy drawn from its hand-drawn sprite (js/sprites.js) instead of its procedural drawing. Same
// call as the procedural draw functions (enemyLook.js), so the Grim outline and smoke, the rising
// squash, status marks and HP bars all work round it unchanged:
//   - drawn with image smoothing off, so its pixels stay crisp
//   - the frame comes from distance walked (spriteStride px per full cycle), so the feet don't slide
//     and the cycle keeps pace at any game speed; frame 1 is held while it stands or attacks
//   - flipped when facing left; anchored at its feet (the sprite's lowest opaque row) on the same
//     ground point as the procedural creature, with the same ground shadow under it
//   - hit flashes tint the sprite; a Grim (until it has its own sprite) is darker, with a red glow on
//     the eye (SPRITE_EYES), on top of the usual Grim outline
// e.part: 'shadow' draws only the ground shadow, 'body' everything but it (see enemyLook.js).

import * as C from '../config.js';
import { spriteFor } from '../sprites.js';
import { drawShadow } from './environment.js';
import { EnemyState } from '../entities/enemy.js';

const scratches = new Map(); // file → a canvas the size of one frame, reused every draw

export function hasSprite(type) {
  return !!spriteFor(C.ENEMY_TYPES[type]?.sprite);
}

// Whether it is walking now (else it holds frame 1): on its way, and not rooted.
function isWalking(e) {
  return (e.state === EnemyState.WALKING || e.state === EnemyState.APPROACHING) && e.statuses?.slowed?.mult !== 0;
}

export function drawSpriteEnemy(ctx, e, hit, lunging) {
  const t = C.ENEMY_TYPES[e.type];
  const sp = spriteFor(t.sprite);
  const r = e.radius;
  const feet = e.y + r * 0.5; // the procedural creatures' ground point
  if (e.part !== 'body') drawShadow(ctx, e.x, feet, r * 1.1, r * 0.3);
  if (e.part === 'shadow') return;

  const frame = isWalking(e) ? Math.floor(((e.stride ?? 0) / t.spriteStride) * sp.frames) % sp.frames : 0;
  const scratch = frameCanvas(t.sprite, sp);
  const sx = scratch.getContext('2d');
  sx.globalCompositeOperation = 'copy';
  sx.imageSmoothingEnabled = false;
  sx.drawImage(sp.img, frame * sp.frameW, 0, sp.frameW, sp.frameH, 0, 0, sp.frameW, sp.frameH);
  sx.globalCompositeOperation = 'source-atop'; // tints touch only the creature's own pixels
  const grim = t.variant === 'grim';
  if (grim) {
    sx.fillStyle = C.SPRITE_GRIM_TINT;
    sx.fillRect(0, 0, sp.frameW, sp.frameH);
  }
  if (hit) {
    sx.fillStyle = hit === 'strike' ? C.SPRITE_STRIKE_FLASH : C.SPRITE_HIT_FLASH; // 'strike': a Druid strike (M1f §4)
    sx.fillRect(0, 0, sp.frameW, sp.frameH);
  }
  sx.globalCompositeOperation = 'source-over';

  // Size: spriteScale at the type's radius; a larger drawn radius (a Grim's drawScale) scales it up.
  const k = (t.spriteScale ?? 1) * (r / t.radius);
  const facing = e.facing ?? 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(e.x + (lunging ? 5 * (r / 16) * facing : 0)), Math.round(feet));
  ctx.scale(facing * k, k);
  ctx.drawImage(scratch, -sp.frameW / 2, -sp.feet);
  const eye = grim && C.SPRITE_EYES[t.sprite];
  if (eye) {
    const ex = eye.x - sp.frameW / 2 + 0.5;
    const ey = eye.y - sp.feet + 0.5;
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3.2);
    g.addColorStop(0, 'rgba(255, 210, 160, 1)');
    g.addColorStop(0.35, 'rgba(255, 40, 30, 0.95)');
    g.addColorStop(1, 'rgba(255, 20, 20, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(ex - 3.2, ey - 3.2, 6.4, 6.4);
  }
  ctx.restore();
}

function frameCanvas(file, sp) {
  let c = scratches.get(file);
  if (!c) {
    c = Object.assign(document.createElement('canvas'), { width: sp.frameW, height: sp.frameH });
    scratches.set(file, c);
  }
  return c;
}
