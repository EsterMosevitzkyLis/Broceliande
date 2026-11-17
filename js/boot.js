// Start-up (M2j §4): load the data tabs from data/*.csv behind a "Loading…" screen, check them,
// apply them to config.js, and only then start the game (main.js and everything it imports, so
// every module sees the loaded values). Problems are shown in the page, not just the console:
// errors in a panel that stops the game from starting; warnings in a small list that can be
// dismissed. The existing start-up checks that run as main.js starts (levels, candidates,
// corridors, items…) report through the console as before; what they report is shown too.

import * as C from './config.js';
import { loadTables } from './data/loader.js';
import { validateTables } from './data/validate.js';
import { loadLevelMaps } from './mapFile.js';
import { NARRATIVE_TABS } from './data/schema.js';
import { validateNarrative } from './data/validateNarrative.js';
import { applyNarrative, loadPortraits } from './narrative.js';

const loadingScreen = document.getElementById('loading-screen');

// "spawns · row 42 · type: unknown enemy "stirg"" (parts that don't apply are left out).
function problemLine(p) {
  const where = [p.tab, p.row !== '' && p.row !== undefined ? `row ${p.row}` : '', p.column].filter(Boolean).join(' · ');
  return where ? `${where}: ${p.message}` : p.message;
}

function showProblems(kind, problems) {
  const panel = document.getElementById(kind === 'error' ? 'data-errors' : 'data-warnings');
  const list = panel.querySelector('ul');
  list.replaceChildren(...problems.map((p) => {
    const li = document.createElement('li');
    li.textContent = problemLine(p);
    return li;
  }));
  panel.hidden = false;
}

document.querySelector('#data-warnings button').addEventListener('click', () => {
  document.getElementById('data-warnings').hidden = true;
});

// The warnings panel shows only with the debug overlay on (D, main.js sets body.debug-on) or with
// ?debug in the URL (styles.css); warnings always go to the console. Errors always show.
if (new URLSearchParams(location.search).has('debug')) document.body.classList.add('debug-param');

// Data warnings found before the game starts (the start-up checks' own warnings are console
// output already, captured below).
function logWarnings(warnings) {
  for (const p of warnings) if (p.tab !== 'start-up check') console.warn(`Data warning: ${problemLine(p)}`);
}

// Console errors and warnings from main.js's start-up checks, as problems.
function captureConsole(problems) {
  const original = { error: console.error, warn: console.warn };
  console.error = (...args) => { problems.errors.push({ tab: 'start-up check', message: args.join(' ') }); original.error(...args); };
  console.warn = (...args) => { problems.warnings.push({ tab: 'start-up check', message: args.join(' ') }); original.warn(...args); };
  return () => Object.assign(console, original);
}

// Live mode (§4.3): with ?live in the URL, every tab comes straight from the published Google
// Sheets named in data/sheet_sources.json (M5a §1.1: the main one and the Narrative one), and a
// LIVE DATA badge shows. Otherwise from data/*.csv and data/narrative/*.csv.
const LIVE_URL = 'https://docs.google.com/spreadsheets/d/e/{id}/pub?gid={gid}&single=true&output=csv';
const LIVE_HINT = ' — check that the Google Sheet is published (File › Share › Publish to web) and that the tab\'s gid in data/sheet_sources.json is right';
const live = new URLSearchParams(location.search).has('live');

async function liveSources() {
  const res = await fetch('data/sheet_sources.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// The live URL of each tab of one sheet: { publishedId, tabs: { tab: gid } }.
const liveUrlFor = (sheet) => (tab) => (sheet.tabs?.[tab] === undefined || sheet.tabs[tab] === null)
  ? `(no gid for "${tab}" in data/sheet_sources.json)`
  : LIVE_URL.replace('{id}', sheet.publishedId).replace('{gid}', sheet.tabs[tab]);

// M5a §1.1: the Narrative sheet is set up once its publishedId and every gid are filled in.
const isSheetSetUp = (sheet) => !!sheet?.publishedId && !sheet.publishedId.startsWith('PASTE')
  && Object.values(sheet.tabs ?? {}).every(Number.isInteger);

async function load() {
  const local = (folder) => (tab) => `data/${folder}${tab}.csv`;
  if (!live) {
    const main = await loadTables(local(''));
    return { ...main, narrative: await loadTables(local('narrative/'), '', NARRATIVE_TABS) };
  }
  document.getElementById('live-badge').hidden = false;
  let sources;
  try {
    sources = await liveSources();
  } catch (err) {
    return { tables: {}, narrative: { tables: {}, problems: { errors: [], warnings: [] } }, problems: { errors: [{ tab: 'sheet_sources.json', message: `could not read data/sheet_sources.json (${err.message})` }], warnings: [] } };
  }
  const main = await loadTables(liveUrlFor(sources), LIVE_HINT);
  if (isSheetSetUp(sources.narrative)) return { ...main, narrative: await loadTables(liveUrlFor(sources.narrative), LIVE_HINT, NARRATIVE_TABS) };
  // Not set up yet: the project's copy, with a warning.
  const narrative = await loadTables(local('narrative/'), '', NARRATIVE_TABS);
  narrative.problems.warnings.push({ tab: 'sheet_sources.json', message: 'the Narrative sheet\'s publishedId or gids are not filled in yet, so the dialogues come from data/narrative/*.csv' });
  return { ...main, narrative };
}

const { tables, problems, narrative } = await load();
// M5a §1.5: the Narrative sheet's problems join the main sheet's, its tabs named narrative/<tab>.
for (const kind of ['errors', 'warnings']) {
  for (const p of narrative.problems[kind]) problems[kind].push(p.tab in NARRATIVE_TABS ? { ...p, tab: `narrative/${p.tab}` } : p);
}
// M4a §1.3: every battle level's map file, always from the project (in ?live mode too).
const { maps, backgrounds } = await loadLevelMaps(tables.levels ?? [], problems);
if (problems.errors.length === 0) validateTables(tables, problems, maps);
if (problems.errors.length === 0) validateNarrative(narrative.tables, problems, tables);
// M5a §1.2: portrait images, always from the project (in ?live mode too).
const portraits = problems.errors.length === 0 ? await loadPortraits(narrative.tables.characters, problems) : {};
if (problems.errors.length === 0) {
  try {
    C.applyData(tables, maps, backgrounds);
    applyNarrative(narrative.tables, portraits);
  } catch (err) {
    problems.errors.push({ tab: '', message: `the data could not be applied: ${err.message}` });
    console.error(err);
  }
}

logWarnings(problems.warnings);
if (problems.errors.length > 0) {
  loadingScreen.hidden = true;
  showProblems('error', problems.errors);
  if (problems.warnings.length) showProblems('warning', problems.warnings);
} else {
  const restore = captureConsole(problems);
  try {
    await import('./main.js');
  } catch (err) {
    problems.errors.push({ tab: '', message: `the game failed to start: ${err.message}` });
    console.error(err);
  } finally {
    restore();
  }
  loadingScreen.hidden = true;
  if (problems.errors.length) showProblems('error', problems.errors);
  if (problems.warnings.length) showProblems('warning', problems.warnings);
}
