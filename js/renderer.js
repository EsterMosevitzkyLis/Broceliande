// Canvas drawing. Reads game state; never modifies it.

import * as C from './config.js';
import { drawDebugOverlay } from './debug/debugOverlay.js';

const COLORS = {
  hudBackdrop: '#10160e',
  forestFloor: '#2f4a26',
  marker: '#ffe066',
};

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = C.STAGE_WIDTH;
  canvas.height = C.STAGE_HEIGHT;

  function render(game, view) {
    drawBackground(ctx);
    if (view.clickMarker) drawClickMarker(ctx, view.clickMarker);
    if (view.debug) drawDebugOverlay(ctx, game);
  }

  return { render };
}

function drawBackground(ctx) {
  ctx.fillStyle = COLORS.forestFloor;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.STAGE_HEIGHT);
  // Area behind the HTML HUD strip.
  ctx.fillStyle = COLORS.hudBackdrop;
  ctx.fillRect(0, 0, C.STAGE_WIDTH, C.HUD_STRIP_HEIGHT);
}

// Phase 1 check for screen → world conversion: crosshair where the player clicked.
function drawClickMarker(ctx, p) {
  ctx.save();
  ctx.strokeStyle = COLORS.marker;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
  ctx.moveTo(p.x - 18, p.y);
  ctx.lineTo(p.x + 18, p.y);
  ctx.moveTo(p.x, p.y - 18);
  ctx.lineTo(p.x, p.y + 18);
  ctx.stroke();
  ctx.fillStyle = COLORS.marker;
  ctx.font = '16px monospace';
  ctx.fillText(`(${Math.round(p.x)}, ${Math.round(p.y)})`, p.x + 14, p.y - 14);
  ctx.restore();
}
