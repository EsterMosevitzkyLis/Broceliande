// Building turrets of a type on slots (spec §9.3, M1f §5.2) and upgrading them one level at a
// time (§11.2, M1e §4.3). The Druid's Prep builds pay on completion (completeBuild); Bough
// Double jobs in Combat pay up front (M1i §2.6) and then only place or raise the turret.

import { canAfford, deduct } from '../resources.js';
import { createTurret, buildCost, nextLevelStats, turretMaxHp, isWallType } from '../entities/turret.js';
import { createWall, wallFalls, raiseWallLevel, wallMaxHp } from './wallSystem.js';
import { events } from '../events.js';

export function turretOnSlot(game, slotIndex) {
  return game.turrets.find((t) => t.slotIndex === slotIndex) ?? null;
}

// Prep build completion: deduct and place a turret of that type. If resources are somehow
// short now, the build fails with no effect (§7.5). wall: a Scale Bulwark's wall placement (M6d §2.4).
export function completeBuild(game, slotIndex, type, wall = null) {
  if (turretOnSlot(game, slotIndex)) return;
  const cost = buildCost(type);
  if (!canAfford(game.resources, cost)) {
    console.warn(`Build on slot ${slotIndex} failed: resources no longer sufficient`);
    return;
  }
  deduct(game.resources, cost);
  placeTurret(game, slotIndex, type, wall);
}

// A turret of that type appears on the slot (already paid for). Building on a wreck clears it (M6b §2.2).
// M6d §2.4: a Scale Bulwark raises its wall at the placement chosen for it.
export function placeTurret(game, slotIndex, type, wall = null) {
  if (turretOnSlot(game, slotIndex)) return false;
  game.wrecks = game.wrecks.filter((w) => w.slotIndex !== slotIndex);
  const turret = createTurret(game.nextEntityId++, slotIndex, game.slots[slotIndex], type);
  if (isWallType(type) && wall) turret.wall = createWall(game, turret, wall);
  game.turrets.push(turret);
  events.emit('turretBuilt', { slotIndex, type });
  return true;
}

// The turret on the slot goes up one level (already paid for). No effect at max level. M6b §2.1:
// its max HP rises and the difference is added to its HP (no full heal).
export function raiseTurretLevel(game, slotIndex) {
  const turret = turretOnSlot(game, slotIndex);
  if (!turret || !nextLevelStats(turret)) return false;
  const before = turretMaxHp(turret);
  const wallBefore = turret.wall ? wallMaxHp(turret) : 0;
  turret.level++;
  turret.hp += turretMaxHp(turret) - before;
  raiseWallLevel(turret, wallBefore); // M6d §2.6: a standing wall gains the difference too
  events.emit('upgradeCompleted', { slotIndex, level: turret.level });
  return true;
}

// M6b §2.1–§2.2: a spear (or any attacksTurrets enemy's hit) on a turret. At 0 HP it collapses into
// a wreck on its slot: a job a Bough Double was doing on it is cancelled and refunded, and the slot
// can be built on again.
export function damageTurret(game, turret, damage) {
  if (!game.turrets.includes(turret)) return;
  turret.hp -= damage;
  turret.lastHitTime = game.combatTime;
  events.emit('turretHit', { x: turret.x, y: turret.y });
  if (turret.hp > 0) return;
  game.turrets = game.turrets.filter((t) => t !== turret);
  wallFalls(game, turret); // M6d §2.5: its wall falls and doesn't regrow
  game.wrecks.push({ slotIndex: turret.slotIndex, x: turret.x, y: turret.y, type: turret.type, seed: turret.id });
  game.debris.push({ x: turret.x, y: turret.y, seed: turret.id, age: 0 });
  game.turretsWrecked++;
  events.emit('turretWrecked', { slotIndex: turret.slotIndex, x: turret.x, y: turret.y });
}
