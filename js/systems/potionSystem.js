// Potions in battle (Potions addendum §3.3, §4, §5): using a belt slot's potion in Prep or Combat, the
// shared cooldown, and the self potions' effects (phase 3). A used potion is gone from the run's belt
// at once, leaving its slot empty for the rest of the battle (the inventory never refills it mid-battle).
//
// Timed effects are explicit state on game, one per potion (§4.3: never stacking with itself):
//   game.potionEffects: { potionId: { key, duration, until, nextTick } }
//     key: the potion-tier whose numbers apply (the higher tier on a repeat)
//     until: combat time it ends; null while queued in Prep (§4.2: its timer starts with Combat)
//     nextTick: Regeneration's next heal, Thorn Aura's next damage, Rootgrip's next pulse (combat time)
// Self effects with a stat (Wards, Fury, Quickening) are timed stat modifiers: game.stats is resolved
// again (equipment, then the active potions) whenever one starts or ends. Auras (phase 4) work on every
// enemy within their radius of the Druid's home. Thrown flasks (phase 5) fly to a spot and break there:
//   game.flasks: [{ key, from, to, age, flight }] in flight (Combat time; the effect lands on arrival)
//   game.potionFields: [{ key, id, x, y, radius, born, until, nextTick }] what a broken flask leaves on
//     the ground: Firebomb's fire, Sporecap's cloud, Tanglevine's vines, Acid's splash (the last two
//     only for drawing). All effects end with the battle.

import * as C from '../config.js';
import { GameState } from '../states.js';
import { events } from '../events.js';
import { addFloatingText } from '../effects.js';
import { resolveStats } from '../stats.js';
import { potionRow, isPotionWorking } from '../potions.js';
import { isStepMode } from './stepSystem.js';
import { damageEnemy } from './combatSystem.js';
import { applySlowAtLeast, applyRoot, applyConfuse, isConfused, applyCorrode } from './statusSystem.js';

// The states the battle belt shows in (greyed outside Prep and Combat).
const BELT_STATES = [GameState.PREP, GameState.COMBAT, GameState.ENDING, GameState.VICTORY, GameState.DEFEAT];

// Potions whose effect lasts a while (Cleansing: its venom ward, when its tier has one).
const TIMED = ['regeneration', 'cleansing', 'wardBark', 'wardVenom', 'fury', 'quickening', 'burrowcall', 'mireAura', 'rootgripAura', 'bewilderAura', 'thornAura'];
export const AURAS = ['mireAura', 'rootgripAura', 'bewilderAura', 'thornAura'];

// s after an effect starts that its first tick comes (Rootgrip pulses at once, then every ROOTGRIP_INTERVAL).
const firstTick = (id) => (id === 'rootgripAura' ? 0 : C.POTION_TICK_INTERVAL);

const EPS = 1e-9;

export function isBeltShown(game) {
  return !!game.run?.hasPotions && BELT_STATES.includes(game.state);
}

// Why the potion in this slot can't be used now, or null if it can (§3.3 greyed sockets).
export function potionUseBlocker(game, slot) {
  const key = game.run?.belt[slot];
  if (!key) return 'Empty slot';
  const p = potionRow(key);
  if (game.state !== GameState.PREP && game.state !== GameState.COMBAT) return 'Not now';
  if (p.use === 'auto') return 'Used by itself when needed';
  if (!isPotionWorking(key)) return 'Not in the game yet';
  if (p.use === 'prepOnly' && game.state === GameState.COMBAT) return 'Only in Prep';
  if (p.use === 'throw' && game.state !== GameState.COMBAT) return 'Only in Combat';
  if (game.state === GameState.COMBAT && game.potionCooldown > 0) return 'Wait for the cooldown';
  if (p.id === 'healing' && game.druidHp >= game.stats['druid.maxHp']) return 'Already at full HP';
  if (p.id === 'foresight' && !isStepMode(game)) return 'Only with a step budget';
  if (p.id === 'cleansing' && !(p.amount > 0) && !game.druidVenom) return 'You are not poisoned';
  return null;
}

// s an effect of this potion-tier lasts (Cleansing: its `amount` s of venom ward).
function effectDuration(p) {
  return p.id === 'cleansing' ? p.amount : p.duration;
}

// Whether a potion's timed effect is running now (not just queued in Prep).
export function isEffectActive(game, potionId) {
  const e = game.potionEffects?.[potionId];
  return !!e && e.until !== null;
}

// The effect's potion-tier row while it runs, else null.
export function activeEffectRow(game, potionId) {
  return isEffectActive(game, potionId) ? potionRow(game.potionEffects[potionId].key) : null;
}

