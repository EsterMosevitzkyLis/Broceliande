// The Vale's mini-bosses (M6b §5), on top of the shared mini-boss rules (boss bar, banner, corridor
// check, melee slots, keeping to one side, unstick rule).
//   The Broodmother (§5.1–§5.2): every BROOD_EGG_INTERVAL s (a Grim's GRIM_BROOD_EGG_INTERVAL) she
//     lays an egg sac on her lane just behind her: an enemy of its own (BROOD_EGG_TYPE, role 'egg',
//     stationary), so turrets, summons and the HUD treat it like any other, but it never moves,
//     blocks or attacks. BROOD_HATCH_TIME s after it is laid it hatches into BROOD_HATCH_COUNT (a
//     Grim's GRIM_BROOD_HATCH_COUNT) spiders, unless destroyed first. She lays none until she is
//     BROOD_EGG_MIN_DIST px into her lane, nor within BROOD_EGG_SPACING px of another sac: when due
//     but held back she waits and lays as soon as she can. Any egg sac hatches, however it came
//     (the debug Spawn enemy too).
//   The High-Shaman (§5.3): every HIGH_SHAMAN_PULSE_INTERVAL s a relic pulse shields every lizardfolk
//     within HIGH_SHAMAN_RANGE (and himself, more strongly); lizardfolk within that range (not he)
//     move HIGH_SHAMAN_AURA_SPEED × faster (enemy.auraMult, read by moveMult in enemy.js).

import * as C from '../config.js';
import { createEnemy, enemyType, laneWorldPos, maxOffset } from '../entities/enemy.js';
import { applyShield } from './statusSystem.js';
import { isLizardfolk } from './shamanSystem.js';
import { events } from '../events.js';

const TIMER_EPSILON = 1e-9;

const isBroodmother = (e) => enemyType(e).baseType === 'broodmother';
const isHighShaman = (e) => enemyType(e).baseType === 'highShaman';
const isEgg = (e) => enemyType(e).role === 'egg';

export function updateValeBosses(game, dt) {
  for (const mother of game.enemies.filter(isBroodmother)) {
    const grim = enemyType(mother).variant === 'grim';
    mother.layTimer = (mother.layTimer ?? 0) + dt;
    if (mother.layTimer >= (grim ? C.GRIM_BROOD_EGG_INTERVAL : C.BROOD_EGG_INTERVAL) - TIMER_EPSILON
      && layEgg(game, mother)) mother.layTimer = 0;
  }
  for (const egg of game.enemies.filter(isEgg)) {
    egg.eggAge = (egg.eggAge ?? 0) + dt;
    if (egg.eggAge >= C.BROOD_HATCH_TIME - TIMER_EPSILON) hatch(game, egg);
  }
  // The aura: worked out afresh each step (one step behind the movement, which is fine).
  const shamans = game.enemies.filter(isHighShaman);
  for (const e of game.enemies) {
    const near = isLizardfolk(e) && shamans.some((s) => s !== e && Math.hypot(s.x - e.x, s.y - e.y) <= C.HIGH_SHAMAN_RANGE);
    e.auraMult = near ? C.HIGH_SHAMAN_AURA_SPEED : 1;
  }
  for (const s of shamans) {
    s.pulseTimer = (s.pulseTimer ?? 0) + dt;
    if (s.pulseTimer >= C.HIGH_SHAMAN_PULSE_INTERVAL - TIMER_EPSILON) {
      s.pulseTimer = 0;
      relicPulse(game, s);
    }
  }
}

// An egg sac on her lane just behind her (never before the lane's start), on her side of it.
// Returns false (no sac) while she is too near the lane's start or the spot is too near another sac.
function layEgg(game, mother) {
  if (mother.s < C.BROOD_EGG_MIN_DIST) return false;
  const type = C.BROOD_EGG_TYPE[mother.type] ?? 'broodEgg';
  const lane = mother.lane;
  const s = Math.max(0, mother.s - mother.collisionRadius - C.EGG_LAY_GAP);
  const max = maxOffset(type, lane);
  const offset = Math.max(-max, Math.min(max, mother.offset));
  const pos = laneWorldPos(lane, s, offset);
  if (game.enemies.some((e) => isEgg(e) && Math.hypot(e.x - pos.x, e.y - pos.y) < C.BROOD_EGG_SPACING)) return false;
  const egg = createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']);
  egg.s = s;
  Object.assign(egg, pos);
  egg.eggAge = 0;
  egg.laidBy = mother.id;
  game.enemies.push(egg);
  game.enemyCounts[type].spawned++;
  game.enemyCounts[type].alive++;
  mother.layAt = game.combatTime; // her abdomen dips (drawing)
  events.emit('eggLaid', { x: egg.x, y: egg.y });
  return true;
}

// The sac splits and its spiders spread out round it, on its lane, walking on from there.
function hatch(game, egg) {
  const grim = enemyType(egg).variant === 'grim';
  const n = grim ? C.GRIM_BROOD_HATCH_COUNT : C.BROOD_HATCH_COUNT;
  game.enemies = game.enemies.filter((e) => e !== egg);
  game.enemyCounts[egg.type].alive--;
  const type = C.BROOD_HATCH_TYPE;
  const lane = egg.lane;
  const max = maxOffset(type, lane);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const s = Math.min(lane.path.length - 1, Math.max(0, egg.s + Math.cos(a) * C.EGG_HATCH_SPREAD));
    const offset = Math.max(-max, Math.min(max, egg.offset + Math.sin(a) * C.EGG_HATCH_SPREAD));
    const spider = createEnemy(game.nextEntityId++, type, lane, offset, game.rng, game.stats['enemy.hpMult']);
    spider.s = s;
    Object.assign(spider, laneWorldPos(lane, s, offset));
    game.enemies.push(spider);
    game.enemyCounts[type].spawned++;
    game.enemyCounts[type].alive++;
  }
  game.eggHatches.push({ x: egg.x, y: egg.y, seed: egg.id, grim, age: 0 });
  events.emit('eggHatched', { x: egg.x, y: egg.y });
}

function relicPulse(game, shaman) {
  for (const e of game.enemies) {
    if (e === shaman || !isLizardfolk(e) || Math.hypot(e.x - shaman.x, e.y - shaman.y) > C.HIGH_SHAMAN_RANGE) continue;
    applyShield(game, e, C.HIGH_SHAMAN_PULSE_SHIELD, C.HIGH_SHAMAN_SHIELD_DURATION);
  }
  applyShield(game, shaman, C.HIGH_SHAMAN_SELF_SHIELD, C.HIGH_SHAMAN_SHIELD_DURATION);
  shaman.pulseAt = game.combatTime; // the relic flares (drawing)
  game.relicPulses.push({ x: shaman.x, y: shaman.y, age: 0 });
  events.emit('relicPulse', { x: shaman.x, y: shaman.y });
}
