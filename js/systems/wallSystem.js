// The Scale Bulwark's wall (M6d §2): where a wall may stand (wall placement mode: the reach, the lit
// lanes, the ghost wall and its reasons), and the wall itself, which lives on its emitter turret
// (turret.wall): it holds ground enemies at its face, is attacked by them (thorns at level 5), breaks,
// and regrows while the emitter stands.
//
// A placement (chosen before building): { laneId, s, x, y, tx, ty } — the lane, distance along it,
// the centreline point and the lane's direction there; the wall spans the corridor at right angles.
// turret.wall: the placement plus { id, isWall, turretId, crossings: [{ laneId, s }] (every lane whose
//   corridor it spans), half (its half length), up, hp, regrowIn (s left while broken), riseAge (s
//   since it rose; below WALL_RISE_TIME it is still rising), lastHitTime }.

import * as C from '../config.js';
import { GameState, ActionState } from '../states.js';
import { EnemyState, laneWorldPos } from '../entities/enemy.js';
import { isWallType, wallStats, wallReach } from '../entities/turret.js';
import { damageEnemy } from './combatSystem.js';
import { events } from '../events.js';

const STAGE_MARGIN = 20; // px a wall must keep inside the battlefield's edges
const STOP_SLACK = 2;    // px before its face where an enemy counts as at the wall (a step is ~1 px)

const half = (game, laneId) => game.lanes.find((l) => l.id === laneId).corridorWidth / 2;

// ---------------------------------------------------------------------------
// Placement (§2.4)
// ---------------------------------------------------------------------------

// The parts of lane centrelines inside the reach of a slot: [{ laneId, points: [{ x, y, s }] }],
// one entry per unbroken run.
export function litLanes(game, slotIndex, type) {
  const slot = game.slots[slotIndex];
  const reach = wallReach(type);
  const runs = [];
  for (const lane of game.lanes) {
    let run = null;
    for (const p of lane.path.points) {
      if (Math.hypot(p.x - slot.x, p.y - slot.y) <= reach) {
        if (!run) runs.push(run = { laneId: lane.id, points: [] });
        run.points.push(p);
      } else {
        run = null;
      }
    }
  }
  return runs;
}

// The walls already standing or on their way (a Druid's build or travel, a Double's job), as placements.
export function plannedWalls(game) {
  const walls = game.turrets.filter((t) => t.wall).map((t) => t.wall);
  for (const d of game.doubles ?? []) if (d.wall) walls.push(d.wall);
  if (game.action.wall && (game.action.state === ActionState.BUILDING || game.action.state === ActionState.TRAVELLING)) walls.push(game.action.wall);
  return walls;
}

// The wall position nearest p inside the slot's reach, on the nearest lane: a placement with
// { valid, reason } (the reason an invalid one shows), or null if no lane is in reach.
export function wallPlacementAt(game, slotIndex, type, p) {
  const slot = game.slots[slotIndex];
  const reach = wallReach(type);
  let best = null;
  for (const lane of game.lanes) {
    let q = lane.path.closestPoint(p);
    if (Math.hypot(q.x - slot.x, q.y - slot.y) > reach) {
      // Its nearest point is out of reach: the nearest of its points that are in reach.
      q = null;
      for (const pt of lane.path.points) {
        if (Math.hypot(pt.x - slot.x, pt.y - slot.y) > reach) continue;
        const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (!q || dist < q.dist) q = { x: pt.x, y: pt.y, s: pt.s, dist };
      }
    }
    if (q && (!best || q.dist < best.q.dist)) best = { lane, q };
  }
  if (!best) return null;
  const { lane, q } = best;
  const t = lane.path.tangentAt(q.s);
  const spot = { laneId: lane.id, s: q.s, x: q.x, y: q.y, tx: t.x, ty: t.y };
  return { ...spot, ...placementProblem(game, spot) };
}

// §2.4's rules: inside the field, WALL_MIN_GAP along the lane from any other wall (or that far
// apart where they are on different lanes), and WALL_DRUID_CLEARANCE from the Druid.
function placementProblem(game, spot) {
  const bad = (reason) => ({ valid: false, reason });
  if (spot.x < STAGE_MARGIN || spot.x > C.STAGE_WIDTH - STAGE_MARGIN || spot.y < C.HUD_STRIP_HEIGHT + STAGE_MARGIN || spot.y > C.STAGE_HEIGHT - STAGE_MARGIN) return bad('Off the field');
  const druid = game.scene.level.druidPos;
  if (Math.hypot(spot.x - druid.x, spot.y - druid.y) < C.WALL_DRUID_CLEARANCE) return bad('Too close to the Druid');
  for (const w of plannedWalls(game)) {
    const along = crossingsOf(game, w).find((c) => c.laneId === spot.laneId);
    const gap = along ? Math.abs(along.s - spot.s) : Math.hypot(w.x - spot.x, w.y - spot.y);
    if (gap < C.WALL_MIN_GAP) return bad('Too close to another wall');
  }
  return { valid: true, reason: '' };
}

