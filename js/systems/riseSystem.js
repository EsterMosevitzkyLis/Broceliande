// Rising dead (M3b §3): in a region with risingDead, an enemy whose type `rises` that dies for the
// first time leaves a body where it fell (game.bodies) instead of dying for good. After RISE_DELAY
// it stands up again on the same spot with RISE_HP_FRAC of its max HP, marked risen, and carries
// on along its lane; a risen enemy never rises again. Dying while burning (M2o) stays dead: it burns
// to ash instead. Drops are rolled only on the final death (combatSystem.killEnemy). A body
// waiting to rise is out of game.enemies, so nothing collides with it, targets it or holds a
// Druid melee slot for it; the wave isn't cleared while one waits (waveSystem.js).
// game.bodies: [{ enemy, timer (s until it rises), age (s since it fell) }]
// game.ashes:  [{ type, x, y, radius, age }] (visual only)

import * as C from '../config.js';
import { EnemyState, AttackState, enemyType } from '../entities/enemy.js';
import { regionTwist } from '../levelSettings.js';
import { events } from '../events.js';

// Whether this death leaves a body to rise: a `rises` type, not yet risen, in a region with the twist.
export function willRise(game, enemy) {
  return !!enemyType(enemy).rises && !enemy.risen && regionTwist(game.scene.level, 'risingDead');
}

// Its first death, not burning: the body slumps where it fell.
export function layBody(game, enemy) {
  game.bodies.push({ enemy, timer: C.RISE_DELAY, age: 0 });
  events.emit('enemyDied', { type: enemy.type, x: enemy.x, y: enemy.y, fell: true }); // its death sound
}

// Its first death while burning: it burns to ash and stays dead (§3.1).
export function burnToAsh(game, enemy) {
  game.traitStats.burnedToAsh++;
  game.ashes.push({ type: enemy.type, x: enemy.x, y: enemy.y, radius: enemy.radius, age: 0 });
}

// Each Combat step: bodies count down and rise.
export function updateBodies(game, dt) {
  for (const body of [...game.bodies]) {
    body.age += dt;
    body.timer -= dt;
    if (body.timer <= 0) rise(game, body);
  }
}

function rise(game, body) {
  game.bodies = game.bodies.filter((b) => b !== body);
  const e = body.enemy;
  const t = enemyType(e);
  e.hp = Math.max(1, Math.round(e.maxHp * C.RISE_HP_FRAC));
  e.risen = true;
  e.risenAt = game.combatTime; // its pull-up animation (drawing)
  e.statuses = {};
  // Back on its lane where it fell; it queues for melee slots again as normal.
  e.state = EnemyState.WALKING;
  e.slots = [];
  e.stand = null;
  e.biteTimer = 0;
  e.bitingSince = Infinity;
  e.blockedBy = null;
  e.vultureBiteTimer = 0;
  e.attack = AttackState.READY;
  e.sinceBlow = t.windupTime ? t.attackInterval - t.windupTime : 0;
  e.windupElapsed = 0;
  e.windupTarget = null;
  e.stuckTimer = 0;
  e.stuckOn = null;
  e.passThroughId = null;
  game.enemies.push(e);
  game.traitStats.rises++;
  // §3.2: a boss rises as one: its bar back (at RISE_HP_FRAC) and a banner.
  if (t.boss) game.bossAnnouncement = { text: `${/^The /.test(t.name) ? t.name : `The ${t.name}`} rises again!`, age: 0 };
  events.emit('enemyRose', { type: e.type, x: e.x, y: e.y });
}

// Debug Shift+N (skipWave): every body dies for good at once.
export function finishBodies(game) {
  for (const body of game.bodies) {
    game.enemyCounts[body.enemy.type].alive--;
    game.enemyCounts[body.enemy.type].killed++;
  }
  game.bodies = [];
}

// Visual only (effects.js): the ash heaps smoulder away.
export function updateAshes(game, dt) {
  for (const a of game.ashes) a.age += dt;
  game.ashes = game.ashes.filter((a) => a.age < C.ASH_TIME);
}
