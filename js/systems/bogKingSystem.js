// The Bog King (M3b §5): the final boss, an enemy of role 'boss' (it works for any such type).
//   Entrance (§5.3): when his spawn is due, his lane's entrance bubbles and darkens for
//     BOSS_ENTRANCE_TIME, then he rises from the peat there (game.bossEntrances).
//   Raise the drowned (§5.2): every BOG_KING_SUMMON_INTERVAL s on the field he raises up to
//     BOG_KING_SUMMON_COUNT Drowned Thralls in his lane, just ahead of and beside him, keeping at
//     most BOG_KING_SUMMON_MAX of his raised Thralls (and their bodies) about. They are normal Thralls.
//   Sink and resurface (§5.2): the first time his HP falls to half, he sinks into the bog for
//     BOG_KING_SINK_TIME (game.submerged: out of game.enemies, so nothing can damage or target him;
//     every status is cleared), then re-emerges at the start of a different lane (seeded).
// The wave isn't won while one is still to come up or is submerged (waveSystem.js).
// game.bossEntrances: [{ lane, type, timer }]; game.submerged: [{ enemy, timer }]

import * as C from '../config.js';
import { createEnemy, laneWorldPos, maxOffset, enemyType } from '../entities/enemy.js';
import { returnToLane } from './riseSystem.js';
import { events } from '../events.js';

export const isBogKing = (enemy) => enemyType(enemy).role === 'boss';

// trySpawn (spawnSystem.js): his spawn starts the entrance instead of placing him.
export function startEntrance(game, lane, type) {
  game.bossEntrances.push({ lane, type, timer: C.BOSS_ENTRANCE_TIME });
  game.lanePulses.push({ laneId: lane.id, age: 0 });
}

// Each Combat step: entrances, his raising, and resurfacing.
export function updateBogKing(game, dt) {
  for (const en of [...game.bossEntrances]) {
    en.timer -= dt;
    if (en.timer <= 0) {
      game.bossEntrances = game.bossEntrances.filter((x) => x !== en);
      emerge(game, en.lane, en.type);
    }
  }
  for (const king of game.enemies.filter(isBogKing)) {
    king.summonTimer = (king.summonTimer ?? 0) + dt;
    if (king.summonTimer >= C.BOG_KING_SUMMON_INTERVAL) {
      king.summonTimer -= C.BOG_KING_SUMMON_INTERVAL;
      raiseDrowned(game, king);
    }
  }
  for (const sub of [...game.submerged]) {
    sub.timer -= dt;
    if (sub.timer <= 0) resurface(game, sub);
  }
}

function emerge(game, lane, type) {
  const t = C.ENEMY_TYPES[type];
  const offset = t.keepSide ? (game.rng.next() < 0.5 ? -1 : 1) * Math.max(0, maxOffset(type, lane) - C.SIDE_KEEP_MARGIN) : 0;
  const king = createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']);
  king.pullUpAt = game.combatTime; // he rises from the peat (drawing)
  king.summonTimer = 0;
  game.enemies.push(king);
  game.enemyCounts[type].spawned++;
  game.enemyCounts[type].alive++;
  game.bossAnnouncement = { text: t.banner ?? `${t.name} rises!`, age: 0 };
  events.emit('enemySpawned', { type, lane: lane.id, first: true }); // his deep, slow roar
}

// Raised Thralls of his still about: alive, or bodies waiting to rise.
export function raisedCount(game, king) {
  return game.enemies.filter((e) => e.raisedBy === king.id).length + game.bodies.filter((b) => b.enemy.raisedBy === king.id).length;
}

function raiseDrowned(game, king) {
  const n = Math.min(C.BOG_KING_SUMMON_COUNT, C.BOG_KING_SUMMON_MAX - raisedCount(game, king));
  if (n <= 0) return;
  const type = 'thrall'; // Drowned Thralls (§5.2), wherever he is
  const lane = king.lane;
  const side = maxOffset(type, lane) * 0.85;
  // Just ahead of him in the middle, and beside him either side (all within the lane).
  const spots = [[king.radius + 26, 0], [king.radius * 0.3, -side], [king.radius * 0.3, side]];
  for (let i = 0; i < n; i++) {
    const [ahead, offset] = spots[i % spots.length];
    const s = Math.min(lane.path.length - 1, king.s + ahead);
    const thrall = createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']);
    thrall.s = s;
    Object.assign(thrall, laneWorldPos(lane, s, offset));
    thrall.raisedBy = king.id;
    thrall.pullUpAt = game.combatTime; // clawing up out of the ground (drawing)
    game.enemies.push(thrall);
    game.enemyCounts[type].spawned++;
    game.enemyCounts[type].alive++;
  }
  king.summonPoseAt = game.combatTime; // he spreads his arms (drawing)
  events.emit('bogKingSummons', {});
}

// damageEnemy (combatSystem.js): the first time his HP falls to half he sinks instead (with at
// least 1 HP left, so a big hit can't skip it). Returns true if he sank.
export function sinkAtHalf(game, king) {
  if (!isBogKing(king) || king.hasSunk || king.hp > king.maxHp * 0.5) return false;
  king.hp = Math.max(1, king.hp);
  king.hasSunk = true;
  game.enemies = game.enemies.filter((e) => e !== king);
  for (const s of king.slots) game.meleeSlots[s].enemyId = null;
  king.slots = [];
  king.statuses = {}; // slow, burn and Corrosion all washed off
  game.submerged.push({ enemy: king, timer: C.BOG_KING_SINK_TIME });
  events.emit('bogKingSinks', {});
  return true;
}

function resurface(game, sub) {
  game.submerged = game.submerged.filter((x) => x !== sub);
  const king = sub.enemy;
  const others = game.lanes.filter((l) => l !== king.lane);
  const lane = others.length ? others[game.rng.int(0, others.length - 1)] : king.lane;
  const t = enemyType(king);
  const offset = t.keepSide ? Math.sign(king.offset || 1) * Math.max(0, maxOffset(king.type, lane) - C.SIDE_KEEP_MARGIN) : 0;
  king.lane = lane;
  king.s = 0;
  king.offset = offset;
  king.sideOffset = offset;
  king.wanderTarget = offset;
  Object.assign(king, laneWorldPos(lane, 0, offset));
  returnToLane(king);
  king.pullUpAt = game.combatTime;
  game.enemies.push(king);
  game.lanePulses.push({ laneId: lane.id, age: 0 });
  game.bossAnnouncement = { text: `${t.name} resurfaces!`, age: 0 };
  events.emit('bogKingSurfaces', {});
}
