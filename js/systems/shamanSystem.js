// Lizard Shamans (M6b §4.3): every SHAMAN_SHIELD_INTERVAL s (a Grim's GRIM_SHAMAN_SHIELD_INTERVAL),
// a shaman shields up to SHAMAN_SHIELD_TARGETS of the nearest lizardfolk within SHAMAN_SHIELD_RANGE,
// itself included, for SHAMAN_SHIELD_AMOUNT (a Grim's GRIM_SHAMAN_SHIELD_AMOUNT) lasting
// SHAMAN_SHIELD_DURATION s. Spiders are never shielded. A cast raises its staff and threads reach
// the shielded (enemy.castAt, enemy.castTargets: drawing and the debug overlay's shield links).

import * as C from '../config.js';
import { enemyType } from '../entities/enemy.js';
import { applyShield } from './statusSystem.js';
import { events } from '../events.js';

const TIMER_EPSILON = 1e-9;

// M6b §6: never the Iron Oracle while bound on his perch (nothing touches him then).
export function isLizardfolk(enemy) {
  return C.LIZARDFOLK.has(enemyType(enemy).baseType) && !enemy.bound;
}

export function updateShamans(game, dt) {
  for (const shaman of game.enemies) {
    const t = enemyType(shaman);
    if (t.baseType !== 'shaman') continue;
    const grim = t.variant === 'grim';
    const interval = grim ? C.GRIM_SHAMAN_SHIELD_INTERVAL : C.SHAMAN_SHIELD_INTERVAL;
    shaman.castTimer = (shaman.castTimer ?? 0) + dt;
    if (shaman.castTimer < interval - TIMER_EPSILON) continue;
    shaman.castTimer = 0;
    const dist = (e) => Math.hypot(e.x - shaman.x, e.y - shaman.y);
    const targets = game.enemies.filter((e) => isLizardfolk(e) && dist(e) <= C.SHAMAN_SHIELD_RANGE)
      .sort((a, b) => dist(a) - dist(b) || a.id - b.id)
      .slice(0, C.SHAMAN_SHIELD_TARGETS);
    for (const e of targets) applyShield(game, e, grim ? C.GRIM_SHAMAN_SHIELD_AMOUNT : C.SHAMAN_SHIELD_AMOUNT, C.SHAMAN_SHIELD_DURATION);
    shaman.castAt = game.combatTime;
    shaman.castTargets = targets.map((e) => e.id);
    events.emit('shamanCast', { type: shaman.type, x: shaman.x, y: shaman.y });
  }
}
