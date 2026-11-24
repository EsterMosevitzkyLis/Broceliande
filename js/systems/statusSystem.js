// Timed enemy statuses (M2k §3.4). Each status lives on enemy.statuses until its `until` (combat
// time) passes. Applying one again refreshes it rather than stacking. Three so far:
//   slowed:   { until, mult } — the enemy moves at mult × its speed (see enemySpeed in enemy.js)
//   corroded: { until, mult } — it takes mult × damage from every source, before armor (M2m §2.4)
//   burning:  { until, nextTick, tickDamage, tickInterval, spreadRadius, level, sourceTurretId } —
//             tickDamage every tickInterval s (burnSystem.js), M2o §2.2; spreadRadius > 0: Wildfire
//   shielded: { until, amount, max } — absorbs damage before HP (M6b §3, damageEnemy in combatSystem.js)
//   confused: { until } — Potions §5: walks back along its lane, attacking nothing (movementSystem.js)
// Rooted (Potions §5) is Slowed to 0: slowed with rooted: true (a weaker slow never replaces it).

import * as C from '../config.js';
import { enemyType, EnemyState, AttackState } from '../entities/enemy.js';

// Slows an enemy for `duration` s from now; already slowed: the duration restarts. Its type's
// slowResist (M2l §1.3, the Grim Wolf's Dogged) ignores that fraction of the slow:
// effective mult = 1 − (1 − mult) × (1 − slowResist).
export function applySlow(game, enemy, mult, duration) {
  const old = enemy.statuses.slowed;
  if (old?.rooted && mult > 0 && old.until > game.combatTime) return; // Potions §5: a root holds
  const resist = enemyType(enemy).slowResist ?? 0;
  enemy.statuses.slowed = { until: game.combatTime + duration, mult: 1 - (1 - mult) * (1 - resist) };
}

// Potions §5 (Mire Aura): a slow that never weakens a stronger one already on the enemy (a root, a
// Slow Wisp's): it only takes over if it slows as much or more.
export function applySlowAtLeast(game, enemy, mult, duration) {
  const old = enemy.statuses.slowed;
  const resist = enemyType(enemy).slowResist ?? 0;
  const eff = 1 - (1 - mult) * (1 - resist);
  if (old && old.mult < eff) return;
  enemy.statuses.slowed = { until: Math.max(old?.until ?? 0, game.combatTime + duration), mult: eff };
}

// Potions §5: Rooted = Slowed to 0 (slowResist still applies) for `duration` s. Bosses ignore it.
export function applyRoot(game, enemy, duration) {
  if (enemyType(enemy).boss || !(duration > 0)) return false;
  const old = enemy.statuses.slowed;
  const until = Math.max(old?.rooted ? old.until : 0, game.combatTime + duration);
  applySlow(game, enemy, 0, until - game.combatTime);
  enemy.statuses.slowed.rooted = true;
  return true;
}

export function isRooted(enemy) {
  return !!enemy.statuses.slowed?.rooted;
}

// Potions §5: Confused for `duration` s (a longer confusion already on it is kept). The enemy lets go
// of the Druid (its melee slots are freed, a wind-up is dropped) and walks back along its lane at
// its normal speed, attacking nothing; then it resumes. Bosses, egg sacs and the perched Oracle
// ignore it. Returns whether it took.
export function applyConfuse(game, enemy, duration) {
  if (enemyType(enemy).boss || enemy.stationary || enemy.bound || !(duration > 0)) return false;
  const old = enemy.statuses.confused;
  enemy.statuses.confused = { until: Math.max(old?.until ?? 0, game.combatTime + duration) };
  if (old) return true;
  for (const s of enemy.slots ?? []) game.meleeSlots[s].enemyId = null;
  enemy.slots = [];
  if (enemy.state !== EnemyState.WALKING) {
    enemy.state = EnemyState.WALKING;
    enemy.s = Math.min(enemy.s, enemy.lane.path.length - C.ENEMY_SLOT_CLAIM_DISTANCE);
    enemy.offLane = true; // off its lane (at the Druid, or walking to him): it heads back to it first
  }
  if (enemy.attack === AttackState.WINDUP) enemy.attack = AttackState.READY;
  enemy.throwing = false;
  enemy.passThroughId = null;
  return true;
}

export function isConfused(enemy) {
  return !!enemy.statuses.confused;
}

export function isSlowed(enemy) {
  return !!enemy.statuses.slowed;
}

// Corrodes an enemy until `linger` s from now (M2m §2.4). Level 5 Toader clouds call it every
// step for each enemy inside, so it lasts while inside and `linger` s after leaving.
export function applyCorrode(game, enemy, mult, linger) {
  enemy.statuses.corroded = { until: game.combatTime + linger, mult };
}

export function isCorroded(enemy) {
  return !!enemy.statuses.corroded;
}

// Damage taken multiplier from its statuses: Corroded's mult, else 1.
export function corrodeMult(enemy) {
  return enemy.statuses.corroded?.mult ?? 1;
}

// Sets an enemy burning (M2o §2.2) with `burn` ({ duration, tickInterval, tickDamage, spreadRadius })
// from a turret (id and level). Its first tick comes one tickInterval after it catches fire. Burned
// again while burning: the duration restarts (no stacking), and it keeps whichever burn is stronger
// (more damage per second), its next tick no later than the stronger burn's interval from now.
export function applyBurn(game, enemy, burn, turretId, level) {
  const now = game.combatTime;
  const fresh = { until: now + burn.duration, nextTick: now + burn.tickInterval, tickDamage: burn.tickDamage, tickInterval: burn.tickInterval, spreadRadius: burn.spreadRadius, level, sourceTurretId: turretId, duration: burn.duration };
  const old = enemy.statuses.burning;
  if (!old) {
    enemy.statuses.burning = fresh;
    return;
  }
  const stronger = fresh.tickDamage / fresh.tickInterval > old.tickDamage / old.tickInterval;
  const kept = stronger ? { ...fresh, nextTick: Math.min(old.nextTick, fresh.nextTick) } : { ...old, until: fresh.until };
  enemy.statuses.burning = kept;
}

// M3c §5: a burn set by an item (Peatsmoke Crown, Ashen Censer): ITEM_BURN_DAMAGE every
// ITEM_BURN_TICK s for `duration` s. The same burning status as the Cinderjaw's.
export function applyItemBurn(game, enemy, duration) {
  if (!(duration > 0) || !game.enemies.includes(enemy)) return;
  applyBurn(game, enemy, { duration, tickInterval: C.ITEM_BURN_TICK, tickDamage: C.ITEM_BURN_DAMAGE, spreadRadius: 0 }, null, 'item');
}

export function isBurning(enemy) {
  return !!enemy.statuses.burning;
}

// Removes statuses whose time is up.
export function updateStatuses(game) {
  for (const enemy of game.enemies) {
    for (const [name, status] of Object.entries(enemy.statuses)) {
      if (game.combatTime >= status.until) delete enemy.statuses[name];
    }
  }
}

// M6b §3: shields `enemy` with `amount` (× the level's enemy HP multiplier) for `duration` s. A
// shielded enemy's shield is reset to the larger of the two amounts, with the new duration (no stacking).
export function applyShield(game, enemy, amount, duration) {
  const scaled = Math.round(amount * game.stats['enemy.hpMult']);
  const old = enemy.statuses.shielded;
  const kept = Math.max(scaled, old?.amount ?? 0);
  enemy.statuses.shielded = { until: game.combatTime + duration, amount: kept, max: Math.max(kept, old?.max ?? 0) };
}

export function shieldOf(enemy) {
  return enemy.statuses.shielded?.amount ?? 0;
}
