// Short-lived feedback effects (spec §16.3). Aged in simulation time so pause and
// speed apply, but they never affect gameplay.

import * as C from './config.js';
import { updateAshes } from './systems/riseSystem.js';
import { RESOURCE_KEYS } from './resources.js';
import { ageFerns } from './systems/hiddenSpotSystem.js';

// small: drawn at a smaller size (damage numbers on enemies). muted: small grey text ("Nothing found").
// color: its own text colour (venom ticks on the Druid), else the usual one.
export function addFloatingText(game, text, x, y, small = false, muted = false, color = null) {
  game.floatingTexts.push({ text, x, y, age: 0, small, muted, color });
}

// Resource floaters (M2d §1), the one component for every resource gain: one rising icon + "×N"
// per resource gained, in resource order, FLOATER_STAGGER apart, each starting FLOATER_STACK_PX
// higher than the last. Zero amounts are not shown; nothing at all shows "Nothing found".
// Returns how many floaters it launched (so others can follow them, M2e §3.2).
export function addResourceFloaters(game, gained, x, y) {
  const found = RESOURCE_KEYS.filter((k) => (gained[k] ?? 0) > 0);
  if (found.length === 0) {
    addFloatingText(game, 'Nothing found', x, y, true, true);
    return 0;
  }
  found.forEach((resource, i) => {
    game.floaters.push({ resource, amount: gained[resource], x, y: y - i * C.FLOATER_STACK_PX, delay: i * C.FLOATER_STAGGER, age: 0 });
  });
  return found.length;
}

export function updateEffects(game, dt) {
  ageFerns(game, dt); // M6c §1.3–§1.4: ferns parting and clearing
  for (const f of game.floaters) f.age += dt;
  if (game.itemMessage) {
    game.itemMessage.age += dt;
    if (game.itemMessage.age >= C.ITEM_FOUND_TIME) game.itemMessage = null;
  }
  game.floaters = game.floaters.filter((f) => f.age < f.delay + C.FLOATER_TIME);
  for (const t of game.floatingTexts) t.age += dt;
  game.floatingTexts = game.floatingTexts.filter((t) => t.age < C.FLOATING_TEXT_TIME);
  for (const s of game.swipes) s.age += dt;
  game.swipes = game.swipes.filter((s) => s.age < C.DRUID_SWIPE_TIME);
  for (const b of game.wispBursts) b.age += dt; // Slow Wisp bursts (M2k §3.5)
  game.wispBursts = game.wispBursts.filter((b) => b.age < C.WISP_BURST_TIME);
  for (const s of game.sparks) s.age += dt;
  game.sparks = game.sparks.filter((s) => s.age < C.STRIKE_SPARK_TIME);
  // Bough Double effects (M1i §2.7): wood chips and Doubles fading out after a job.
  for (const c of game.chips) c.age += dt;
  game.chips = game.chips.filter((c) => c.age < C.DOUBLE_CHIP_TIME);
  for (const f of game.doubleFades) f.age += dt;
  game.doubleFades = game.doubleFades.filter((f) => f.age < C.DOUBLE_FADE_TIME);
  // Mini-boss feedback (M2c §2.5–2.6): dust rings, screen shake, arrival banner, lane pulses.
  for (const d of game.dustRings) d.age += dt;
  game.dustRings = game.dustRings.filter((d) => d.age < C.OGRE_DUST_TIME);
  updateAshes(game, dt); // M3b §3.1: risers burnt to ash smoulder away
  // Grim trait feedback (M2l §2.2): armor sparks and lifesteal sparkles.
  for (const s of game.armorSparks) s.age += dt;
  game.armorSparks = game.armorSparks.filter((s) => s.age < C.ARMOR_SPARK_TIME);
  for (const b of game.coneBursts) b.age += dt;   // M2o §4.2
  game.coneBursts = game.coneBursts.filter((b) => b.age < C.CONE_BURST_TIME);
  for (const j of game.emberJumps) j.age += dt;
  game.emberJumps = game.emberJumps.filter((j) => j.age < C.EMBER_JUMP_TIME);
  for (const s of game.healSparkles) s.age += dt;
  game.healSparkles = game.healSparkles.filter((s) => s.age < C.HEAL_SPARKLE_TIME);
  // M6b §2.2, §3: a turret's collapse debris and shields shattering.
  for (const d of game.debris) d.age += dt;
  game.debris = game.debris.filter((d) => d.age < C.WRECK_DEBRIS_TIME);
  for (const s of game.shieldShatters) s.age += dt;
  game.shieldShatters = game.shieldShatters.filter((s) => s.age < C.SHIELD_SHATTER_TIME);
  for (const c of game.wallCrumbles) c.age += dt; // M6d §2.5
  game.wallCrumbles = game.wallCrumbles.filter((c) => c.age < C.WALL_CRUMBLE_TIME);
  for (const p of game.thornPricks) p.age += dt;
  game.thornPricks = game.thornPricks.filter((p) => p.age < C.WALL_HIT_FLASH_TIME * 3);
  for (const h of game.eggHatches) h.age += dt; // M6b §5
  game.eggHatches = game.eggHatches.filter((h) => h.age < C.EGG_HATCH_TIME);
  for (const p of game.relicPulses) p.age += dt;
  game.relicPulses = game.relicPulses.filter((p) => p.age < C.RELIC_PULSE_TIME);
  for (const list of [game.ironCalls, game.pylonBreaks, game.linkSnaps]) for (const x of list) x.age += dt; // M6b §6
  game.ironCalls = game.ironCalls.filter((x) => x.age < C.IRON_CALL_TIME);
  game.pylonBreaks = game.pylonBreaks.filter((x) => x.age < C.PYLON_BREAK_TIME);
  game.linkSnaps = game.linkSnaps.filter((x) => x.age < C.LINK_SNAP_TIME);
  if (game.shake) {
    game.shake.age += dt;
    if (game.shake.age >= (game.shake.time ?? C.OGRE_SHAKE_TIME)) game.shake = null;
  }
  if (game.bossAnnouncement) {
    game.bossAnnouncement.age += dt;
    if (game.bossAnnouncement.age >= C.BOSS_BANNER_TIME) game.bossAnnouncement = null;
  }
  for (const p of game.lanePulses) p.age += dt;
  game.lanePulses = game.lanePulses.filter((p) => p.age < C.BOSS_LANE_PULSE_TIME);
}
