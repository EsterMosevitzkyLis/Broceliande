// Dialogues (M5a §2): triggers matched against gameplay events, the queue of dialogues waiting to
// play, and what has been seen. Listens on the event bus; never changes the simulation (it only
// writes the run's list of triggers seen this run, run.dialoguesSeen). The box itself, its text
// and its input are js/dialogueBox.js; main.js opens the next queued dialogue when it's ready.

import * as C from './config.js';
import { events } from './events.js';
import { GameState } from './states.js';
import { DIALOGUE_EVENTS, DIALOGUES, TRIGGERS } from './narrative.js';
import { mapNode } from './run.js';

// §2.1: the states in which each event's dialogue shows, and the states it may wait through first
// (an item found in battle shows on the map, after the Victory overlay; a new region's map after
// the crossing dialog). A queued dialogue in any other state has missed its moment and is dropped.
const SHOW = {
  prepStart: { in: [GameState.PREP], waits: [] },
  battleWon: { in: [GameState.VICTORY], waits: [GameState.ENDING] },
  death: { in: [GameState.DEFEAT], waits: [GameState.ENDING] },
  itemAcquired: { in: [GameState.MAP, GameState.TRADER, GameState.TINKER, GameState.VILLAGE], waits: [GameState.VICTORY, GameState.CROSSING] },
  regionEntered: { in: [GameState.MAP], waits: [GameState.CROSSING] },
};

// Queued dialogues: { triggerId (null: debug Play dialogue), dialogue, left, right, event (null:
// show anywhere), run }. In order; an event's matches are queued by priority.
const queue = [];
let current = null;   // the open dialogue: { entry, line (index) }
let lastEvent = null; // debug: { name, ctx, matched: [trigger IDs] }

// ---------------------------------------------------------------------------
// Saved lists (§2.2): onceEver triggers seen, and each event's count over all runs (occurrence).
// If storage is unavailable they last for the session.
// ---------------------------------------------------------------------------
function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // No storage (private window, blocked site data): kept for this session only.
  }
}

let seenEver = load(C.DIALOGUE_SEEN_KEY, []);
if (!Array.isArray(seenEver)) seenEver = [];
let counts = load(C.DIALOGUE_COUNTS_KEY, {});
if (typeof counts !== 'object' || Array.isArray(counts)) counts = {};

// ---------------------------------------------------------------------------
// Events and triggers
// ---------------------------------------------------------------------------

// Subscribes to the dialogue events (§2.1). Called once, before the first run starts.
export function initDialogues() {
  for (const name of DIALOGUE_EVENTS) events.on(name, (e) => onEvent(name, e));
}

// An event's context (§2.1): region (by order), map row, level, item, and its occurrence (how many
// times it has fired over all runs, this one included). e: { run, levelId?, regionId?, itemId? }.
// Battle events name their level; otherwise the run's current node gives the row (a Trader's, a
// Tinker's Rest's), and a newly entered region has no row yet.
function context(name, e) {
  const run = e.run ?? null;
  const level = e.levelId ? C.LEVELS[e.levelId] : null;
  const node = !level && run?.currentNodeId ? mapNode(run, run.currentNodeId) : null;
  const regionId = level?.region ?? e.regionId ?? run?.regionId;
  return {
    run,
    regionOrder: C.REGIONS[regionId]?.order,
    row: level?.row ?? node?.row,
    level: e.levelId ?? node?.levelId ?? undefined,
    item: e.itemId,
    occurrence: counts[name],
  };
}

const fits = (want, have) => want === undefined || want === have; // a blank condition matches anything

function played(t, run) {
  if (t.repeat === 'onceEver') return seenEver.includes(t.id);
  if (t.repeat === 'oncePerRun') return !!run?.dialoguesSeen?.includes(t.id);
  return false; // always
}

function matches(t, name, ctx) {
  return t.enabled && t.event === name
    && fits(t.regionOrder, ctx.regionOrder) && fits(t.row, ctx.row) && fits(t.level, ctx.level)
    && fits(t.item, ctx.item) && fits(t.occurrence, ctx.occurrence)
    && !played(t, ctx.run) && !queue.some((q) => q.triggerId === t.id);
}

