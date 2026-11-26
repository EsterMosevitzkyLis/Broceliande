// Hand-drawn sprites (enemies tab: sprite, spriteFrames, spriteFrameW, spriteFrameH, spriteScale,
// spriteStride). A sprite is a PNG in assets/sprites/: a horizontal strip of spriteFrames frames,
// each spriteFrameW x spriteFrameH px, facing right, on a transparent background. Loaded at start-up
// (boot.js) for every enemy row that names one; an enemy without one keeps its procedural drawing.
// Its feet row (the bottom of its lowest opaque pixel, over all frames) is found when it loads, so
// it can stand on the ground where the procedural creature did.

const SPRITE_DIR = 'assets/sprites';

// file name → { img, frames, frameW, frameH, feet (px from the frame's top) }
const sprites = {};

export function spriteFor(file) {
  return file ? sprites[file] ?? null : null;
}

// Loads every sprite the enemies tab names; any problem is a data error (problems.errors).
export async function loadSprites(enemyRows, problems) {
  const err = (row, message) => problems.errors.push({ tab: 'enemies', row: row._row ?? '', column: 'sprite', message: `${row.id}: ${message}` });
  const byId = Object.fromEntries(enemyRows.map((r) => [r.id, r]));
  // A variant row (baseType) takes every blank cell from its base row, as config.js does.
  const rows = enemyRows.map((r) => (r.baseType ? { ...byId[r.baseType], ...r } : r)).filter((r) => r.sprite);
  await Promise.all(rows.map(async (r) => {
    const missing = ['spriteFrames', 'spriteFrameW', 'spriteFrameH', 'spriteStride'].filter((k) => !(r[k] > 0));
    if (missing.length) {
      err(r, `a sprite needs ${missing.join(', ')}`);
      return;
    }
    if (sprites[r.sprite]) return;
    let img;
    try {
      img = await loadImage(`${SPRITE_DIR}/${r.sprite}`);
    } catch {
      err(r, `could not load ${SPRITE_DIR}/${r.sprite}`);
      return;
    }
    if (img.width < r.spriteFrames * r.spriteFrameW || img.height < r.spriteFrameH) {
      err(r, `${r.sprite} is ${img.width} x ${img.height} px, smaller than ${r.spriteFrames} frames of ${r.spriteFrameW} x ${r.spriteFrameH}`);
      return;
    }
    sprites[r.sprite] = { img, frames: r.spriteFrames, frameW: r.spriteFrameW, frameH: r.spriteFrameH, feet: feetRow(img, r.spriteFrames * r.spriteFrameW, r.spriteFrameH) };
  }));
}

// The bottom edge of the lowest row with an opaque pixel (its feet), or the frame's height.
function feetRow(img, w, h) {
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 0) return y + 1;
  }
  return h;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