// The active and queued effects for the HUD icons: [{ key, left (s), queued }], in the tab's order.
export function effectIcons(game) {
  return Object.values(game.potionEffects ?? {})
    .map((e) => ({ key: e.key, queued: e.until === null, left: e.until === null ? e.duration : Math.max(0, e.until - game.combatTime) }))
    .sort((a, b) => C.POTION_IDS.indexOf(potionRow(a.key).id) - C.POTION_IDS.indexOf(potionRow(b.key).id));
}

// game.stats again: equipment (resolveStats), Foresight's extra steps, then every active self effect.
export function refreshPotionStats(game) {
  const s = resolveStats(game.run?.equipped, game.scene.level);
  s['steps.budget'] += game.foresightSteps ?? 0;
  for (const id of Object.keys(game.potionEffects ?? {})) {
    const p = activeEffectRow(game, id);
    if (!p) continue;
    if (id === 'wardBark') s['druid.damageTakenMult'] *= Math.max(0, 1 - p.amount / 100);
    if (id === 'wardVenom') s['druid.venomTakenMult'] *= Math.max(0, 1 - p.amount / 100);
    if (id === 'fury') s['druid.strikeDamageMult'] *= p.amount;
    if (id === 'quickening') s['druid.strikeIntervalMult'] /= p.amount;
  }
  game.stats = s;
}

// §4.3: drinking a potion whose effect is already on restarts its timer with the higher tier's numbers.
function startEffect(game, key) {
  const p = potionRow(key);
  const old = game.potionEffects[p.id];
  const best = old && potionRow(old.key).rank > p.rank ? old.key : key;
  const duration = effectDuration(potionRow(best));
  const combat = game.state === GameState.COMBAT;
  const keepRhythm = combat && old && old.until !== null; // Regeneration keeps its tick rhythm
  game.potionEffects[p.id] = {
    key: best,
    duration,
    until: combat ? game.combatTime + duration : null,
    nextTick: keepRhythm ? old.nextTick : combat ? game.combatTime + firstTick(p.id) : null,
  };
  refreshPotionStats(game);
}

// §4.2: Combat starts: every effect drunk in Prep starts its timer now.
export function startQueuedEffects(game) {
  for (const [id, e] of Object.entries(game.potionEffects)) {
    if (e.until !== null) continue;
    e.until = game.combatTime + e.duration;
    e.nextTick = game.combatTime + firstTick(id);
  }
  refreshPotionStats(game);
}

// §5: all effects end when the battle ends.
export function endPotionEffects(game) {
  game.flasks = [];
  game.potionFields = [];
  if (!Object.keys(game.potionEffects ?? {}).length) return;
  game.potionEffects = {};
  refreshPotionStats(game);
}

function healDruid(game, amount) {
  const before = game.druidHp;
  game.druidHp = Math.min(game.stats['druid.maxHp'], game.druidHp + amount);
  const healed = game.druidHp - before;
  if (healed > 0) addFloatingText(game, `+${Number(healed.toFixed(1))}`, game.druidPos.x, game.druidPos.y - C.DRUID_RADIUS * 2.2, false, false, C.HEAL_TEXT_COLOR);
}

// Uses the potion in a belt slot (click or keys 1-5); false if it can't be used now.
export function usePotion(game, slot) {
  if (potionUseBlocker(game, slot) || isThrowSlot(game, slot)) return false;
  const key = game.run.belt[slot];
  const p = potionRow(key);
  game.run.belt[slot] = null;
  // §4.1: the shared cooldown, in Combat only (none in Prep); auto potions never start it.
  if (game.state === GameState.COMBAT) game.potionCooldown = C.POTION_COOLDOWN;
  if (p.id === 'healing') healDruid(game, p.amount);
  if (p.id === 'cleansing') game.druidVenom = null; // removed at once, in Prep or Combat
  if (p.id === 'foresight') {
    game.foresightSteps += p.amount;
    game.stepsRemaining += p.amount;
    refreshPotionStats(game);
    addFloatingText(game, `+${p.amount} ${p.amount === 1 ? 'step' : 'steps'}`, game.druidPos.x, game.druidPos.y - C.DRUID_RADIUS * 2.2, false, false, C.HEAL_TEXT_COLOR);
  }
  if (TIMED.includes(p.id) && effectDuration(p) > 0) startEffect(game, key);
  events.emit('potionUsed', { key, slot });
  return true;
}

