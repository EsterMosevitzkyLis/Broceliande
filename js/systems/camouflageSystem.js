// Camouflage (M6c §2): in a region with camouflage, an enemy whose type has camouflage (the lizard
// hunters and their Grims) is a faint shimmer that turrets, summons and the Druid's strike can't
// target, until it is revealed. Area effects still hit it (clouds, burning, Wisp bursts, Cinderjaw
// cones). It walks, stops and throws as usual.
//   Revealed while it is within the current range of any turret, inside a poison cloud or burning,
//   and for REVEAL_LINGER s after; for WISP_REVEAL s after a Slow Wisp burst hits it; and briefly,
//   THROW_REVEAL s, each time it throws a spear.
// Per enemy: camouflaged (true while hidden; unset for every other enemy), revealUntil and
// wispRevealUntil (combat time), and for the look only camoShow (0 = shimmer, 1 = the full
// hunter) and shiverAt (when it last resolved).

import * as C from '../config.js';
import { enemyType } from '../entities/enemy.js';
import { turretRange } from '../entities/turret.js';
import { isInsideCloud } from './cloudSystem.js';
import { isBurning } from './statusSystem.js';
import { regionTwist } from '../levelSettings.js';
import { events } from '../events.js';

const camouflageOn = (game) => regionTwist(game.scene.level, 'camouflage');

// Whether turrets, summons and the Druid's strike may aim at it (M6b §6: never the bound Oracle).
export const canTarget = (e) => !e.bound && e.camouflaged !== true;

// A Slow Wisp burst hit it.
export function revealByWisp(game, e) {
  if (camouflageOn(game) && enemyType(e).camouflage) e.wispRevealUntil = game.combatTime + C.WISP_REVEAL;
}

export function updateCamouflage(game, dt) {
  if (!camouflageOn(game)) return;
  const now = game.combatTime;
  for (const e of game.enemies) {
    if (!enemyType(e).camouflage) continue;
    const exposed = isInsideCloud(game, e) || isBurning(e)
      || game.turrets.some((t) => Math.hypot(e.x - t.x, e.y - t.y) <= turretRange(t));
    if (exposed) e.revealUntil = now + C.REVEAL_LINGER;
    const lasting = now < (e.revealUntil ?? -Infinity) || now < (e.wispRevealUntil ?? -Infinity);
    const threw = now - (e.lastThrowTime ?? -Infinity) < C.THROW_REVEAL;
    const wasHidden = e.camouflaged ?? true;
    e.camouflaged = !lasting && !threw;
    // Resolving for good (not just a throw's glimpse): a soft shiver and a quiet rustle.
    if (wasHidden && lasting) {
      e.shiverAt = now;
      events.emit('hunterRevealed', { type: e.type, x: e.x, y: e.y });
    }
    const goal = e.camouflaged ? 0 : 1;
    const step = dt / C.CAMO_FADE_TIME;
    const show = e.camoShow ?? 0;
    e.camoShow = goal > show ? Math.min(goal, show + step) : Math.max(goal, show - step);
  }
}

// Debug overlay and panel: 'hidden', 'revealed', 'lingering 1.2 s', 'Wisp 3.1 s' or 'throw'.
export function revealState(game, e) {
  if (e.camouflaged) return 'hidden';
  const now = game.combatTime;
  const wisp = (e.wispRevealUntil ?? -Infinity) - now;
  const linger = (e.revealUntil ?? -Infinity) - now;
  if (linger > C.REVEAL_LINGER - 1e-6) return 'revealed';
  if (linger > 0 && linger >= wisp) return `lingering ${linger.toFixed(1)} s`;
  if (wisp > 0) return `Wisp ${wisp.toFixed(1)} s`;
  return 'throw';
}