// Every lane whose corridor the wall at a placement spans (its own lane, and any lane running
// through the same ground there): where along each one it stands.
function crossingsOf(game, spot) {
  if (spot.crossings) return spot.crossings;
  const out = [];
  for (const lane of game.lanes) {
    if (lane.id === spot.laneId) { out.push({ laneId: lane.id, s: spot.s }); continue; }
    const q = lane.path.closestPoint(spot);
    if (q.dist <= lane.corridorWidth / 2) out.push({ laneId: lane.id, s: q.s });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The wall (§2.5)
// ---------------------------------------------------------------------------

// A new wall for a Scale Bulwark turret just built: it rises at once (pushing back anything inside).
export function createWall(game, turret, spot) {
  const wall = {
    ...spot, id: game.nextEntityId++, isWall: true, turretId: turret.id,
    crossings: crossingsOf(game, spot), half: half(game, spot.laneId),
    up: true, hp: wallStats(turret.type, turret.level).hp, regrowIn: 0, riseAge: 0, lastHitTime: -Infinity,
  };
  events.emit('wallRisen', { x: wall.x, y: wall.y });
  return wall;
}

export function wallMaxHp(turret) {
  return wallStats(turret.type, turret.level).hp;
}

// The standing wall with this id, or null.
export function wallById(game, id) {
  for (const t of game.turrets) if (t.wall?.id === id && t.wall.up) return t.wall;
  return null;
}

// The standing wall holding a ground enemy up, or null: one across its lane whose face it has
// reached and not yet passed. Flyers pass over (§2.5); egg sacs never move.
export function wallAhead(game, enemy) {
  if (enemy.flying || enemy.stationary || enemy.state !== EnemyState.WALKING) return null;
  for (const t of game.turrets) {
    const w = t.wall;
    if (!w?.up) continue;
    for (const c of w.crossings) {
      if (c.laneId !== enemy.lane.id) continue;
      const face = c.s - C.WALL_THICKNESS / 2 - enemy.collisionRadius;
      if (enemy.s >= face - STOP_SLACK && enemy.s <= c.s + C.WALL_THICKNESS / 2) return w;
    }
  }
  return null;
}

// An attacker's hit on a wall: HP off; level 5's thorns hurt the attacker back (§2.6); at 0 it breaks.
export function damageWall(game, wall, damage, attacker = null) {
  const turret = game.turrets.find((t) => t.id === wall.turretId);
  if (!wall.up || !turret) return;
  wall.hp -= damage;
  wall.lastHitTime = game.combatTime;
  events.emit('wallHit', { x: wall.x, y: wall.y });
  const thorns = wallStats(turret.type, turret.level).thornsRatio;
  if (thorns > 0 && attacker && game.enemies.includes(attacker)) {
    game.thornPricks.push({ x: attacker.x, y: attacker.y - attacker.radius, age: 0 });
    damageEnemy(game, attacker, damage * thorns, 'thorns');
  }
  if (wall.hp <= 0) breakWall(game, turret);
}

// The wall breaks: a crumble of scale pieces and a dry crack; it regrows after wallRegrow s.
function breakWall(game, turret) {
  const w = turret.wall;
  w.up = false;
  w.hp = 0;
  w.regrowIn = wallStats(turret.type, turret.level).regrow;
  crumble(game, w);
  events.emit('wallBroken', { x: w.x, y: w.y });
}

function crumble(game, w) {
  game.wallCrumbles.push({ x: w.x, y: w.y, tx: w.tx, ty: w.ty, half: w.half, seed: w.id, age: 0 });
}

// The emitter was destroyed (buildSystem.js damageTurret): its wall falls and never regrows.
export function wallFalls(game, turret) {
  if (!turret.wall) return;
  if (turret.wall.up) {
    crumble(game, turret.wall);
    events.emit('wallBroken', { x: turret.wall.x, y: turret.wall.y });
  }
  turret.wall = null;
}

// An upgrade raised the emitter's level: a standing wall gains the difference in max HP (no full heal).
export function raiseWallLevel(turret, maxBefore) {
  if (turret.wall?.up) turret.wall.hp += wallMaxHp(turret) - maxBefore;
}

// Before blocking each step: a broken wall counts down to regrowing (not while a Double upgrades or
// repairs its emitter), and a rising wall pushes the ground enemies inside it back to its near side.
export function updateWalls(game, dt) {
  for (const t of game.turrets) {
    const w = t.wall;
    if (!w) continue;
    if (!w.up) {
      const job = game.doubles.find((d) => d.slotIndex === t.slotIndex)?.job;
      if (job === 'upgrade' || job === 'repair') continue;
      w.regrowIn -= dt;
      if (w.regrowIn > 0) continue;
      w.up = true;
      w.hp = wallMaxHp(t);
      w.riseAge = 0;
      events.emit('wallRisen', { x: w.x, y: w.y });
    }
    if (w.riseAge < C.WALL_RISE_TIME) pushBack(game, w, dt);
    w.riseAge += dt;
  }
}

// §2.5: "pushes them gently back along the lane to its far side (the side they came from)", over
// what is left of the rise.
function pushBack(game, w, dt) {
  const left = Math.max(dt, C.WALL_RISE_TIME - w.riseAge);
  for (const e of game.enemies) {
    if (e.flying || e.stationary || e.state !== EnemyState.WALKING) continue;
    const c = w.crossings.find((x) => x.laneId === e.lane.id);
    if (!c) continue;
    const face = c.s - C.WALL_THICKNESS / 2 - e.collisionRadius;
    if (e.s <= face || e.s > c.s + C.WALL_THICKNESS / 2 + e.collisionRadius) continue;
    e.s -= (e.s - face) * Math.min(1, dt / left);
    const p = laneWorldPos(e.lane, e.s, e.offset);
    e.x = p.x;
    e.y = p.y;
  }
}

// Whether a wall placement mode (view.wallPlacement) can carry on: a Prep build while the Druid isn't
// travelling, or a Bough Double's build while it is still targeting.
export function wallPlacementOpen(game, placing) {
  if (!placing || !isWallType(placing.type)) return false;
  if (placing.via === 'double') return game.state === GameState.COMBAT && game.action.state === ActionState.SUMMON_PLACEMENT && game.action.target === 'double';
  return game.state === GameState.PREP && game.action.state !== ActionState.TRAVELLING;
}
