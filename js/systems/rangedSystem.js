// Ranged enemies (M6b §4.2, the Lizard Hunters): an enemy with an attackRange walks its lane, and
// while a valid target is within that range it stops (enemy.throwing; movementSystem.js holds it)
// and throws a spear at it every attackInterval. Targets, in priority: the summons in range
// (Vultures, Squirrels; the nearest), then, for an attacksTurrets enemy, the turrets in range (the
// lowest HP first, then the nearest), then the Druid. Spears fly fast but not instantly and land on
// their target if it is still there. A ranged enemy held up by a summon, or already at the Druid's
// melee slots, fights in melee as any other.

import * as C from '../config.js';
import { EnemyState, enemyType } from '../entities/enemy.js';
import { hurtDruid } from './combatSystem.js';
import { damageTurret } from './buildSystem.js';
import { events } from '../events.js';
import { wallById, damageWall } from './wallSystem.js';

const TIMER_EPSILON = 1e-9;
const SPEAR_HAND_HEIGHT = 1.6;  // × radius above its feet: where a spear leaves the hand
const TURRET_HIT_HEIGHT = 16;   // px above a turret's centre where a spear strikes it
const DRUID_HIT_HEIGHT = 0.9;   // × DRUID_RADIUS above his centre

function summons(game) {
  return [...game.vultures.map((unit) => ({ kind: 'vulture', unit })), ...game.squirrels.map((unit) => ({ kind: 'squirrel', unit }))];
}

// The target a ranged enemy would throw at now: { kind, id } or null.
export function rangedTarget(game, enemy) {
  const t = enemyType(enemy);
  const range = t.attackRange;
  const dist = (o) => Math.hypot(o.x - enemy.x, o.y - enemy.y);
  const summon = summons(game).filter((s) => s.unit.hp > 0 && dist(s.unit) <= range).sort((a, b) => dist(a.unit) - dist(b.unit))[0];
  if (summon) return { kind: summon.kind, id: summon.unit.id };
  if (t.attacksTurrets) {
    const turret = game.turrets.filter((x) => dist(x) <= range).sort((a, b) => a.hp - b.hp || dist(a) - dist(b))[0];
    if (turret) return { kind: 'turret', id: turret.id };
  }
  if (dist(game.scene.level.druidPos) <= range) return { kind: 'druid', id: null };
  return null;
}

// Where a target is now (the point a spear flies to), or null if it is gone.
function targetPoint(game, target) {
  if (target.kind === 'druid') {
    const d = game.scene.level.druidPos;
    return { x: d.x, y: d.y - C.DRUID_RADIUS * DRUID_HIT_HEIGHT };
  }
  if (target.kind === 'turret') {
    const t = game.turrets.find((x) => x.id === target.id);
    return t ? { x: t.x, y: t.y - TURRET_HIT_HEIGHT } : null;
  }
  if (target.kind === 'wall') { // M6d §2.5: the point of the wall in front of its thrower
    const w = wallById(game, target.id);
    if (!w) return null;
    const across = Math.max(-w.half, Math.min(w.half, target.across ?? 0));
    return { x: w.x - w.ty * across, y: w.y + w.tx * across - TURRET_HIT_HEIGHT };
  }
  const list = target.kind === 'vulture' ? game.vultures : game.squirrels;
  const u = list.find((x) => x.id === target.id && x.hp > 0);
  return u ? { x: u.x, y: u.y } : null;
}

export function updateRanged(game, dt) {
  for (const enemy of game.enemies) {
    const t = enemyType(enemy);
    if (!t.attackRange) continue;
    enemy.sinceThrow = Math.min((enemy.sinceThrow ?? t.attackInterval) + dt, t.attackInterval);
    const free = enemy.state === EnemyState.WALKING && enemy.blockedBy === null;
    // M6d §2.5: held up at a Scale Bulwark wall, it throws its spears at the wall.
    const wall = enemy.blockedBy !== null ? wallById(game, enemy.blockedBy) : null;
    const target = wall ? { kind: 'wall', id: wall.id, across: (enemy.x - wall.x) * -wall.ty + (enemy.y - wall.y) * wall.tx } : free ? rangedTarget(game, enemy) : null;
    enemy.throwing = !!target;
    enemy.throwTarget = target;
    if (!target) continue;
    const at = targetPoint(game, target);
    if (Math.abs(at.x - enemy.x) > 0.5) enemy.facing = Math.sign(at.x - enemy.x);
    if (enemy.sinceThrow < t.attackInterval - TIMER_EPSILON) continue;
    enemy.sinceThrow = 0;
    enemy.lastThrowTime = game.combatTime;
    const from = { x: enemy.x + enemy.facing * enemy.radius * 0.4, y: enemy.y + enemy.radius * (0.5 - SPEAR_HAND_HEIGHT) };
    game.spears.push({ x: from.x, y: from.y, angle: Math.atan2(at.y - from.y, at.x - from.x), target, damage: t.damage, type: enemy.type, ownerId: enemy.id });
    events.emit('spearThrown', { type: enemy.type, x: enemy.x, y: enemy.y });
  }
}

// Spears home on their target and land when within SPEAR_HIT_RADIUS; one whose target is gone
// drops out of the air (it vanishes).
export function updateSpears(game, dt) {
  const left = [];
  for (const s of game.spears) {
    const at = targetPoint(game, s.target);
    if (!at) continue;
    const dx = at.x - s.x;
    const dy = at.y - s.y;
    const dist = Math.hypot(dx, dy);
    const step = C.SPEAR_SPEED * dt;
    if (dist <= Math.max(step, C.SPEAR_HIT_RADIUS)) {
      land(game, s);
      continue;
    }
    s.angle = Math.atan2(dy, dx);
    s.x += (dx / dist) * step;
    s.y += (dy / dist) * step;
    left.push(s);
  }
  game.spears = left;
}

function land(game, s) {
  const { kind, id } = s.target;
  if (kind === 'druid') {
    hurtDruid(game, s.damage);
    game.druidLastHitTime = game.combatTime;
  } else if (kind === 'turret') {
    damageTurret(game, game.turrets.find((x) => x.id === id), s.damage);
  } else if (kind === 'wall') {
    damageWall(game, wallById(game, id), s.damage, game.enemies.find((e) => e.id === s.ownerId) ?? null); // thorns hurt the thrower
  } else {
    const unit = (kind === 'vulture' ? game.vultures : game.squirrels).find((x) => x.id === id);
    unit.hp -= s.damage;
    unit.lastHitTime = game.combatTime;
  }
  events.emit('spearHit', { type: s.type, target: kind });
}
