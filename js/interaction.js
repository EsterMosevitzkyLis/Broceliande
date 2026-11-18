// Player commands: turns clicks and Esc into Druid actions and menu changes,
// following the start/switch/cancel rules of spec §7.4 and §16.2.
//   - Opening a menu never cancels the current action; confirming a new action does.
//   - Clicking empty ground closes the menu and does not cancel the action.
//   - Esc / right-click: close menu → exit summon placement / Double targeting → cancel timed action.
//   - M6d §2.4: choosing the Scale Bulwark opens wall placement mode (view.wallPlacement); a click on
//     a valid wall position confirms the build there, Esc / right-click leaves it at no cost.
//     They never cancel a Bough Double's job (only "Cancel job" in the target's menu does, M1i §2.6).

import { GameState, ActionState } from './states.js';
import { pick } from './picking.js';
import {
  startSearch, startBuild, cancelAction, isBuildingSlot,
  startSummonPlacement, exitSummonPlacement, placeSummon, startTravel, isTravelling,
  summonAvailability, denySummon,
} from './systems/actionSystem.js';
import { isStepMode, canVisit } from './systems/stepSystem.js';
import { isDoubleTargeting, isDoubleTarget, doubleOnSlot, startDoubleJob, cancelDoubleJob } from './systems/doubleSystem.js';
import { buildableTypes, isWallType } from './entities/turret.js';
import { wallPlacementAt } from './systems/wallSystem.js';
import { startCombat, enterNode } from './game.js';
import { availableNodeAt } from './run.js';
import * as C from './config.js';
import { resolveHiddenSpot } from './systems/hiddenSpotSystem.js';
import { events } from './events.js';

const SUMMON_FLASH_MS = C.SUMMON_DENIED_FLASH_TIME * 1000; // real time: a UI flash, not gameplay

