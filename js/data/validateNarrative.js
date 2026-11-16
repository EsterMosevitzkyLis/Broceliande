// Checks on the Broceliande Narrative sheet's tabs (M5a §1.5), before they're applied. Adds
// { tab, row, column, message } problems to problems.errors / problems.warnings, like validate.js.
// mainTables: the main sheet's tabs (items and levels are referenced from triggers).

import { DIALOGUE_EVENTS, REPEAT_MODES, DEFAULT_REPEAT } from '../narrative.js';

export function validateNarrative(t, problems, mainTables) {
  const tabName = (tab) => `narrative/${tab}`;
  const err = (tab, row, column, message) => problems.errors.push({ tab: tabName(tab), row: row?._row ?? row ?? '', column, message });
  const warn = (tab, row, column, message) => problems.warnings.push({ tab: tabName(tab), row: row?._row ?? row ?? '', column, message });

  const unique = (tab, col) => {
    const seen = new Set();
    for (const r of t[tab]) {
      if (r[col] === undefined) continue;
      if (seen.has(r[col])) err(tab, r, col, `duplicate ${col} "${r[col]}"`);
      seen.add(r[col]);
    }
    return seen;
  };

  // characters
  const characters = unique('characters', 'id');

  // dialogues: known speakers, lines numbered 1, 2, 3… without gaps or duplicates.
  const lines = {};
  for (const r of t.dialogues) {
    if (r.speaker !== undefined && !characters.has(r.speaker)) err('dialogues', r, 'speaker', `unknown character "${r.speaker}"`);
    if (r.dialogue !== undefined && r.line !== undefined) (lines[r.dialogue] ??= []).push(r);
  }
  for (const [id, rows] of Object.entries(lines)) {
    const numbers = rows.map((r) => r.line).sort((a, b) => a - b);
    const dup = numbers.find((n, i) => i > 0 && n === numbers[i - 1]);
    if (dup !== undefined) err('dialogues', rows.find((r) => r.line === dup), 'line', `dialogue ${id} has line ${dup} twice`);
    else if (numbers.some((n, i) => n !== i + 1)) err('dialogues', rows[0], 'line', `dialogue ${id}'s lines must be numbered 1 to ${numbers.length} without gaps (they are ${numbers.join(', ')})`);
  }

  // triggers
  unique('triggers', 'id');
  const items = new Set(mainTables.items.map((r) => r.id));
  const levels = new Set(mainTables.levels.map((r) => r.id));
  for (const r of t.triggers) {
    if (r.event !== undefined && !DIALOGUE_EVENTS.includes(r.event)) err('triggers', r, 'event', `unknown event "${r.event}" (one of ${DIALOGUE_EVENTS.join(', ')})`);
    if (r.repeat !== undefined && !REPEAT_MODES.includes(r.repeat)) err('triggers', r, 'repeat', `unknown repeat "${r.repeat}" (one of ${REPEAT_MODES.join(', ')}, blank = ${DEFAULT_REPEAT})`);
    if (r.dialogue !== undefined && !lines[r.dialogue]) err('triggers', r, 'dialogue', `unknown dialogue "${r.dialogue}"`);
    for (const col of ['left', 'right']) if (r[col] !== undefined && !characters.has(r[col])) err('triggers', r, col, `unknown character "${r[col]}"`);
    if (r.item !== undefined && !items.has(r.item)) err('triggers', r, 'item', `unknown item "${r.item}"`);
    if (r.item !== undefined && r.event !== 'itemAcquired') warn('triggers', r, 'item', 'only itemAcquired events carry an item, so this trigger can never match');
    if (r.level !== undefined && !levels.has(r.level)) warn('triggers', r, 'level', `unknown level "${r.level}" (the trigger can never match)`);
    // Every line's speaker must be one of the trigger's two characters.
    for (const line of lines[r.dialogue] ?? []) {
      if (line.speaker !== r.left && line.speaker !== r.right) err('triggers', r, 'dialogue', `dialogue ${r.dialogue} line ${line.line}: speaker "${line.speaker}" is neither left (${r.left}) nor right (${r.right})`);
    }
  }
  return problems;
}
