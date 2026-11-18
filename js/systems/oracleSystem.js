// The Iron Oracle (M6b §6), the Vale's final boss, and his relic pylons.
//   Pylons: one per landmark:relicPylon in the level's map file, made at encounter start
//     (game.pylons). Not enemies (they don't count for "Enemies left" or the waves): stationary
//     targets with PYLON_HP (not scaled by enemyHpMult) and PYLON_ARMOR. Turrets aim at one only when no enemy
//     is in their range, Vultures only when there is no enemy at all (combatSystem.js,
//     vultureSystem.js). A broken one stays as a stump.
//   On his perch (stage 1): his spawn puts him ORACLE_PERCH_DIST along his lane, standing still
//     (stationary: he blocks nothing) and bound: nothing can hurt or target him while any pylon
//     stands. Arriving where no pylon stands at all, he comes down at once.
//   Iron Call: every ORACLE_CALL_INTERVAL s, on his perch or not, every lizardfolk on the map gains
//     an ORACLE_CALL_SHIELD shield, then ORACLE_CALL_SPAWNS lizardmen appear at his lane's entrance.
//   The descent (stage 2): when the last pylon falls his ward shatters and he walks down his lane
//     like the Bog King (melee, wind-up, screen shake), still calling.

import * as C from '../config.js';
import { createEnemy, enemyType, laneWorldPos, maxOffset } from '../entities/enemy.js';
import { applyShield } from './statusSystem.js';
import { isLizardfolk } from './shamanSystem.js';
import { events } from '../events.js';

const TIMER_EPSILON = 1e-9;

export const isOracle = (e) => enemyType(e).baseType === 'ironOracle';
export const standingPylons = (game) => (game.pylons ?? []).filter((p) => !p.broken);

// Where a pylon's glowing core is (its link to the Oracle starts there), and where the link
// meets him.
export const pylonCore = (p) => ({ x: p.x, y: p.y - p.size * 2.45 });
export const oracleChest = (e) => ({ x: e.x, y: e.y - enemyType(e).hitHeight * 0.75 });

export function createPylons(game) {
  const hp = C.PYLON_HP;
  return game.scene.decor.filter((d) => d.kind === 'relicPylon').map((d) => ({
    id: game.nextEntityId++,
    pylon: true,
    x: d.x,
    y: d.y,
    size: d.size,          // half its base's width (DECOR.landmarkSize × its scale)
    radius: d.size,        // for Vultures landing beside it
    hitHeight: d.size * 2.2, // where pebbles strike it
    hp,
    maxHp: hp,
    broken: false,
    lastHitTime: -Infinity,
    brokenAt: null,
    seed: d.mapIndex,
  }));
}

// A target by id for turrets and Vultures: a living enemy or a standing pylon.
export function targetById(game, id) {
  return game.enemies.find((e) => e.id === id) ?? standingPylons(game).find((p) => p.id === id) ?? null;
}

// The standing pylons within range of (x, y), nearest first.
export function pylonsInRange(game, x, y, range) {
  return standingPylons(game)
    .map((p) => ({ p, d: Math.hypot(p.x - x, p.y - y) }))
    .filter((c) => c.d <= range)
    .sort((a, b) => a.d - b.d)
    .map((c) => c.p);
}

// trySpawn (spawnSystem.js): his spawn puts him on his perch.
export function perchOracle(game, lane, type) {
  const t = C.ENEMY_TYPES[type];
  const offset = (game.rng.next() < 0.5 ? -1 : 1) * Math.max(0, maxOffset(type, lane) - C.SIDE_KEEP_MARGIN);
  const s = Math.min(C.ORACLE_PERCH_DIST, lane.path.length - 1);
  const oracle = createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']);
  oracle.s = s;
  Object.assign(oracle, laneWorldPos(lane, s, offset));
  oracle.callTimer = 0;
  game.enemies.push(oracle);
  game.enemyCounts[type].spawned++;
  game.enemyCounts[type].alive++;
  game.lanePulses.push({ laneId: lane.id, age: 0 });
  events.emit('enemySpawned', { type, lane: lane.id, first: true });
  if (standingPylons(game).length) {
    oracle.bound = true;
    oracle.stationary = true;
    game.bossAnnouncement = { text: t.banner ?? `${t.name} appears!`, age: 0 };
  } else if (game.pylons.length) {
    release(game, oracle); // every pylon already broken
  } else {
    game.bossAnnouncement = { text: t.banner ?? `${t.name} appears!`, age: 0 }; // a level without pylons (debug)
  }
}