// Whether the slot holds a flask to throw (§4.4: it needs a spot, so a click or key starts aiming).
export function isThrowSlot(game, slot) {
  const key = game.run?.belt[slot];
  return !!key && potionRow(key).use === 'throw';
}

// §4.4: throws the flask in a belt slot at a spot (any distance). It flies from the Druid and breaks
// on arrival (FLASK_FLIGHT_TIME s later). Starts the shared cooldown. false if it can't be thrown now.
export function throwPotion(game, slot, at) {
  if (!isThrowSlot(game, slot) || potionUseBlocker(game, slot)) return false;
  const key = game.run.belt[slot];
  game.run.belt[slot] = null;
  game.potionCooldown = C.POTION_COOLDOWN;
  const from = { x: game.druidPos.x, y: game.druidPos.y - C.DRUID_RADIUS };
  game.flasks.push({ key, from, to: { x: at.x, y: at.y }, age: 0, flight: C.FLASK_FLIGHT_TIME });
  events.emit('potionUsed', { key, slot });
  return true;
}

// The enemies a flask reaches: every one whose body is within `radius` of the spot.
function enemiesNear(game, x, y, radius) {
  return game.enemies.filter((en) => Math.hypot(en.x - x, en.y - y) <= radius + en.radius);
}

// A flask breaks where it lands (§5): Acid corrodes and Tanglevine roots whoever is there at once;
// Firebomb and Sporecap leave a patch that works while it lasts (updateFields).
function breakFlask(game, f) {
  const p = potionRow(f.key);
  const now = game.combatTime;
  const near = enemiesNear(game, f.to.x, f.to.y, p.radius);
  if (p.id === 'acidFlask') {
    const mult = 1 + p.amount / 100;
    for (const en of near) {
      const old = en.statuses.corroded;
      if (old && old.mult > mult && old.until >= now + p.duration) continue; // never weakens a stronger one
      applyCorrode(game, en, Math.max(mult, old?.mult ?? 0), p.duration);
    }
  }
  if (p.id === 'tanglevineFlask') for (const en of near) applyRoot(game, en, p.amount);
  const life = p.id === 'acidFlask' ? C.ACID_SPLASH_TIME : p.duration;
  game.potionFields.push({ key: f.key, id: p.id, x: f.to.x, y: f.to.y, radius: p.radius, born: now, until: now + life, nextTick: now + C.POTION_TICK_INTERVAL });
  events.emit('flaskBroke', { key: f.key, x: f.to.x, y: f.to.y });
}

// Each Combat step: flasks in flight, and the patches broken flasks left.
//   Firebomb: every enemy inside takes `amount` damage a second, in POTION_TICK_INTERVAL ticks
//   Sporecap: every enemy inside is Confused for `amount` s, refreshed while it stays inside
function updateFlasks(game, dt) {
  for (const f of game.flasks) {
    f.age += dt;
    if (f.age >= f.flight - EPS) breakFlask(game, f);
  }
  game.flasks = game.flasks.filter((f) => f.age < f.flight - EPS);
  const now = game.combatTime;
  for (const field of game.potionFields) {
    const p = potionRow(field.key);
    if (p.id === 'sporecapFlask') for (const en of enemiesNear(game, field.x, field.y, p.radius)) applyConfuse(game, en, p.amount);
    if (p.id === 'firebomb') {
      while (field.nextTick <= field.until + EPS && now >= field.nextTick - EPS) {
        field.nextTick += C.POTION_TICK_INTERVAL;
        for (const en of enemiesNear(game, field.x, field.y, p.radius)) {
          if (game.enemies.includes(en)) damageEnemy(game, en, p.amount * C.POTION_TICK_INTERVAL, `potion:${p.id}`);
        }
      }
    }
  }
  game.potionFields = game.potionFields.filter((field) => now < field.until - EPS);
}

// Phoenix (§5, auto): the Druid's HP would reach 0 in Combat, so the first Phoenix in a belt slot is
// used instead: he stays at its `amount` HP and takes no damage for PHOENIX_IMMUNE_TIME s. Once per
// battle; ignores the shared cooldown and doesn't start it. Returns whether he was saved.
export function savedByPhoenix(game) {
  if (game.state !== GameState.COMBAT || game.phoenixUsed || !game.run) return false;
  const slot = game.run.belt.findIndex((k) => k && potionRow(k).id === 'phoenix');
  if (slot < 0) return false;
  const key = game.run.belt[slot];
  game.run.belt[slot] = null;
  game.phoenixUsed = true;
  game.druidHp = Math.min(game.stats['druid.maxHp'], potionRow(key).amount);
  game.druidImmuneUntil = game.combatTime + C.PHOENIX_IMMUNE_TIME;
  const home = game.scene.level.druidPos;
  game.phoenixBursts.push({ x: home.x, y: home.y, age: 0 });
  addFloatingText(game, `+${Math.round(game.druidHp)}`, home.x, home.y - C.DRUID_RADIUS * 2.2, false, false, C.HEAL_TEXT_COLOR);
  events.emit('potionUsed', { key, slot, auto: true });
  return true;
}

