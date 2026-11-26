// Hand-drawn sprites (CLAUDE.md: the art is moving gradually from procedural drawing to hand-drawn
// assets). The sprites tab defines each one (config.js SPRITES): a PNG in assets/sprites/, a
// horizontal strip of `frames` frames, each frameW x frameH px. A thing names one by id in its
// `sprite` column. Images load at start-up (boot.js); a missing file is only a warning, and whatever
// names it keeps its procedural drawing.

import * as C from './config.js';

const SPRITE_DIR = 'assets/sprites';

const images = {}; // file → its loaded image

// The sprite with this id, ready to draw: its sprites tab row plus { img }, or null (none named, or
// its file did not load).
export function spriteFor(id) {
  const def = id ? C.SPRITES?.[id] : null;
  const img = def && images[def.file];
  return img ? { ...def, img } : null;
}

// Loads the image of every sprites tab row (raw rows, before applyData). A file that is missing or
// smaller than its frames is a warning (problems.warnings).
export async function loadSpriteImages(rows, problems) {
  const warn = (r, message) => problems.warnings.push({ tab: 'sprites', row: r._row ?? '', column: 'file', message: `${r.id}: ${message}, so it is drawn procedurally` });
  await Promise.all(rows.filter((r) => r.file).map(async (r) => {
    let img = images[r.file];
    if (!img) {
      try {
        img = await loadImage(`${SPRITE_DIR}/${r.file}`);
      } catch {
        warn(r, `could not load ${SPRITE_DIR}/${r.file}`);
        return;
      }
    }
    if (img.width < r.frames * r.frameW || img.height < r.frameH) {
      warn(r, `${r.file} is ${img.width} x ${img.height} px, smaller than ${r.frames} frames of ${r.frameW} x ${r.frameH}`);
      return;
    }
    images[r.file] = img;
  }));
}

// Which frame to show (0-based). moving: it is walking now. distance: px it has walked (a mover's
// frame follows it, `stride` px per full cycle, so the feet don't slide at any game speed; frame 1
// is held while it stands). time: s (a loop at `fps`). Otherwise frame 1.
export function spriteFrame(sp, { moving = false, distance = 0, time = 0 } = {}) {
  if (sp.stride) return moving ? Math.floor((distance / sp.stride) * sp.frames) % sp.frames : 0;
  if (sp.fps) return Math.floor(time * sp.fps) % sp.frames;
  return 0;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