export function createInteraction(game, view) {
  function closeMenu() {
    view.menu = null;
  }
  // M6d §2.4: the wall placement is confirmed: the build (or travel, or the Double's job) starts with it.
  function confirmWall(world) {
    const wp = view.wallPlacement;
    const spot = wallPlacementAt(game, wp.slotIndex, wp.type, world);
    if (!spot?.valid) {
      events.emit('wallDenied', {});
      return;
    }
    const wall = { laneId: spot.laneId, s: spot.s, x: spot.x, y: spot.y, tx: spot.tx, ty: spot.ty };
    const started = wp.via === 'double' ? startDoubleJob(game, wp.slotIndex, wp.type, wall)
      : isStepMode(game) ? startTravel(game, { kind: 'slot', index: wp.slotIndex }, wp.type, wall)
        : startBuild(game, wp.slotIndex, wp.type, wall);
    if (started) view.wallPlacement = null;
  }
  // M6c §1.3: a turret slot found under ferns opens its build menu (no extra travel).
  events.on('hiddenSlotFound', ({ slotIndex }) => { view.menu = { kind: 'build', index: slotIndex }; });

  function onLeftClick(world) {
    // Map (M2a §4.3): clicking an available node starts its Prep; anything else does nothing.
    if (game.state === GameState.MAP) {
      const nodeId = availableNodeAt(game.run, world);
      if (nodeId && enterNode(game, nodeId)) closeMenu();
      return;
    }
    if (game.state !== GameState.PREP && game.state !== GameState.COMBAT) return;
    if (view.wallPlacement) {
      confirmWall(world);
      return;
    }
    const hit = pick(game, world);
    // Bough Double targeting (M1i §2.4 step 3): a turret starts its upgrade job at once; an empty
    // slot opens the turret choice. Anything else closes that menu and keeps targeting.
    if (isDoubleTargeting(game)) {
      const target = (hit?.kind === 'turret' || hit?.kind === 'slot') && isDoubleTarget(game, hit.index);
      if (target && hit.kind === 'turret') {
        if (startDoubleJob(game, hit.index)) closeMenu(); // unaffordable: nothing happens
      } else if (target) {
        view.menu = { kind: 'doubleBuild', index: hit.index };
      } else {
        closeMenu();
      }
      return;
    }
    // Summon placement (§15.1): a left-click anywhere on the battlefield places the chosen summon.
    if (game.action.state === ActionState.SUMMON_PLACEMENT) {
      placeSummon(game, world); // ignored on the HUD strip
      return;
    }
    const isPrep = game.state === GameState.PREP;

    // Step-mode Prep (M1b §5.3, M1f §5.2). Clicking a valid, affordable feature travels there and
    // searches on arrival. Clicking a valid, affordable slot opens the build menu (with the travel
    // cost); choosing a turret there travels and builds. Anything else closes the menu at no
    // cost. Input is ignored while travelling.
    if (isPrep && isStepMode(game)) {
      if (isTravelling(game)) return;
      if (hit?.kind === 'slot' && canVisit(game, hit)) view.menu = { kind: 'build', index: hit.index };
      else if ((hit?.kind === 'feature' || hit?.kind === 'hidden') && startTravel(game, hit)) closeMenu(); // M6c §1.3: a fern clump travels too
      else closeMenu();
      return;
    }

    // M6c §1.3, timed Prep (no travel): a fern clump is revealed and resolved where it is.
    if (hit?.kind === 'hidden' && isPrep) {
      closeMenu();
      resolveHiddenSpot(game, hit.index, startSearch);
      return;
    }
    if (hit?.kind === 'feature' && isPrep && !game.features[hit.index].exhausted) {
      // Starting a search confirms a new action, so it also closes any open menu.
      // Clicking the feature already being searched does nothing.
      if (startSearch(game, hit.index)) closeMenu();
      return;
    }
    if (hit?.kind === 'slot' && isPrep) {
      if (!isBuildingSlot(game, hit.index)) view.menu = { kind: 'build', index: hit.index };
      return;
    }
    // Combat (M1i §2.4): clicking a turret, or a slot a Double is building on, opens its info menu
    // (with Cancel job while a Double works there). It never starts a job; an empty slot only
    // shows its hint tooltip.
    if (game.state === GameState.COMBAT && (hit?.kind === 'turret' || (hit?.kind === 'slot' && doubleOnSlot(game, hit.index)))) {
      view.menu = { kind: 'turret', index: hit.index };
      return;
    }
    // Empty ground, or something not interactive in this phase.
    closeMenu();
  }

  function onEscape() {
    if (game.state === GameState.ENDING) return; // M1e §1.2: input disabled while the battle ends
    if (view.wallPlacement) {
      view.wallPlacement = null; // M6d §2.4: cancelled at no cost (a Double keeps targeting)
      return;
    }
    if (view.menu) {
      closeMenu(); // closing the turret choice returns to Double targeting
      return;
    }
    if (exitSummonPlacement(game)) return;
    cancelAction(game);
  }

  // option: which of the menu's options was clicked.
  function onMenuAction(option = 0) {
    const menu = view.menu;
    if (!menu) return;
    if (menu.kind === 'build') {
      // One card per turret type (M1f §5.2): build it, or in step mode travel there to build it.
      const type = buildableTypes(game.scene.level.region)[option];
      if (isWallType(type)) { // M6d §2.4: choose where its wall goes first
        view.wallPlacement = { slotIndex: menu.index, type, via: 'build' };
        closeMenu();
        return;
      }
      const started = isStepMode(game)
        ? startTravel(game, { kind: 'slot', index: menu.index }, type)
        : startBuild(game, menu.index, type);
      if (started) closeMenu();
    }
    // M1i §2.4: the turret choice for a Double's build job.
    if (menu.kind === 'doubleBuild') {
      const type = buildableTypes(game.scene.level.region)[option];
      if (isWallType(type)) {
        view.wallPlacement = { slotIndex: menu.index, type, via: 'double' };
        closeMenu();
      } else if (startDoubleJob(game, menu.index, type)) {
        closeMenu();
      }
    }
    // M1i §2.6: the turret menu's first card is "Cancel job" while a Double works there.
    if (menu.kind === 'turret' && option === 0 && cancelDoubleJob(game, menu.index)) closeMenu();
  }

  // A summon's card in the summon panel (M2q) or its shortcut (Q / W / E / R), Combat only. The same
  // summon again while placing it cancels placement (like Esc); another summon switches to it if it
  // is available. Unavailable: no placement, but its reason near the Druid, a soft "denied" sound
  // and a flash of its card.
  function onSummonKey(kind) {
    if (game.state !== GameState.COMBAT) return;
    const placing = game.action.state === ActionState.SUMMON_PLACEMENT;
    if (placing && game.action.target === kind) {
      exitSummonPlacement(game);
      closeMenu();
      return;
    }
    const { available, reason } = summonAvailability(game, kind);
    if (!available) {
      denySummon(game, kind, reason || 'Not now');
      view.flashSummon = { kind, until: performance.now() + SUMMON_FLASH_MS };
      return;
    }
    closeMenu();
    startSummonPlacement(game, kind);
  }

  // Start Combat / Start Battle button. Ignored mid-travel so a paid move always lands.
  function onStartCombat() {
    if (!isTravelling(game)) startCombat(game);
  }

  return { onLeftClick, onEscape, onMenuAction, onStartCombat, onSummonKey, closeMenu };
}

// Whether the hovered object reacts to a click right now (for the pointer cursor).
export function isInteractive(game, hover) {
  if (!hover) return false;
  if (game.state === GameState.COMBAT) {
    if (isDoubleTargeting(game)) return (hover.kind === 'turret' || hover.kind === 'slot') && isDoubleTarget(game, hover.index);
    if (hover.kind === 'turret') return true;
    return hover.kind === 'slot' && doubleOnSlot(game, hover.index) !== null;
  }
  if (game.state !== GameState.PREP) return false;
  if (isStepMode(game)) return !isTravelling(game) && canVisit(game, hover);
  if (hover.kind === 'hidden') return !game.hiddenSpots[hover.index].revealed;
  if (hover.kind === 'feature') return !game.features[hover.index].exhausted;
  if (hover.kind === 'slot') return !isBuildingSlot(game, hover.index);
  return false;
}
