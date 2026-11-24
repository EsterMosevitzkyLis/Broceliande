// Potions in battle (Potions addendum §3.3, §4): using a belt slot's potion in Prep or Combat, and the
// shared cooldown. A used potion is gone from the run's belt at once, leaving its slot empty for the
// rest of the battle (the inventory never refills it mid-battle). Phase 1: only Healing does
// anything; the other potions sit in their slots, greyed.

import * as C from '../config.js';
import { GameState } from '../states.js';
import { events } from '../events.js';
import { addFloatingText } from '../effects.js';
import { potionRow, isPotionWorking } from '../potions.js';

// The states the battle belt shows in (greyed outside Prep and Combat).
const BELT_STATES = [GameState.PREP, GameState.COMBAT, GameState.ENDING, GameState.VICTORY, GameState.DEFEAT];

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
  if (game.state === GameState.COMBAT && game.potionCooldown > 0) return 'Wait for the cooldown';
  if (p.id === 'healing' && game.druidHp >= game.stats['druid.maxHp']) return 'Already at full HP';
  return null;
}

// Uses the potion in a belt slot (click or keys 1-5); false if it can't be used now.
export function usePotion(game, slot) {
  if (potionUseBlocker(game, slot)) return false;
  const key = game.run.belt[slot];
  const p = potionRow(key);
  game.run.belt[slot] = null;
  // §4.1: the shared cooldown, in Combat only (none in Prep); auto potions never start it.
  if (game.state === GameState.COMBAT) game.potionCooldown = C.POTION_COOLDOWN;
  if (p.id === 'healing') {
    const before = game.druidHp;
    game.druidHp = Math.min(game.stats['druid.maxHp'], game.druidHp + p.amount);
    const healed = Math.round(game.druidHp - before);
    addFloatingText(game, `+${healed}`, game.druidPos.x, game.druidPos.y - C.DRUID_RADIUS * 2.2, false, false, C.HEAL_TEXT_COLOR);
  }
  events.emit('potionUsed', { key, slot });
  return true;
}

// The shared cooldown runs in Combat time only (fixed timestep, so game speed applies).
export function updatePotions(game, dt) {
  if (game.potionCooldown > 0) game.potionCooldown = Math.max(0, game.potionCooldown - dt);
}
