// The Broceliande Narrative sheet's data (M5a §1), filled once at start-up by js/boot.js
// (applyNarrative) from data/narrative/*.csv, before any game module runs. Kept apart from
// config.js because it comes from the second sheet.

// Code-side lists the data must match (checked by js/data/validateNarrative.js).
export const DIALOGUE_EVENTS = ['prepStart', 'battleWon', 'death', 'itemAcquired', 'regionEntered']; // §2.1
export const REPEAT_MODES = ['onceEver', 'oncePerRun', 'always']; // §2.2
export const DEFAULT_REPEAT = 'onceEver';
export const PORTRAIT_FOLDER = 'data/narrative/portraits/';

// characters: id → { name, image (a loaded Image, or null: the drawn placeholder), telepathic (speaks
// in the Druid's mind: italic, paler lines and a whisper sound) }
export let CHARACTERS = {};
// dialogues: id → [{ speaker, text }] in line order
export let DIALOGUES = {};
// triggers: in row order, [{ id, enabled, event, regionOrder, row, level, item, occurrence, dialogue,
// left, right, repeat, priority }]; a blank condition is undefined (= any)
export let TRIGGERS = [];

// t: the narrative tables (rows as from js/data/loader.js, already checked); images: portrait file
// name → loaded Image (missing files are left out).
export function applyNarrative(t, images = {}) {
  CHARACTERS = Object.fromEntries(t.characters.map((r) => [r.id, { name: r.name, image: (r.portrait && images[r.portrait]) || null, telepathic: r.telepathic === true }]));
  DIALOGUES = {};
  for (const r of [...t.dialogues].sort((a, b) => a.line - b.line)) {
    (DIALOGUES[r.dialogue] ??= []).push({ speaker: r.speaker, text: r.text });
  }
  TRIGGERS = t.triggers.map((r) => ({
    id: r.id, enabled: r.enabled, event: r.event,
    regionOrder: r.regionOrder, row: r.row, level: r.level, item: r.item, occurrence: r.occurrence,
    dialogue: r.dialogue, left: r.left, right: r.right,
    repeat: r.repeat ?? DEFAULT_REPEAT, priority: r.priority ?? 0,
  }));
}

// Loads every portrait the characters tab names (§1.2). A named file that can't be loaded is a
// warning; the placeholder is drawn instead. Returns file name → Image.
export async function loadPortraits(characters, problems) {
  const images = {};
  const files = [...new Set(characters.map((r) => r.portrait).filter(Boolean))];
  await Promise.all(files.map((file) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[file] = img; resolve(); };
    img.onerror = () => {
      for (const r of characters.filter((c) => c.portrait === file)) {
        problems.warnings.push({ tab: 'narrative/characters', row: r._row, column: 'portrait', message: `${PORTRAIT_FOLDER}${file} not found (the placeholder portrait is used)` });
      }
      resolve();
    };
    img.src = PORTRAIT_FOLDER + encodeURIComponent(file);
  })));
  return images;
}
