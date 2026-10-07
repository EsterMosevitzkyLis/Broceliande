// Canvas debug overlay (spec §18.2). Visual only — must not affect gameplay.
// Phase 1: Druid main position and melee slots. More is added as systems arrive.

import * as C from '../config.js';

const COLOR = 'rgba(120, 220, 255, 0.9)';

export function drawDebugOverlay(ctx, game) {
  ctx.save();
  ctx.strokeStyle = COLOR;
  ctx.fillStyle = COLOR;
  ctx.lineWidth = 1.5;
  ctx.font = '14px monospace';

  // Druid main position
  const d = C.DRUID_POS;
  ctx.beginPath();
  ctx.moveTo(d.x - 8, d.y);
  ctx.lineTo(d.x + 8, d.y);
  ctx.moveTo(d.x, d.y - 8);
  ctx.lineTo(d.x, d.y + 8);
  ctx.stroke();
  ctx.fillText(`Druid (${d.x}, ${d.y})`, d.x + 10, d.y - 10);

  // Melee ring and slots
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(d.x, d.y, C.DRUID_MELEE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < C.DRUID_MELEE_SLOTS; i++) {
    const a = (i / C.DRUID_MELEE_SLOTS) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(d.x + Math.cos(a) * C.DRUID_MELEE_RADIUS, d.y + Math.sin(a) * C.DRUID_MELEE_RADIUS, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
