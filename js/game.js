// Game state, phase transitions and restart (spec §6).

import * as C from './config.js';
import { createRng, makeRandomSeed } from './rng.js';

export const GameState = Object.freeze({
  START: 'START',
  PREP: 'PREP',
  COMBAT: 'COMBAT',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
});

// Allowed transitions. Restart (→ PREP) is allowed from any post-START state,
// since the debug R key can restart mid-encounter.
const TRANSITIONS = {
  [GameState.START]: [GameState.PREP],
  [GameState.PREP]: [GameState.COMBAT, GameState.PREP],
  [GameState.COMBAT]: [GameState.VICTORY, GameState.DEFEAT, GameState.PREP],
  [GameState.VICTORY]: [GameState.PREP],
  [GameState.DEFEAT]: [GameState.PREP],
};

export function createGame() {
  return {
    state: GameState.START,
    seed: null,
    rng: null,
    prepRemaining: 0,  // s, counts down during PREP
    combatTime: 0,     // s, counts up during COMBAT
    druidHp: 0,
    wolvesSpawned: 0,
    wolvesAlive: 0,
    wolvesKilled: 0,
  };
}

function setState(game, next) {
  if (!TRANSITIONS[game.state].includes(next)) {
    console.error(`Invalid game state transition ${game.state} → ${next}`);
    return false;
  }
  game.state = next;
  return true;
}

// Page load (START → PREP) and Restart (any → PREP). Layout comes from config and
// never changes; only the seed (and therefore yields) is re-rolled.
export function startEncounter(game) {
  game.seed = C.DEBUG_SEED ?? makeRandomSeed();
  game.rng = createRng(game.seed);
  game.prepRemaining = C.PREP_DURATION;
  game.combatTime = 0;
  game.druidHp = C.DRUID_HP;
  game.wolvesSpawned = 0;
  game.wolvesAlive = 0;
  game.wolvesKilled = 0;
  setState(game, GameState.PREP);
}

// Prep timer reaching 0, Start Combat button, or debug N.
export function startCombat(game) {
  if (game.state !== GameState.PREP) return;
  game.prepRemaining = 0;
  setState(game, GameState.COMBAT);
}

export function endEncounter(game, result) {
  if (game.state !== GameState.COMBAT) return;
  setState(game, result);
}

function checkEndConditions(game) {
  if (game.druidHp <= 0) {
    endEncounter(game, GameState.DEFEAT);
  } else if (game.wolvesSpawned >= C.WAVE_TOTAL && game.wolvesAlive === 0) {
    endEncounter(game, GameState.VICTORY);
  }
}

// One fixed simulation step. VICTORY / DEFEAT / START: simulation is stopped.
export function updateGame(game, dt) {
  switch (game.state) {
    case GameState.PREP:
      game.prepRemaining -= dt;
      if (game.prepRemaining <= 0) startCombat(game);
      break;
    case GameState.COMBAT:
      game.combatTime += dt;
      checkEndConditions(game);
      break;
    default:
      break;
  }
}

// Start-up validation of config (spec §14).
export function validateConfig() {
  let total = 0;
  for (const lane of C.LANES) {
    const bursts = C.WAVE[lane.id];
    if (!bursts) {
      console.error(`WAVE has no bursts for lane "${lane.id}"`);
      continue;
    }
    for (const burst of bursts) total += burst.count;
  }
  if (total !== C.WAVE_TOTAL) {
    console.error(`WAVE total is ${total}, expected WAVE_TOTAL = ${C.WAVE_TOTAL}`);
  }
}
