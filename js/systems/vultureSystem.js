// The Vulture (spec §15.3–15.4, M2r): choosing a target from its spot or the field, straight-line
// flight, landing, pecking, collecting, expiry, and blocking enemies while landed. It treats every
// enemy type alike.

import * as C from '../config.js';
import { VultureState } from '../entities/vulture.js';
import { damageEnemy, lifestealOnBite } from './combatSystem.js';
import { enemyType } from '../entities/enemy.js';
import { blockingSquirrels, collect } from './squirrelSystem.js';
import { isLanded } from './dropSystem.js';
import { inSpot } from './companionSystem.js';
import { events } from '../events.js';

// Geometric tolerance (px) so a Vulture landing exactly at melee range does not flicker
// between landed and flying from rounding error (which would reset its attack timer).
const LANDING_SLACK = 1;

// The nearest of these things to the Vulture, or null.
function nearest(things, v) {
  let best = null;
  let bestDist = Infinity;
  for (const t of things) {
    const d = Math.hypot(t.x - v.x, t.y - v.y);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

// M2r: its next target, { enemy } or { drop } or neither. In its spot, enemies first, then drops. A
// spot that was empty when ordered is guarded until something enters it. An empty spot is left,
// and from then on the target is the nearest enemy or drop anywhere. A drop still in the air counts,
// so a kill's drops are not left behind.
function chooseTarget(game, v) {
  if (v.spot) {
    const here = (t) => inSpot(v.spot, t);
    const enemy = nearest(game.enemies.filter(here), v);
    const drop = enemy ? null : nearest(game.drops.filter(here), v);
    if (enemy || drop) {
      v.guarding = false;
      return { enemy, drop };
    }
    if (v.guarding) return {};
    v.spot = null;
  }
  const enemy = nearest(game.enemies, v);
  const drop = nearest(game.drops, v);
  if (enemy && drop) return nearest([enemy, drop], v) === enemy ? { enemy } : { drop };
  return { enemy, drop };
}

// Flies toward a point, stopping `stopAt` px short of it.
function flyTo(v, x, y, stopAt, dt) {
  const dx = x - v.x;
  const dy = y - v.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= stopAt) return;
  const step = Math.min(C.VULTURE_SPEED * dt, dist - stopAt);
  v.x += (dx / dist) * step;
  v.y += (dy / dist) * step;
  if (Math.abs(dx) > 0.5) v.facing = Math.sign(dx);
}

function fight(game, v, target, dt) {
  const dist = Math.hypot(target.x - v.x, target.y - v.y);
  if (Math.abs(target.x - v.x) > 0.5) v.facing = Math.sign(target.x - v.x);
  if (v.state === VultureState.LANDED && dist > C.VULTURE_MELEE_RANGE + LANDING_SLACK) {
    v.state = VultureState.FLYING; // target got away: take off again
  }
  if (v.state === VultureState.FLYING) {
    // Fly until just inside melee range, then land.
    flyTo(v, target.x, target.y, C.VULTURE_MELEE_RANGE - LANDING_SLACK, dt);
    if (Math.hypot(target.x - v.x, target.y - v.y) <= C.VULTURE_MELEE_RANGE) {
      v.state = VultureState.LANDED;
      v.attackTimer = 0;
    }
  }
  if (v.state === VultureState.LANDED) {
    v.attackTimer += dt;
    if (v.attackTimer >= C.VULTURE_ATTACK_INTERVAL) {
      v.attackTimer -= C.VULTURE_ATTACK_INTERVAL;
      v.lastPeckTime = game.combatTime;
      events.emit('vulturePecked', { x: v.x, y: v.y });
      damageEnemy(game, target, game.stats['vulture.damage']); // effective (M2e); if it dies, next step picks a new target
    }
  }
}

// M2r: flies to a drop and collects it once it has landed. It holds nothing up while it does.
function fetchDrop(game, v, drop, dt) {
  v.state = VultureState.FLYING;
  const range = game.stats['squirrel.pickupRange']; // effective (M2e)
  flyTo(v, drop.x, drop.y, range, dt);
  if (isLanded(drop) && Math.hypot(drop.x - v.x, drop.y - v.y) <= range + LANDING_SLACK) {
    collect(game, v, drop);
    v.dropId = null;
  }
}

// No target: guards its spot, landed, or hovers where it is if it has none.
function idle(v, dt) {
  if (!v.spot) {
    v.state = VultureState.HOVERING;
    return;
  }
  flyTo(v, v.spot.x, v.spot.y, 0, dt);
  const there = v.x === v.spot.x && v.y === v.spot.y;
  v.state = there ? VultureState.LANDED : VultureState.FLYING;
}

export function updateVultures(game, dt) {
  for (const v of game.vultures) {
    // Sticky target: only re-picked when it is gone (or there was none).
    let enemy = game.enemies.find((e) => e.id === v.targetId) ?? null;
    let drop = game.drops.find((d) => d.id === v.dropId) ?? null;
    if (!enemy && !drop) {
      ({ enemy = null, drop = null } = chooseTarget(game, v));
      v.targetId = enemy?.id ?? null;
      v.dropId = drop?.id ?? null;
      v.attackTimer = 0;
      if (enemy) v.state = VultureState.FLYING;
    }
    if (enemy) fight(game, v, enemy, dt);
    else if (drop) fetchDrop(game, v, drop, dt);
    else idle(v, dt);
  }
}

// §15.4: an enemy (any type) whose centre is within the block radius of a landed Vulture stops and
// attacks it (the nearest one if several). With SQUIRREL_BLOCKS_WOLVES, a waiting Squirrel blocks and
// is attacked the same way (M1d §2.4). Runs before movement each step; an enemy with no blocker
// this step simply resumes.
export function updateBlocking(game, dt) {
  const blockers = [
    ...game.vultures.filter((v) => v.state === VultureState.LANDED).map((unit) => ({ unit, radius: C.VULTURE_BLOCK_RADIUS })),
    ...blockingSquirrels(game).map((unit) => ({ unit, radius: C.SQUIRREL_BLOCK_RADIUS, squirrel: true })),
  ];
  for (const enemy of game.enemies) {
    let blocker = null;
    let bestDist = Infinity;
    for (const { unit, radius, squirrel } of blockers) {
      if (squirrel && enemy.flying) continue; // M2h §3.2: Squirrels never block flyers
      const d = Math.hypot(unit.x - enemy.x, unit.y - enemy.y);
      if (d <= radius && d < bestDist) {
        bestDist = d;
        blocker = unit;
      }
    }
    if (!blocker) {
      enemy.blockedBy = null;
      enemy.vultureBiteTimer = 0;
      continue;
    }
    if (enemy.blockedBy !== blocker.id) enemy.vultureBiteTimer = 0; // newly blocked: wind up a bite
    enemy.blockedBy = blocker.id;
    enemy.facing = blocker.x >= enemy.x ? 1 : -1;
    const t = enemyType(enemy); // attacks the blocker with its own type's damage and interval (M1e §3.4)
    if (t.windupTime) continue; // wind-up attackers (the Ogre) strike it in updateWindupAttacks (M2c §2.5)
    enemy.vultureBiteTimer += dt;
    if (enemy.vultureBiteTimer >= t.attackInterval) {
      enemy.vultureBiteTimer -= t.attackInterval;
      enemy.lastBiteTime = game.combatTime;
      blocker.hp -= t.damage;
      blocker.lastHitTime = game.combatTime;
      lifestealOnBite(game, enemy);
      events.emit('enemyAttacked', { type: enemy.type, target: 'summon' });
    }
  }
}

// Expire Vultures at 0 HP (§15.3); M2r: a job has no time limit.
export function expireVultures(game) {
  game.vultures = game.vultures.filter((v) => v.hp > 0);
}