// Whether the Druid takes no damage now (after a Phoenix save).
export function isDruidImmune(game) {
  return game.state === GameState.COMBAT && game.combatTime < (game.druidImmuneUntil ?? -Infinity);
}

// Combat time only (fixed timestep, so game speed applies): the shared cooldown, Regeneration's
// ticks, and effects running out.
export function updatePotions(game, dt) {
  if (game.potionCooldown > 0) game.potionCooldown = Math.max(0, game.potionCooldown - dt);
  updateFlasks(game, dt);
  let ended = false;
  for (const [id, e] of Object.entries(game.potionEffects)) {
    if (e.until === null) continue;
    if (id === 'regeneration') {
      const p = potionRow(e.key);
      while (e.nextTick <= e.until + EPS && game.combatTime >= e.nextTick - EPS && game.druidHp > 0) {
        e.nextTick += C.POTION_TICK_INTERVAL;
        healDruid(game, p.amount * C.POTION_TICK_INTERVAL);
      }
    }
    if (AURAS.includes(id)) updateAura(game, id, e);
    if (game.combatTime >= e.until - EPS) {
      delete game.potionEffects[id];
      ended = true;
    }
  }
  if (ended) refreshPotionStats(game);
}

// The enemies an aura reaches: every one whose body is within its radius of the Druid's home.
function enemiesInAura(game, radius) {
  const home = game.scene.level.druidPos;
  return game.enemies.filter((en) => Math.hypot(en.x - home.x, en.y - home.y) <= radius + en.radius);
}

// §5 auras, each Combat step while it lasts:
//   Mire: every enemy inside is Slowed by `amount` % while inside (never weakening a stronger slow)
//   Rootgrip: a pulse at once and every ROOTGRIP_INTERVAL s roots every enemy inside for `amount` s
//   Bewildering: an enemy inside is Confused for `amount` s, each at most once per BEWILDER_REPEAT s
//   Thorn: every enemy inside takes `amount` damage a second, in POTION_TICK_INTERVAL ticks
function updateAura(game, id, e) {
  const p = potionRow(e.key);
  const now = game.combatTime;
  if (id === 'mireAura') {
    for (const en of enemiesInAura(game, p.radius)) applySlowAtLeast(game, en, 1 - p.amount / 100, C.SIM_STEP * 2);
  }
  if (id === 'rootgripAura') {
    while (e.nextTick <= e.until + EPS && now >= e.nextTick - EPS) {
      e.nextTick += C.ROOTGRIP_INTERVAL;
      for (const en of enemiesInAura(game, p.radius)) applyRoot(game, en, p.amount);
      const home = game.scene.level.druidPos;
      game.auraPulses.push({ x: home.x, y: home.y, radius: p.radius, color: C.POTION_LIQUID[p.id], age: 0 });
    }
  }
  if (id === 'bewilderAura') {
    for (const en of enemiesInAura(game, p.radius)) {
      if (isConfused(en) || now - (en.bewilderedAt ?? -Infinity) < C.BEWILDER_REPEAT - EPS) continue;
      if (applyConfuse(game, en, p.amount)) en.bewilderedAt = now;
    }
  }
  if (id === 'thornAura') {
    while (e.nextTick <= e.until + EPS && now >= e.nextTick - EPS) {
      e.nextTick += C.POTION_TICK_INTERVAL;
      for (const en of enemiesInAura(game, p.radius)) {
        if (game.enemies.includes(en)) damageEnemy(game, en, p.amount * C.POTION_TICK_INTERVAL, `potion:${p.id}`);
      }
    }
  }
}

// The auras round the Druid now, for drawing: [{ id, radius, color, fade (1, falling to 0 over its last AURA_FADE_TIME s) }].
export function activeAuras(game) {
  return AURAS.filter((id) => isEffectActive(game, id)).map((id) => {
    const e = game.potionEffects[id];
    const p = potionRow(e.key);
    return { id, radius: p.radius, color: C.POTION_LIQUID[id], fade: Math.min(1, Math.max(0, (e.until - game.combatTime) / C.AURA_FADE_TIME)) };
  });
}