// §2.2: every matching trigger is queued, highest priority first, ties in row order (sort is stable).
function onEvent(name, e) {
  counts[name] = (counts[name] ?? 0) + 1;
  save(C.DIALOGUE_COUNTS_KEY, counts);
  const ctx = context(name, e);
  const matched = TRIGGERS.filter((t) => matches(t, name, ctx)).sort((a, b) => b.priority - a.priority);
  lastEvent = { name, ctx, matched: matched.map((t) => t.id) };
  for (const t of matched) queue.push({ triggerId: t.id, dialogue: t.dialogue, left: t.left, right: t.right, event: name, run: ctx.run });
}

// ---------------------------------------------------------------------------
// Opening and closing (called by main.js and the box)
// ---------------------------------------------------------------------------

// The next queued dialogue that can show now, taken off the queue and marked open (and seen,
// §2.2: as soon as it opens, so skipping it doesn't replay it); null if none, or one is open.
// Queued dialogues of another run, or whose moment has passed, are dropped first.
export function takeNextDialogue(game) {
  if (current) return null;
  for (let i = queue.length - 1; i >= 0; i--) {
    const q = queue[i];
    const show = q.event ? SHOW[q.event] : null;
    if ((q.run && q.run !== game.run) || (show && !show.in.includes(game.state) && !show.waits.includes(game.state))) queue.splice(i, 1);
  }
  const i = queue.findIndex((q) => !q.event || SHOW[q.event].in.includes(game.state));
  if (i < 0) return null;
  const [entry] = queue.splice(i, 1);
  current = { entry, line: 0 };
  if (entry.triggerId) {
    if (!seenEver.includes(entry.triggerId)) {
      seenEver.push(entry.triggerId);
      save(C.DIALOGUE_SEEN_KEY, seenEver);
    }
    if (game.run && !game.run.dialoguesSeen.includes(entry.triggerId)) game.run.dialoguesSeen.push(entry.triggerId);
  }
  return entry;
}

export function isDialogueOpen() {
  return current !== null;
}

// The box reports the line it shows (debug panel) and when it closes.
export function setDialogueLine(index) {
  if (current) current.line = index;
}

export function dialogueClosed() {
  current = null;
}

// ---------------------------------------------------------------------------
// Debug (§5)
// ---------------------------------------------------------------------------

// Forget seen dialogues: the saved list and the run's list.
export function forgetSeenDialogues(run) {
  seenEver = [];
  save(C.DIALOGUE_SEEN_KEY, seenEver);
  if (run) run.dialoguesSeen = [];
}

// The characters a dialogue plays with: its first trigger's, or else its first two speakers.
function castOf(dialogueId) {
  const t = TRIGGERS.find((tr) => tr.dialogue === dialogueId);
  if (t) return { left: t.left, right: t.right };
  const speakers = [...new Set(DIALOGUES[dialogueId].map((l) => l.speaker))];
  return { left: speakers[0], right: speakers[1] ?? speakers[0] };
}

// Every dialogue, for the debug panel's Play dialogue… list: [{ id, label }].
export function dialogueChoices() {
  return Object.keys(DIALOGUES).map((id) => {
    const { left, right } = castOf(id);
    return { id, label: `${id} (${left} / ${right})` };
  });
}

// Play dialogue…: the dialogue next, wherever the game is (no trigger, nothing marked seen).
export function playDialogueNow(dialogueId) {
  if (!DIALOGUES[dialogueId]) return;
  queue.unshift({ triggerId: null, dialogue: dialogueId, ...castOf(dialogueId), event: null, run: null });
}

export function dialogueDebugLines(run) {
  const lines = [];
  if (current) {
    const e = current.entry;
    lines.push(`Dialogue: ${e.dialogue} line ${current.line + 1}/${DIALOGUES[e.dialogue].length}  (${e.triggerId ? `trigger ${e.triggerId}` : 'debug'})  queued ${queue.length}`);
  } else lines.push(`Dialogue: none  queued ${queue.length}`);
  if (lastEvent) {
    const c = lastEvent.ctx;
    const where = [`region ${c.regionOrder ?? '-'}`, `row ${c.row ?? '-'}`, `level ${c.level ?? '-'}`, c.item ? `item ${c.item}` : '', `#${c.occurrence}`].filter(Boolean).join(', ');
    lines.push(`  last event: ${lastEvent.name} (${where}) → matched: ${lastEvent.matched.join(', ') || 'none'}`);
  }
  lines.push(`  seen: ${seenEver.length} ever, ${run?.dialoguesSeen?.length ?? 0} this run`);
  return lines;
}
