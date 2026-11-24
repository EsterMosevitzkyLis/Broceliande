// Venom on the Druid: a damage-over-time effect that spider bites put on him (the enemies tab's
// venomDps and venomDuration; blank = no venom). Explicit state on game, like an enemy status:
//   game.druidVenom: null | { until, nextTick, dps } (combat time)
// A bite while poisoned restarts the timer and keeps the stronger venom (higher dps, with its
// duration); it never stacks. Ticks every VENOM_TICK_INTERVAL s of Combat only, each through
// hurtDruid (so druid.damageTakenMult applies) and druid.venomTakenMult. Cleared when the fight ends.

import * as C from '../config.js';
import { enemyType } from '../entities/enemy.js';
import { events } from '../events.js';
import { hurtDruid } from './combatSystem.js';
import { addFloatingText } from '../effects.js';
import { isEffectActive } from './potionSystem.js';

export function isDruidPoisoned(game) {
  return !!game.druidVenom;
}

// A bite from `enemy` landed on the Druid: poison him if its type has venom.
export function applyVenom(game, enemy) {
  const t = enemyType(enemy);
  if (!(t.venomDps > 0) || !(t.venomDuration > 0)) return;
  if (isEffectActive(game, 'cleansing')) return; // Potions §5: a Cleansing Tonic's ward
  const now = game.combatTime;
  const v = game.druidVenom;
  // The stronger venom wins; a weaker bite still restarts the stronger one's timer.
  const dps = v ? Math.max(v.dps, t.venomDps) : t.venomDps;
  const duration = v && v.dps > t.venomDps ? v.duration : t.venomDuration;
  // Already poisoned: keep the tick rhythm, or quick bites (a Spider's 0.9 s) would push every
  // tick back and venom would never land.
  const nextTick = v ? v.nextTick : now + C.VENOM_TICK_INTERVAL;
  game.druidVenom = { until: now + duration, nextTick, dps, duration };
}

// Venom ticks (Combat only, called from the Combat step). A tick due at the moment it runs out still lands.
export function updateVenom(game) {
  const v = game.druidVenom;
  if (!v) return;
  while (v.nextTick <= v.until + 1e-9 && game.combatTime >= v.nextTick - 1e-9 && game.druidHp > 0) {
    v.nextTick += C.VENOM_TICK_INTERVAL;
    const dealt = hurtDruid(game, v.dps * C.VENOM_TICK_INTERVAL * game.stats['druid.venomTakenMult']);
    if (dealt <= 0) continue; // fully resisted: nothing to show
    game.damageStats.venom = (game.damageStats.venom ?? 0) + dealt;
    const p = game.scene.level.druidPos;
    addFloatingText(game, `-${Number(dealt.toFixed(1))}`, p.x, p.y - C.DRUID_RADIUS * 2, true, false, C.VENOM_TEXT_COLOR);
    events.emit('druidVenomTick', { damage: dealt });
  }
  if (game.combatTime >= v.until - 1e-9) game.druidVenom = null;
}

export function clearVenom(game) {
  game.druidVenom = null;
}
