// The canvas's pixel ratio: device pixels per world (stage) px. The game canvas is sized to the
// screen's real resolution (main.js fitStage), so the browser's scaling of the stage doesn't blur
// it; every drawing still works in world px through the context's transform. Off-screen caches
// (ground, decoration, the mire, the map's still layer, scratch canvases) are drawn at the same
// ratio with hiResCanvas, then pasted at their world size, so they stay as sharp as live drawing.

let ratio = 1;

export function pixelRatio() {
  return ratio;
}

export function setPixelRatio(k) {
  ratio = k;
}

// A canvas holding w x h world px at the current ratio, its context scaled to draw in world px.
export function hiResCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * ratio);
  c.height = Math.ceil(h * ratio);
  c.getContext('2d').scale(ratio, ratio);
  return c;
}