export function updateOracle(game, dt) {
  if (standingPylons(game).length) {
    game.pylonHumTimer = (game.pylonHumTimer ?? 0) + dt;
    if (game.pylonHumTimer >= C.PYLON_HUM_INTERVAL) {
      game.pylonHumTimer -= C.PYLON_HUM_INTERVAL;
      const p = standingPylons(game)[0];
      events.emit('pylonHum', { x: p.x, y: p.y });
    }
  }
  for (const oracle of game.enemies.filter(isOracle)) {
    if (oracle.bound && !standingPylons(game).length) release(game, oracle);
    oracle.callTimer = (oracle.callTimer ?? 0) + dt;
    if (oracle.callTimer >= C.ORACLE_CALL_INTERVAL - TIMER_EPSILON) {
      oracle.callTimer = 0;
      ironCall(game, oracle);
    }
  }
}

function ironCall(game, oracle) {
  for (const e of game.enemies) if (isLizardfolk(e)) applyShield(game, e, C.ORACLE_CALL_SHIELD, C.ORACLE_CALL_SHIELD_DURATION);
  const lane = oracle.lane;
  const type = C.ORACLE_CALL_TYPE;
  const max = maxOffset(type, lane) * 0.7;
  const n = C.ORACLE_CALL_SPAWNS;
  for (let i = 0; i < n; i++) {
    const offset = n > 1 ? -max + (2 * max * i) / (n - 1) : 0;
    const e = createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']);
    e.calledBy = oracle.id;
    game.enemies.push(e);
    game.enemyCounts[type].spawned++;
    game.enemyCounts[type].alive++;
  }
  game.lanePulses.push({ laneId: lane.id, age: 0 });
  oracle.callAt = game.combatTime; // his staff goes up (drawing)
  game.ironCalls.push({ x: oracle.x, y: oracle.y, age: 0 });
  events.emit('ironCall', { x: oracle.x, y: oracle.y });
}

// damagePylon (combatSystem.js): a pylon's HP reached 0. A crack of light, and its link to a
// bound Oracle snaps.
export function pylonFell(game, pylon) {
  pylon.broken = true;
  pylon.brokenAt = game.combatTime;
  game.pylonBreaks.push({ x: pylon.x, y: pylon.y, size: pylon.size, seed: pylon.seed, age: 0 });
  const core = pylonCore(pylon);
  for (const o of game.enemies.filter((e) => isOracle(e) && e.bound)) {
    const chest = oracleChest(o);
    game.linkSnaps.push({ x1: core.x, y1: core.y, x2: chest.x, y2: chest.y, age: 0 });
  }
  events.emit('pylonBroken', { x: pylon.x, y: pylon.y });
}

// The last pylon fell: his ward shatters and he comes down his lane.
function release(game, oracle) {
  oracle.bound = false;
  oracle.stationary = false;
  oracle.releasedAt = game.combatTime;
  const chest = oracleChest(oracle);
  game.shieldShatters.push({ x: chest.x, y: chest.y, r: oracle.radius * 1.2, seed: oracle.id, age: 0 });
  game.bossAnnouncement = { text: C.ORACLE_RELEASE_BANNER, age: 0 };
  events.emit('oracleReleased', { x: oracle.x, y: oracle.y });
}
